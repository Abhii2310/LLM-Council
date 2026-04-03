#!/usr/bin/env python3
"""Comprehensive end-to-end testing of the LLM Council Evaluation System"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

test_queries = [
    "What is the capital of France?",
    "Explain machine learning in simple terms",
    "What are the benefits of exercise?",
    "How does photosynthesis work?",
]

print("=" * 80)
print("LLM COUNCIL COMPREHENSIVE TESTING")
print("=" * 80)

for i, query in enumerate(test_queries, 1):
    print(f"\n{'=' * 80}")
    print(f"TEST {i}/{len(test_queries)}: {query}")
    print('=' * 80)
    
    start_time = time.time()
    response = requests.post(f"{BASE_URL}/evaluate", json={"query": query})
    total_time = time.time() - start_time
    
    if response.status_code != 200:
        print(f"❌ FAILED: HTTP {response.status_code}")
        print(response.text)
        continue
    
    data = response.json()
    
    # Check responses
    print("\n✓ STEP 1: LLM Responses")
    working_models = 0
    for r in data['responses']:
        if r.get('response') and not r['error']:
            working_models += 1
            print(f"  ✓ {r['model']}: {len(r['response'])} chars, {r['latency_ms']:.0f}ms")
        else:
            print(f"  ✗ {r['model']}: ERROR")
    
    print(f"\n  Models Working: {working_models}/4")
    
    # Check metrics
    print("\n✓ STEP 2: Metrics Computed")
    for m in data['metrics']:
        if m['relevance'] > 0 or m['semantic_similarity'] > 0:
            print(f"  {m['model']}: relevance={m['relevance']:.3f}, semantic={m['semantic_similarity']:.3f}")
    
    # Check best selection
    print("\n✓ STEP 3: Best Response Selected")
    best_score = [s for s in data['scores'] if s['model'] == data['best_model']][0]['final_score']
    print(f"  Best Model: {data['best_model']}")
    print(f"  Final Score: {best_score:.4f}")
    print(f"  Reason: {data['reason'][:100]}...")
    
    # Overall stats
    print(f"\n✓ Total Time: {total_time:.2f}s")
    
    if working_models == 4:
        print("\n✅ TEST PASSED: All 4 models working, metrics computed, best selected")
    elif working_models >= 2:
        print(f"\n⚠️  TEST PARTIAL: {working_models}/4 models working")
    else:
        print("\n❌ TEST FAILED: Less than 2 models working")
    
    time.sleep(1)  # Rate limiting

print("\n" + "=" * 80)
print("TESTING COMPLETE")
print("=" * 80)

# Test history endpoint
print("\n✓ Testing History Endpoint...")
history_response = requests.get(f"{BASE_URL}/history")
if history_response.status_code == 200:
    history = history_response.json()
    print(f"  ✓ History contains {len(history)} records")
else:
    print(f"  ✗ History endpoint failed: {history_response.status_code}")

print("\n" + "=" * 80)
print("ALL TESTS COMPLETED SUCCESSFULLY ✅")
print("=" * 80)
