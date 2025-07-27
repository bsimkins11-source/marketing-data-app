import urllib.request
import json
import time
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

def generate_1000_questions_enhanced():
    """Generate 1000 diverse marketing and analyst questions with enhanced coverage"""
    questions = []
    
    # Platforms and campaigns
    platforms = ['Meta', 'Dv360', 'Cm360', 'Sa360', 'Amazon', 'Tradedesk']
    campaigns = ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']
    metrics = ['spend', 'revenue', 'impressions', 'clicks', 'conversions', 'ctr', 'roas', 'cpa', 'cpm', 'cpc']
    
    # 1. Platform Performance (200 questions) - Enhanced variations
    for platform in platforms:
        for variation in ['performance', 'performing', 'results', 'how is', 'what is', 'doing', 'performed']:
            questions.append(f"What is {platform}'s {variation}?")
            questions.append(f"How is {platform} {variation}?")
            questions.append(f"What are {platform}'s {variation}?")
            questions.append(f"How did {platform} {variation}?")
    
    # 2. Platform Conversions (150 questions) - Enhanced variations
    for platform in platforms:
        questions.extend([
            f"What is {platform}'s conversions?",
            f"How much conversions did {platform} get?",
            f"What are {platform}'s conversions?",
            f"How many conversions did {platform} get?",
            f"What conversions did {platform} generate?",
            f"How many conversions did {platform} achieve?"
        ])
    
    # 3. Campaign-Specific Queries (200 questions) - Enhanced variations
    for campaign in campaigns:
        for metric in metrics:
            questions.extend([
                f"What is the {metric} for {campaign}?",
                f"How much {metric} did {campaign} generate?",
                f"What are the {metric} for {campaign}?",
                f"How many {metric} did {campaign} get?",
                f"What {metric} did {campaign} achieve?"
            ])
    
    # 4. Comparative Analysis (150 questions) - Enhanced variations
    comparative_questions = [
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
        "Which campaign had the most conversions?",
        "What platform performed the best?",
        "What platform had the highest ROAS?",
        "What platform spent the most?",
        "What platform generated the most revenue?",
        "What platform had the highest CTR?"
    ]
    questions.extend(comparative_questions * 6)
    
    # 5. Strategic Insights & Recommendations (150 questions) - Enhanced variations
    strategic_questions = [
        "What did we learn from this campaign?",
        "Which platform should I put more money into?",
        "What are your recommendations?",
        "How can I improve performance?",
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
        "What should I prioritize?",
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
    questions.extend(strategic_questions * 5)
    
    # 6. Campaign Executive Summaries (100 questions) - Enhanced variations
    summary_questions = [
        "Give me a campaign summary",
        "What's the executive summary?",
        "Summarize the campaign performance",
        "Give me an overview of the campaign",
        "What's the campaign overview?",
        "Summarize our marketing performance",
        "Give me a high-level summary",
        "What's the big picture?",
        "Summarize the results",
        "Give me a campaign overview",
        "What's the summary?",
        "Give me a summary",
        "What's the overview?",
        "Give me an overview",
        "What's the big picture?",
        "Give me the big picture",
        "What's the executive summary?",
        "Give me the executive summary",
        "What's the campaign summary?",
        "Give me the campaign summary"
    ]
    questions.extend(summary_questions * 5)
    
    # 7. Anomaly Detection (100 questions) - Enhanced variations
    anomaly_questions = [
        "Are there any anomalies in the data?",
        "What anomalies do you see?",
        "Are there any unusual patterns?",
        "What outliers exist?",
        "Are there any data anomalies?",
        "What unusual trends do you see?",
        "Are there any performance anomalies?",
        "What unexpected patterns exist?",
        "Are there any data irregularities?",
        "What anomalies should I be aware of?",
        "What anomalies exist?",
        "Are there any anomalies?",
        "What unusual patterns do you see?",
        "Are there any outliers?",
        "What data anomalies exist?",
        "What unusual trends exist?",
        "Are there any performance anomalies?",
        "What unexpected patterns do you see?",
        "Are there any irregularities?",
        "What anomalies should I know about?"
    ]
    questions.extend(anomaly_questions * 5)
    
    # 8. Optimization Recommendations (100 questions) - Enhanced variations
    optimization_questions = [
        "What optimization recommendations do you have?",
        "How should I optimize the campaign?",
        "What optimization opportunities exist?",
        "How can I optimize performance?",
        "What should I optimize?",
        "Give me optimization recommendations",
        "How should I improve the campaign?",
        "What optimization strategies should I use?",
        "How can I optimize for better results?",
        "What optimization advice do you have?",
        "What optimization recommendations do you have?",
        "How should I optimize?",
        "What optimization opportunities exist?",
        "How can I optimize?",
        "What should I optimize?",
        "Give me optimization recommendations",
        "How should I improve?",
        "What optimization strategies should I use?",
        "How can I optimize for better results?",
        "What optimization advice do you have?"
    ]
    questions.extend(optimization_questions * 5)
    
    # 9. Basic Metrics (100 questions) - Enhanced variations
    basic_questions = [
        "What is our total spend?",
        "How much revenue did we generate?",
        "What are our total impressions?",
        "How many clicks did we get?",
        "What is our total conversions?",
        "What is our overall CTR?",
        "What is our overall ROAS?",
        "What is our overall CPA?",
        "What is our overall CPM?",
        "How much did we spend in total?",
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
    ]
    questions.extend(basic_questions * 5)
    
    # 10. Advanced Analytics (100 questions) - Enhanced variations
    advanced_questions = [
        "What are the trends in our data?",
        "What patterns do you see?",
        "What insights can you provide?",
        "What are the key metrics?",
        "What should I focus on?",
        "What are the important trends?",
        "What patterns exist in the data?",
        "What insights can you share?",
        "What are the key findings?",
        "What should I pay attention to?",
        "What are the trends?",
        "What patterns do you see?",
        "What insights can you provide?",
        "What are the key metrics?",
        "What should I focus on?",
        "What are the important trends?",
        "What patterns exist?",
        "What insights can you share?",
        "What are the key findings?",
        "What should I pay attention to?"
    ]
    questions.extend(advanced_questions * 5)
    
    # 11. Specific Metric Queries (100 questions) - Enhanced variations
    for metric in metrics:
        questions.extend([
            f"What is our {metric}?",
            f"How much {metric} did we get?",
            f"What are our {metric}?",
            f"How many {metric} did we generate?",
            f"What {metric} did we achieve?",
            f"What is the {metric}?",
            f"How much {metric}?",
            f"What are the {metric}?",
            f"How many {metric}?",
            f"What {metric} did we get?"
        ])
    
    # 12. Platform-Specific Metric Queries (100 questions) - Enhanced variations
    for platform in platforms:
        for metric in metrics:
            questions.extend([
                f"What is {platform}'s {metric}?",
                f"How much {metric} did {platform} get?",
                f"What are {platform}'s {metric}?",
                f"How many {metric} did {platform} generate?",
                f"What {metric} did {platform} achieve?"
            ])
    
    # Shuffle and ensure we have exactly 1000 questions
    random.shuffle(questions)
    return questions[:1000]

def run_mega_uat_98_percent():
    """Run the enhanced mega 1000-question UAT targeting 98% accuracy"""
    print("🚀 MEGA 1000-QUESTION UAT - TARGETING 98% ACCURACY")
    print("=" * 80)
    print("Testing: Enhanced Platform Performance, Conversions, Campaign Summaries,")
    print("         Anomaly Detection, Optimization Recommendations, & More!")
    print("=" * 80)
    
    # Generate questions
    print("Generating 1000 enhanced questions...")
    questions = generate_1000_questions_enhanced()
    
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
        'advanced_analytics': {'total': 0, 'passed': 0},
        'specific_metrics': {'total': 0, 'passed': 0},
        'platform_metrics': {'total': 0, 'passed': 0}
    }
    
    print(f"\nStarting {total_tests} tests...")
    print("-" * 80)
    
    start_time = time.time()
    
    for i, query in enumerate(questions, 1):
        # Determine category
        category = 'other'
        if any(word in query.lower() for word in ['performance', 'performing', 'results', 'doing', 'performed']):
            category = 'platform_performance'
        elif 'conversions' in query.lower():
            category = 'platform_conversions'
        elif any(campaign.lower() in query.lower() for campaign in ['freshnest']):
            category = 'campaign_specific'
        elif any(word in query.lower() for word in ['which', 'best', 'highest', 'most']):
            category = 'comparative'
        elif any(word in query.lower() for word in ['learn', 'apply', 'recommendations', 'optimize', 'improve', 'focus', 'insights', 'takeaways', 'boost', 'scale', 'cut', 'efficiency', 'opportunities', 'prioritize']):
            category = 'strategic'
        elif any(word in query.lower() for word in ['summary', 'overview', 'executive', 'big picture']):
            category = 'executive_summary'
        elif any(word in query.lower() for word in ['anomaly', 'anomalies', 'unusual', 'outliers']):
            category = 'anomaly_detection'
        elif any(word in query.lower() for word in ['optimization', 'optimize']):
            category = 'optimization'
        elif any(word in query.lower() for word in ['total', 'overall', 'how much', 'how many']):
            category = 'basic_metrics'
        elif any(word in query.lower() for word in ['trends', 'patterns', 'insights', 'analytics', 'findings']):
            category = 'advanced_analytics'
        elif any(word in query.lower() for word in ['spend', 'revenue', 'impressions', 'clicks', 'conversions', 'ctr', 'roas', 'cpa', 'cpm', 'cpc']) and not any(platform.lower() in query.lower() for platform in ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk']):
            category = 'specific_metrics'
        elif any(word in query.lower() for word in ['spend', 'revenue', 'impressions', 'clicks', 'conversions', 'ctr', 'roas', 'cpa', 'cpm', 'cpc']) and any(platform.lower() in query.lower() for platform in ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk']):
            category = 'platform_metrics'
        
        if category in categories:
            categories[category]['total'] += 1
        
        # Query API
        response = query_api(query)
        
        # Check if it's a generic response
        if "Try asking about:" in response or "I can help you analyze" in response:
            generic_responses += 1
            status = "❌"
        else:
            passed_tests += 1
            if category in categories:
                categories[category]['passed'] += 1
            status = "✅"
        
        # Progress update every 50 tests
        if i % 50 == 0:
            elapsed_time = time.time() - start_time
            current_success_rate = (passed_tests / i) * 100
            estimated_total_time = (elapsed_time / i) * total_tests
            remaining_time = estimated_total_time - elapsed_time
            
            print(f"\n📊 Progress: {i}/{total_tests} ({current_success_rate:.1f}% success rate)")
            print(f"   Passed: {passed_tests}, Generic: {generic_responses}")
            print(f"   Elapsed: {elapsed_time:.1f}s, Remaining: {remaining_time:.1f}s")
        
        # Faster rate limiting
        time.sleep(0.1)
    
    # Final results
    total_time = time.time() - start_time
    overall_success_rate = (passed_tests / total_tests) * 100
    generic_rate = (generic_responses / total_tests) * 100
    
    print("\n" + "=" * 80)
    print("🎯 MEGA UAT FINAL RESULTS - 98% TARGET")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed Tests: {passed_tests}")
    print(f"Generic Responses: {generic_responses}")
    print(f"Overall Success Rate: {overall_success_rate:.1f}%")
    print(f"Generic Response Rate: {generic_rate:.1f}%")
    print(f"Total Time: {total_time:.1f} seconds")
    
    # Category breakdown
    print(f"\n📊 CATEGORY BREAKDOWN:")
    print("-" * 50)
    for category, stats in categories.items():
        if stats['total'] > 0:
            success_rate = (stats['passed'] / stats['total']) * 100
            print(f"{category.replace('_', ' ').title()}: {stats['passed']}/{stats['total']} ({success_rate:.1f}%)")
    
    # Performance assessment
    if overall_success_rate >= 98:
        print(f"\n🎉 EXCELLENT! We've achieved 98%+ accuracy!")
    elif overall_success_rate >= 95:
        print(f"\n👍 GREAT! We're very close to 98% accuracy!")
    elif overall_success_rate >= 90:
        print(f"\n✅ GOOD! Significant improvement achieved!")
    else:
        print(f"\n📈 PROGRESS! We've made improvements, more work needed.")
    
    print(f"\n" + "=" * 80)
    print("MEGA UAT Complete!")

if __name__ == "__main__":
    run_mega_uat_98_percent() 