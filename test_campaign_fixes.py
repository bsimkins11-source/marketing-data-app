import urllib.request
import urllib.parse
import json
import csv
from collections import defaultdict
import time
import re

# Test the actual UI
BASE_URL = "https://marketing-data-app.vercel.app"

def test_ui_ai_query(question):
    """Test AI query through the actual UI interface"""
    try:
        # First, get the AI analysis page to ensure it's loaded
        page_response = urllib.request.urlopen(f"{BASE_URL}/ai-analysis", timeout=30)
        if page_response.getcode() != 200:
            return f"Error loading page: {page_response.getcode()}"
        
        # Then test the AI query endpoint
        data = json.dumps({"query": question}).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/api/ai/query",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('content', '')
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

def calculate_campaign_metrics(csv_data):
    """Calculate campaign metrics from CSV data"""
    campaign_data = defaultdict(lambda: {'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0, 'revenue': 0, 'ctr_values': []})
    
    for row in csv_data:
        campaign = row['campaign_name'].strip()
        campaign_data[campaign]['spend'] += float(row['spend'])
        campaign_data[campaign]['impressions'] += int(row['impressions'])
        campaign_data[campaign]['clicks'] += int(row['clicks'])
        campaign_data[campaign]['conversions'] += int(row['conversions'])
        campaign_data[campaign]['revenue'] += float(row['spend']) * float(row['roas'])
        campaign_data[campaign]['ctr_values'].append(float(row['ctr']))
    
    campaign_metrics = {}
    for campaign, data in campaign_data.items():
        campaign_ctr = sum(data['ctr_values']) / len(data['ctr_values']) if data['ctr_values'] else 0
        campaign_metrics[campaign] = {
            'ctr': campaign_ctr,
            'roas': data['revenue'] / data['spend'] if data['spend'] > 0 else 0,
            'spend': data['spend']
        }
    
    return campaign_metrics

def validate_campaign_response(question, ai_response, expected_metrics):
    """Validate campaign-specific responses"""
    lower_question = question.lower()
    lower_response = ai_response.lower()
    
    # Check if response contains error indicators
    if 'error' in lower_response or 'exception' in lower_response:
        return False, f"Response contains error: {ai_response}"
    
    # Check if response is just a help message
    if 'try asking about' in lower_response and len(ai_response) < 200:
        return False, "Response is generic help message instead of specific answer"
    
    # Check for specific campaign names
    campaign_names = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
    detected_campaign = None
    for campaign in campaign_names:
        if campaign in lower_question:
            detected_campaign = campaign
            break
    
    if detected_campaign:
        # Normalize campaign name
        normalized_campaign = ' '.join(word.capitalize() for word in detected_campaign.split(' '))
        
        campaign_metrics = expected_metrics.get(normalized_campaign, {})
        
        # Check for CTR
        if 'ctr' in lower_question:
            expected_ctr = campaign_metrics.get('ctr', 0)
            ctr_match = re.search(r'(\d+\.?\d*)%', ai_response)
            if ctr_match:
                response_ctr = float(ctr_match.group(1)) / 100
                if abs(response_ctr - expected_ctr) < 0.001:
                    return True, f"{normalized_campaign} CTR matches: {expected_ctr*100:.2f}%"
                else:
                    return False, f"{normalized_campaign} CTR mismatch: expected {expected_ctr*100:.2f}%, got {response_ctr*100:.2f}%"
            else:
                return False, f"No {normalized_campaign} CTR percentage found in response"
        
        # Check for ROAS
        if 'roas' in lower_question:
            expected_roas = campaign_metrics.get('roas', 0)
            roas_match = re.search(r'(\d+\.?\d*)x', ai_response)
            if roas_match:
                response_roas = float(roas_match.group(1))
                if abs(response_roas - expected_roas) < 0.1:
                    return True, f"{normalized_campaign} ROAS matches: {expected_roas:.2f}x"
                else:
                    return False, f"{normalized_campaign} ROAS mismatch: expected {expected_roas:.2f}x, got {response_roas:.2f}x"
            else:
                return False, f"No {normalized_campaign} ROAS value found in response"
    
    # For other queries, check if response is not empty and not error
    if len(ai_response.strip()) > 10 and 'error' not in lower_response:
        return True, "Response appears valid (no specific CSV validation available)"
    else:
        return False, "Response too short or contains errors"

# Test questions for campaign-specific fixes
CAMPAIGN_TEST_QUESTIONS = [
    "What's the CTR for FreshNest Summer Grilling?",
    "What's the CTR for FreshNest Back to School?",
    "What's the CTR for FreshNest Holiday Recipes?",
    "What's the CTR for FreshNest Pantry Staples?",
    "What's the ROAS for FreshNest Summer Grilling?",
    "What's the ROAS for FreshNest Back to School?",
    "What's the ROAS for FreshNest Holiday Recipes?",
    "What's the ROAS for FreshNest Pantry Staples?",
    "What's the CTR for each campaign?",
    "What's the ROAS for each campaign?",
    "Which platform has the highest CTR?",
    "What's our overall return on ad spend?",
    "What is our average cost per click?",
    "What's the average cost per thousand impressions?",
    "What is our average cost per acquisition?"
]

def test_campaign_fixes():
    """Test campaign-specific query fixes"""
    print("Testing Campaign-Specific Query Fixes...")
    print("=" * 80)
    print(f"Testing {len(CAMPAIGN_TEST_QUESTIONS)} questions to verify fixes")
    print(f"UI URL: {BASE_URL}/ai-analysis")
    print("=" * 80)
    
    csv_data = get_csv_data()
    campaign_metrics = calculate_campaign_metrics(csv_data)
    
    print("Expected Campaign Metrics:")
    for campaign, metrics in campaign_metrics.items():
        print(f"  {campaign}: CTR={metrics['ctr']*100:.2f}%, ROAS={metrics['roas']:.2f}x, Spend=${metrics['spend']:,.2f}")
    print()
    
    results = []
    valid_count = 0
    invalid_count = 0
    
    for i, question in enumerate(CAMPAIGN_TEST_QUESTIONS, 1):
        print(f"Testing Question {i}/{len(CAMPAIGN_TEST_QUESTIONS)}: {question}")
        
        # Test AI response through UI
        ai_response = test_ui_ai_query(question)
        
        # Validate response
        is_valid, validation_note = validate_campaign_response(question, ai_response, campaign_metrics)
        
        if is_valid:
            valid_count += 1
            status = "✓ PASS"
        else:
            invalid_count += 1
            status = "✗ FAIL"
        
        print(f"  {status}: {validation_note}")
        print(f"  Response: {ai_response[:150]}{'...' if len(ai_response) > 150 else ''}")
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
    
    # Final analysis
    print("\n" + "=" * 80)
    print("CAMPAIGN FIXES TEST RESULTS")
    print("=" * 80)
    
    print(f"Total Questions Tested: {len(CAMPAIGN_TEST_QUESTIONS)}")
    print(f"Valid Responses: {valid_count} ({valid_count/len(CAMPAIGN_TEST_QUESTIONS)*100:.1f}%)")
    print(f"Invalid Responses: {invalid_count} ({invalid_count/len(CAMPAIGN_TEST_QUESTIONS)*100:.1f}%)")
    
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
    
    return results

if __name__ == "__main__":
    results = test_campaign_fixes() 