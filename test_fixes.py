#!/usr/bin/env python3

import urllib.request
import json
import csv
from collections import defaultdict

def load_csv_data():
    """Load and process CSV data for validation"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas
            
            data.append({
                'campaign': row['campaign_name'].strip(),
                'platform': row['platform'],
                'impressions': int(row['impressions']),
                'clicks': int(row['clicks']),
                'spend': spend,
                'revenue': revenue,
                'ctr': float(row['ctr']),
                'roas': roas,
                'cpc': float(row['cpc']),
                'cpm': float(row['cpm'])
            })
    return data

def calculate_csv_metrics(data):
    """Calculate key metrics from CSV"""
    total_spend = sum(item['spend'] for item in data)
    total_revenue = sum(item['revenue'] for item in data)
    total_conversions = sum(item.get('conversions', 0) for item in data)
    overall_roas = total_revenue / total_spend if total_spend > 0 else 0
    overall_cpa = total_spend / total_conversions if total_conversions > 0 else 0
    
    return {
        'total_spend': total_spend,
        'total_revenue': total_revenue,
        'overall_roas': overall_roas,
        'overall_cpa': overall_cpa
    }

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "test-fixes"
    }
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('content', 'No content')
    except Exception as e:
        return f"Error: {e}"

def test_critical_fixes():
    """Test the critical fixes we made"""
    print("🔥 TESTING CRITICAL FIXES 🔥")
    print("=" * 60)
    
    # Test 1: Comparative queries (were returning help messages)
    print("\n1. TESTING COMPARATIVE QUERIES:")
    comparative_tests = [
        "which platform performed best",
        "which platform is the most profitable",
        "which platform makes the most money",
        "which platform should I put more money into"
    ]
    
    for query in comparative_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Still returning help message")
        else:
            print("✅ PASS - Handler working!")
            print(f"Response: {response[:100]}...")
    
    # Test 2: Strategic insights (were returning help messages)
    print("\n\n2. TESTING STRATEGIC INSIGHTS:")
    insight_tests = [
        "what did we learn from this campaign",
        "what should I do next",
        "recommendations for next campaign"
    ]
    
    for query in insight_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Still returning help message")
        else:
            print("✅ PASS - Strategic insights working!")
            print(f"Response: {response[:100]}...")
    
    # Test 3: Campaign-specific queries (were failing)
    print("\n\n3. TESTING CAMPAIGN-SPECIFIC QUERIES:")
    campaign_tests = [
        "what is the revenue for FreshNest Summer Grilling",
        "how much did we spend on FreshNest Back to School",
        "what is the impressions for FreshNest Pantry Staples"
    ]
    
    for query in campaign_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Still returning help message")
        else:
            print("✅ PASS - Campaign handler working!")
            print(f"Response: {response[:100]}...")
    
    # Test 4: CPA calculation (was 540%+ off)
    print("\n\n4. TESTING CPA CALCULATION:")
    cpa_query = "what is our average CPA"
    response = query_api(cpa_query)
    print(f"Query: {cpa_query}")
    print(f"Response: {response}")
    
    # Test 5: Platform-specific queries (were failing)
    print("\n\n5. TESTING PLATFORM-SPECIFIC QUERIES:")
    platform_tests = [
        "what is the impressions for Meta",
        "how many clicks did Amazon get",
        "what is the spend for Dv360"
    ]
    
    for query in platform_tests:
        print(f"\nQuery: {query}")
        response = query_api(query)
        if "I understand you're asking about" in response:
            print("❌ FAIL - Still returning help message")
        else:
            print("✅ PASS - Platform handler working!")
            print(f"Response: {response[:100]}...")

if __name__ == "__main__":
    test_critical_fixes() 