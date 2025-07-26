#!/usr/bin/env python3
"""
Analyze First 100 Questions - Focused Analysis
"""

import urllib.request
import json
import csv
from collections import defaultdict
import re
import time

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
            conversions = int(row['conversions'])
            cpa = spend / conversions if conversions > 0 else 0
            
            data.append({
                'campaign_name': row['campaign_name'].strip(),
                'platform': row['platform'].strip(),
                'impressions': int(row['impressions']),
                'clicks': int(row['clicks']),
                'conversions': conversions,
                'spend': spend,
                'revenue': revenue,
                'ctr': float(row['ctr']),
                'cpc': float(row['cpc']),
                'cpa': cpa,
                'roas': roas
            })
    return data

def calculate_csv_metrics(data):
    """Calculate expected metrics from CSV"""
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
        # Look for percentage patterns
        patterns = [
            r'(\d+\.?\d*)%',
            r'(\d+\.?\d*)\s*percent',
            r'(\d+\.?\d*)\s*per\s*cent'
        ]
    elif metric_type == 'currency':
        # Look for currency patterns
        patterns = [
            r'\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*dollars?',
            r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*USD'
        ]
    else:
        # Look for general number patterns - be more specific to avoid matching platform names
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
    
    extracted_value = extract_number_from_response(response, metric_type)
    if extracted_value is None:
        return False, "Could not extract number from response"
    
    if metric_type == 'percentage':
        # Convert expected to decimal for comparison
        expected_decimal = expected_value
        difference = abs(extracted_value - expected_decimal)
        return difference <= tolerance, f"Expected {expected_decimal:.4f}, got {extracted_value:.4f}"
    else:
        difference = abs(extracted_value - expected_value)
        return difference <= tolerance, f"Expected {expected_value}, got {extracted_value}"

def run_first_100_analysis():
    """Analyze first 100 questions in detail"""
    print("🔍 ANALYZING FIRST 100 QUESTIONS")
    print("=" * 60)
    
    # Load data
    print("📊 Loading CSV data...")
    data = load_csv_data()
    metrics = calculate_csv_metrics(data)
    
    # First 100 questions from the comprehensive test
    test_questions = [
        # Overall metrics
        ("What is our total spend?", metrics['total_spend'], 'currency'),
        ("How much revenue did we generate?", metrics['total_revenue'], 'currency'),
        ("What is our total impressions?", metrics['total_impressions'], 'number'),
        ("How many clicks did we get?", metrics['total_clicks'], 'number'),
        ("What is our overall CTR?", metrics['overall_ctr'], 'percentage'),
        ("What is our overall ROAS?", metrics['overall_roas'], 'number'),
        ("What is our average CPA?", metrics['overall_cpa'], 'currency'),
        
        # Platform comparative queries
        ("Which platform performed best?", None, 'comparative'),
        ("Which platform had the highest ROAS?", None, 'comparative'),
        ("Which platform spent the most?", None, 'comparative'),
        ("Which platform generated the most revenue?", None, 'comparative'),
        ("Which platform had the most impressions?", None, 'comparative'),
        ("Which platform got the most clicks?", None, 'comparative'),
        
        # Strategic insights
        ("What did we learn from this campaign?", None, 'insights'),
        ("What should I apply to the next campaign?", None, 'insights'),
        ("What are the key insights from this data?", None, 'insights'),
        
        # Platform-specific metrics
        ("What is the CTR for Meta?", metrics['platform_metrics']['Meta']['ctr'], 'percentage'),
        ("What is the ROAS for Amazon?", metrics['platform_metrics']['Amazon']['roas'], 'number'),
        ("How much did we spend on Dv360?", metrics['platform_metrics']['Dv360']['spend'], 'currency'),
        ("What revenue did Meta generate?", metrics['platform_metrics']['Meta']['revenue'], 'currency'),
        
        # Campaign-specific metrics
        ("What is the CTR for FreshNest Summer Grilling?", metrics['campaign_metrics']['FreshNest Summer Grilling']['ctr'], 'percentage'),
        ("What is the ROAS for FreshNest Back to School?", metrics['campaign_metrics']['FreshNest Back to School']['roas'], 'number'),
        ("How much did we spend on FreshNest Holiday Recipes?", metrics['campaign_metrics']['FreshNest Holiday Recipes']['spend'], 'currency'),
        
        # Pattern variations
        ("What's our total spend?", metrics['total_spend'], 'currency'),
        ("How much money did we spend?", metrics['total_spend'], 'currency'),
        ("What's our overall click-through rate?", metrics['overall_ctr'], 'percentage'),
        ("What's our return on ad spend?", metrics['overall_roas'], 'number'),
        ("Which platform was the best?", None, 'comparative'),
        ("Which platform had the best performance?", None, 'comparative'),
        ("What platform should I put more money into?", None, 'insights'),
    ]
    
    # Generate additional questions to reach 100
    additional_questions = []
    
    # Platform-specific questions
    for platform in ['Meta', 'Amazon', 'Dv360', 'Cm360', 'Sa360', 'Tradedesk']:
        additional_questions.extend([
            (f"What is the CTR for {platform}?", metrics['platform_metrics'][platform]['ctr'], 'percentage'),
            (f"What is the ROAS for {platform}?", metrics['platform_metrics'][platform]['roas'], 'number'),
            (f"How much did we spend on {platform}?", metrics['platform_metrics'][platform]['spend'], 'currency'),
            (f"What revenue did {platform} generate?", metrics['platform_metrics'][platform]['revenue'], 'currency'),
            (f"How many impressions did {platform} get?", metrics['platform_metrics'][platform]['impressions'], 'number'),
            (f"How many clicks did {platform} get?", metrics['platform_metrics'][platform]['clicks'], 'number'),
        ])
    
    # Campaign-specific questions
    for campaign in ['FreshNest Summer Grilling', 'FreshNest Back to School', 'FreshNest Holiday Recipes', 'FreshNest Pantry Staples']:
        additional_questions.extend([
            (f"What is the CTR for {campaign}?", metrics['campaign_metrics'][campaign]['ctr'], 'percentage'),
            (f"What is the ROAS for {campaign}?", metrics['campaign_metrics'][campaign]['roas'], 'number'),
            (f"How much did we spend on {campaign}?", metrics['campaign_metrics'][campaign]['spend'], 'currency'),
            (f"What revenue did {campaign} generate?", metrics['campaign_metrics'][campaign]['revenue'], 'currency'),
        ])
    
    # Combine and trim to 100
    all_questions = test_questions + additional_questions
    all_questions = all_questions[:100]
    
    print(f"📝 Testing {len(all_questions)} questions...")
    print()
    
    results = []
    passed = 0
    failed = 0
    
    for i, (question, expected, metric_type) in enumerate(all_questions, 1):
        print(f"Question {i:3d}: {question}")
        
        try:
            response = query_api(question)
            
            if metric_type == 'comparative':
                # For comparative queries, just check if we get a meaningful response
                if response and len(response) > 50 and 'error' not in response.lower():
                    results.append((question, True, "Comparative query returned meaningful response"))
                    passed += 1
                else:
                    results.append((question, False, "Comparative query failed"))
                    failed += 1
            elif metric_type == 'insights':
                # For insights queries, check if we get strategic content
                if response and ('insight' in response.lower() or 'recommend' in response.lower() or 'performance' in response.lower()):
                    results.append((question, True, "Insights query returned strategic content"))
                    passed += 1
                else:
                    results.append((question, False, "Insights query failed"))
                    failed += 1
            else:
                # For metric queries, validate against expected values
                success, message = validate_response(response, expected, metric_type)
                results.append((question, success, message))
                if success:
                    passed += 1
                else:
                    failed += 1
            
            print(f"   Response: {response[:150]}...")
            print(f"   Result: {'✅ PASS' if results[-1][1] else '❌ FAIL'}")
            if not results[-1][1]:
                print(f"   Reason: {results[-1][2]}")
            print()
            
            # Small delay to avoid overwhelming the API
            time.sleep(0.1)
            
        except Exception as e:
            results.append((question, False, f"Exception: {str(e)}"))
            failed += 1
            print(f"   Error: {str(e)}")
            print()
    
    # Summary
    print("=" * 60)
    print("📊 FIRST 100 ANALYSIS RESULTS")
    print("=" * 60)
    print(f"Total Questions: {len(all_questions)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(all_questions)*100):.1f}%")
    print()
    
    # Analyze failures by category
    failed_questions = [r for r in results if not r[1]]
    
    print("❌ FAILURE ANALYSIS BY CATEGORY:")
    print()
    
    # Categorize failures
    platform_specific_failures = []
    campaign_specific_failures = []
    pattern_variation_failures = []
    other_failures = []
    
    for question, success, message in failed_questions:
        if "for Meta" in question or "for Amazon" in question or "for Dv360" in question or "for Cm360" in question or "for Sa360" in question or "for Tradedesk" in question:
            platform_specific_failures.append((question, message))
        elif "for FreshNest" in question:
            campaign_specific_failures.append((question, message))
        elif "What's" in question or "How much money" in question:
            pattern_variation_failures.append((question, message))
        else:
            other_failures.append((question, message))
    
    if platform_specific_failures:
        print(f"🔴 Platform-specific failures ({len(platform_specific_failures)}):")
        for question, message in platform_specific_failures[:5]:  # Show first 5
            print(f"   • {question}")
            print(f"     Reason: {message}")
        print()
    
    if campaign_specific_failures:
        print(f"🔴 Campaign-specific failures ({len(campaign_specific_failures)}):")
        for question, message in campaign_specific_failures[:5]:  # Show first 5
            print(f"   • {question}")
            print(f"     Reason: {message}")
        print()
    
    if pattern_variation_failures:
        print(f"🔴 Pattern variation failures ({len(pattern_variation_failures)}):")
        for question, message in pattern_variation_failures[:5]:  # Show first 5
            print(f"   • {question}")
            print(f"     Reason: {message}")
        print()
    
    if other_failures:
        print(f"🔴 Other failures ({len(other_failures)}):")
        for question, message in other_failures[:5]:  # Show first 5
            print(f"   • {question}")
            print(f"     Reason: {message}")
        print()
    
    return results

if __name__ == "__main__":
    run_first_100_analysis() 