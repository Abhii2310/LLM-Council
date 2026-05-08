#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, request


@dataclass
class CheckResult:
    name: str
    status: str  # PASS, WARN, FAIL
    detail: str


def _http_json(base_url: str, method: str, path: str, timeout: float, payload: dict[str, Any] | None = None) -> Any:
    url = f"{base_url.rstrip('/')}{path}"
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url=url, method=method.upper(), data=body, headers=headers)
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if not raw.strip():
                return {}
            return json.loads(raw)
    except error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} on {path}: {raw[:400]}") from e
    except error.URLError as e:
        raise RuntimeError(f"Network error on {path}: {e}") from e


def _contains_any(text: str, candidates: list[str]) -> bool:
    lower = (text or "").lower()
    return any(c.lower() in lower for c in candidates)


def run_checks(args: argparse.Namespace) -> list[CheckResult]:
    results: list[CheckResult] = []

    # 1) Basic backend + quantum status
    try:
        quantum = _http_json(args.base_url, "GET", "/quantum/status", args.timeout)
        required = {"enabled", "mode", "strength", "backend", "provider"}
        missing = sorted(required - set(quantum.keys()))
        if missing:
            results.append(CheckResult("Quantum status endpoint", "FAIL", f"Missing keys: {', '.join(missing)}"))
        else:
            results.append(
                CheckResult(
                    "Quantum status endpoint",
                    "PASS",
                    f"mode={quantum.get('mode')} enabled={quantum.get('enabled')} backend={quantum.get('backend')}",
                )
            )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("Quantum status endpoint", "FAIL", str(exc)))

    # 2) Provider health check
    try:
        health = _http_json(args.base_url, "GET", "/providers/health-check", args.timeout)
        summary = health.get("summary") or {}
        total = int(summary.get("total_models", 0) or 0)
        healthy = int(summary.get("healthy_models", 0) or 0)
        blocked = int(summary.get("blocked_models", 0) or 0)

        if total <= 0:
            results.append(CheckResult("Provider health", "FAIL", "total_models is 0"))
        elif healthy < int(args.min_healthy_models):
            results.append(
                CheckResult(
                    "Provider health",
                    "FAIL",
                    f"healthy_models={healthy}/{total}, blocked={blocked} (min required={args.min_healthy_models})",
                )
            )
        else:
            results.append(
                CheckResult("Provider health", "PASS", f"healthy_models={healthy}/{total}, blocked={blocked}")
            )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("Provider health", "FAIL", str(exc)))

    # 3) Evaluate flow + RAG + quantum fields
    try:
        payload = {
            "query": "What is MSRIT NIRF ranking?",
            "session_id": f"predeploy_{int(time.time())}",
            "reasoning_mode": "standard",
            "enable_web_search": False,
        }
        evaluate = _http_json(args.base_url, "POST", "/evaluate", args.timeout, payload)

        quantum_model = str(evaluate.get("quantum_selected_model") or "").strip()
        quantum_score = evaluate.get("quantum_selected_score")
        best_response = str(evaluate.get("best_response") or "")
        reliability = evaluate.get("council_reliability") or {}
        successful = int(reliability.get("successful_models", 0) or 0)

        expected_rag_or_safety = _contains_any(
            best_response,
            [
                "official MSRIT homepage reference to NIRF 2025",
                "Safety check:",
                "verified KB snapshot",
            ],
        )

        if not quantum_model:
            results.append(CheckResult("Evaluate quantum output", "FAIL", "quantum_selected_model is empty"))
        elif not isinstance(quantum_score, (int, float)):
            results.append(CheckResult("Evaluate quantum output", "FAIL", "quantum_selected_score missing/invalid"))
        else:
            results.append(
                CheckResult(
                    "Evaluate quantum output",
                    "PASS",
                    f"quantum_selected_model={quantum_model}, quantum_selected_score={float(quantum_score):.4f}",
                )
            )

        if successful < int(args.min_successful_models):
            results.append(
                CheckResult(
                    "Evaluate council reliability",
                    "FAIL",
                    f"successful_models={successful} (min required={args.min_successful_models})",
                )
            )
        else:
            results.append(CheckResult("Evaluate council reliability", "PASS", f"successful_models={successful}"))

        if expected_rag_or_safety:
            results.append(CheckResult("Evaluate RAG grounding", "PASS", "RAG/safety-grounded output detected"))
        else:
            results.append(
                CheckResult(
                    "Evaluate RAG grounding",
                    "WARN",
                    "Output did not match expected grounding phrases; manually inspect best_response",
                )
            )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("Evaluate flow", "FAIL", str(exc)))

    # 4) Self-training / feedback pipeline
    try:
        before = _http_json(args.base_url, "GET", f"/feedback/insights?limit={args.feedback_limit}", args.timeout)
        before_total = int(before.get("total_feedback", 0) or 0)

        if args.no_feedback_write:
            results.append(
                CheckResult(
                    "Feedback write check",
                    "WARN",
                    "Skipped write test (--no-feedback-write). Insights read path is reachable.",
                )
            )
        else:
            model = str(args.feedback_model).strip() or "llama4_scout"
            feedback_payload = {
                "query": "predeploy self-training verification",
                "session_id": f"predeploy_feedback_{int(time.time())}",
                "best_model": model,
                "selected_model": model,
                "is_positive": True,
                "note": "predeploy_check_signal",
            }
            _http_json(args.base_url, "POST", "/feedback", args.timeout, feedback_payload)

            after = _http_json(args.base_url, "GET", f"/feedback/insights?limit={args.feedback_limit}", args.timeout)
            after_total = int(after.get("total_feedback", 0) or 0)

            if after_total <= before_total:
                results.append(
                    CheckResult(
                        "Feedback write check",
                        "FAIL",
                        f"total_feedback did not increase (before={before_total}, after={after_total})",
                    )
                )
            else:
                results.append(
                    CheckResult(
                        "Feedback write check",
                        "PASS",
                        f"total_feedback increased {before_total} -> {after_total}",
                    )
                )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("Feedback pipeline", "FAIL", str(exc)))

    # 5) Reliability insights endpoint check
    try:
        reliability = _http_json(args.base_url, "GET", f"/reliability/insights?limit={args.reliability_limit}", args.timeout)
        summary = reliability.get("summary") or {}
        window = int(reliability.get("window_evaluations", 0) or 0)
        rate = float(summary.get("success_rate", 0.0) or 0.0)
        slots = int(summary.get("total_slots", 0) or 0)

        if window <= 0 or slots <= 0:
            results.append(CheckResult("Reliability insights", "WARN", "No historical evaluation data yet"))
        else:
            results.append(
                CheckResult(
                    "Reliability insights",
                    "PASS",
                    f"window_evaluations={window}, total_slots={slots}, success_rate={rate:.2f}%",
                )
            )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("Reliability insights", "FAIL", str(exc)))

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pre-deployment validation checks for LLM Council backend")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Backend base URL")
    parser.add_argument("--timeout", type=float, default=90.0, help="HTTP timeout seconds per request")
    parser.add_argument("--min-healthy-models", type=int, default=6, help="Minimum healthy models required")
    parser.add_argument("--min-successful-models", type=int, default=6, help="Minimum successful models in evaluate")
    parser.add_argument("--reliability-limit", type=int, default=50, help="Window size for reliability insights")
    parser.add_argument("--feedback-limit", type=int, default=200, help="Window size for feedback insights")
    parser.add_argument("--feedback-model", default="llama4_scout", help="Model key used for feedback write check")
    parser.add_argument(
        "--no-feedback-write",
        action="store_true",
        help="Skip POST /feedback mutation check (read-only mode)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    results = run_checks(args)

    print("\n=== LLM Council Pre-Deployment Checks ===")
    print(f"Base URL: {args.base_url}")
    print("")

    for r in results:
        print(f"[{r.status}] {r.name}: {r.detail}")

    fail_count = sum(1 for r in results if r.status == "FAIL")
    warn_count = sum(1 for r in results if r.status == "WARN")
    pass_count = sum(1 for r in results if r.status == "PASS")

    print("\n--- Summary ---")
    print(f"PASS={pass_count} WARN={warn_count} FAIL={fail_count}")

    if fail_count > 0:
        print("RESULT: FAIL (deployment gate blocked)")
        return 1

    if warn_count > 0:
        print("RESULT: PASS WITH WARNINGS (review recommended)")
    else:
        print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
