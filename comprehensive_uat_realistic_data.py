#!/usr/bin/env python3
"""
COMPREHENSIVE UAT WITH REALISTIC DATA
=====================================
Test all new campaign management and optimization handlers with realistic campaign data
"""

import json
import urllib.request
import csv
from collections import defaultdict

def load_csv_data():
    """Load and process CSV data"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Calculate revenue from spend and ROAS
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas
            
            data.append({
                'platform': row['platform'],
                'campaign_name': row['campaign_name'],
                'ad_group_name': row['ad_group_name'],
                'placement_name': row['placement_name'],
                'creative_name': row['creative_name'],
                'creative_format': row['creative_format'],
                'spend': spend,
                'revenue': revenue,
                'impressions': float(row['impressions']),
                'clicks': float(row['clicks']),
                'conversions': float(row['conversions']),
                'ctr': float(row['clicks']) / float(row['impressions']) if float(row['impressions']) > 0 else 0,
                'roas': roas,
                'cpc': float(row['cpc']) if row['cpc'] else 0,
                'cpm': float(row['cpm']) if row['cpm'] else 0
            })
    return data

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

def extract_number_from_response(response, metric_type='number'):
    """Extract numbers from AI response"""
    import re
    
    if not response or 'Error:' in response:
        return None
    
    # Handle percentages
    if metric_type == 'percentage':
        patterns = [
            r'(\d+\.?\d*)%',  # Match percentages
            r'(\d+\.?\d*)\s*percent'  # Match "percent"
        ]
    else:
        patterns = [
            r':\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',  # Match numbers after colon
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',      # Fallback: Match any number with commas
            r'(\d+\.?\d*)'                          # Fallback: Match any number
        ]
    
    for pattern in patterns:
        match = re.search(pattern, response)
        if match and match.group(1):
            try:
                value = float(match.group(1).replace(',', ''))
                if metric_type == 'percentage':
                    return value / 100  # Convert percentage to decimal
                return value
            except (ValueError, AttributeError):
                continue
    
    return None

def calculate_csv_metrics(data, query_type, **kwargs):
    """Calculate expected metrics from CSV data"""
    if query_type == 'total_spend':
        return sum(item['spend'] for item in data)
    
    elif query_type == 'total_revenue':
        return sum(item['revenue'] for item in data)
    
    elif query_type == 'total_impressions':
        return sum(item['impressions'] for item in data)
    
    elif query_type == 'total_clicks':
        return sum(item['clicks'] for item in data)
    
    elif query_type == 'overall_ctr':
        total_clicks = sum(item['clicks'] for item in data)
        total_impressions = sum(item['impressions'] for item in data)
        return total_clicks / total_impressions if total_impressions > 0 else 0
    
    elif query_type == 'average_roas':
        total_spend = sum(item['spend'] for item in data)
        total_revenue = sum(item['revenue'] for item in data)
        return total_revenue / total_spend if total_spend > 0 else 0
    
    elif query_type == 'platform_roas':
        platform = kwargs.get('platform')
        platform_data = [item for item in data if item['platform'] == platform]
        if not platform_data:
            return 0
        total_spend = sum(item['spend'] for item in platform_data)
        total_revenue = sum(item['revenue'] for item in platform_data)
        return total_revenue / total_spend if total_spend > 0 else 0
    
    elif query_type == 'platform_ctr':
        platform = kwargs.get('platform')
        platform_data = [item for item in data if item['platform'] == platform]
        if not platform_data:
            return 0
        total_clicks = sum(item['clicks'] for item in platform_data)
        total_impressions = sum(item['impressions'] for item in platform_data)
        return total_clicks / total_impressions if total_impressions > 0 else 0
    
    elif query_type == 'campaign_roas':
        campaign = kwargs.get('campaign')
        campaign_data = [item for item in data if item['campaign_name'] == campaign]
        if not campaign_data:
            return 0
        total_spend = sum(item['spend'] for item in campaign_data)
        total_revenue = sum(item['revenue'] for item in campaign_data)
        return total_revenue / total_spend if total_spend > 0 else 0
    
    elif query_type == 'campaign_ctr':
        campaign = kwargs.get('campaign')
        campaign_data = [item for item in data if item['campaign_name'] == campaign]
        if not campaign_data:
            return 0
        total_clicks = sum(item['clicks'] for item in campaign_data)
        total_impressions = sum(item['impressions'] for item in campaign_data)
        return total_clicks / total_impressions if total_impressions > 0 else 0
    
    return 0

def validate_response(response, expected_value, tolerance=0.1, query_type='number'):
    """Validate AI response against expected value"""
    if not response or 'Error:' in response:
        return False, f"API Error or no response"
    
    if 'I understand you\'re asking about' in response:
        return False, f"Generic help response"
    
    extracted_value = extract_number_from_response(response, query_type)
    if extracted_value is None:
        return False, f"Could not extract number from response"
    
    if expected_value == 0:
        return extracted_value == 0, f"Expected 0, got {extracted_value}"
    
    difference = abs(extracted_value - expected_value) / expected_value
    return difference <= tolerance, f"Expected {expected_value}, got {extracted_value} (diff: {difference*100:.1f}%)"

def run_comprehensive_uat():
    """Run comprehensive UAT with realistic data"""
    print('🧪 COMPREHENSIVE UAT WITH REALISTIC DATA')
    print('=' * 60)
    
    # Load CSV data
    data = load_csv_data()
    print(f'📊 Loaded {len(data)} data points from realistic campaign data')
    
    # Comprehensive test questions covering all new handlers
    test_questions = [
        # BASIC METRICS (existing handlers)
        ('How much money did we spend?', 'total_spend', 'number', {}),
        ('What is our total revenue?', 'total_revenue', 'number', {}),
        ('How many impressions did we get?', 'total_impressions', 'number', {}),
        ('How many clicks did we get?', 'total_clicks', 'number', {}),
        ('What is our overall CTR?', 'overall_ctr', 'percentage', {}),
        ('What is our average ROAS?', 'average_roas', 'number', {}),
        
        # PLATFORM-SPECIFIC QUERIES
        ('What is the ROAS for Meta?', 'platform_roas', 'number', {'platform': 'Meta'}),
        ('What is the CTR for Dv360?', 'platform_ctr', 'percentage', {'platform': 'Dv360'}),
        ('How much did we spend on Amazon?', 'platform_spend', 'number', {'platform': 'Amazon'}),
        ('What is the ROAS for Cm360?', 'platform_roas', 'number', {'platform': 'Cm360'}),
        
        # CAMPAIGN-SPECIFIC QUERIES
        ('What is the ROAS for FreshNest Summer Grilling?', 'campaign_roas', 'number', {'campaign': 'FreshNest Summer Grilling'}),
        ('What is the CTR for FreshNest Back to School?', 'campaign_ctr', 'percentage', {'campaign': 'FreshNest Back to School'}),
        ('How much did we spend on FreshNest Holiday Recipes?', 'campaign_spend', 'number', {'campaign': 'FreshNest Holiday Recipes'}),
        
        # ADVANCED OPTIMIZATION QUERIES (new handlers)
        ('Which placements are performing best?', 'optimization', 'insights', {}),
        ('Which ad formats work best?', 'optimization', 'insights', {}),
        ('What audiences should I target?', 'optimization', 'insights', {}),
        ('How are my creatives performing?', 'optimization', 'insights', {}),
        ('How can I optimize my campaigns?', 'optimization', 'insights', {}),
        
        # CAMPAIGN MANAGEMENT QUERIES (new handlers)
        ('How well were these campaigns managed?', 'management', 'insights', {}),
        ('What is the campaign pacing like?', 'management', 'insights', {}),
        ('Are there any anomalies in the data?', 'management', 'insights', {}),
        ('How consistent was the spend?', 'management', 'insights', {}),
        ('What optimization patterns do you see?', 'management', 'insights', {}),
        
        # COMPARATIVE QUERIES
        ('Which platform performed best?', 'comparative', 'insights', {}),
        ('Which platform has the highest ROAS?', 'comparative', 'insights', {}),
        ('Which platform spent the most?', 'comparative', 'insights', {}),
        ('Which campaign had the best performance?', 'comparative', 'insights', {}),
        
        # STRATEGIC INSIGHTS
        ('What did we learn from this campaign?', 'strategic', 'insights', {}),
        ('What should I do next?', 'strategic', 'insights', {}),
        ('How can I improve my ROAS?', 'strategic', 'insights', {}),
        ('Which platform should I put more money into?', 'strategic', 'insights', {}),
        
        # PLACEMENT OPTIMIZATION
        ('Which placements should I optimize?', 'placement', 'insights', {}),
        ('What placement has the highest CTR?', 'placement', 'insights', {}),
        ('How are my placements performing?', 'placement', 'insights', {}),
        
        # CREATIVE OPTIMIZATION
        ('Which creative format performs best?', 'creative', 'insights', {}),
        ('How are my creatives performing?', 'creative', 'insights', {}),
        ('Which creatives should I replace?', 'creative', 'insights', {}),
        
        # AUDIENCE OPTIMIZATION
        ('Which audiences are performing best?', 'audience', 'insights', {}),
        ('What ad groups should I scale?', 'audience', 'insights', {}),
        ('Which audiences need optimization?', 'audience', 'insights', {}),
        
        # ANOMALY DETECTION
        ('Are there any unusual performance patterns?', 'anomaly', 'insights', {}),
        ('What are the outliers in my data?', 'anomaly', 'insights', {}),
        ('Which days had exceptional performance?', 'anomaly', 'insights', {}),
        
        # PACING ANALYSIS
        ('How consistent was our daily spend?', 'pacing', 'insights', {}),
        ('Did we have any zero-spend days?', 'pacing', 'insights', {}),
        ('What is our spend volatility?', 'pacing', 'insights', {}),
        
        # COMPREHENSIVE OPTIMIZATION
        ('How should I reallocate my budget?', 'comprehensive', 'insights', {}),
        ('What are my biggest optimization opportunities?', 'comprehensive', 'insights', {}),
        ('How can I increase my revenue?', 'comprehensive', 'insights', {}),
        ('What should I optimize first?', 'comprehensive', 'insights', {}),
        
        # MANAGEMENT QUALITY
        ('Was this campaign managed well?', 'quality', 'insights', {}),
        ('What is the management quality score?', 'quality', 'insights', {}),
        ('How healthy are these campaigns?', 'quality', 'insights', {}),
        ('What management improvements are needed?', 'quality', 'insights', {})
    ]
    
    # Results tracking
    results = {
        'total': len(test_questions),
        'successful': 0,
        'failed': 0,
        'errors': 0,
        'generic_responses': 0,
        'category_results': defaultdict(lambda: {'successful': 0, 'failed': 0, 'total': 0})
    }
    
    print(f'\n🚀 Testing {len(test_questions)} comprehensive queries...')
    print('=' * 60)
    
    for i, (question, query_type, response_type, params) in enumerate(test_questions, 1):
        print(f'\n{i:3d}. {question}')
        
        # Determine category for tracking
        if query_type in ['total_spend', 'total_revenue', 'total_impressions', 'total_clicks', 'overall_ctr', 'average_roas']:
            category = 'basic_metrics'
        elif query_type in ['platform_roas', 'platform_ctr', 'platform_spend']:
            category = 'platform_specific'
        elif query_type in ['campaign_roas', 'campaign_ctr', 'campaign_spend']:
            category = 'campaign_specific'
        elif query_type == 'optimization':
            category = 'advanced_optimization'
        elif query_type == 'management':
            category = 'campaign_management'
        elif query_type == 'comparative':
            category = 'comparative_analysis'
        elif query_type == 'strategic':
            category = 'strategic_insights'
        elif query_type == 'placement':
            category = 'placement_optimization'
        elif query_type == 'creative':
            category = 'creative_optimization'
        elif query_type == 'audience':
            category = 'audience_optimization'
        elif query_type == 'anomaly':
            category = 'anomaly_detection'
        elif query_type == 'pacing':
            category = 'pacing_analysis'
        elif query_type == 'comprehensive':
            category = 'comprehensive_optimization'
        elif query_type == 'quality':
            category = 'management_quality'
        else:
            category = 'other'
        
        results['category_results'][category]['total'] += 1
        
        # Get AI response
        response = query_api(question)
        
        # Validate response
        if response_type == 'insights':
            # For insight queries, check if we got a meaningful response
            if not response or 'Error:' in response:
                success = False
                reason = "API Error or no response"
                results['errors'] += 1
            elif 'I understand you\'re asking about' in response:
                success = False
                reason = "Generic help response"
                results['generic_responses'] += 1
            else:
                success = True
                reason = "Meaningful insight response"
        else:
            # For metric queries, validate against expected values
            if params:
                expected_value = calculate_csv_metrics(data, query_type, **params)
            else:
                expected_value = calculate_csv_metrics(data, query_type)
            
            success, reason = validate_response(response, expected_value, 0.1, response_type)
        
        # Update results
        if success:
            results['successful'] += 1
            results['category_results'][category]['successful'] += 1
            print(f'   ✅ SUCCESS: {reason}')
        else:
            results['failed'] += 1
            results['category_results'][category]['failed'] += 1
            print(f'   ❌ FAILED: {reason}')
            print(f'   Response: {response[:100]}...')
    
    # Calculate success rate
    success_rate = (results['successful'] / results['total']) * 100
    
    print('\n' + '=' * 60)
    print('📊 COMPREHENSIVE UAT RESULTS')
    print('=' * 60)
    print(f'🎯 Overall Success Rate: {success_rate:.1f}%')
    print(f'✅ Successful: {results["successful"]}/{results["total"]}')
    print(f'❌ Failed: {results["failed"]}/{results["total"]}')
    print(f'🚨 Errors: {results["errors"]}')
    print(f'📝 Generic Responses: {results["generic_responses"]}')
    
    print('\n📈 CATEGORY BREAKDOWN:')
    for category, stats in results['category_results'].items():
        if stats['total'] > 0:
            category_success_rate = (stats['successful'] / stats['total']) * 100
            print(f'• {category.replace("_", " ").title()}: {category_success_rate:.1f}% ({stats["successful"]}/{stats["total"]})')
    
    print('\n💡 KEY INSIGHTS:')
    if success_rate >= 90:
        print('🏆 EXCEPTIONAL: AI system is performing excellently across all categories')
    elif success_rate >= 80:
        print('✅ EXCELLENT: Strong performance with room for minor improvements')
    elif success_rate >= 70:
        print('👍 GOOD: Solid performance with some areas needing attention')
    elif success_rate >= 60:
        print('⚠️ FAIR: Several areas need improvement')
    else:
        print('🚨 NEEDS WORK: Significant improvements required')
    
    if results['generic_responses'] > 0:
        print(f'⚠️ {results["generic_responses"]} queries returned generic help responses - handlers may not be triggering')
    
    if results['errors'] > 0:
        print(f'🚨 {results["errors"]} API errors detected - check deployment status')
    
    return results

if __name__ == "__main__":
    run_comprehensive_uat() 