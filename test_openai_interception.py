#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "openai-test"
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

print("🔍 TESTING OPENAI INTERCEPTION 🔍")
print("=" * 50)

# Test 1: Check if OpenAI is intercepting simple queries
print("\n1. Testing simple query that should bypass OpenAI: 'learn campaign'")
response = query_api("learn campaign")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 2: Check if OpenAI is intercepting platform queries
print("\n2. Testing platform query: 'platform performed best'")
response = query_api("platform performed best")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 3: Check if the issue is with the function not being called at all
print("\n3. Testing a query that should definitely work: 'what is our total spend'")
response = query_api("what is our total spend")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 4: Check if there's a different interception point
print("\n4. Testing a completely different pattern: 'show me revenue'")
response = query_api("show me revenue")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test 5: Check if the issue is with the function structure
print("\n5. Testing if the function is even being called: 'hello world'")
response = query_api("hello world")
print(f"Response: {response[:200]}...") 