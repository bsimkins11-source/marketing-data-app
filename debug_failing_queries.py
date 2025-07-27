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

def test_failing_patterns():
    """Test specific patterns that might be failing"""
    
    # Test basic metrics that might be failing
    basic_metrics_tests = [
        "How much money did we spend?",
        "How much revenue did we generate?",
        "How many impressions did we get?",
        "How many clicks did we get?",
        "How many conversions did we get?",
        "What is our total spend?",
        "What is our total revenue?",
        "What is our total impressions?",
        "What is our total clicks?",
        "What is our total conversions?"
    ]
    
    # Test platform metrics that might be failing
    platform_metrics_tests = [
        "What is Meta's spend?",
        "What is Amazon's revenue?",
        "What is Dv360's impressions?",
        "What is Cm360's clicks?",
        "What is Sa360's conversions?",
        "How much did Meta spend?",
        "How much revenue did Amazon generate?",
        "How many impressions did Dv360 get?",
        "How many clicks did Cm360 get?",
        "How many conversions did Sa360 get?"
    ]
    
    # Test specific metrics that might be failing
    specific_metrics_tests = [
        "What is the CTR?",
        "What is the ROAS?",
        "What is the CPA?",
        "What is the CPC?",
        "What is the CPM?",
        "What is our CTR?",
        "What is our ROAS?",
        "What is our CPA?",
        "What is our CPC?",
        "What is our CPM?"
    ]
    
    print("🔍 TESTING FAILING PATTERNS")
    print("=" * 50)
    
    # Test basic metrics
    print("\n📊 BASIC METRICS TESTS:")
    print("-" * 30)
    for query in basic_metrics_tests:
        response = query_api(query)
        is_generic = "I understand you're asking about" in response or "Try asking about" in response
        status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
        print(f"{status} {query[:50]}...")
        time.sleep(0.5)
    
    # Test platform metrics
    print("\n🏢 PLATFORM METRICS TESTS:")
    print("-" * 30)
    for query in platform_metrics_tests:
        response = query_api(query)
        is_generic = "I understand you're asking about" in response or "Try asking about" in response
        status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
        print(f"{status} {query[:50]}...")
        time.sleep(0.5)
    
    # Test specific metrics
    print("\n📈 SPECIFIC METRICS TESTS:")
    print("-" * 30)
    for query in specific_metrics_tests:
        response = query_api(query)
        is_generic = "I understand you're asking about" in response or "Try asking about" in response
        status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
        print(f"{status} {query[:50]}...")
        time.sleep(0.5)

if __name__ == "__main__":
    test_failing_patterns() 