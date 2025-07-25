#!/usr/bin/env python3

import urllib.request
import json
import sys

def test_query(query):
    """Test a single query and return the response"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query
    }
    
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    
    try:
        response = urllib.request.urlopen(req, json.dumps(data).encode('utf-8'))
        result = json.loads(response.read().decode('utf-8'))
        return result
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=== DEBUGGING QUERY FLOW ===")
    
    # Test queries in order of complexity
    test_queries = [
        "test",
        "total spend", 
        "spend",
        "ctr",
        "campaign",
        "freshnest",
        "summer grilling",
        "freshnest summer grilling",
        "freshnest summer grilling ctr",
        "What is the CTR for FreshNest Summer Grilling?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: '{query}'")
        result = test_query(query)
        
        if "error" in result:
            print(f"   ERROR: {result['error']}")
        else:
            content = result.get('content', 'No content')
            data_type = result.get('data', {}).get('type', 'No type')
            print(f"   Type: {data_type}")
            print(f"   Content: {content[:100]}...")
            
            # Check if it's a help message
            if "I understand you're asking about" in content:
                print(f"   STATUS: ❌ HELP MESSAGE")
            else:
                print(f"   STATUS: ✅ WORKING")

if __name__ == "__main__":
    main() 