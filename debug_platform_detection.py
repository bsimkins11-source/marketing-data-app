import urllib.request
import json

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

# Test different variations
test_queries = [
    "How much did Meta spend?",
    "What is Meta's spend?",
    "Meta spend",
    "meta spend",
    "How much did meta spend?",
    "What is meta's spend?"
]

print("🔍 DEBUGGING PLATFORM DETECTION")
print("=" * 50)

for query in test_queries:
    print(f"\nTesting: '{query}'")
    result = query_api(query)
    content = result.get('content', 'No content')
    data_type = result.get('data', {}).get('type', 'No type')
    
    is_generic = "I understand you're asking about" in content
    status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
    
    print(f"{status} | Type: {data_type}")
    print(f"Response: {content[:100]}...") 