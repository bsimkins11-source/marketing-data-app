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

# Test anomaly detection queries that were failing
test_queries = [
    "Are there any anomalies?",
    "Show me unusual performance",
    "What problems do you see?",
    "What's wrong with our campaigns?",
    "What's bad about our performance?",
    "What's poor about our results?",
    "What's terrible about our campaigns?",
    "What's awful about our performance?",
    "What's horrible about our results?",
    "What's the worst performing campaign?",
    "What's the lowest performing platform?",
    "What's underperforming?",
    "What's failing?",
    "What's struggling?",
    "What trouble do you see?",
    "What concerns do you have?",
    "What worries you?",
    "What alarms you?",
    "What alerts should I be aware of?"
]

print("🔍 TESTING ANOMALY DETECTION IMPROVEMENTS")
print("=" * 50)

for query in test_queries:
    print(f"\nTesting: '{query}'")
    result = query_api(query)
    content = result.get('content', 'No content')
    data_type = result.get('data', {}).get('type', 'No type')
    
    is_generic = "I understand you're asking about" in content
    status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
    
    print(f"{status} | Type: {data_type}")
    print(f"Response: {content[:150]}...")
    time.sleep(0.5) 