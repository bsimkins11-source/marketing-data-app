import urllib.request
import json
import time

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query, "sessionId": "comprehensive_test"}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get('data', {}).get('type', 'unknown')
    except Exception as e:
        return f"Error: {e}"

def run_comprehensive_test():
    """Run a comprehensive test covering all major query categories"""
    test_queries = [
        # Platform Performance (was 76.5%)
        "What is metas performance?",
        "How is Amazon performing?",
        "What are Metas results?",
        
        # Platform Conversions (was 22.5%)
        "What is Amazons conversions?",
        "How many conversions did Dv360 get?",
        "What conversions did Cm360 generate?",
        
        # Campaign Specific (was 100%)
        "What is the spend for FreshNest Summer Grilling?",
        "What is the revenue for FreshNest Back to School?",
        "What is the CTR for FreshNest Holiday Recipes?",
        
        # Comparative (was 19.0%)
        "Which platform performed best?",
        "Which platform had the highest ROAS?",
        "Which platform is most efficient?",
        
        # Strategic (was 62.4%)
        "What are your recommendations?",
        "What insights can you provide?",
        "How can I improve performance?",
        
        # Executive Summary (was 0%)
        "Give me an executive summary",
        "Show me the overview",
        "What is the status?",
        
        # Anomaly Detection (was 0%)
        "Are there any anomalies?",
        "Show me unusual performance",
        "What problems do you see?",
        
        # Optimization (was 0%)
        "How can I optimize?",
        "What should I improve?",
        "Give me optimization tips",
        
        # Advanced Analytics (was 0%)
        "Show me advanced analytics",
        "Give me a deep dive analysis",
        "What patterns do you see?",
        
        # Basic Metrics (was 19.6%)
        "What is the total spend?",
        "What is the total revenue?",
        "How many impressions?",
        
        # Specific Metrics (was 13.9%)
        "What is the CTR?",
        "What is our ROAS?",
        "What is the CPA?",
        
        # Platform Metrics (was 35.3%)
        "What is Metas CTR?",
        "What is Amazons ROAS?",
        "What is Dv360s CPA?"
    ]
    
    print("🚀 COMPREHENSIVE UAT TEST - TARGETING 90%+ ACCURACY")
    print("=" * 70)
    
    results = {}
    categories = {
        'Platform Performance': [],
        'Platform Conversions': [],
        'Campaign Specific': [],
        'Comparative': [],
        'Strategic': [],
        'Executive Summary': [],
        'Anomaly Detection': [],
        'Optimization': [],
        'Advanced Analytics': [],
        'Basic Metrics': [],
        'Specific Metrics': [],
        'Platform Metrics': []
    }
    
    # Map queries to categories
    category_mapping = {
        0: 'Platform Performance', 1: 'Platform Performance', 2: 'Platform Performance',
        3: 'Platform Conversions', 4: 'Platform Conversions', 5: 'Platform Conversions',
        6: 'Campaign Specific', 7: 'Campaign Specific', 8: 'Campaign Specific',
        9: 'Comparative', 10: 'Comparative', 11: 'Comparative',
        12: 'Strategic', 13: 'Strategic', 14: 'Strategic',
        15: 'Executive Summary', 16: 'Executive Summary', 17: 'Executive Summary',
        18: 'Anomaly Detection', 19: 'Anomaly Detection', 20: 'Anomaly Detection',
        21: 'Optimization', 22: 'Optimization', 23: 'Optimization',
        24: 'Advanced Analytics', 25: 'Advanced Analytics', 26: 'Advanced Analytics',
        27: 'Basic Metrics', 28: 'Basic Metrics', 29: 'Basic Metrics',
        30: 'Specific Metrics', 31: 'Specific Metrics', 32: 'Specific Metrics',
        33: 'Platform Metrics', 34: 'Platform Metrics', 35: 'Platform Metrics'
    }
    
    for i, query in enumerate(test_queries):
        result_type = query_api(query)
        results[query] = result_type
        category = category_mapping.get(i, 'Unknown')
        categories[category].append(result_type)
        print(f"✅ {query[:45]}... → {result_type}")
        time.sleep(0.5)  # Rate limiting
    
    print("\n📊 RESULTS SUMMARY:")
    print("=" * 70)
    
    # Count successful vs fallback
    successful = sum(1 for result in results.values() if result != 'fallback' and not result.startswith('Error'))
    total = len(results)
    success_rate = (successful / total) * 100
    
    print(f"✅ Overall Success: {successful}/{total} ({success_rate:.1f}%)")
    print(f"❌ Fallback: {total - successful}/{total}")
    
    print("\n📈 CATEGORY BREAKDOWN:")
    print("=" * 70)
    
    for category, results_list in categories.items():
        if results_list:
            category_success = sum(1 for result in results_list if result != 'fallback' and not result.startswith('Error'))
            category_rate = (category_success / len(results_list)) * 100
            print(f"{category}: {category_success}/{len(results_list)} ({category_rate:.1f}%)")
    
    print(f"\n🎯 TARGET ANALYSIS:")
    print("=" * 70)
    print(f"Current: {success_rate:.1f}%")
    print("Target: 90%+")
    print(f"Gap: {90 - success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 OUTSTANDING! We've reached 90%+ accuracy!")
    elif success_rate >= 80:
        print("🎉 EXCELLENT! We're very close to 90%!")
    elif success_rate >= 70:
        print("👍 GREAT! Significant progress made!")
    else:
        print("⚠️  NEEDS MORE WORK - Still below target")

if __name__ == "__main__":
    run_comprehensive_test() 