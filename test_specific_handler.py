#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "specific-test"
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

print("🔍 TESTING SPECIFIC HANDLER 🔍")
print("=" * 50)

# Test the EXACT handler that should work
print("\n1. Testing 'how much revenue did we generate' (should work)")
response = query_api("how much revenue did we generate")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test a variation
print("\n2. Testing 'how much revenue we generate' (variation)")
response = query_api("how much revenue we generate")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test another variation
print("\n3. Testing 'how much revenue generate' (minimal)")
response = query_api("how much revenue generate")
print(f"Response: {response[:200]}...")

print("\n" + "="*50)

# Test if the issue is with the word "generate"
print("\n4. Testing 'how much revenue' (without generate)")
response = query_api("how much revenue")
print(f"Response: {response[:200]}...") 