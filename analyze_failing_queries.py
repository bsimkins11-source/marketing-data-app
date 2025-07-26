#!/usr/bin/env python3
"""
ANALYZE FAILING QUERIES
=======================
Identify patterns in failing queries to improve success rate to 95%
"""

import json
import urllib.request

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

def analyze_failing_queries():
    """Analyze failing queries to identify patterns"""
    
    # Failed queries from UAT results
    failing_queries = [
        # Platform/Campaign spend queries (2 failures)
        ('How much did we spend on Amazon?', 'platform_spend'),
        ('How much did we spend on FreshNest Holiday Recipes?', 'campaign_spend'),
        
        # Campaign management queries (5 failures)
        ('How well were these campaigns managed?', 'campaign_management'),
        ('How consistent was the spend?', 'pacing_analysis'),
        ('Did we have any zero-spend days?', 'pacing_analysis'),
        ('What is our spend volatility?', 'pacing_analysis'),
        ('How consistent was our daily spend?', 'pacing_analysis'),
        
        # Strategic insights (1 failure)
        ('Which platform should I put more money into?', 'strategic_insights'),
        
        # Placement optimization (2 failures)
        ('What placement has the highest CTR?', 'placement_optimization'),
        ('How are my placements performing?', 'placement_optimization'),
        
        # Creative optimization (1 failure)
        ('Which creatives should I replace?', 'creative_optimization'),
        
        # Comprehensive optimization (1 failure)
        ('How can I increase my revenue?', 'comprehensive_optimization'),
        
        # Management quality (1 failure)
        ('How healthy are these campaigns?', 'management_quality')
    ]
    
    print('🔍 ANALYZING FAILING QUERIES FOR 95% SUCCESS RATE')
    print('=' * 70)
    
    # Categorize failures
    failure_categories = {}
    
    for query, category in failing_queries:
        print(f'\n📝 Query: {query}')
        print(f'🏷️  Category: {category}')
        
        response = query_api(query)
        
        if 'I understand you\'re asking about' in response:
            failure_type = 'Generic Help Response'
            print(f'❌ Failure Type: {failure_type}')
            print(f'🔍 Pattern: Query not triggering specific handler')
        elif 'Error:' in response:
            failure_type = 'API Error'
            print(f'❌ Failure Type: {failure_type}')
        else:
            failure_type = 'Other'
            print(f'❌ Failure Type: {failure_type}')
        
        print(f'📄 Response: {response[:150]}...')
        print('-' * 70)
        
        # Track by category
        if category not in failure_categories:
            failure_categories[category] = []
        failure_categories[category].append({
            'query': query,
            'failure_type': failure_type,
            'response': response[:100]
        })
    
    print('\n📊 FAILURE ANALYSIS SUMMARY')
    print('=' * 70)
    
    for category, failures in failure_categories.items():
        print(f'\n🎯 {category.upper()}: {len(failures)} failures')
        for failure in failures:
            print(f'  • {failure["query"]} ({failure["failure_type"]})')
    
    print('\n💡 RECOMMENDED FIXES')
    print('=' * 70)
    
    # Platform/Campaign spend queries
    if 'platform_spend' in failure_categories or 'campaign_spend' in failure_categories:
        print('\n1. 🎯 PLATFORM/CAMPAIGN SPEND HANDLERS')
        print('   • Add specific handlers for "How much did we spend on [Platform/Campaign]?"')
        print('   • Pattern: "spend on [name]" or "spent on [name]"')
    
    # Campaign management queries
    if 'campaign_management' in failure_categories:
        print('\n2. 🎯 CAMPAIGN MANAGEMENT HANDLERS')
        print('   • Add handler for "How well were these campaigns managed?"')
        print('   • Pattern: "campaigns managed" or "management quality"')
    
    # Pacing analysis queries
    if 'pacing_analysis' in failure_categories:
        print('\n3. 🎯 PACING ANALYSIS HANDLERS')
        print('   • Add handlers for spend consistency and volatility')
        print('   • Patterns: "consistent spend", "spend volatility", "zero-spend days"')
    
    # Strategic insights
    if 'strategic_insights' in failure_categories:
        print('\n4. 🎯 STRATEGIC INSIGHTS HANDLERS')
        print('   • Add handler for "Which platform should I put more money into?"')
        print('   • Pattern: "put more money into" or "invest more in"')
    
    # Placement optimization
    if 'placement_optimization' in failure_categories:
        print('\n5. 🎯 PLACEMENT OPTIMIZATION HANDLERS')
        print('   • Add handlers for placement-specific queries')
        print('   • Patterns: "placement has highest CTR", "placements performing"')
    
    # Creative optimization
    if 'creative_optimization' in failure_categories:
        print('\n6. 🎯 CREATIVE OPTIMIZATION HANDLERS')
        print('   • Add handler for "Which creatives should I replace?"')
        print('   • Pattern: "creatives should replace" or "replace creatives"')
    
    # Comprehensive optimization
    if 'comprehensive_optimization' in failure_categories:
        print('\n7. 🎯 COMPREHENSIVE OPTIMIZATION HANDLERS')
        print('   • Add handler for "How can I increase my revenue?"')
        print('   • Pattern: "increase revenue" or "boost revenue"')
    
    # Management quality
    if 'management_quality' in failure_categories:
        print('\n8. 🎯 MANAGEMENT QUALITY HANDLERS')
        print('   • Add handler for "How healthy are these campaigns?"')
        print('   • Pattern: "campaigns healthy" or "campaign health"')
    
    print('\n🎯 TARGET: 95% SUCCESS RATE')
    print('• Current: 75.9% (41/54)')
    print('• Need: +7 more successful queries')
    print('• Target: 51/54 successful queries')

if __name__ == "__main__":
    analyze_failing_queries() 