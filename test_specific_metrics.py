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
            return result
    except Exception as e:
        return f"Error: {e}"

# Test specific metrics that were failing
test_queries = [
    "What is the CTR?",
    "What is the ROAS?",
    "What is the CPA?",
    "What is the CPC?",
    "What is the CPM?",
    "What is our CTR?",
    "What is our ROAS?",
    "What is our CPA?",
    "What is our CPC?",
    "What is our CPM?",
    "What is the click-through rate?",
    "What is the return on ad spend?",
    "What is the cost per acquisition?",
    "What is the cost per click?",
    "What is the cost per thousand?"
]

print("🔍 TESTING SPECIFIC METRICS IMPROVEMENTS")
print("=" * 50)

for query in test_queries:
    print(f"\nTesting: '{query}'")
    result = query_api(query)
    content = result.get('content', 'No content')
    data_type = result.get('data', {}).get('type', 'No type')
    
    is_generic = "I understand you're asking about" in content
    status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
    
    print(f"{status} | Type: {data_type}")
    print(f"Response: {content}")
    time.sleep(0.5) 