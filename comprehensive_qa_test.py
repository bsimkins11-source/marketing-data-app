import requests
import json
import csv
from collections import defaultdict
import time

# Test the deployed app
BASE_URL = "https://marketing-data-app.vercel.app"

def test_ai_query(question):
    """Test AI query endpoint"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/query",
            json={"query": question},
            timeout=30
        )
        if response.status_code == 200:
            return response.json().get('response', '')
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

def validate_response(question, ai_response, csv_data):
    """Validate AI response against CSV data"""
    # This will be implemented based on question type
    return True, "Validation logic to be implemented"

# 100 Marketing Questions for Testing
MARKETING_QUESTIONS = [
    # Basic Metrics
    "What is the total spend across all campaigns?",
    "What is the total revenue generated?",
    "What is the overall ROAS?",
    "What is the average CTR?",
    "What is the total number of impressions?",
    "What is the total number of clicks?",
    "What is the total number of conversions?",
    "What is the average CPC?",
    "What is the average CPM?",
    "What is the average CPA?",
    
    # Platform Analysis
    "Which platform has the highest CTR?",
    "Which platform has the highest ROAS?",
    "Which platform has the highest spend?",
    "Which platform has the most impressions?",
    "Which platform has the most clicks?",
    "Which platform has the most conversions?",
    "What is the average CTR for Meta?",
    "What is the average CTR for Amazon?",
    "What is the average CTR for Dv360?",
    "What is the average CTR for Cm360?",
    "What is the average CTR for Sa360?",
    "What is the average CTR for Tradedesk?",
    "What is the ROAS for Meta?",
    "What is the ROAS for Amazon?",
    "What is the ROAS for Dv360?",
    "What is the ROAS for Cm360?",
    "What is the ROAS for Sa360?",
    "What is the ROAS for Tradedesk?",
    
    # Campaign Analysis
    "What are the top 3 campaigns by CTR?",
    "What are the top 3 campaigns by ROAS?",
    "What are the top 3 campaigns by spend?",
    "What are the top 3 campaigns by impressions?",
    "What are the top 3 campaigns by clicks?",
    "What are the top 3 campaigns by conversions?",
    "What is the average CTR for each campaign?",
    "What is the average ROAS for each campaign?",
    "What is the average CPC for each campaign?",
    "What is the average CPA for each campaign?",
    "Which campaign has the highest CTR?",
    "Which campaign has the highest ROAS?",
    "Which campaign has the highest spend?",
    "Which campaign has the most impressions?",
    "Which campaign has the most clicks?",
    "Which campaign has the most conversions?",
    
    # Performance Analysis
    "What is the best performing campaign?",
    "What is the worst performing campaign?",
    "Which campaigns are underperforming?",
    "Which campaigns are overperforming?",
    "What is the performance by creative format?",
    "What is the performance by ad group?",
    "What is the performance by placement?",
    
    # Comparative Analysis
    "Compare Meta vs Amazon performance",
    "Compare Dv360 vs Cm360 performance",
    "Compare Sa360 vs Tradedesk performance",
    "Which platform is most cost-effective?",
    "Which platform has the best conversion rate?",
    "Which platform has the lowest CPC?",
    "Which platform has the lowest CPM?",
    "Which platform has the lowest CPA?",
    
    # Trend Analysis
    "What is the performance trend over time?",
    "Which campaigns are improving?",
    "Which campaigns are declining?",
    "What is the daily performance?",
    "What is the weekly performance?",
    "What is the monthly performance?",
    
    # Budget Analysis
    "How much budget is allocated to each platform?",
    "How much budget is allocated to each campaign?",
    "What is the budget efficiency by platform?",
    "What is the budget efficiency by campaign?",
    "Which campaigns are over budget?",
    "Which campaigns are under budget?",
    
    # Creative Analysis
    "What is the performance by creative format?",
    "Which creative format has the highest CTR?",
    "Which creative format has the highest ROAS?",
    "What is the performance by creative name?",
    "Which creative is performing best?",
    "Which creative is performing worst?",
    
    # Geographic Analysis
    "What is the performance by location?",
    "Which locations are performing best?",
    "Which locations are performing worst?",
    "What is the regional performance?",
    
    # Device Analysis
    "What is the performance by device?",
    "Which device has the highest CTR?",
    "Which device has the highest ROAS?",
    "What is the mobile vs desktop performance?",
    
    # Audience Analysis
    "What is the performance by audience?",
    "Which audience segments are performing best?",
    "Which audience segments are performing worst?",
    "What is the demographic performance?",
    
    # Optimization Questions
    "What should I optimize for better CTR?",
    "What should I optimize for better ROAS?",
    "Which campaigns should I pause?",
    "Which campaigns should I scale?",
    "What is the recommended budget allocation?",
    "What is the recommended bid strategy?",
    
    # Reporting Questions
    "Generate a performance report",
    "Create a summary of top performers",
    "Show me the key metrics",
    "What are the main insights?",
    "What are the recommendations?",
    "What are the risks and opportunities?",
    
    # Specific Campaign Questions
    "How is FreshNest Summer Grilling performing?",
    "How is FreshNest Back to School performing?",
    "How is FreshNest Holiday Recipes performing?",
    "How is FreshNest Pantry Staples performing?",
    "What is the CTR for FreshNest Summer Grilling?",
    "What is the ROAS for FreshNest Back to School?",
    "What is the spend for FreshNest Holiday Recipes?",
    "What is the impressions for FreshNest Pantry Staples?",
    
    # Complex Analysis
    "What is the correlation between spend and ROAS?",
    "What is the correlation between impressions and CTR?",
    "What is the correlation between clicks and conversions?",
    "What is the efficiency ratio by platform?",
    "What is the efficiency ratio by campaign?",
    "What is the cost per acquisition by platform?",
    "What is the cost per acquisition by campaign?",
    
    # Comparative Metrics
    "Which platform has the best cost per conversion?",
    "Which campaign has the best cost per conversion?",
    "What is the conversion rate by platform?",
    "What is the conversion rate by campaign?",
    "What is the click-through rate by platform?",
    "What is the click-through rate by campaign?",
    
    # Summary Questions
    "Give me a summary of all metrics",
    "What are the key performance indicators?",
    "What is the overall campaign health?",
    "What are the main success factors?",
    "What are the main challenges?",
    "What are the next steps?",
    
    # Edge Cases
    "What is the performance for campaigns with zero conversions?",
    "What is the performance for campaigns with high spend but low ROAS?",
    "What is the performance for campaigns with low spend but high ROAS?",
    "Which campaigns have the highest variance in performance?",
    "Which campaigns have the most consistent performance?",
    
    # Specific Date Questions
    "What was the performance on 2024-06-01?",
    "What was the performance on 2024-06-15?",
    "What was the performance on 2024-06-30?",
    "What was the best performing day?",
    "What was the worst performing day?",
    
    # Aggregation Questions
    "What is the total performance across all platforms?",
    "What is the total performance across all campaigns?",
    "What is the average performance across all platforms?",
    "What is the average performance across all campaigns?",
    "What is the median performance across all platforms?",
    "What is the median performance across all campaigns?"
]

def run_comprehensive_test():
    """Run comprehensive test of all questions"""
    print("Starting Comprehensive QA Test...")
    print("=" * 60)
    
    csv_data = get_csv_data()
    results = []
    
    for i, question in enumerate(MARKETING_QUESTIONS, 1):
        print(f"Testing Question {i}/100: {question}")
        
        # Test AI response
        ai_response = test_ai_query(question)
        
        # Validate response
        is_valid, validation_note = validate_response(question, ai_response, csv_data)
        
        result = {
            'question_number': i,
            'question': question,
            'ai_response': ai_response,
            'is_valid': is_valid,
            'validation_note': validation_note
        }
        results.append(result)
        
        # Add delay to avoid rate limiting
        time.sleep(0.5)
        
        # Print progress
        if i % 10 == 0:
            print(f"Completed {i}/100 questions...")
    
    # Analyze results
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    valid_responses = sum(1 for r in results if r['is_valid'])
    print(f"Valid Responses: {valid_responses}/100 ({valid_responses}%)")
    print(f"Invalid Responses: {100-valid_responses}/100 ({100-valid_responses}%)")
    
    # Show failed questions
    failed_questions = [r for r in results if not r['is_valid']]
    if failed_questions:
        print(f"\nFailed Questions ({len(failed_questions)}):")
        for r in failed_questions:
            print(f"Q{r['question_number']}: {r['question']}")
            print(f"   Response: {r['ai_response'][:100]}...")
            print(f"   Note: {r['validation_note']}")
            print()
    
    return results

if __name__ == "__main__":
    results = run_comprehensive_test() 