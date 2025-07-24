import requests
import json
import csv
from collections import defaultdict
import time
import re

# Test the actual UI
BASE_URL = "https://marketing-data-app.vercel.app"

def test_ui_ai_query(question):
    """Test AI query through the UI interface"""
    try:
        # First, get the AI analysis page to ensure it's loaded
        page_response = requests.get(f"{BASE_URL}/ai-analysis", timeout=30)
        if page_response.status_code != 200:
            return f"Error loading page: {page_response.status_code}"
        
        # Then test the AI query endpoint
        response = requests.post(
            f"{BASE_URL}/api/ai/query",
            json={"query": question},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('content', '')
        else:
            return f"Error: {response.status_code}"
    except Exception as e:
        return f"Exception: {str(e)}"

def get_csv_data():
    """Load CSV data for validation"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append(row)
    return data

def calculate_csv_metrics(csv_data):
    """Calculate key metrics from CSV data for validation"""
    metrics = {}
    
    # Total metrics
    total_spend = sum(float(row['spend']) for row in csv_data)
    total_impressions = sum(int(row['impressions']) for row in csv_data)
    total_clicks = sum(int(row['clicks']) for row in csv_data)
    total_conversions = sum(int(row['conversions']) for row in csv_data)
    
    # Calculate revenue (assuming ROAS * spend)
    total_revenue = sum(float(row['spend']) * float(row['roas']) for row in csv_data)
    
    metrics['total_spend'] = total_spend
    metrics['total_revenue'] = total_revenue
    metrics['total_impressions'] = total_impressions
    metrics['total_clicks'] = total_clicks
    metrics['total_conversions'] = total_conversions
    metrics['overall_roas'] = total_revenue / total_spend if total_spend > 0 else 0
    metrics['average_ctr'] = total_clicks / total_impressions if total_impressions > 0 else 0
    metrics['average_cpc'] = total_spend / total_clicks if total_clicks > 0 else 0
    metrics['average_cpm'] = (total_spend / total_impressions) * 1000 if total_impressions > 0 else 0
    metrics['average_cpa'] = total_spend / total_conversions if total_conversions > 0 else 0
    
    # Platform metrics
    platform_data = defaultdict(lambda: {'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0, 'revenue': 0})
    
    for row in csv_data:
        platform = row['platform']
        platform_data[platform]['spend'] += float(row['spend'])
        platform_data[platform]['impressions'] += int(row['impressions'])
        platform_data[platform]['clicks'] += int(row['clicks'])
        platform_data[platform]['conversions'] += int(row['conversions'])
        platform_data[platform]['revenue'] += float(row['spend']) * float(row['roas'])
    
    platform_metrics = {}
    for platform, data in platform_data.items():
        platform_metrics[platform] = {
            'ctr': data['clicks'] / data['impressions'] if data['impressions'] > 0 else 0,
            'roas': data['revenue'] / data['spend'] if data['spend'] > 0 else 0,
            'spend': data['spend'],
            'impressions': data['impressions'],
            'clicks': data['clicks'],
            'conversions': data['conversions']
        }
    
    metrics['platform_metrics'] = platform_metrics
    
    return metrics

# Quick test with key questions
QUICK_TEST_QUESTIONS = [
    "What is the total spend across all campaigns?",
    "What is the average CTR?",
    "Which platform has the highest CTR?",
    "What are the top 3 campaigns by CTR?",
    "What is the average CTR for each campaign?",
    "What is the average CTR for Meta?",
    "How many campaigns are there?",
    "What is the overall ROAS?",
    "Which platform has the highest ROAS?",
    "What is the average ROAS for each campaign?"
]

def run_quick_ui_test():
    """Run quick UI test with key questions"""
    print("Starting Quick UI QA Test...")
    print("=" * 60)
    print(f"Testing {len(QUICK_TEST_QUESTIONS)} key questions against the actual UI")
    print("=" * 60)
    
    csv_data = get_csv_data()
    csv_metrics = calculate_csv_metrics(csv_data)
    
    print("CSV Data Summary:")
    print(f"Total Spend: ${csv_metrics['total_spend']:,.2f}")
    print(f"Total Revenue: ${csv_metrics['total_revenue']:,.2f}")
    print(f"Overall ROAS: {csv_metrics['overall_roas']:.2f}")
    print(f"Average CTR: {csv_metrics['average_ctr']:.4f} ({csv_metrics['average_ctr']*100:.2f}%)")
    print()
    
    print("Platform CTR Rankings (Expected):")
    platform_ctr = sorted(csv_metrics['platform_metrics'].items(), 
                         key=lambda x: x[1]['ctr'], reverse=True)
    for i, (platform, data) in enumerate(platform_ctr, 1):
        print(f"{i}. {platform}: {data['ctr']:.4f} ({data['ctr']*100:.2f}%)")
    print()
    
    results = []
    
    for i, question in enumerate(QUICK_TEST_QUESTIONS, 1):
        print(f"Testing Question {i}: {question}")
        
        # Test AI response through UI
        ai_response = test_ui_ai_query(question)
        print(f"AI Response: {ai_response}")
        print("-" * 60)
        
        results.append({
            'question': question,
            'ai_response': ai_response
        })
        
        # Add delay to avoid rate limiting
        time.sleep(1)
    
    return results, csv_metrics

if __name__ == "__main__":
    results, csv_metrics = run_quick_ui_test() 