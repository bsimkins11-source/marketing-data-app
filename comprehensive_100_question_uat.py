#!/usr/bin/env python3

import urllib.request
import json
import csv
import re
from collections import defaultdict
import time

def load_csv_data():
    """Load and parse the CSV data for validation"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas  # Calculate revenue from ROAS and spend
            
            data.append({
                'campaign': row['campaign_name'],
                'platform': row['platform'],
                'impressions': int(row['impressions']),
                'clicks': int(row['clicks']),
                'spend': spend,
                'revenue': revenue,
                'conversions': int(row['conversions']),
                'ctr': float(row['ctr']),
                'cpc': float(row['cpc']),
                'cpm': float(row['cpm']),
                'roas': roas
            })
    return data

def calculate_csv_metrics(data):
    """Calculate comprehensive metrics from CSV data"""
    metrics = {
        'total_impressions': sum(item['impressions'] for item in data),
        'total_clicks': sum(item['clicks'] for item in data),
        'total_spend': sum(item['spend'] for item in data),
        'total_revenue': sum(item['revenue'] for item in data),
        'total_conversions': sum(item['conversions'] for item in data),
        'overall_ctr': sum(item['clicks'] for item in data) / sum(item['impressions'] for item in data) if sum(item['impressions'] for item in data) > 0 else 0,
        'overall_cpc': sum(item['spend'] for item in data) / sum(item['clicks'] for item in data) if sum(item['clicks'] for item in data) > 0 else 0,
        'overall_cpm': (sum(item['spend'] for item in data) / sum(item['impressions'] for item in data)) * 1000 if sum(item['impressions'] for item in data) > 0 else 0,
        'overall_cpa': sum(item['spend'] for item in data) / sum(item['conversions'] for item in data) if sum(item['conversions'] for item in data) > 0 else 0,
        'overall_roas': sum(item['revenue'] for item in data) / sum(item['spend'] for item in data) if sum(item['spend'] for item in data) > 0 else 0
    }
    
    # Campaign-specific metrics
    campaign_metrics = defaultdict(lambda: {'impressions': 0, 'clicks': 0, 'spend': 0, 'revenue': 0, 'conversions': 0, 'ctr_values': [], 'roas_values': []})
    for item in data:
        campaign = item['campaign']
        campaign_metrics[campaign]['impressions'] += item['impressions']
        campaign_metrics[campaign]['clicks'] += item['clicks']
        campaign_metrics[campaign]['spend'] += item['spend']
        campaign_metrics[campaign]['revenue'] += item['revenue']
        campaign_metrics[campaign]['conversions'] += item['conversions']
        campaign_metrics[campaign]['ctr_values'].append(item['ctr'])
        campaign_metrics[campaign]['roas_values'].append(item['roas'])
    
    # Calculate averages for campaigns
    for campaign in campaign_metrics:
        ctr_values = campaign_metrics[campaign]['ctr_values']
        roas_values = campaign_metrics[campaign]['roas_values']
        campaign_metrics[campaign]['avg_ctr'] = sum(ctr_values) / len(ctr_values) if ctr_values else 0
        campaign_metrics[campaign]['avg_roas'] = sum(roas_values) / len(roas_values) if roas_values else 0
    
    # Platform-specific metrics
    platform_metrics = defaultdict(lambda: {'impressions': 0, 'clicks': 0, 'spend': 0, 'revenue': 0, 'conversions': 0, 'ctr_values': [], 'roas_values': []})
    for item in data:
        platform = item['platform']
        platform_metrics[platform]['impressions'] += item['impressions']
        platform_metrics[platform]['clicks'] += item['clicks']
        platform_metrics[platform]['spend'] += item['spend']
        platform_metrics[platform]['revenue'] += item['revenue']
        platform_metrics[platform]['conversions'] += item['conversions']
        platform_metrics[platform]['ctr_values'].append(item['ctr'])
        platform_metrics[platform]['roas_values'].append(item['roas'])
    
    # Calculate averages for platforms
    for platform in platform_metrics:
        ctr_values = platform_metrics[platform]['ctr_values']
        roas_values = platform_metrics[platform]['roas_values']
        platform_metrics[platform]['avg_ctr'] = sum(ctr_values) / len(ctr_values) if ctr_values else 0
        platform_metrics[platform]['avg_roas'] = sum(roas_values) / len(roas_values) if roas_values else 0
    
    metrics['campaign_metrics'] = dict(campaign_metrics)
    metrics['platform_metrics'] = dict(platform_metrics)
    
    return metrics

def query_api(query):
    """Query the API and return response"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query
    }
    
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    
    try:
        response = urllib.request.urlopen(req, json.dumps(data).encode('utf-8'))
        result = json.loads(response.read().decode('utf-8'))
        return result.get('content', '')
    except Exception as e:
        return f"Error: {str(e)}"

def extract_number_from_response(response, metric_type):
    """Extract numerical value from response"""
    if not response or 'Error:' in response:
        return None
    
    # Remove common prefixes and extract numbers
    response_lower = response.lower()
    
    try:
        if metric_type == 'ctr':
            # Look for percentage patterns
            match = re.search(r'(\d+\.?\d*)%', response)
            if match and match.group(1).strip():
                return float(match.group(1)) / 100
        elif metric_type == 'roas':
            # Look for ROAS patterns (e.g., "2.91x", "3.20x")
            match = re.search(r'(\d+\.?\d*)x', response)
            if match and match.group(1).strip():
                return float(match.group(1))
        elif metric_type == 'currency':
            # Look for currency patterns
            match = re.search(r'\$?([\d,]+\.?\d*)', response)
            if match and match.group(1).strip():
                return float(match.group(1).replace(',', ''))
        elif metric_type == 'number':
            # Look for general number patterns with commas
            match = re.search(r'([\d,]+\.?\d*)', response)
            if match and match.group(1).strip():
                return float(match.group(1).replace(',', ''))
    except (ValueError, AttributeError):
        return None
    
    return None

def validate_response(response, expected_value, metric_type, tolerance=0.1):
    """Validate response against expected value"""
    if not response or 'Error:' in response:
        return False, "No response or error"
    
    extracted_value = extract_number_from_response(response, metric_type)
    if extracted_value is None:
        return False, "Could not extract value from response"
    
    if expected_value == 0:
        return extracted_value == 0, f"Expected 0, got {extracted_value}"
    
    difference = abs(extracted_value - expected_value) / expected_value
    return difference <= tolerance, f"Expected {expected_value}, got {extracted_value} (diff: {difference:.2%})"

def run_comprehensive_uat():
    """Run comprehensive 100-question UAT"""
    print("Loading CSV data...")
    csv_data = load_csv_data()
    csv_metrics = calculate_csv_metrics(csv_data)
    
    print("CSV Metrics Summary:")
    print(f"  Total Impressions: {csv_metrics['total_impressions']:,}")
    print(f"  Total Clicks: {csv_metrics['total_clicks']:,}")
    print(f"  Total Spend: ${csv_metrics['total_spend']:,.2f}")
    print(f"  Total Revenue: ${csv_metrics['total_revenue']:,.2f}")
    print(f"  Overall CTR: {csv_metrics['overall_ctr']:.4f}")
    print(f"  Overall ROAS: {csv_metrics['overall_roas']:.2f}")
    print()
    
    # Comprehensive question set with varied formats
    questions = [
        # Basic metrics - different formats
        ("What is our total spend?", csv_metrics['total_spend'], 'currency'),
        ("How much did we spend in total?", csv_metrics['total_spend'], 'currency'),
        ("Total spend across all campaigns?", csv_metrics['total_spend'], 'currency'),
        ("What's our total spend?", csv_metrics['total_spend'], 'currency'),
        ("Show me the total spend", csv_metrics['total_spend'], 'currency'),
        
        ("What is our total revenue?", csv_metrics['total_revenue'], 'currency'),
        ("How much revenue did we generate?", csv_metrics['total_revenue'], 'currency'),
        ("Total revenue across all campaigns?", csv_metrics['total_revenue'], 'currency'),
        ("What's our total revenue?", csv_metrics['total_revenue'], 'currency'),
        
        ("What is our total impressions?", csv_metrics['total_impressions'], 'number'),
        ("How many impressions did we get?", csv_metrics['total_impressions'], 'number'),
        ("Total impressions across all campaigns?", csv_metrics['total_impressions'], 'number'),
        ("What's our total impressions?", csv_metrics['total_impressions'], 'number'),
        
        ("What is our total clicks?", csv_metrics['total_clicks'], 'number'),
        ("How many clicks did we get?", csv_metrics['total_clicks'], 'number'),
        ("Total clicks across all campaigns?", csv_metrics['total_clicks'], 'number'),
        ("What's our total clicks?", csv_metrics['total_clicks'], 'number'),
        
        # Overall metrics - different formats
        ("What is our overall CTR?", csv_metrics['overall_ctr'], 'ctr'),
        ("What's our overall click-through rate?", csv_metrics['overall_ctr'], 'ctr'),
        ("Overall CTR across all campaigns?", csv_metrics['overall_ctr'], 'ctr'),
        ("What is our average CTR?", csv_metrics['overall_ctr'], 'ctr'),
        ("Show me the overall CTR", csv_metrics['overall_ctr'], 'ctr'),
        
        ("What is our overall ROAS?", csv_metrics['overall_roas'], 'roas'),
        ("What's our overall return on ad spend?", csv_metrics['overall_roas'], 'roas'),
        ("Overall ROAS across all campaigns?", csv_metrics['overall_roas'], 'roas'),
        ("What is our average ROAS?", csv_metrics['overall_roas'], 'roas'),
        ("Show me the overall ROAS", csv_metrics['overall_roas'], 'roas'),
        
        ("What is our average CPC?", csv_metrics['overall_cpc'], 'currency'),
        ("What's our average cost per click?", csv_metrics['overall_cpc'], 'currency'),
        ("Average CPC across all campaigns?", csv_metrics['overall_cpc'], 'currency'),
        ("What is our overall CPC?", csv_metrics['overall_cpc'], 'currency'),
        
        ("What is our average CPM?", csv_metrics['overall_cpm'], 'currency'),
        ("What's our average cost per thousand impressions?", csv_metrics['overall_cpm'], 'currency'),
        ("Average CPM across all campaigns?", csv_metrics['overall_cpm'], 'currency'),
        ("What is our overall CPM?", csv_metrics['overall_cpm'], 'currency'),
        
        ("What is our average CPA?", csv_metrics['overall_cpa'], 'currency'),
        ("What's our average cost per acquisition?", csv_metrics['overall_cpa'], 'currency'),
        ("Average CPA across all campaigns?", csv_metrics['overall_cpa'], 'currency'),
        ("What is our overall CPA?", csv_metrics['overall_cpa'], 'currency'),
        
        # Campaign-specific queries - different formats
        ("What is the CTR for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_ctr'], 'ctr'),
        ("What's the CTR for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_ctr'], 'ctr'),
        ("FreshNest Summer Grilling CTR?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_ctr'], 'ctr'),
        ("Show me the CTR for FreshNest Summer Grilling", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_ctr'], 'ctr'),
        
        ("What is the CTR for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_ctr'], 'ctr'),
        ("What's the CTR for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_ctr'], 'ctr'),
        ("FreshNest Back to School CTR?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_ctr'], 'ctr'),
        
        ("What is the CTR for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_ctr'], 'ctr'),
        ("What's the CTR for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_ctr'], 'ctr'),
        ("FreshNest Holiday Recipes CTR?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_ctr'], 'ctr'),
        
        ("What is the CTR for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_ctr'], 'ctr'),
        ("What's the CTR for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_ctr'], 'ctr'),
        ("FreshNest Pantry Staples CTR?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_ctr'], 'ctr'),
        
        ("What is the ROAS for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_roas'], 'roas'),
        ("What's the ROAS for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_roas'], 'roas'),
        ("FreshNest Summer Grilling ROAS?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_roas'], 'roas'),
        ("What is the return on ad spend for FreshNest Summer Grilling?", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_roas'], 'roas'),
        ("Show me the ROAS for FreshNest Summer Grilling", csv_metrics['campaign_metrics']['FreshNest Summer Grilling']['avg_roas'], 'roas'),
        
        ("What is the ROAS for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_roas'], 'roas'),
        ("What's the ROAS for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_roas'], 'roas'),
        ("FreshNest Back to School ROAS?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_roas'], 'roas'),
        ("What is the return on ad spend for FreshNest Back to School?", csv_metrics['campaign_metrics']['FreshNest Back to School']['avg_roas'], 'roas'),
        
        ("What is the ROAS for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_roas'], 'roas'),
        ("What's the ROAS for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_roas'], 'roas'),
        ("FreshNest Holiday Recipes ROAS?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_roas'], 'roas'),
        ("What is the return on ad spend for FreshNest Holiday Recipes?", csv_metrics['campaign_metrics']['FreshNest Holiday Recipes']['avg_roas'], 'roas'),
        
        ("What is the ROAS for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_roas'], 'roas'),
        ("What's the ROAS for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_roas'], 'roas'),
        ("FreshNest Pantry Staples ROAS?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_roas'], 'roas'),
        ("What is the return on ad spend for FreshNest Pantry Staples?", csv_metrics['campaign_metrics']['FreshNest Pantry Staples']['avg_roas'], 'roas'),
        
        # Platform-specific queries
        ("What is the CTR for Meta?", csv_metrics['platform_metrics']['Meta']['avg_ctr'], 'ctr'),
        ("What's the CTR for Meta?", csv_metrics['platform_metrics']['Meta']['avg_ctr'], 'ctr'),
        ("Meta CTR?", csv_metrics['platform_metrics']['Meta']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for Meta?", csv_metrics['platform_metrics']['Meta']['avg_ctr'], 'ctr'),
        
        ("What is the CTR for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_ctr'], 'ctr'),
        ("What's the CTR for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_ctr'], 'ctr'),
        ("Amazon CTR?", csv_metrics['platform_metrics']['Amazon']['avg_ctr'], 'ctr'),
        ("What is the click-through rate for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_ctr'], 'ctr'),
        
        ("What is the ROAS for Meta?", csv_metrics['platform_metrics']['Meta']['avg_roas'], 'roas'),
        ("What's the ROAS for Meta?", csv_metrics['platform_metrics']['Meta']['avg_roas'], 'roas'),
        ("Meta ROAS?", csv_metrics['platform_metrics']['Meta']['avg_roas'], 'roas'),
        ("What is the return on ad spend for Meta?", csv_metrics['platform_metrics']['Meta']['avg_roas'], 'roas'),
        
        ("What is the ROAS for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_roas'], 'roas'),
        ("What's the ROAS for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_roas'], 'roas'),
        ("Amazon ROAS?", csv_metrics['platform_metrics']['Amazon']['avg_roas'], 'roas'),
        ("What is the return on ad spend for Amazon?", csv_metrics['platform_metrics']['Amazon']['avg_roas'], 'roas'),
        
        # Comparative queries
        ("Which platform has the highest CTR?", None, 'comparison'),
        ("What platform has the best CTR?", None, 'comparison'),
        ("Which platform has the highest ROAS?", None, 'comparison'),
        ("What platform has the best ROAS?", None, 'comparison'),
        ("Which campaign has the highest CTR?", None, 'comparison'),
        ("What campaign has the best CTR?", None, 'comparison'),
        ("Which campaign has the highest ROAS?", None, 'comparison'),
        ("What campaign has the best ROAS?", None, 'comparison'),
        
        # List queries
        ("What is the CTR for each campaign?", None, 'list'),
        ("Show me CTR for each campaign", None, 'list'),
        ("What is the ROAS for each campaign?", None, 'list'),
        ("Show me ROAS for each campaign", None, 'list'),
        ("What is the CTR for each platform?", None, 'list'),
        ("Show me CTR for each platform", None, 'list'),
        ("What is the ROAS for each platform?", None, 'list'),
        ("Show me ROAS for each platform", None, 'list'),
        
        # Count queries
        ("How many campaigns do we have?", len(csv_metrics['campaign_metrics']), 'number'),
        ("What is the number of campaigns?", len(csv_metrics['campaign_metrics']), 'number'),
        ("Count of campaigns?", len(csv_metrics['campaign_metrics']), 'number'),
        ("How many platforms do we have?", len(csv_metrics['platform_metrics']), 'number'),
        ("What is the number of platforms?", len(csv_metrics['platform_metrics']), 'number'),
        ("Count of platforms?", len(csv_metrics['platform_metrics']), 'number'),
        
        # Complex queries
        ("What is our total spend on Meta?", csv_metrics['platform_metrics']['Meta']['spend'], 'currency'),
        ("How much did we spend on Meta?", csv_metrics['platform_metrics']['Meta']['spend'], 'currency'),
        ("Meta spend?", csv_metrics['platform_metrics']['Meta']['spend'], 'currency'),
        
        ("What is our total spend on Amazon?", csv_metrics['platform_metrics']['Amazon']['spend'], 'currency'),
        ("How much did we spend on Amazon?", csv_metrics['platform_metrics']['Amazon']['spend'], 'currency'),
        ("Amazon spend?", csv_metrics['platform_metrics']['Amazon']['spend'], 'currency'),
        
        ("What is our total revenue from Meta?", csv_metrics['platform_metrics']['Meta']['revenue'], 'currency'),
        ("How much revenue did we get from Meta?", csv_metrics['platform_metrics']['Meta']['revenue'], 'currency'),
        ("Meta revenue?", csv_metrics['platform_metrics']['Meta']['revenue'], 'currency'),
        
        ("What is our total revenue from Amazon?", csv_metrics['platform_metrics']['Amazon']['revenue'], 'currency'),
        ("How much revenue did we get from Amazon?", csv_metrics['platform_metrics']['Amazon']['revenue'], 'currency'),
        ("Amazon revenue?", csv_metrics['platform_metrics']['Amazon']['revenue'], 'currency'),
    ]
    
    print(f"Running comprehensive UAT with {len(questions)} questions...")
    print("=" * 80)
    
    results = []
    passed = 0
    failed = 0
    
    for i, (question, expected_value, metric_type) in enumerate(questions, 1):
        print(f"Question {i}/{len(questions)}: {question}")
        
        response = query_api(question)
        print(f"  Response: {response[:100]}...")
        
        if metric_type in ['comparison', 'list']:
            # For comparison and list queries, just check if we get a meaningful response
            is_valid = len(response) > 20 and 'help' not in response.lower() and 'Error:' not in response
            validation_note = "Valid response" if is_valid else "Invalid response"
            if is_valid:
                passed += 1
            else:
                failed += 1
        else:
            # For specific metrics, validate against expected values
            is_valid, validation_note = validate_response(response, expected_value, metric_type)
            if is_valid:
                passed += 1
            else:
                failed += 1
        
        results.append({
            'question': question,
            'response': response,
            'expected': expected_value,
            'metric_type': metric_type,
            'passed': is_valid,
            'note': validation_note
        })
        
        print(f"  Result: {'✅ PASS' if is_valid else '❌ FAIL'} - {validation_note}")
        print("-" * 80)
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.5)
    
    # Summary
    print("\n" + "=" * 80)
    print("COMPREHENSIVE UAT SUMMARY")
    print("=" * 80)
    print(f"Total Questions: {len(questions)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/len(questions)*100):.1f}%")
    
    print("\nFailed Questions:")
    print("-" * 40)
    for result in results:
        if not result['passed']:
            print(f"❌ {result['question']}")
            print(f"   Expected: {result['expected']} ({result['metric_type']})")
            print(f"   Response: {result['response'][:100]}...")
            print(f"   Note: {result['note']}")
            print()
    
    return results

if __name__ == "__main__":
    run_comprehensive_uat() 