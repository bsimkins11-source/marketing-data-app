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

def debug_remaining_failures():
    """Debug the remaining 8.2% failing patterns"""
    print("🔍 DEBUGGING REMAINING 8.2% FAILURES")
    print("=" * 80)
    
    # Test patterns that might still be failing
    test_queries = [
        # Specific Metrics variations that might still fail
        "What spend did we achieve?",
        "What are the spend?",
        "What spend did we get?",
        "What is our revenue?",
        "How much revenue did we get?",
        "What are our revenue?",
        "What revenue did we achieve?",
        "What is the revenue?",
        "How much revenue?",
        "What are the revenue?",
        "What revenue did we get?",
        
        # Platform Conversions variations
        "What conversions did Sa360 generate?",
        "How many conversions did Tradedesk achieve?",
        "What conversions did Sa360 achieve?",
        "How many conversions did Tradedesk generate?",
        
        # Comparative variations
        "Which platform had the most impressions?",
        "Which platform had the most clicks?",
        "Which platform had the most conversions?",
        "Which campaign had the most impressions?",
        "Which campaign had the most clicks?",
        "Which campaign had the most conversions?",
        
        # Edge cases
        "What is our cpm?",
        "What is our cpc?",
        "How much cpm did we get?",
        "How much cpc did we get?",
        "What are our cpm?",
        "What are our cpc?",
        
        # Platform-specific metrics
        "What is Meta's cpm?",
        "What is Dv360's cpc?",
        "How much cpm did Meta get?",
        "How much cpc did Dv360 get?",
        
        # Campaign-specific edge cases
        "What is FreshNest Summer Grilling's cpm?",
        "What is FreshNest Back to School's cpc?",
        "How much cpm did FreshNest Holiday Recipes get?",
        "How much cpc did FreshNest Pantry Staples get?"
    ]
    
    print("Testing remaining failing patterns...")
    print("-" * 80)
    
    failures = []
    successes = []
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i:2d}. Testing: {query}")
        
        response = query_api(query)
        
        # Check if it's a generic response
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌ GENERIC"
            print(f"    {status}")
            failures.append(query)
        else:
            status = "✅ SUCCESS"
            print(f"    {status}")
            print(f"    Response: {response[:100]}...")
            successes.append(query)
        
        time.sleep(0.5)
    
    # Results
    print("\n" + "=" * 80)
    print("🎯 REMAINING FAILURES ANALYSIS")
    print("=" * 80)
    
    total_tests = len(test_queries)
    failure_count = len(failures)
    success_count = len(successes)
    
    print(f"Total Tests: {total_tests}")
    print(f"Failures: {failure_count}")
    print(f"Successes: {success_count}")
    print(f"Failure Rate: {(failure_count/total_tests)*100:.1f}%")
    
    if failures:
        print(f"\n❌ FAILING PATTERNS:")
        print("-" * 30)
        for i, failure in enumerate(failures, 1):
            print(f"{i}. {failure}")
    
    if successes:
        print(f"\n✅ SUCCESSFUL PATTERNS:")
        print("-" * 30)
        for i, success in enumerate(successes, 1):
            print(f"{i}. {success}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    debug_remaining_failures() 