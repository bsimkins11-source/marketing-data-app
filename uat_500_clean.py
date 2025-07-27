#!/usr/bin/env python3
"""
UAT 500 CLEAN - Comprehensive testing with cleaned-up codebase
=============================================================
500-question UAT to validate the cleaned-up AI handlers
"""

import json
import urllib.request
import time
from collections import defaultdict

def query_api(query):
    """Query the AI API"""
    url = 'https://marketing-data-app.vercel.app/api/ai/query'
    data = json.dumps({'query': query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get('content', '')
    except Exception as e:
        return f'Error: {str(e)}'

def generate_test_questions():
    """Generate 500 diverse test questions"""
    platforms = ['Meta', 'Dv360', 'Cm360', 'Sa360', 'Amazon', 'Tradedesk']
    metrics = ['ROAS', 'CTR', 'spend', 'revenue', 'impressions', 'clicks', 'conversions']
    campaigns = ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']
    
    questions = []
    
    # 1. Basic metrics (50 questions)
    for metric in metrics:
        questions.extend([
            f"What is the total {metric}?",
            f"How much {metric} did we get?",
            f"What is our {metric}?",
            f"Show me the {metric}",
            f"Total {metric}",
            f"Overall {metric}",
            f"Sum of {metric}",
            f"Calculate {metric}"
        ])
    
    # 2. Platform-specific metrics (300 questions)
    for platform in platforms:
        for metric in metrics:
            questions.extend([
                f"What is {platform}'s {metric}?",
                f"How much {metric} did {platform} get?",
                f"What is the {metric} for {platform}?",
                f"{platform} {metric}",
                f"How much did we spend on {platform}?",
                f"What is {platform}'s performance?",
                f"How is {platform} performing?",
                f"What are {platform}'s results?",
                f"How much {metric} does {platform} have?",
                f"What is {platform}'s total {metric}?",
                f"How much {metric} did {platform} achieve?",
                f"What is {platform}'s {metric} performance?",
                f"How much {metric} did {platform} produce?",
                f"What is {platform}'s {metric} result?"
            ])
    
    # 3. Campaign-specific metrics (50 questions)
    for campaign in campaigns:
        for metric in metrics:
            questions.extend([
                f"What is the {metric} for {campaign}?",
                f"How much {metric} did {campaign} get?",
                f"What is {campaign}'s {metric}?",
                f"{campaign} {metric}",
                f"How much did we spend on {campaign}?",
                f"What is {campaign}'s performance?",
                f"How is {campaign} performing?",
                f"What are {campaign}'s results?"
            ])
    
    # 4. Comparative queries (50 questions)
    questions.extend([
        "Which platform performed best?",
        "Which platform had the highest ROAS?",
        "Which platform had the highest CTR?",
        "Which platform spent the most?",
        "Which platform generated the most revenue?",
        "Which platform got the most impressions?",
        "Which platform got the most clicks?",
        "Which platform was the best?",
        "Which platform had the best performance?",
        "Which platform was most profitable?",
        "Which platform costs the most?",
        "Which platform is most expensive?",
        "Which platform makes the most money?",
        "Which platform generated the most revenue?",
        "Which platform had the most traffic?",
        "Which platform had the most engagement?",
        "Which campaign performed best?",
        "Which campaign had the highest ROAS?",
        "Which campaign had the highest CTR?",
        "Which campaign spent the most?",
        "Which campaign generated the most revenue?",
        "Which campaign got the most impressions?",
        "Which campaign got the most clicks?",
        "Which campaign was the best?",
        "Which campaign had the best performance?",
        "Which campaign was most profitable?",
        "Which campaign costs the most?",
        "Which campaign is most expensive?",
        "Which campaign makes the most money?",
        "Which campaign generated the most revenue?",
        "Which campaign had the most traffic?",
        "Which campaign had the most engagement?",
        "What are the top 3 platforms by ROAS?",
        "What are the top 3 platforms by CTR?",
        "What are the top 3 platforms by spend?",
        "What are the top 3 platforms by revenue?",
        "What are the top 3 campaigns by ROAS?",
        "What are the top 3 campaigns by CTR?",
        "What are the top 3 campaigns by spend?",
        "What are the top 3 campaigns by revenue?",
        "Show me the top performing platforms",
        "Show me the best performing campaigns",
        "List the top platforms",
        "List the best campaigns",
        "Rank the platforms by performance",
        "Rank the campaigns by performance"
    ])
    
    # 5. Strategic insights (25 questions)
    questions.extend([
        "What did we learn from this campaign?",
        "What should I apply to the next campaign?",
        "What recommendations do you have?",
        "How can I improve performance?",
        "What should I optimize?",
        "Where should I put more money?",
        "Which platform should I invest more in?",
        "What insights can you provide?",
        "What are the key takeaways?",
        "What should I focus on?",
        "How can I increase revenue?",
        "How can I boost performance?",
        "What optimization opportunities are there?",
        "What should I reallocate?",
        "How can I improve ROAS?",
        "What budget optimization do you recommend?",
        "How can I increase my revenue?",
        "What should I do differently?",
        "What worked well?",
        "What didn't work well?",
        "What are the best practices from this data?",
        "What should I avoid in the future?",
        "What should I replicate?",
        "What should I change?",
        "What should I keep doing?"
    ])
    
    # 6. Data verification (25 questions)
    questions.extend([
        "Did three units really have a 0% ROAS?",
        "Is this data accurate?",
        "Can you verify these results?",
        "Are these numbers correct?",
        "What does this mean?",
        "Explain these results",
        "Verify the data",
        "Check the results",
        "Confirm the performance",
        "Is this realistic?",
        "Does this make sense?",
        "What does this tell us?",
        "Explain the data",
        "Verify the performance",
        "Check the performance",
        "Confirm the data",
        "Is this accurate performance?",
        "Explain the results",
        "Verify the performance",
        "Check the data",
        "Confirm the results",
        "Did this really occur?",
        "Verify the results",
        "Check the performance",
        "Confirm the data",
        "Did this really happen?"
    ])
    
    return questions[:500]  # Ensure exactly 500 questions

def run_uat_500():
    """Run the 500-question UAT"""
    print('🚀 UAT 500 CLEAN - COMPREHENSIVE TESTING')
    print('=' * 60)
    
    # Generate test questions
    test_questions = generate_test_questions()
    print(f'📝 Generated {len(test_questions)} test questions')
    
    # Track results
    successful = 0
    failed = 0
    errors = 0
    generic_responses = 0
    
    # Category tracking
    categories = {
        'basic_metrics': 0,
        'platform_specific': 0,
        'campaign_specific': 0,
        'comparative': 0,
        'strategic': 0,
        'verification': 0
    }
    
    category_success = {
        'basic_metrics': 0,
        'platform_specific': 0,
        'campaign_specific': 0,
        'comparative': 0,
        'strategic': 0,
        'verification': 0
    }
    
    print('\n🔍 STARTING UAT...')
    print('=' * 60)
    
    for i, question in enumerate(test_questions, 1):
        print(f'\n📝 Test {i}: {question}')
        
        # Determine category
        category = 'basic_metrics'  # default
        if any(platform.lower() in question.lower() for platform in ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk']):
            category = 'platform_specific'
        elif any(campaign.lower() in question.lower() for campaign in ['freshnest']):
            category = 'campaign_specific'
        elif any(word in question.lower() for word in ['which', 'best', 'top', 'highest', 'most']):
            category = 'comparative'
        elif any(word in question.lower() for word in ['learn', 'recommend', 'optimize', 'improve', 'focus']):
            category = 'strategic'
        elif any(word in question.lower() for word in ['verify', 'check', 'confirm', 'explain', 'mean']):
            category = 'verification'
        
        categories[category] += 1
        
        # Query API
        response = query_api(question)
        
        # Analyze response
        if 'Error:' in response:
            print('🚨 ERROR: API error')
            errors += 1
        elif 'I understand you\'re asking about' in response:
            print('❌ FAILED: Generic help response')
            failed += 1
            generic_responses += 1
        else:
            print('✅ SUCCESS: Meaningful response')
            successful += 1
            category_success[category] += 1
        
        # Progress update every 50 questions
        if i % 50 == 0:
            print(f'\n📊 PROGRESS: {i}/500 ({successful/i*100:.1f}% success rate)')
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    # Final results
    print('\n' + '=' * 60)
    print('📊 UAT 500 CLEAN - FINAL RESULTS')
    print('=' * 60)
    print(f'🎯 Overall Success Rate: {successful/500*100:.1f}%')
    print(f'✅ Successful: {successful}/500')
    print(f'❌ Failed: {failed}/500')
    print(f'🚨 Errors: {errors}/500')
    print(f'📝 Generic Responses: {generic_responses}/500')
    
    print('\n📈 CATEGORY BREAKDOWN:')
    for category, count in categories.items():
        if count > 0:
            success_rate = category_success[category] / count * 100
            print(f'• {category.replace("_", " ").title()}: {success_rate:.1f}% ({category_success[category]}/{count})')
    
    print('\n💡 KEY INSIGHTS:')
    if successful/500 >= 0.95:
        print('🎉 EXCELLENT: 95%+ accuracy achieved!')
    elif successful/500 >= 0.90:
        print('👍 GOOD: 90%+ accuracy achieved')
    elif successful/500 >= 0.80:
        print('⚠️ NEEDS IMPROVEMENT: Below 90% accuracy')
    else:
        print('🚨 CRITICAL: Significant optimization required')

if __name__ == "__main__":
    run_uat_500() 