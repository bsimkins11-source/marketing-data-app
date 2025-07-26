#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "exact-match"
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

# Test the EXACT patterns from our handlers
print("🔍 TESTING EXACT HANDLER PATTERNS 🔍")
print("=" * 50)

# Test 1: Exact pattern from our handler
print("\n1. Testing EXACT pattern: 'platform performed best'")
response = query_api("platform performed best")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 2: Another exact pattern
print("\n2. Testing EXACT pattern: 'platform was the best'")
response = query_api("platform was the best")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 3: Strategic insights exact pattern
print("\n3. Testing EXACT pattern: 'learn campaign'")
response = query_api("learn campaign")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 4: Test if ANY handler works
print("\n4. Testing KNOWN WORKING handler: 'what is our total spend'")
response = query_api("what is our total spend")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 5: Test if the issue is with the "which" keyword
print("\n5. Testing: 'which platform had the highest ROAS' (should work)")
response = query_api("which platform had the highest ROAS")
print(f"Response: {response[:200]}...") 