import urllib.request
import json
import time

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get('content', 'No content')
    except Exception as e:
        return f"Error: {e}"

def debug_regression():
    """Debug the regression in Executive Summary and Advanced Analytics"""
    print("🔍 DEBUGGING REGRESSION IN EXECUTIVE SUMMARY & ADVANCED ANALYTICS")
    print("=" * 80)
    
    # Test Executive Summary patterns
    executive_queries = [
        "Give me a campaign summary",
        "What's the executive summary?",
        "Summarize the campaign performance",
        "Give me an overview of the campaign",
        "What's the campaign overview?",
        "Summarize our marketing performance",
        "Give me a high-level summary",
        "What's the big picture?",
        "Summarize the results",
        "Give me a campaign overview"
    ]
    
    # Test Advanced Analytics patterns
    analytics_queries = [
        "What are the trends in our data?",
        "What patterns do you see?",
        "What insights can you provide?",
        "What are the key metrics?",
        "What should I focus on?",
        "What are the important trends?",
        "What patterns exist in the data?",
        "What insights can you share?",
        "What are the key findings?",
        "What should I pay attention to?"
    ]
    
    print("Testing Executive Summary patterns...")
    print("-" * 50)
    
    executive_failures = 0
    for i, query in enumerate(executive_queries, 1):
        print(f"\n{i:2d}. Testing: {query}")
        
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌ GENERIC"
            executive_failures += 1
        else:
            status = "✅ SUCCESS"
        
        print(f"    {status}")
        print(f"    Response: {response[:100]}...")
        time.sleep(0.5)
    
    print(f"\nExecutive Summary: {executive_failures}/{len(executive_queries)} failing")
    
    print("\nTesting Advanced Analytics patterns...")
    print("-" * 50)
    
    analytics_failures = 0
    for i, query in enumerate(analytics_queries, 1):
        print(f"\n{i:2d}. Testing: {query}")
        
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌ GENERIC"
            analytics_failures += 1
        else:
            status = "✅ SUCCESS"
        
        print(f"    {status}")
        print(f"    Response: {response[:100]}...")
        time.sleep(0.5)
    
    print(f"\nAdvanced Analytics: {analytics_failures}/{len(analytics_queries)} failing")
    
    print("\n" + "=" * 80)
    print("🎯 REGRESSION ANALYSIS COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    debug_regression() 