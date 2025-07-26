#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "priority-test"
    }
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('content', 'No content')
    except Exception as e:
        return f"Error: {e}"

print("🔍 DEBUGGING HANDLER PRIORITY 🔍")
print("=" * 50)

# Test 1: Check if ANY new handlers work
print("\n1. Testing 'how much revenue did we generate' (should work - old handler)")
response = query_api("how much revenue did we generate")
if "I understand you're asking about" in response:
    print("❌ FAIL - Old handler not working")
else:
    print("✅ PASS - Old handler working")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 2: Check if the issue is with the pattern matching
print("\n2. Testing EXACT pattern: 'platform performed best'")
response = query_api("platform performed best")
if "I understand you're asking about" in response:
    print("❌ FAIL - New handler not working")
    print("This means the handler is not being triggered at all!")
else:
    print("✅ PASS - New handler working!")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 3: Test a different pattern
print("\n3. Testing: 'platform was the best'")
response = query_api("platform was the best")
if "I understand you're asking about" in response:
    print("❌ FAIL - Alternative pattern not working")
else:
    print("✅ PASS - Alternative pattern working!")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 4: Test strategic insights
print("\n4. Testing: 'learn campaign'")
response = query_api("learn campaign")
if "I understand you're asking about" in response:
    print("❌ FAIL - Strategic insights not working")
else:
    print("✅ PASS - Strategic insights working!")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 5: Test if the issue is with the "which" keyword
print("\n5. Testing: 'which platform should I put more money into'")
response = query_api("which platform should I put more money into")
if "I understand you're asking about" in response:
    print("❌ FAIL - Investment recommendation not working")
else:
    print("✅ PASS - Investment recommendation working!")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 6: Check if there's a caching issue by testing a unique query
print("\n6. Testing unique query to check for caching: 'platform performed best at 9pm'")
response = query_api("platform performed best at 9pm")
if "I understand you're asking about" in response:
    print("❌ FAIL - Even unique query not working")
else:
    print("✅ PASS - Unique query working!")
    print(f"Response: {response[:100]}...") 