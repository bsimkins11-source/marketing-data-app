#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "simple-test"
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

# Test the simplest possible comparative query
print("Testing: platform performed best")
response = query_api("platform performed best")
print(f"Response: {response}")

print("\n" + "="*50 + "\n")

# Test if the issue is with the "which" keyword
print("Testing: which platform performed best")
response = query_api("which platform performed best")
print(f"Response: {response}")

print("\n" + "="*50 + "\n")

# Test a strategic insights query
print("Testing: learn campaign")
response = query_api("learn campaign")
print(f"Response: {response}") 