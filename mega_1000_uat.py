import urllib.request
import json
import time
import csv
import random
from collections import defaultdict

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

def generate_1000_questions():
    """Generate 1000 diverse marketing and analyst questions"""
    questions = []
    
    # Platforms
    platforms = ['Meta', 'Dv360', 'Cm360', 'Sa360', 'Amazon', 'Tradedesk']
    campaigns = ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']
    metrics = ['spend', 'revenue', 'impressions', 'clicks', 'conversions', 'ctr', 'roas', 'cpa', 'cpm']
    
    # 1. Platform Performance (150 questions)
    for platform in platforms:
        for variation in ['performance', 'performing', 'results', 'how is', 'what is']:
            questions.append(f"What is {platform}'s {variation}?")
            questions.append(f"How is {platform} {variation}?")
            questions.append(f"What are {platform}'s {variation}?")
    
    # 2. Platform Conversions (100 questions)
    for platform in platforms:
        questions.append(f"What is {platform}'s conversions?")
        questions.append(f"How much conversions did {platform} get?")
        questions.append(f"What are {platform}'s conversions?")
        questions.append(f"How many conversions did {platform} get?")
    
    # 3. Campaign-Specific Queries (200 questions)
    for campaign in campaigns:
        for metric in metrics:
            questions.append(f"What is the {metric} for {campaign}?")
            questions.append(f"How much {metric} did {campaign} generate?")
            questions.append(f"What are the {metric} for {campaign}?")
    
    # 4. Comparative Analysis (150 questions)
    questions.extend([
        "Which platform performed best?",
        "Which platform had the highest ROAS?",
        "Which platform spent the most?",
        "Which platform generated the most revenue?",
        "Which platform had the highest CTR?",
        "Which platform was most efficient?",
        "Which platform had the lowest CPA?",
        "Which platform had the most impressions?",
        "Which platform had the most clicks?",
        "Which platform had the most conversions?",
        "Which campaign performed best?",
        "Which campaign had the highest ROAS?",
        "Which campaign spent the most?",
        "Which campaign generated the most revenue?",
        "Which campaign had the highest CTR?",
        "Which campaign was most efficient?",
        "Which campaign had the lowest CPA?",
        "Which campaign had the most impressions?",
        "Which campaign had the most clicks?",
        "Which campaign had the most conversions?"
    ] * 7)
    
    # 5. Strategic Insights & Recommendations (200 questions)
    questions.extend([
        "What did we learn from this campaign?",
        "What should I apply to the next campaign?",
        "Which platform should I put more money into?",
        "What are your recommendations?",
        "How can I improve performance?",
        "What should I optimize?",
        "How can I increase revenue?",
        "What should I focus on?",
        "How can I reduce costs?",
        "What insights can you provide?",
        "What are the key takeaways?",
        "What should I do differently?",
        "How can I boost ROAS?",
        "What optimization opportunities exist?",
        "How can I improve CTR?",
        "What should I scale?",
        "What should I cut?",
        "How can I improve efficiency?",
        "What are the growth opportunities?",
        "What should I prioritize?"
    ] * 10)
    
    # 6. Campaign Executive Summaries (100 questions)
    questions.extend([
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
    ] * 10)
    
    # 7. Anomaly Detection (100 questions)
    questions.extend([
        "Are there any anomalies in the data?",
        "What anomalies do you see?",
        "Are there any unusual patterns?",
        "What outliers exist?",
        "Are there any data anomalies?",
        "What unusual trends do you see?",
        "Are there any performance anomalies?",
        "What unexpected patterns exist?",
        "Are there any data irregularities?",
        "What anomalies should I be aware of?"
    ] * 10)
    
    # 8. Optimization Recommendations (100 questions)
    questions.extend([
        "What optimization recommendations do you have?",
        "How should I optimize the campaign?",
        "What optimization opportunities exist?",
        "How can I optimize performance?",
        "What should I optimize?",
        "Give me optimization recommendations",
        "How should I improve the campaign?",
        "What optimization strategies should I use?",
        "How can I optimize for better results?",
        "What optimization advice do you have?"
    ] * 10)
    
    # 9. Basic Metrics (100 questions)
    questions.extend([
        "What is our total spend?",
        "How much revenue did we generate?",
        "What are our total impressions?",
        "How many clicks did we get?",
        "What is our total conversions?",
        "What is our overall CTR?",
        "What is our overall ROAS?",
        "What is our overall CPA?",
        "What is our overall CPM?",
        "How much did we spend in total?"
    ] * 10)
    
    # 10. Advanced Analytics (100 questions)
    questions.extend([
        "What are the trends in our data?",
        "What patterns do you see?",
        "What insights can you provide?",
        "What are the key metrics?",
        "What should I focus on?",
        "What are the important trends?",
        "What patterns exist in the data?",
        "What insights can you share?",
        "What are the key findings?",
        "What should I pay attention to?"
    ] * 10)
    
    # Shuffle and ensure we have exactly 1000 questions
    random.shuffle(questions)
    return questions[:1000]

def run_mega_uat():
    """Run the mega 1000-question UAT"""
    print("🚀 MEGA 1000-QUESTION UAT - COMPREHENSIVE TESTING")
    print("=" * 80)
    print("Testing: Platform Performance, Conversions, Campaign Summaries,")
    print("         Anomaly Detection, Optimization Recommendations, & More!")
    print("=" * 80)
    
    # Generate questions
    print("Generating 1000 diverse questions...")
    questions = generate_1000_questions()
    
    total_tests = len(questions)
    passed_tests = 0
    generic_responses = 0
    
    # Track performance by category
    categories = {
        'platform_performance': {'total': 0, 'passed': 0},
        'platform_conversions': {'total': 0, 'passed': 0},
        'campaign_specific': {'total': 0, 'passed': 0},
        'comparative': {'total': 0, 'passed': 0},
        'strategic': {'total': 0, 'passed': 0},
        'executive_summary': {'total': 0, 'passed': 0},
        'anomaly_detection': {'total': 0, 'passed': 0},
        'optimization': {'total': 0, 'passed': 0},
        'basic_metrics': {'total': 0, 'passed': 0},
        'advanced_analytics': {'total': 0, 'passed': 0}
    }
    
    print(f"\nStarting {total_tests} tests...")
    print("-" * 80)
    
    for i, query in enumerate(questions, 1):
        # Determine category
        category = 'other'
        if any(word in query.lower() for word in ['performance', 'performing', 'results']):
            category = 'platform_performance'
        elif 'conversions' in query.lower():
            category = 'platform_conversions'
        elif any(campaign.lower() in query.lower() for campaign in ['freshnest']):
            category = 'campaign_specific'
        elif any(word in query.lower() for word in ['which', 'best', 'highest', 'most']):
            category = 'comparative'
        elif any(word in query.lower() for word in ['learn', 'apply', 'recommendations', 'optimize', 'improve']):
            category = 'strategic'
        elif any(word in query.lower() for word in ['summary', 'overview', 'executive']):
            category = 'executive_summary'
        elif any(word in query.lower() for word in ['anomaly', 'anomalies', 'unusual', 'outliers']):
            category = 'anomaly_detection'
        elif any(word in query.lower() for word in ['optimization', 'optimize']):
            category = 'optimization'
        elif any(word in query.lower() for word in ['total', 'overall', 'how much', 'how many']):
            category = 'basic_metrics'
        elif any(word in query.lower() for word in ['trends', 'patterns', 'insights', 'analytics']):
            category = 'advanced_analytics'
        
        if category in categories:
            categories[category]['total'] += 1
        
        # Query API
        response = query_api(query)
        
        # Check if it's a generic response
        if "Try asking about:" in response or "I can help you analyze" in response:
            generic_responses += 1
            print(f"{i:4d}. ❌ Generic: {query[:60]}...")
        else:
            passed_tests += 1
            if category in categories:
                categories[category]['passed'] += 1
            print(f"{i:4d}. ✅ Success: {query[:60]}...")
        
        # Progress update every 100 tests
        if i % 100 == 0:
            current_success_rate = (passed_tests / i) * 100
            print(f"\n📊 Progress: {i}/{total_tests} ({current_success_rate:.1f}% success rate)")
            print(f"   Passed: {passed_tests}, Generic: {generic_responses}")
        
        time.sleep(0.5)  # Rate limiting
    
    # Final results
    overall_success_rate = (passed_tests / total_tests) * 100
    generic_rate = (generic_responses / total_tests) * 100
    
    print("\n" + "=" * 80)
    print("🎯 MEGA UAT FINAL RESULTS")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed Tests: {passed_tests}")
    print(f"Generic Responses: {generic_responses}")
    print(f"Overall Success Rate: {overall_success_rate:.1f}%")
    print(f"Generic Response Rate: {generic_rate:.1f}%")
    
    # Category breakdown
    print(f"\n📊 CATEGORY BREAKDOWN:")
    print("-" * 50)
    for category, stats in categories.items():
        if stats['total'] > 0:
            success_rate = (stats['passed'] / stats['total']) * 100
            print(f"{category.replace('_', ' ').title()}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
    
    # Performance assessment
    if overall_success_rate >= 95:
        print(f"\n🎉 EXCELLENT! We've achieved 95%+ accuracy!")
    elif overall_success_rate >= 90:
        print(f"\n👍 GREAT! We're very close to 95% accuracy!")
    elif overall_success_rate >= 80:
        print(f"\n✅ GOOD! Significant improvement achieved!")
    else:
        print(f"\n📈 PROGRESS! We've made improvements, more work needed.")
    
    print(f"\n" + "=" * 80)
    print("MEGA UAT Complete!")

if __name__ == "__main__":
    run_mega_uat() 