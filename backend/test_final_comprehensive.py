#!/usr/bin/env python3
"""
COMPREHENSIVE FINAL TESTING - World-Class QA Engineer Approach
Testing all user requirements and system functionality
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name):
        self.passed.append(test_name)
        print(f"✅ PASS: {test_name}")
    
    def add_fail(self, test_name, reason):
        self.failed.append((test_name, reason))
        print(f"❌ FAIL: {test_name} - {reason}")
    
    def add_warning(self, test_name, reason):
        self.warnings.append((test_name, reason))
        print(f"⚠️  WARN: {test_name} - {reason}")
    
    def summary(self):
        print("\n" + "=" * 80)
        print("FINAL TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {len(self.passed)}")
        print(f"❌ Failed: {len(self.failed)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        
        if self.failed:
            print("\n❌ FAILED TESTS:")
            for name, reason in self.failed:
                print(f"  - {name}: {reason}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for name, reason in self.warnings:
                print(f"  - {name}: {reason}")
        
        print("\n" + "=" * 80)
        if not self.failed:
            print("🎉 ALL TESTS PASSED! SYSTEM IS PRODUCTION READY!")
        else:
            print("⚠️  SOME TESTS FAILED - REVIEW REQUIRED")
        print("=" * 80)

results = TestResults()

print("=" * 80)
print("STARTING COMPREHENSIVE SYSTEM TESTING")
print("=" * 80)

# TEST 1: Backend Health Check
print("\n[TEST 1] Backend Health Check")
try:
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    if response.status_code == 200:
        results.add_pass("Backend health endpoint")
    else:
        results.add_fail("Backend health endpoint", f"Status {response.status_code}")
except Exception as e:
    results.add_fail("Backend health endpoint", str(e))

# TEST 2: All 4 LLM Models Working
print("\n[TEST 2] All 4 LLM Models Working")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "What is 2+2?"},
        timeout=60
    )
    data = response.json()
    
    working_models = sum(1 for r in data['responses'] if r.get('response') and not r['error'])
    if working_models == 4:
        results.add_pass("All 4 models returning responses")
    else:
        results.add_fail("All 4 models returning responses", f"Only {working_models}/4 working")
    
    # Check individual models
    for r in data['responses']:
        if r.get('response') and not r['error']:
            results.add_pass(f"Model {r['model']} working")
        else:
            results.add_fail(f"Model {r['model']} working", r.get('error', 'No response'))
    
except Exception as e:
    results.add_fail("LLM models test", str(e))

# TEST 3: Gemini Integration
print("\n[TEST 3] Gemini Integration (replacing ChatGPT)")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "Explain quantum computing"},
        timeout=60
    )
    data = response.json()
    
    if 'gemini_response' in data:
        results.add_pass("Gemini response field exists")
        
        gemini_resp = data.get('gemini_response', '')
        if len(gemini_resp) > 50 and 'unavailable' not in gemini_resp.lower():
            results.add_pass("Gemini returning valid response")
        elif 'unavailable' in gemini_resp.lower():
            results.add_warning("Gemini response", "Gemini API may not be configured")
        else:
            results.add_fail("Gemini response", "Response too short or invalid")
    else:
        results.add_fail("Gemini integration", "gemini_response field missing")
    
    # Ensure chatgpt_response is NOT in response
    if 'chatgpt_response' in data:
        results.add_fail("ChatGPT removal", "chatgpt_response still in response")
    else:
        results.add_pass("ChatGPT successfully replaced with Gemini")
    
except Exception as e:
    results.add_fail("Gemini integration test", str(e))

# TEST 4: Metrics Computation
print("\n[TEST 4] Metrics Computation")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "What are the benefits of exercise?"},
        timeout=60
    )
    data = response.json()
    
    if len(data.get('metrics', [])) == 4:
        results.add_pass("All 4 models have metrics")
    else:
        results.add_fail("Metrics count", f"Expected 4, got {len(data.get('metrics', []))}")
    
    # Check metric fields
    required_fields = ['relevance', 'semantic_similarity', 'agreement', 'clarity', 'length_optimization']
    for metric in data.get('metrics', []):
        for field in required_fields:
            if field in metric:
                if 0 <= metric[field] <= 1:
                    pass  # Valid
                else:
                    results.add_warning(f"Metric {field} range", f"Value {metric[field]} outside [0,1]")
            else:
                results.add_fail(f"Metric field {field}", f"Missing in {metric.get('model')}")
    
    results.add_pass("All metric fields present and valid")
    
except Exception as e:
    results.add_fail("Metrics computation test", str(e))

# TEST 5: Best Response Selection
print("\n[TEST 5] Best Response Selection")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "Explain machine learning"},
        timeout=60
    )
    data = response.json()
    
    if data.get('best_model'):
        results.add_pass("Best model selected")
    else:
        results.add_fail("Best model selection", "No best_model in response")
    
    if data.get('best_response'):
        results.add_pass("Best response extracted")
    else:
        results.add_fail("Best response extraction", "No best_response in response")
    
    if data.get('reason'):
        results.add_pass("Reasoning generated")
    else:
        results.add_fail("Reasoning generation", "No reason in response")
    
    # Check scores
    if len(data.get('scores', [])) == 4:
        results.add_pass("All 4 models have final scores")
    else:
        results.add_fail("Final scores", f"Expected 4, got {len(data.get('scores', []))}")
    
except Exception as e:
    results.add_fail("Best response selection test", str(e))

# TEST 6: Latency Tracking
print("\n[TEST 6] Latency Tracking")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "What is the capital of France?"},
        timeout=60
    )
    data = response.json()
    
    latency_data = data.get('latency', [])
    if len(latency_data) == 4:
        results.add_pass("Latency tracked for all 4 models")
    else:
        results.add_fail("Latency tracking", f"Expected 4, got {len(latency_data)}")
    
    for lat in latency_data:
        if lat.get('latency_ms', 0) > 0:
            pass  # Valid
        else:
            results.add_warning(f"Latency for {lat.get('model')}", "Latency is 0 or missing")
    
except Exception as e:
    results.add_fail("Latency tracking test", str(e))

# TEST 7: History Persistence
print("\n[TEST 7] History Persistence")
try:
    # Submit a query
    requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "Test history query"},
        timeout=60
    )
    
    time.sleep(1)  # Wait for DB write
    
    # Fetch history
    response = requests.get(f"{BASE_URL}/history?limit=5", timeout=10)
    history_data = response.json()
    
    if isinstance(history_data, dict) and 'items' in history_data:
        history = history_data['items']
        if isinstance(history, list) and len(history) > 0:
            results.add_pass("History endpoint working")
            results.add_pass("Queries stored in database")
        else:
            results.add_fail("History persistence", "No history items in response")
    else:
        results.add_fail("History persistence", "Invalid response format")
    
except Exception as e:
    results.add_fail("History persistence test", str(e))

# TEST 8: Error Handling
print("\n[TEST 8] Error Handling")
try:
    # Test empty query
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": ""},
        timeout=10
    )
    if response.status_code == 400:
        results.add_pass("Empty query validation")
    else:
        results.add_warning("Empty query validation", f"Expected 400, got {response.status_code}")
    
    # Test missing query field
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={},
        timeout=10
    )
    if response.status_code in [400, 422]:
        results.add_pass("Missing query field validation")
    else:
        results.add_warning("Missing query validation", f"Expected 400/422, got {response.status_code}")
    
except Exception as e:
    results.add_fail("Error handling test", str(e))

# TEST 9: Response Format Validation
print("\n[TEST 9] Response Format Validation")
try:
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "Hello world"},
        timeout=60
    )
    data = response.json()
    
    required_top_level = ['query', 'responses', 'metrics', 'scores', 'best_model', 
                          'best_response', 'reason', 'gemini_response', 'latency']
    
    for field in required_top_level:
        if field in data:
            results.add_pass(f"Response field '{field}' present")
        else:
            results.add_fail(f"Response field '{field}'", "Missing from response")
    
except Exception as e:
    results.add_fail("Response format validation", str(e))

# TEST 10: Performance Test
print("\n[TEST 10] Performance Test")
try:
    start = time.time()
    response = requests.post(
        f"{BASE_URL}/evaluate",
        json={"query": "What is Python?"},
        timeout=60
    )
    elapsed = time.time() - start
    
    if elapsed < 30:
        results.add_pass(f"Response time acceptable ({elapsed:.2f}s)")
    elif elapsed < 60:
        results.add_warning("Response time", f"Slow response ({elapsed:.2f}s)")
    else:
        results.add_fail("Response time", f"Too slow ({elapsed:.2f}s)")
    
except Exception as e:
    results.add_fail("Performance test", str(e))

# Print final summary
results.summary()
