#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "structure-test"
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

print("🔍 TESTING FUNCTION STRUCTURE 🔍")
print("=" * 50)

# Test 1: Check if the function is working at all
print("\n1. Testing basic functionality: 'what is our total spend'")
response = query_api("what is our total spend")
print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 2: Check if our simple test handler works
print("\n2. Testing simple test handler: 'learn campaign'")
response = query_api("learn campaign")
if "Test: Strategic insights handler is working!" in response:
    print("✅ PASS - Simple handler is working!")
else:
    print("❌ FAIL - Simple handler not working")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 3: Check if the comparative handler works
print("\n3. Testing comparative handler: 'platform performed best'")
response = query_api("platform performed best")
if "Platform with the best performance" in response:
    print("✅ PASS - Comparative handler is working!")
else:
    print("❌ FAIL - Comparative handler not working")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 4: Check if the issue is with the "which" keyword
print("\n4. Testing: 'which platform had the highest ROAS' (should work)")
response = query_api("which platform had the highest ROAS")
if "Platform with the highest ROAS" in response:
    print("✅ PASS - Old handler still working")
else:
    print("❌ FAIL - Old handler broken")
    print(f"Response: {response[:100]}...")

print("\n" + "="*50)

# Test 5: Check if there's a server error
print("\n5. Testing with a completely different query")
response = query_api("show me all campaigns")
print(f"Response: {response[:100]}...") 