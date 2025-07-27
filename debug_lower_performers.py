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

# Test queries for lower-performing categories
test_categories = {
    "Strategic Insights": [
        "What should we do to improve performance?",
        "How can we optimize our campaigns?",
        "What recommendations do you have?",
        "What actions should we take?",
        "How should we proceed?",
        "What's the best strategy?",
        "What's our next move?",
        "How can we improve?",
        "What should we focus on?",
        "What's the best approach?",
        "How can we increase revenue?",
        "How can we reduce costs?",
        "What's the optimal strategy?",
        "How should we allocate budget?",
        "What's the most effective approach?",
        "How can we maximize ROI?",
        "What's the best course of action?",
        "How should we optimize?",
        "What improvements should we make?",
        "What's the recommended strategy?",
        "How can we enhance performance?",
        "What's the most efficient approach?",
        "How should we improve results?",
        "What's the best way forward?",
        "How can we achieve better results?",
        "What's the optimal approach?",
        "How should we proceed?",
        "What's the recommended action?",
        "How can we improve efficiency?",
        "What's the best strategy going forward?"
    ],
    "Anomaly Detection": [
        "What's wrong with our campaigns?",
        "What's the problem?",
        "What's the issue?",
        "What's concerning?",
        "What's troubling?",
        "What's worrying?",
        "What's alarming?",
        "What's critical?",
        "What's urgent?",
        "What's dangerous?",
        "What's risky?",
        "What's problematic?",
        "What's troublesome?",
        "What's difficult?",
        "What's challenging?",
        "What's hard?",
        "What's tough?",
        "What's rough?",
        "What's complicated?",
        "What's complex?",
        "What's confusing?",
        "What's unclear?",
        "What's vague?",
        "What's ambiguous?",
        "What's uncertain?",
        "What's doubtful?",
        "What's questionable?",
        "What's suspicious?",
        "What's peculiar?",
        "What's odd?",
        "What's strange?",
        "What's weird?",
        "What's bizarre?",
        "What's unusual?",
        "What's unexpected?",
        "What's surprising?",
        "What's shocking?",
        "What's disturbing?",
        "What's troubling?",
        "What's worrisome?",
        "What's concerning?",
        "What's alarming?",
        "What's critical?",
        "What's urgent?",
        "What's emergency?",
        "What's dangerous?",
        "What's risky?",
        "What's hazardous?",
        "What's threatening?",
        "What's worrying?",
        "What's stressful?",
        "What's frustrating?",
        "What's annoying?",
        "What's irritating?",
        "What's bothersome?",
        "What's troublesome?",
        "What's problematic?",
        "What's difficult?",
        "What's challenging?",
        "What's hard?",
        "What's tough?",
        "What's rough?",
        "What's complicated?",
        "What's complex?",
        "What's confusing?",
        "What's unclear?",
        "What's vague?",
        "What's ambiguous?",
        "What's uncertain?",
        "What's doubtful?",
        "What's questionable?",
        "What's suspicious?",
        "What's peculiar?",
        "What's odd?",
        "What's strange?",
        "What's weird?",
        "What's bizarre?",
        "What's unusual?",
        "What's unexpected?",
        "What's surprising?",
        "What's shocking?",
        "What's disturbing?",
        "What's troubling?",
        "What's worrisome?",
        "What's concerning?",
        "What's alarming?",
        "What's critical?",
        "What's urgent?",
        "What's emergency?",
        "What's dangerous?",
        "What's risky?",
        "What's hazardous?",
        "What's threatening?"
    ],
    "Specific Metrics": [
        "What's the CTR?",
        "What's the ROAS?",
        "What's the CPA?",
        "What's the CPC?",
        "What's the CPM?",
        "What's our CTR?",
        "What's our ROAS?",
        "What's our CPA?",
        "What's our CPC?",
        "What's our CPM?",
        "What's the click-through rate?",
        "What's the return on ad spend?",
        "What's the cost per acquisition?",
        "What's the cost per click?",
        "What's the cost per thousand?",
        "What's our click-through rate?",
        "What's our return on ad spend?",
        "What's our cost per acquisition?",
        "What's our cost per click?",
        "What's our cost per thousand?",
        "What's the current CTR?",
        "What's the current ROAS?",
        "What's the current CPA?",
        "What's the current CPC?",
        "What's the current CPM?",
        "What's our current CTR?",
        "What's our current ROAS?",
        "What's our current CPA?",
        "What's our current CPC?",
        "What's our current CPM?",
        "What's the average CTR?",
        "What's the average ROAS?",
        "What's the average CPA?",
        "What's the average CPC?",
        "What's the average CPM?",
        "What's our average CTR?",
        "What's our average ROAS?",
        "What's our average CPA?",
        "What's our average CPC?",
        "What's our average CPM?",
        "What's the overall CTR?",
        "What's the overall ROAS?",
        "What's the overall CPA?",
        "What's the overall CPC?",
        "What's the overall CPM?",
        "What's our overall CTR?",
        "What's our overall ROAS?",
        "What's our overall CPA?",
        "What's our overall CPC?",
        "What's our overall CPM?",
        "What's the total CTR?",
        "What's the total ROAS?",
        "What's the total CPA?",
        "What's the total CPC?",
        "What's the total CPM?",
        "What's our total CTR?",
        "What's our total ROAS?",
        "What's our total CPA?",
        "What's our total CPC?",
        "What's our total CPM?"
    ]
}

print("🔍 DEBUGGING LOWER PERFORMING CATEGORIES")
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
        for query in failed_queries[:5]:  # Show first 5
            print(f"   - {query}")
        if len(failed_queries) > 5:
            print(f"   ... and {len(failed_queries) - 5} more")
    
    print("-" * 40)

print(f"\n🎯 DEBUGGING COMPLETE!") 