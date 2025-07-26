#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "basic-test"
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

print("🔍 TESTING BASIC API FUNCTIONALITY 🔍")
print("=" * 50)

# Test 1: Test if the API is responding at all
print("\n1. Testing basic API response")
response = query_api("hello")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 2: Test a simple query that should work
print("\n2. Testing simple query: 'what is our total spend'")
response = query_api("what is our total spend")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 3: Test if the issue is with the session ID
print("\n3. Testing with different session ID")
response = query_api("what is our total spend")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 4: Test if there's a server error
print("\n4. Testing with empty query")
response = query_api("")
print(f"Response: {response[:200]}...") 