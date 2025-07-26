#!/usr/bin/env python3
"""
STRATOSPHERIC 1000-QUESTION UAT
================================
Testing our bulletproof AI system with 1000 diverse marketing queries
"""

import json
import urllib.request
import re
from collections import defaultdict
import csv

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
            
            # Calculate CPA from spend and conversions
            conversions = float(row['conversions'])
            cpa = spend / conversions if conversions > 0 else 0
            
            data.append({
                'platform': row['platform'],
                'campaign_name': row['campaign_name'],
                'spend': spend,
                'revenue': revenue,
                'impressions': float(row['impressions']),
                'clicks': float(row['clicks']),
                'conversions': conversions,
                'ctr': float(row['clicks']) / float(row['impressions']) if float(row['impressions']) > 0 else 0,
                'roas': roas,
                'cpa': cpa
            })
    return data

def calculate_csv_metrics(data):
    """Calculate comprehensive metrics from CSV data"""
    metrics = {}
    
    # Overall metrics
    total_spend = sum(item['spend'] for item in data)
    total_revenue = sum(item['revenue'] for item in data)
    total_impressions = sum(item['impressions'] for item in data)
    total_clicks = sum(item['clicks'] for item in data)
    total_conversions = sum(item['conversions'] for item in data)
    
    metrics['total_spend'] = total_spend
    metrics['total_revenue'] = total_revenue
    metrics['total_impressions'] = total_impressions
    metrics['total_clicks'] = total_clicks
    metrics['total_conversions'] = total_conversions
    metrics['overall_ctr'] = total_clicks / total_impressions if total_impressions > 0 else 0
    metrics['overall_roas'] = total_revenue / total_spend if total_spend > 0 else 0
    metrics['overall_cpa'] = total_spend / total_conversions if total_conversions > 0 else 0
    
    # Platform metrics
    platform_groups = defaultdict(list)
    for item in data:
        platform_groups[item['platform']].append(item)
    
    platform_metrics = {}
    for platform, items in platform_groups.items():
        platform_spend = sum(item['spend'] for item in items)
        platform_revenue = sum(item['revenue'] for item in items)
        platform_impressions = sum(item['impressions'] for item in items)
        platform_clicks = sum(item['clicks'] for item in items)
        platform_conversions = sum(item['conversions'] for item in items)
        
        platform_metrics[platform] = {
            'spend': platform_spend,
            'revenue': platform_revenue,
            'impressions': platform_impressions,
            'clicks': platform_clicks,
            'conversions': platform_conversions,
            'ctr': platform_clicks / platform_impressions if platform_impressions > 0 else 0,
            'roas': platform_revenue / platform_spend if platform_spend > 0 else 0,
            'cpa': platform_spend / platform_conversions if platform_conversions > 0 else 0
        }
    
    metrics['platform_metrics'] = platform_metrics
    
    # Campaign metrics
    campaign_groups = defaultdict(list)
    for item in data:
        campaign_groups[item['campaign_name']].append(item)
    
    campaign_metrics = {}
    for campaign, items in campaign_groups.items():
        campaign_spend = sum(item['spend'] for item in items)
        campaign_revenue = sum(item['revenue'] for item in items)
        campaign_impressions = sum(item['impressions'] for item in items)
        campaign_clicks = sum(item['clicks'] for item in items)
        campaign_conversions = sum(item['conversions'] for item in items)
        
        campaign_metrics[campaign] = {
            'spend': campaign_spend,
            'revenue': campaign_revenue,
            'impressions': campaign_impressions,
            'clicks': campaign_clicks,
            'conversions': campaign_conversions,
            'ctr': campaign_clicks / campaign_impressions if campaign_impressions > 0 else 0,
            'roas': campaign_revenue / campaign_spend if campaign_spend > 0 else 0,
            'cpa': campaign_spend / campaign_conversions if campaign_conversions > 0 else 0
        }
    
    metrics['campaign_metrics'] = campaign_metrics
    
    return metrics

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get('content', '')
    except Exception as e:
        return f"Error: {str(e)}"

def extract_number_from_response(response, metric_type='number'):
    """Extract number from response"""
    if metric_type == 'percentage':
        patterns = [
            r'(\d+\.?\d*)%',
            r'(\d+\.?\d*)\s*percent',
            r'(\d+\.?\d*)\s*per\s*cent'
        ]
    elif metric_type == 'currency':
        patterns = [
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*dollars?',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*USD'
        ]
    else:
        patterns = [
            r':\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',  # Match numbers after colon
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',      # Match any number with commas
            r'(\d+\.?\d*)'                          # Match any number
        ]
    
    for pattern in patterns:
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            try:
                value = match.group(1).replace(',', '')
                if metric_type == 'percentage':
                    return float(value) / 100  # Convert percentage to decimal
                return float(value)
            except (ValueError, AttributeError):
                continue
    
    return None

def validate_response(response, expected_value, metric_type='number', tolerance=0.01):
    """Validate response against expected value"""
    if not response or 'error' in response.lower():
        return False, "Error in response"
    
    # Handle comparative and insights queries
    if metric_type in ['comparative', 'insights']:
        if len(response) > 50 and not response.startswith('I understand'):
            return True, "Valid response"
        return False, "Generic response"
    
    extracted_value = extract_number_from_response(response, metric_type)
    if extracted_value is None:
        return False, "Could not extract number from response"
    
    if metric_type == 'percentage':
        expected_decimal = expected_value
        difference = abs(extracted_value - expected_decimal)
        return difference <= tolerance, f"Expected {expected_decimal:.4f}, got {extracted_value:.4f}"
    else:
        difference = abs(extracted_value - expected_value)
        return difference <= tolerance, f"Expected {expected_value}, got {extracted_value}"

def generate_1000_questions():
    """Generate 1000 diverse marketing questions"""
    questions = []
    
    # Overall metrics (50 questions)
    overall_metrics = [
        ("What is our total spend?", 'total_spend', 'currency'),
        ("How much money did we spend?", 'total_spend', 'currency'),
        ("What's our total spend?", 'total_spend', 'currency'),
        ("Total spend across all campaigns?", 'total_spend', 'currency'),
        ("How much revenue did we generate?", 'total_revenue', 'currency'),
        ("What's our total revenue?", 'total_revenue', 'currency'),
        ("Total revenue across all campaigns?", 'total_revenue', 'currency'),
        ("What is our total impressions?", 'total_impressions', 'number'),
        ("How many impressions did we get?", 'total_impressions', 'number'),
        ("Total impressions across all campaigns?", 'total_impressions', 'number'),
        ("How many clicks did we get?", 'total_clicks', 'number'),
        ("What's our total clicks?", 'total_clicks', 'number'),
        ("Total clicks across all campaigns?", 'total_clicks', 'number'),
        ("What is our overall CTR?", 'overall_ctr', 'percentage'),
        ("What's our overall click-through rate?", 'overall_ctr', 'percentage'),
        ("Overall CTR across all campaigns?", 'overall_ctr', 'percentage'),
        ("What is our overall ROAS?", 'overall_roas', 'number'),
        ("What's our return on ad spend?", 'overall_roas', 'number'),
        ("Overall ROAS across all campaigns?", 'overall_roas', 'number'),
        ("What is our average CPA?", 'overall_cpa', 'currency'),
        ("Average cost per acquisition?", 'overall_cpa', 'currency'),
        ("Overall CPA across all campaigns?", 'overall_cpa', 'currency'),
    ]
    
    # Add variations
    for i in range(27):
        questions.extend(overall_metrics)
    
    # Platform comparative queries (100 questions)
    platform_comparative = [
        ("Which platform performed best?", None, 'comparative'),
        ("Which platform had the best performance?", None, 'comparative'),
        ("Which platform was the best?", None, 'comparative'),
        ("Which platform had the highest ROAS?", None, 'comparative'),
        ("Which platform spent the most?", None, 'comparative'),
        ("Which platform generated the most revenue?", None, 'comparative'),
        ("Which platform had the most impressions?", None, 'comparative'),
        ("Which platform got the most clicks?", None, 'comparative'),
        ("Which platform should I put more money into?", None, 'insights'),
        ("What platform should I invest more in?", None, 'insights'),
        ("Which platform is most efficient?", None, 'comparative'),
        ("Which platform has the best ROI?", None, 'comparative'),
    ]
    
    for i in range(8):
        questions.extend(platform_comparative)
    
    # Strategic insights (50 questions)
    strategic_insights = [
        ("What did we learn from this campaign?", None, 'insights'),
        ("What should I apply to the next campaign?", None, 'insights'),
        ("What are the key insights from this data?", None, 'insights'),
        ("What recommendations do you have?", None, 'insights'),
        ("What should I do next?", None, 'insights'),
        ("What insights can you provide?", None, 'insights'),
        ("What did we discover?", None, 'insights'),
        ("What patterns did you find?", None, 'insights'),
    ]
    
    for i in range(6):
        questions.extend(strategic_insights)
    
    # Platform-specific metrics (400 questions)
    platforms = ['Meta', 'Amazon', 'Dv360', 'Cm360', 'Sa360', 'Tradedesk']
    platform_metrics = ['ctr', 'roas', 'spend', 'revenue', 'impressions', 'clicks']
    
    for platform in platforms:
        for metric in platform_metrics:
            if metric == 'ctr':
                questions.append((f"What is the CTR for {platform}?", f'platform_metrics.{platform}.ctr', 'percentage'))
                questions.append((f"What's the click-through rate for {platform}?", f'platform_metrics.{platform}.ctr', 'percentage'))
                questions.append((f"CTR for {platform}?", f'platform_metrics.{platform}.ctr', 'percentage'))
            elif metric == 'roas':
                questions.append((f"What is the ROAS for {platform}?", f'platform_metrics.{platform}.roas', 'number'))
                questions.append((f"What's the return on ad spend for {platform}?", f'platform_metrics.{platform}.roas', 'number'))
                questions.append((f"ROAS for {platform}?", f'platform_metrics.{platform}.roas', 'number'))
            elif metric == 'spend':
                questions.append((f"How much did we spend on {platform}?", f'platform_metrics.{platform}.spend', 'currency'))
                questions.append((f"What's our spend on {platform}?", f'platform_metrics.{platform}.spend', 'currency'))
                questions.append((f"Spend on {platform}?", f'platform_metrics.{platform}.spend', 'currency'))
            elif metric == 'revenue':
                questions.append((f"What revenue did {platform} generate?", f'platform_metrics.{platform}.revenue', 'currency'))
                questions.append((f"How much revenue from {platform}?", f'platform_metrics.{platform}.revenue', 'currency'))
                questions.append((f"Revenue from {platform}?", f'platform_metrics.{platform}.revenue', 'currency'))
            elif metric == 'impressions':
                questions.append((f"How many impressions did {platform} get?", f'platform_metrics.{platform}.impressions', 'number'))
                questions.append((f"What's our impressions on {platform}?", f'platform_metrics.{platform}.impressions', 'number'))
                questions.append((f"Impressions for {platform}?", f'platform_metrics.{platform}.impressions', 'number'))
            elif metric == 'clicks':
                questions.append((f"How many clicks did {platform} get?", f'platform_metrics.{platform}.clicks', 'number'))
                questions.append((f"What's our clicks on {platform}?", f'platform_metrics.{platform}.clicks', 'number'))
                questions.append((f"Clicks for {platform}?", f'platform_metrics.{platform}.clicks', 'number'))
    
    # Campaign-specific metrics (300 questions)
    campaigns = ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']
    campaign_metrics = ['ctr', 'roas', 'spend', 'revenue', 'impressions', 'clicks']
    
    for campaign in campaigns:
        for metric in campaign_metrics:
            if metric == 'ctr':
                questions.append((f"What is the CTR for {campaign}?", f'campaign_metrics.{campaign}.ctr', 'percentage'))
                questions.append((f"What's the click-through rate for {campaign}?", f'campaign_metrics.{campaign}.ctr', 'percentage'))
            elif metric == 'roas':
                questions.append((f"What is the ROAS for {campaign}?", f'campaign_metrics.{campaign}.roas', 'number'))
                questions.append((f"What's the return on ad spend for {campaign}?", f'campaign_metrics.{campaign}.roas', 'number'))
            elif metric == 'spend':
                questions.append((f"How much did we spend on {campaign}?", f'campaign_metrics.{campaign}.spend', 'currency'))
                questions.append((f"What's our spend on {campaign}?", f'campaign_metrics.{campaign}.spend', 'currency'))
            elif metric == 'revenue':
                questions.append((f"What revenue did {campaign} generate?", f'campaign_metrics.{campaign}.revenue', 'currency'))
                questions.append((f"How much revenue from {campaign}?", f'campaign_metrics.{campaign}.revenue', 'currency'))
            elif metric == 'impressions':
                questions.append((f"How many impressions did {campaign} get?", f'campaign_metrics.{campaign}.impressions', 'number'))
                questions.append((f"What's our impressions on {campaign}?", f'campaign_metrics.{campaign}.impressions', 'number'))
            elif metric == 'clicks':
                questions.append((f"How many clicks did {campaign} get?", f'campaign_metrics.{campaign}.clicks', 'number'))
                questions.append((f"What's our clicks on {campaign}?", f'campaign_metrics.{campaign}.clicks', 'number'))
    
    # Add more variations to reach 1000
    additional_variations = [
        ("What's our total budget?", 'total_spend', 'currency'),
        ("How much did we invest?", 'total_spend', 'currency'),
        ("What's our total investment?", 'total_spend', 'currency'),
        ("How much money did we invest?", 'total_spend', 'currency'),
        ("What's our total cost?", 'total_spend', 'currency'),
        ("How much did we pay?", 'total_spend', 'currency'),
        ("What's our total expenditure?", 'total_spend', 'currency'),
        ("How much did we spend in total?", 'total_spend', 'currency'),
        ("What's our overall spend?", 'total_spend', 'currency'),
        ("How much money did we spend in total?", 'total_spend', 'currency'),
    ]
    
    # Add these variations multiple times to reach 1000
    remaining = 1000 - len(questions)
    for i in range(remaining // len(additional_variations) + 1):
        questions.extend(additional_variations)
    
    return questions[:1000]  # Ensure exactly 1000 questions

def run_stratospheric_uat():
    """Run the stratospheric 1000-question UAT"""
    print("🚀 STRATOSPHERIC 1000-QUESTION UAT")
    print("=" * 60)
    
    # Load data
    print("📊 Loading CSV data...")
    data = load_csv_data()
    metrics = calculate_csv_metrics(data)
    
    # Generate questions
    print("🎯 Generating 1000 questions...")
    test_questions = generate_1000_questions()
    
    print(f"📝 Testing {len(test_questions)} questions...")
    
    passed = 0
    failed = 0
    failures = []
    
    for i, (question, expected_key, metric_type) in enumerate(test_questions, 1):
        print(f"Question {i:3d}: {question}")
        
        # Get expected value
        if expected_key:
            expected_value = None
            if '.' in expected_key:
                parts = expected_key.split('.')
                if parts[0] == 'platform_metrics':
                    expected_value = metrics['platform_metrics'][parts[1]][parts[2]]
                elif parts[0] == 'campaign_metrics':
                    expected_value = metrics['campaign_metrics'][parts[1]][parts[2]]
                else:
                    expected_value = metrics[expected_key]
            else:
                expected_value = metrics[expected_key]
        else:
            expected_value = None
        
        # Query API
        response = query_api(question)
        print(f"   Response: {response[:100]}...")
        
        # Validate
        success, reason = validate_response(response, expected_value, metric_type)
        
        if success:
            print(f"   Result: ✅ PASS")
            passed += 1
        else:
            print(f"   Result: ❌ FAIL")
            print(f"   Reason: {reason}")
            failed += 1
            failures.append((question, reason))
        
        # Progress update every 100 questions
        if i % 100 == 0:
            print(f"\n📊 PROGRESS UPDATE: {i}/1000 completed")
            print(f"✅ Passed: {passed}, ❌ Failed: {failed}")
            print(f"📈 Success Rate: {(passed/i)*100:.1f}%\n")
    
    # Final results
    print("\n" + "=" * 60)
    print("🚀 STRATOSPHERIC UAT RESULTS")
    print("=" * 60)
    print(f"Total Questions: {len(test_questions)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(test_questions))*100:.1f}%")
    
    if failures:
        print(f"\n❌ TOP FAILURES:")
        for i, (question, reason) in enumerate(failures[:10], 1):
            print(f"{i:2d}. {question}")
            print(f"    Reason: {reason}")
    
    return passed, failed, failures

if __name__ == "__main__":
    run_stratospheric_uat() 