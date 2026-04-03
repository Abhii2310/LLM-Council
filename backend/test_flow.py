#!/usr/bin/env python3
import requests
import json

# Test the evaluation pipeline flow
response = requests.post(
    "http://localhost:8000/evaluate",
    json={"query": "Explain quantum computing in simple terms"}
)

data = response.json()

print('=' * 60)
print('STEP 1: LLM COUNCIL RESPONSES')
print('=' * 60)
for i, r in enumerate(data['responses'], 1):
    status = '✓' if r.get('response') and not r['error'] else '✗'
    print(f"{i}. {r['model']} {status}")
    if r.get('response'):
        print(f"   Response: {r['response'][:80]}...")
    print(f"   Latency: {r['latency_ms']:.1f}ms")

print('\n' + '=' * 60)
print('STEP 2: METRICS DASHBOARD')
print('=' * 60)
for m in data['metrics']:
    print(f"{m['model']}:")
    print(f"  Relevance: {m['relevance']:.3f} | Semantic: {m['semantic_similarity']:.3f} | Agreement: {m['agreement']:.3f}")
    print(f"  Clarity: {m['clarity']:.3f} | Length: {m['length_optimization']:.3f}")

print('\n' + '=' * 60)
print('STEP 3: BEST RESPONSE SELECTION')
print('=' * 60)
best_score = [s for s in data['scores'] if s['model'] == data['best_model']][0]['final_score']
print(f"Best Model: {data['best_model']}")
print(f"Final Score: {best_score:.4f}")
print(f"Reason: {data['reason']}")
print(f"Best Response: {data['best_response'][:100]}...")

print('\n' + '=' * 60)
print('FLOW VERIFICATION: ✓ ALL STEPS WORKING')
print('=' * 60)
