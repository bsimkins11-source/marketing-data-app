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

def validate_response(question, ai_response, csv_metrics):
    """Validate AI response against expected CSV data"""
    lower_question = question.lower()
    lower_response = ai_response.lower()
    
    # Check if response contains error indicators
    if 'error' in lower_response or 'exception' in lower_response:
        return False, f"Response contains error: {ai_response}"
    
    # Check if response is just a help message
    if 'try asking about' in lower_response or 'i can help you' in lower_response:
        return False, "Response is generic help message instead of specific answer"
    
    # Validate total spend queries
    if 'total spend' in lower_question or 'spend across all' in lower_question:
        expected_spend = csv_metrics['total_spend']
        # Look for dollar amounts in response
        spend_match = re.search(r'\$([\d,]+\.?\d*)', ai_response)
        if spend_match:
            response_spend = float(spend_match.group(1).replace(',', ''))
            if abs(response_spend - expected_spend) < 1:  # Allow small rounding differences
                return True, "Spend amount matches"
            else:
                return False, f"Spend mismatch: expected ${expected_spend:,.2f}, got ${response_spend:,.2f}"
        else:
            return False, "No spend amount found in response"
    
    # Validate average CTR queries
    if 'average ctr' in lower_question and 'each campaign' not in lower_question:
        expected_ctr = csv_metrics['average_ctr']
        # Look for percentage in response
        ctr_match = re.search(r'(\d+\.?\d*)%', ai_response)
        if ctr_match:
            response_ctr = float(ctr_match.group(1)) / 100
            if abs(response_ctr - expected_ctr) < 0.001:  # Allow small differences
                return True, "CTR percentage matches"
            else:
                return False, f"CTR mismatch: expected {expected_ctr*100:.2f}%, got {response_ctr*100:.2f}%"
        else:
            return False, "No CTR percentage found in response"
    
    # Validate platform CTR ranking
    if 'platform' in lower_question and 'highest ctr' in lower_question:
        platform_ctr = sorted(csv_metrics['platform_metrics'].items(), 
                             key=lambda x: x[1]['ctr'], reverse=True)
        expected_top_platform = platform_ctr[0][0]
        if expected_top_platform.lower() in lower_response:
            return True, f"Top platform {expected_top_platform} found in response"
        else:
            return False, f"Expected top platform {expected_top_platform} not found in response"
    
    # Validate campaign CTR ranking
    if 'top 3 campaigns by ctr' in lower_question:
        # This would require more complex validation of campaign data
        if 'freshnest' in lower_response and '%' in lower_response:
            return True, "Campaign CTR ranking appears correct"
        else:
            return False, "Campaign CTR ranking format incorrect"
    
    # Validate "each campaign" queries
    if 'each campaign' in lower_question and 'ctr' in lower_question:
        if 'freshnest' in lower_response and '%' in lower_response and len(re.findall(r'\d+\.\d+%', ai_response)) >= 3:
            return True, "Campaign breakdown appears correct"
        else:
            return False, "Campaign breakdown format incorrect"
    
    # For other queries, just check if response is not empty and not error
    if len(ai_response.strip()) > 10 and 'error' not in lower_response:
        return True, "Response appears valid"
    else:
        return False, "Response too short or contains errors"
    
    return True, "Validation passed"

# Comprehensive test questions covering all major use cases
UI_TEST_QUESTIONS = [
    # Basic Metrics (10 questions)
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
    
    # Platform Analysis (15 questions)
    "Which platform has the highest CTR?",
    "Which platform has the highest ROAS?",
    "Which platform has the highest spend?",
    "Which platform has the most impressions?",
    "Which platform has the most clicks?",
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
    
    # Campaign Analysis (15 questions)
    "What are the top 3 campaigns by CTR?",
    "What are the top 3 campaigns by ROAS?",
    "What are the top 3 campaigns by spend?",
    "What are the top 3 campaigns by impressions?",
    "What are the top 3 campaigns by clicks?",
    "What is the average CTR for each campaign?",
    "What is the average ROAS for each campaign?",
    "What is the average CPC for each campaign?",
    "What is the average CPA for each campaign?",
    "Which campaign has the highest CTR?",
    "Which campaign has the highest ROAS?",
    "Which campaign has the highest spend?",
    "Which campaign has the most impressions?",
    "Which campaign has the most clicks?",
    "How many campaigns are there?",
    
    # Performance Analysis (10 questions)
    "What is the best performing campaign?",
    "What is the worst performing campaign?",
    "Which campaigns are underperforming?",
    "Which campaigns are overperforming?",
    "What is the performance by creative format?",
    "What is the performance by ad group?",
    "What is the performance by placement?",
    "Show me the key metrics",
    "What are the main insights?",
    "What are the recommendations?",
    
    # Comparative Analysis (10 questions)
    "Compare Meta vs Amazon performance",
    "Compare Dv360 vs Cm360 performance",
    "Compare Sa360 vs Tradedesk performance",
    "Which platform is most cost-effective?",
    "Which platform has the best conversion rate?",
    "Which platform has the lowest CPC?",
    "Which platform has the lowest CPM?",
    "Which platform has the lowest CPA?",
    "What is the correlation between spend and ROAS?",
    "What is the correlation between impressions and CTR?",
    
    # Specific Campaign Questions (10 questions)
    "How is FreshNest Summer Grilling performing?",
    "How is FreshNest Back to School performing?",
    "How is FreshNest Holiday Recipes performing?",
    "How is FreshNest Pantry Staples performing?",
    "What is the CTR for FreshNest Summer Grilling?",
    "What is the ROAS for FreshNest Back to School?",
    "What is the spend for FreshNest Holiday Recipes?",
    "What is the impressions for FreshNest Pantry Staples?",
    "Which FreshNest campaign is performing best?",
    "Which FreshNest campaign has the highest CTR?",
    
    # Optimization Questions (10 questions)
    "What should I optimize for better CTR?",
    "What should I optimize for better ROAS?",
    "Which campaigns should I pause?",
    "Which campaigns should I scale?",
    "What is the recommended budget allocation?",
    "What is the recommended bid strategy?",
    "What are the risks and opportunities?",
    "What are the next steps?",
    "What is the overall campaign health?",
    "What are the main success factors?",
    
    # Edge Cases (10 questions)
    "What is the performance for campaigns with zero conversions?",
    "What is the performance for campaigns with high spend but low ROAS?",
    "What is the performance for campaigns with low spend but high ROAS?",
    "Which campaigns have the highest variance in performance?",
    "Which campaigns have the most consistent performance?",
    "What was the performance on 2024-06-01?",
    "What was the performance on 2024-06-15?",
    "What was the performance on 2024-06-30?",
    "What was the best performing day?",
    "What was the worst performing day?",
    
    # Complex Analysis (10 questions)
    "What is the efficiency ratio by platform?",
    "What is the efficiency ratio by campaign?",
    "What is the cost per acquisition by platform?",
    "What is the cost per acquisition by campaign?",
    "Which platform has the best cost per conversion?",
    "Which campaign has the best cost per conversion?",
    "What is the conversion rate by platform?",
    "What is the conversion rate by campaign?",
    "What is the click-through rate by platform?",
    "What is the click-through rate by campaign?"
]

def run_ui_comprehensive_test():
    """Run comprehensive UI test"""
    print("Starting Comprehensive UI QA Test...")
    print("=" * 80)
    print(f"Testing {len(UI_TEST_QUESTIONS)} questions against the actual UI")
    print("=" * 80)
    
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
    valid_count = 0
    invalid_count = 0
    
    for i, question in enumerate(UI_TEST_QUESTIONS, 1):
        print(f"Testing Question {i}/{len(UI_TEST_QUESTIONS)}: {question}")
        
        # Test AI response through UI
        ai_response = test_ui_ai_query(question)
        
        # Validate response
        is_valid, validation_note = validate_response(question, ai_response, csv_metrics)
        
        if is_valid:
            valid_count += 1
            status = "✓ PASS"
        else:
            invalid_count += 1
            status = "✗ FAIL"
        
        print(f"  {status}: {validation_note}")
        print(f"  Response: {ai_response[:100]}{'...' if len(ai_response) > 100 else ''}")
        print("-" * 80)
        
        result = {
            'question_number': i,
            'question': question,
            'ai_response': ai_response,
            'is_valid': is_valid,
            'validation_note': validation_note
        }
        results.append(result)
        
        # Add delay to avoid rate limiting
        time.sleep(1)
        
        # Print progress every 10 questions
        if i % 10 == 0:
            print(f"\nProgress: {i}/{len(UI_TEST_QUESTIONS)} questions completed")
            print(f"Current Score: {valid_count}/{i} ({valid_count/i*100:.1f}%)\n")
    
    # Final analysis
    print("\n" + "=" * 80)
    print("FINAL TEST RESULTS")
    print("=" * 80)
    
    print(f"Total Questions Tested: {len(UI_TEST_QUESTIONS)}")
    print(f"Valid Responses: {valid_count} ({valid_count/len(UI_TEST_QUESTIONS)*100:.1f}%)")
    print(f"Invalid Responses: {invalid_count} ({invalid_count/len(UI_TEST_QUESTIONS)*100:.1f}%)")
    
    # Show failed questions
    failed_questions = [r for r in results if not r['is_valid']]
    if failed_questions:
        print(f"\nFailed Questions ({len(failed_questions)}):")
        print("-" * 40)
        for r in failed_questions:
            print(f"Q{r['question_number']}: {r['question']}")
            print(f"   Response: {r['ai_response'][:100]}...")
            print(f"   Note: {r['validation_note']}")
            print()
    
    # Show success rate by category
    print("Success Rate by Category:")
    print("-" * 40)
    categories = {
        'Basic Metrics': range(1, 11),
        'Platform Analysis': range(11, 26),
        'Campaign Analysis': range(26, 41),
        'Performance Analysis': range(41, 51),
        'Comparative Analysis': range(51, 61),
        'Specific Campaign': range(61, 71),
        'Optimization': range(71, 81),
        'Edge Cases': range(81, 91),
        'Complex Analysis': range(91, 101)
    }
    
    for category, question_range in categories.items():
        category_results = [r for r in results if r['question_number'] in question_range]
        category_valid = sum(1 for r in category_results if r['is_valid'])
        category_total = len(category_results)
        success_rate = category_valid / category_total * 100 if category_total > 0 else 0
        print(f"{category}: {category_valid}/{category_total} ({success_rate:.1f}%)")
    
    return results, csv_metrics

if __name__ == "__main__":
    results, csv_metrics = run_ui_comprehensive_test() 