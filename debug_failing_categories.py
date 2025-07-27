import urllib.request
import json
import time

def query_api(query):
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return f"Error: {e}"

# Test queries that are likely failing in the mega test
test_categories = {
    "Anomaly Detection - Critical": [
        "Are there any anomalies?",
        "Show me any anomalies",
        "Find any anomalies",
        "Detect any anomalies",
        "Spot any anomalies",
        "Identify any anomalies",
        "Are there any problems?",
        "Show me any problems",
        "Find any problems",
        "Detect any problems",
        "Spot any problems",
        "Identify any problems",
        "Are there any issues?",
        "Show me any issues",
        "Find any issues",
        "Detect any issues",
        "Spot any issues",
        "Identify any issues",
        "Are there any red flags?",
        "Show me any red flags",
        "Find any red flags",
        "Detect any red flags",
        "Spot any red flags",
        "Identify any red flags",
        "Are there any warnings?",
        "Show me any warnings",
        "Find any warnings",
        "Detect any warnings",
        "Spot any warnings",
        "Identify any warnings",
        "Are there any concerns?",
        "Show me any concerns",
        "Find any concerns",
        "Detect any concerns",
        "Spot any concerns",
        "Identify any concerns",
        "Are there any risks?",
        "Show me any risks",
        "Find any risks",
        "Detect any risks",
        "Spot any risks",
        "Identify any risks",
        "Are there any troubles?",
        "Show me any troubles",
        "Find any troubles",
        "Detect any troubles",
        "Spot any troubles",
        "Identify any troubles",
        "Are there any alarms?",
        "Show me any alarms",
        "Find any alarms",
        "Detect any alarms",
        "Spot any alarms",
        "Identify any alarms",
        "Are there any alerts?",
        "Show me any alerts",
        "Find any alerts",
        "Detect any alerts",
        "Spot any alerts",
        "Identify any alerts"
    ],
    "Specific Metrics - Critical": [
        "What is the CTR?",
        "What is our CTR?",
        "What is the current CTR?",
        "What is our current CTR?",
        "What is the average CTR?",
        "What is our average CTR?",
        "What is the overall CTR?",
        "What is our overall CTR?",
        "What is the total CTR?",
        "What is our total CTR?",
        "What is the ROAS?",
        "What is our ROAS?",
        "What is the current ROAS?",
        "What is our current ROAS?",
        "What is the average ROAS?",
        "What is our average ROAS?",
        "What is the overall ROAS?",
        "What is our overall ROAS?",
        "What is the total ROAS?",
        "What is our total ROAS?",
        "What is the CPA?",
        "What is our CPA?",
        "What is the current CPA?",
        "What is our current CPA?",
        "What is the average CPA?",
        "What is our average CPA?",
        "What is the overall CPA?",
        "What is our overall CPA?",
        "What is the total CPA?",
        "What is our total CPA?",
        "What is the CPC?",
        "What is our CPC?",
        "What is the current CPC?",
        "What is our current CPC?",
        "What is the average CPC?",
        "What is our average CPC?",
        "What is the overall CPC?",
        "What is our overall CPC?",
        "What is the total CPC?",
        "What is our total CPC?",
        "What is the CPM?",
        "What is our CPM?",
        "What is the current CPM?",
        "What is our current CPM?",
        "What is the average CPM?",
        "What is our average CPM?",
        "What is the overall CPM?",
        "What is our overall CPM?",
        "What is the total CPM?",
        "What is our total CPM?"
    ]
}

print("🔍 DEBUGGING FAILING CATEGORIES")
print("=" * 60)

for category, queries in test_categories.items():
    print(f"\n📊 {category.upper()}")
    print("-" * 40)
    
    passed = 0
    total = len(queries)
    failed_queries = []
    
    for query in queries:
        result = query_api(query)
        content = result.get('content', 'No content')
        data_type = result.get('data', {}).get('type', 'No type')
        
        is_generic = "I understand you're asking about" in content
        status = "❌ GENERIC" if is_generic else "✅ SPECIFIC"
        
        if not is_generic:
            passed += 1
        else:
            failed_queries.append(query)
        
        print(f"{status} | {query[:50]}... | {data_type}")
        time.sleep(0.1)
    
    success_rate = (passed / total) * 100
    print(f"\n📈 {category} Success Rate: {passed}/{total} ({success_rate:.1f}%)")
    
    if failed_queries:
        print(f"\n❌ Failed Queries ({len(failed_queries)}):")
        for query in failed_queries[:10]:  # Show first 10
            print(f"   - {query}")
        if len(failed_queries) > 10:
            print(f"   ... and {len(failed_queries) - 10} more")
    
    print("-" * 40)

print(f"\n🎯 DEBUGGING COMPLETE!") 