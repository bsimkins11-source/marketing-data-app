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

def test_ctr_cpa_calculations():
    """Test CTR and CPA calculations to ensure they handle zero values correctly"""
    print("🧪 TESTING CTR & CPA CALCULATIONS")
    print("=" * 80)
    
    # Test queries that should trigger CTR and CPA calculations
    test_queries = [
        "What is our overall CTR?",
        "What is our overall CPA?",
        "What are the trends in our data?",
        "Give me a campaign summary",
        "What are the key metrics?"
    ]
    
    print("Waiting 30 seconds for deployment to complete...")
    time.sleep(30)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i}. Testing: {query}")
        
        response = query_api(query)
        
        # Check for problematic values
        if "0.00%" in response and "CTR" in response:
            print(f"    ⚠️  Found 0.00% CTR - this might be correct if no impressions")
        elif "Infinity" in response or "NaN" in response:
            print(f"    ❌ ERROR: Found Infinity or NaN in response")
            print(f"    Response: {response[:200]}...")
        elif "N/A" in response and "CPA" in response:
            print(f"    ✅ Found N/A CPA - this is correct if no conversions")
        else:
            print(f"    ✅ Response looks good")
            print(f"    Response: {response[:200]}...")
        
        time.sleep(0.5)
    
    print("\n" + "=" * 80)
    print("CTR & CPA Test Complete!")

if __name__ == "__main__":
    test_ctr_cpa_calculations() 