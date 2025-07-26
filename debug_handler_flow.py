#!/usr/bin/env python3

import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "debug-flow"
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

def debug_handler_flow():
    """Debug why handlers aren't being triggered"""
    print("🔍 DEBUGGING HANDLER FLOW 🔍")
    print("=" * 50)
    
    # Test 1: Check if basic handlers work
    print("\n1. TESTING BASIC HANDLERS (should work):")
    basic_tests = [
        "what is our total spend",
        "how much revenue did we generate",
        "which platform had the highest ROAS"
    ]
    
    for query in basic_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Basic handler not working")
        else:
            print("✅ PASS - Basic handler working")
            print(f"Response: {response[:80]}...")
    
    # Test 2: Check comparative handler patterns
    print("\n\n2. TESTING COMPARATIVE HANDLER PATTERNS:")
    comparative_patterns = [
        "platform performed best",  # Should match our handler
        "platform was the best",    # Should match our handler
        "platform had the best performance",  # Should match our handler
        "platform is the most profitable",    # Should match our handler
        "platform makes the most money"       # Should match our handler
    ]
    
    for query in comparative_patterns:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Comparative handler not triggered")
        else:
            print("✅ PASS - Comparative handler working!")
            print(f"Response: {response[:80]}...")
    
    # Test 3: Check strategic insights patterns
    print("\n\n3. TESTING STRATEGIC INSIGHTS PATTERNS:")
    insight_patterns = [
        "learn campaign",           # Should match our handler
        "learn this",               # Should match our handler
        "should i do",              # Should match our handler
        "recommendations",          # Should match our handler
        "what next",                # Should match our handler
        "apply to next"             # Should match our handler
    ]
    
    for query in insight_patterns:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Strategic insights handler not triggered")
        else:
            print("✅ PASS - Strategic insights handler working!")
            print(f"Response: {response[:80]}...")
    
    # Test 4: Check campaign-specific patterns
    print("\n\n4. TESTING CAMPAIGN-SPECIFIC PATTERNS:")
    campaign_patterns = [
        "revenue FreshNest Summer Grilling",  # Should match our handler
        "spend FreshNest Back to School",     # Should match our handler
        "impressions FreshNest Pantry Staples" # Should match our handler
    ]
    
    for query in campaign_patterns:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Campaign handler not triggered")
        else:
            print("✅ PASS - Campaign handler working!")
            print(f"Response: {response[:80]}...")
    
    # Test 5: Check if the issue is with "which" keyword
    print("\n\n5. TESTING 'WHICH' KEYWORD ISSUE:")
    which_tests = [
        "platform performed best",      # No "which"
        "which platform performed best", # With "which"
        "what platform performed best"   # With "what"
    ]
    
    for query in which_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Handler not triggered")
        else:
            print("✅ PASS - Handler working!")
            print(f"Response: {response[:80]}...")

if __name__ == "__main__":
    debug_handler_flow() 