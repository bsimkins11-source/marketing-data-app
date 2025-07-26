#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "debug-test"
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

# Test the failing query
print("Testing: which platform should I put more money into")
response = query_api("which platform should I put more money into")
print(f"Response: {response}")

print("\n" + "="*50 + "\n")

# Test similar queries that should work
test_queries = [
    "which platform performed best",
    "which platform is the most profitable", 
    "which platform makes the most money",
    "which platform had the highest ROAS",
    "which platform is the best",
    "what platform should I invest in"
]

for query in test_queries:
    print(f"Testing: {query}")
    response = query_api(query)
    print(f"Response: {response}")
    print("-" * 30) 