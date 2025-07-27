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

def debug_failing_patterns():
    """Debug specific failing patterns in low-performing categories"""
    print("🔍 DEBUGGING FAILING PATTERNS")
    print("=" * 80)
    
    # Test specific failing patterns
    test_queries = [
        # Specific Metrics (48.6% success rate)
        "What is our spend?",
        "How much spend did we get?",
        "What are our spend?",
        "How many spend did we generate?",
        "What spend did we achieve?",
        "What is the spend?",
        "How much spend?",
        "What are the spend?",
        "How many spend?",
        "What spend did we get?",
        
        # Platform Performance (72.6% success rate)
        "What is Meta's doing?",
        "How is Dv360 doing?",
        "What are Amazon's doing?",
        "How did Cm360 doing?",
        "What is Sa360's performed?",
        "How is Tradedesk performed?",
        
        # Platform Conversions (67.5% success rate)
        "What conversions did Meta generate?",
        "How many conversions did Dv360 achieve?",
        "What conversions did Amazon achieve?",
        "How many conversions did Cm360 generate?",
        
        # Strategic Insights (78.0% success rate)
        "What did we learn?",
        "What should I apply to the next campaign?",
        "What recommendations do you have?",
        "How can I improve?",
        "What should I optimize?",
        "How can I increase revenue?",
        "What should I focus on?",
        "What insights can you provide?",
        "What are the key takeaways?",
        "How can I boost ROAS?",
        "What optimization opportunities exist?",
        "How can I improve CTR?",
        "What should I scale?",
        "What should I cut?",
        "How can I improve efficiency?",
        "What are the growth opportunities?",
        "What should I prioritize?"
    ]
    
    print("Testing specific failing patterns...")
    print("-" * 80)
    
    specific_metrics_fails = 0
    platform_performance_fails = 0
    platform_conversions_fails = 0
    strategic_fails = 0
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{i:2d}. Testing: {query}")
        
        response = query_api(query)
        
        # Check if it's a generic response
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌ GENERIC"
            print(f"    {status}")
            
            # Categorize the failure
            if i <= 10:  # Specific Metrics
                specific_metrics_fails += 1
            elif i <= 16:  # Platform Performance
                platform_performance_fails += 1
            elif i <= 20:  # Platform Conversions
                platform_conversions_fails += 1
            else:  # Strategic Insights
                strategic_fails += 1
        else:
            status = "✅ SUCCESS"
            print(f"    {status}")
            print(f"    Response: {response[:100]}...")
        
        time.sleep(0.5)
    
    # Results
    print("\n" + "=" * 80)
    print("🎯 FAILING PATTERNS ANALYSIS")
    print("=" * 80)
    
    specific_metrics_total = 10
    platform_performance_total = 6
    platform_conversions_total = 4
    strategic_total = 17
    
    print(f"Specific Metrics: {specific_metrics_fails}/{specific_metrics_total} failing")
    print(f"Platform Performance: {platform_performance_fails}/{platform_performance_total} failing")
    print(f"Platform Conversions: {platform_conversions_fails}/{platform_conversions_total} failing")
    print(f"Strategic Insights: {strategic_fails}/{strategic_total} failing")
    
    print(f"\n📊 FAILURE RATES:")
    print(f"Specific Metrics: {(specific_metrics_fails/specific_metrics_total)*100:.1f}% failing")
    print(f"Platform Performance: {(platform_performance_fails/platform_performance_total)*100:.1f}% failing")
    print(f"Platform Conversions: {(platform_conversions_fails/platform_conversions_total)*100:.1f}% failing")
    print(f"Strategic Insights: {(strategic_fails/strategic_total)*100:.1f}% failing")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    debug_failing_patterns() 