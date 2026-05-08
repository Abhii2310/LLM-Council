# LLM Council Deployment Runbook

## Recommended Hosting (simple + reliable)
- Frontend: Vercel (Vite React app)
- Backend: Render Web Service (FastAPI)
- This matches existing `frontend/vercel.json` and `backend/render.yaml`.

## 1) Pre-deploy local gate (must pass)
From repo root:

```bash
make predeploy
```

Read-only version (does not write feedback event):

```bash
make predeploy-readonly
```

## 2) GitHub push flow
From repo root:

```bash
git status
git add .
git commit -m "chore: predeploy gate and deployment hardening"
git push origin main
```

## 3) Backend deploy (Render)
1. Create new Render Web Service from GitHub repo.
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables in Render dashboard:
   - `BACKEND_CORS_ORIGINS=https://<your-frontend-domain>.vercel.app`
   - `REQUEST_TIMEOUT_SECONDS=45`
   - `PER_MODEL_SOFT_TIMEOUT_SECONDS=12`
   - `RAG_ENABLED=true`
   - `RAG_DOCS_PATH=knowledge_base`
   - `QUANTUM_OPTIMIZATION_MODE=assist`
   - `QUANTUM_OPTIMIZATION_STRENGTH=0.08`
   - `QUANTUM_OPTIMIZATION_SEED=23`
   - Provider keys you use (set in dashboard only, never in git):
     - `GROQ_API_KEY`
     - `GEMINI_API_KEY`
     - `OPENROUTER_API_KEY`
     - `OPENAI_API_KEY`
     - `NVIDIA_API_KEY`
     - `CEREBRAS_API_KEY`
     - `AIMLAPI_API_KEY`
     - others as needed

## 4) Frontend deploy (Vercel)
1. Import GitHub repo in Vercel.
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set env var in Vercel project:
   - `VITE_BACKEND_URL=https://<your-render-backend-domain>`

## 5) Post-deploy smoke checks
Run these against production backend URL:

```bash
python3 backend/scripts/predeploy_check.py --base-url https://<your-render-backend-domain> --no-feedback-write
```

Then manually verify in UI:
- Dashboard loads without network errors.
- `Run Provider Health Check` returns summary.
- At least one `/evaluate` request completes.
- Quantum status card is visible and populated.
- Feedback thumbs action succeeds.

## 6) Security checklist
- Never commit `.env` files or API keys.
- Keep `BACKEND_CORS_ORIGINS` strict (no `*` in production).
- Rotate provider keys periodically.
- Use separate keys for dev/staging/prod.
- Redact secrets from logs (already implemented in backend).
- Keep provider health check enabled for runtime diagnosis.

## 7) CI/CD gate recommendation
Add a CI job that runs:

```bash
make predeploy-readonly
```

Block deployment if exit code is non-zero.
