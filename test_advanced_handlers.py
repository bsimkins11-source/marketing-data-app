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

def test_advanced_handlers():
    """Test the advanced analytics and executive summary handlers"""
    print("🧪 TESTING ADVANCED ANALYTICS & EXECUTIVE SUMMARY HANDLERS")
    print("=" * 80)
    
    # Test queries that were failing in the mega UAT
    test_queries = [
        # Advanced Analytics (were 0% success rate)
        "What are the trends in our data?",
        "What patterns do you see?",
        "What insights can you provide?",
        "What are the key metrics?",
        "What should I focus on?",
        "What are the important trends?",
        "What patterns exist in the data?",
        "What insights can you share?",
        "What are the key findings?",
        "What should I pay attention to?",
        
        # Executive Summary (were 60% success rate)
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
    
    print("Waiting 60 seconds for deployment to complete...")
    time.sleep(60)
    
    advanced_analytics_tests = 0
    advanced_analytics_passed = 0
    executive_summary_tests = 0
    executive_summary_passed = 0
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i:2d}. Testing: {query}")
        
        response = query_api(query)
        
        # Check if it's a generic response
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌ GENERIC"
            print(f"    {status}")
        else:
            status = "✅ SUCCESS"
            print(f"    {status}")
            print(f"    Response: {response[:100]}...")
        
        # Categorize and count
        if i <= 10:  # First 10 are advanced analytics
            advanced_analytics_tests += 1
            if "✅" in status:
                advanced_analytics_passed += 1
        else:  # Last 10 are executive summary
            executive_summary_tests += 1
            if "✅" in status:
                executive_summary_passed += 1
        
        time.sleep(0.5)  # Rate limiting
    
    # Results
    print("\n" + "=" * 80)
    print("🎯 TEST RESULTS")
    print("=" * 80)
    
    advanced_success_rate = (advanced_analytics_passed / advanced_analytics_tests) * 100 if advanced_analytics_tests > 0 else 0
    executive_success_rate = (executive_summary_passed / executive_summary_tests) * 100 if executive_summary_tests > 0 else 0
    
    print(f"Advanced Analytics: {advanced_analytics_passed}/{advanced_analytics_tests} ({advanced_success_rate:.1f}%)")
    print(f"Executive Summary: {executive_summary_passed}/{executive_summary_tests} ({executive_success_rate:.1f}%)")
    
    overall_passed = advanced_analytics_passed + executive_summary_passed
    overall_tests = advanced_analytics_tests + executive_summary_tests
    overall_success_rate = (overall_passed / overall_tests) * 100 if overall_tests > 0 else 0
    
    print(f"\nOverall: {overall_passed}/{overall_tests} ({overall_success_rate:.1f}%)")
    
    if overall_success_rate >= 90:
        print("\n🎉 EXCELLENT! Handlers are working correctly!")
    elif overall_success_rate >= 70:
        print("\n👍 GOOD! Significant improvement achieved!")
    else:
        print("\n⚠️ NEEDS WORK! Some handlers still need fixing.")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_advanced_handlers() 