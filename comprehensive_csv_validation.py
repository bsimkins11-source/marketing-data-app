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

def calculate_comprehensive_csv_metrics(csv_data):
    """Calculate comprehensive metrics from CSV data for validation"""
    metrics = {}
    
    # Total metrics
    total_spend = sum(float(row['spend']) for row in csv_data)
    total_impressions = sum(int(row['impressions']) for row in csv_data)
    total_clicks = sum(int(row['clicks']) for row in csv_data)
    total_conversions = sum(int(row['conversions']) for row in csv_data)
    
    # Calculate revenue (assuming ROAS * spend)
    total_revenue = sum(float(row['spend']) * float(row['roas']) for row in csv_data)
    
    # Calculate average CTR as average of individual CTR values (matching AI calculation)
    average_ctr = sum(float(row['ctr']) for row in csv_data) / len(csv_data)
    
    # Calculate other metrics
    average_cpc = total_spend / total_clicks if total_clicks > 0 else 0
    average_cpm = (total_spend / total_impressions) * 1000 if total_impressions > 0 else 0
    average_cpa = total_spend / total_conversions if total_conversions > 0 else 0
    overall_roas = total_revenue / total_spend if total_spend > 0 else 0
    conversion_rate = total_conversions / total_clicks if total_clicks > 0 else 0
    
    metrics['total_spend'] = total_spend
    metrics['total_revenue'] = total_revenue
    metrics['total_impressions'] = total_impressions
    metrics['total_clicks'] = total_clicks
    metrics['total_conversions'] = total_conversions
    metrics['overall_roas'] = overall_roas
    metrics['average_ctr'] = average_ctr
    metrics['average_cpc'] = average_cpc
    metrics['average_cpm'] = average_cpm
    metrics['average_cpa'] = average_cpa
    metrics['conversion_rate'] = conversion_rate
    
    # Platform metrics
    platform_data = defaultdict(lambda: {'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0, 'revenue': 0, 'ctr_values': []})
    
    for row in csv_data:
        platform = row['platform']
        platform_data[platform]['spend'] += float(row['spend'])
        platform_data[platform]['impressions'] += int(row['impressions'])
        platform_data[platform]['clicks'] += int(row['clicks'])
        platform_data[platform]['conversions'] += int(row['conversions'])
        platform_data[platform]['revenue'] += float(row['spend']) * float(row['roas'])
        platform_data[platform]['ctr_values'].append(float(row['ctr']))
    
    platform_metrics = {}
    for platform, data in platform_data.items():
        # Calculate platform CTR as average of individual CTR values (matching AI calculation)
        platform_ctr = sum(data['ctr_values']) / len(data['ctr_values']) if data['ctr_values'] else 0
        
        platform_metrics[platform] = {
            'ctr': platform_ctr,
            'roas': data['revenue'] / data['spend'] if data['spend'] > 0 else 0,
            'spend': data['spend'],
            'impressions': data['impressions'],
            'clicks': data['clicks'],
            'conversions': data['conversions'],
            'cpc': data['spend'] / data['clicks'] if data['clicks'] > 0 else 0,
            'cpm': (data['spend'] / data['impressions']) * 1000 if data['impressions'] > 0 else 0,
            'cpa': data['spend'] / data['conversions'] if data['conversions'] > 0 else 0
        }
    
    metrics['platform_metrics'] = platform_metrics
    
    # Campaign metrics
    campaign_data = defaultdict(lambda: {'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0, 'revenue': 0, 'ctr_values': []})
    
    for row in csv_data:
        campaign = row['campaign_name'].strip()  # Normalize campaign names
        campaign_data[campaign]['spend'] += float(row['spend'])
        campaign_data[campaign]['impressions'] += int(row['impressions'])
        campaign_data[campaign]['clicks'] += int(row['clicks'])
        campaign_data[campaign]['conversions'] += int(row['conversions'])
        campaign_data[campaign]['revenue'] += float(row['spend']) * float(row['roas'])
        campaign_data[campaign]['ctr_values'].append(float(row['ctr']))
    
    campaign_metrics = {}
    for campaign, data in campaign_data.items():
        # Calculate campaign CTR as average of individual CTR values
        campaign_ctr = sum(data['ctr_values']) / len(data['ctr_values']) if data['ctr_values'] else 0
        
        campaign_metrics[campaign] = {
            'ctr': campaign_ctr,
            'roas': data['revenue'] / data['spend'] if data['spend'] > 0 else 0,
            'spend': data['spend'],
            'impressions': data['impressions'],
            'clicks': data['clicks'],
            'conversions': data['conversions'],
            'cpc': data['spend'] / data['clicks'] if data['clicks'] > 0 else 0,
            'cpa': data['spend'] / data['conversions'] if data['conversions'] > 0 else 0
        }
    
    metrics['campaign_metrics'] = campaign_metrics
    
    return metrics

def validate_against_csv(question, ai_response, csv_metrics):
    """Comprehensive validation of AI response against CSV data"""
    lower_question = question.lower()
    lower_response = ai_response.lower()
    
    # Check if response contains error indicators
    if 'error' in lower_response or 'exception' in lower_response:
        return False, f"Response contains error: {ai_response}"
    
    # Check if response is just a help message
    if 'try asking about' in lower_response and len(ai_response) < 200:
        return False, "Response is generic help message instead of specific answer"
    
    # 1. Validate total spend queries
    if any(phrase in lower_question for phrase in ['total spend', 'spend across all', 'total cost', 'total budget', 'total investment', 'total expenditure', 'total advertising spend']):
        expected_spend = csv_metrics['total_spend']
        spend_match = re.search(r'\$([\d,]+\.?\d*)', ai_response)
        if spend_match:
            response_spend = float(spend_match.group(1).replace(',', ''))
            if abs(response_spend - expected_spend) < 1:
                return True, f"Spend amount matches: ${expected_spend:,.2f}"
            else:
                return False, f"Spend mismatch: expected ${expected_spend:,.2f}, got ${response_spend:,.2f}"
        else:
            return False, "No spend amount found in response"
    
    # 2. Validate total revenue queries
    if any(phrase in lower_question for phrase in ['total revenue', 'revenue generated', 'total return']):
        expected_revenue = csv_metrics['total_revenue']
        revenue_match = re.search(r'\$([\d,]+\.?\d*)', ai_response)
        if revenue_match:
            response_revenue = float(revenue_match.group(1).replace(',', ''))
            if abs(response_revenue - expected_revenue) < 1:
                return True, f"Revenue amount matches: ${expected_revenue:,.2f}"
            else:
                return False, f"Revenue mismatch: expected ${expected_revenue:,.2f}, got ${response_revenue:,.2f}"
        else:
            return False, "No revenue amount found in response"
    
    # 3. Validate overall ROAS queries
    if any(phrase in lower_question for phrase in ['overall roas', 'total roas', 'return on ad spend']):
        expected_roas = csv_metrics['overall_roas']
        roas_match = re.search(r'(\d+\.?\d*)x', ai_response)
        if roas_match:
            response_roas = float(roas_match.group(1))
            if abs(response_roas - expected_roas) < 0.1:
                return True, f"ROAS matches: {expected_roas:.2f}x"
            else:
                return False, f"ROAS mismatch: expected {expected_roas:.2f}x, got {response_roas:.2f}x"
        else:
            return False, "No ROAS value found in response"
    
    # 4. Validate average CTR queries
    if 'average ctr' in lower_question or 'ctr' in lower_question:
        # Check if it's a platform-specific CTR query
        platform_ctr_queries = ['meta', 'amazon', 'dv360', 'cm360', 'sa360', 'tradedesk']
        is_platform_query = any(platform in lower_question for platform in platform_ctr_queries)
        
        if is_platform_query:
            for platform in platform_ctr_queries:
                if platform in lower_question:
                    expected_ctr = csv_metrics['platform_metrics'].get(platform.title(), {}).get('ctr', 0)
                    ctr_match = re.search(r'(\d+\.?\d*)%', ai_response)
                    if ctr_match:
                        response_ctr = float(ctr_match.group(1)) / 100
                        if abs(response_ctr - expected_ctr) < 0.001:
                            return True, f"{platform.title()} CTR matches: {expected_ctr*100:.2f}%"
                        else:
                            return False, f"{platform.title()} CTR mismatch: expected {expected_ctr*100:.2f}%, got {response_ctr*100:.2f}%"
                    else:
                        return False, f"No {platform.title()} CTR percentage found in response"
        else:
            # Overall average CTR
            expected_ctr = csv_metrics['average_ctr']
            ctr_match = re.search(r'(\d+\.?\d*)%', ai_response)
            if ctr_match:
                response_ctr = float(ctr_match.group(1)) / 100
                if abs(response_ctr - expected_ctr) < 0.001:
                    return True, f"Average CTR matches: {expected_ctr*100:.2f}%"
                else:
                    return False, f"CTR mismatch: expected {expected_ctr*100:.2f}%, got {response_ctr*100:.2f}%"
            else:
                return False, "No CTR percentage found in response"
    
    # 5. Validate total impressions queries
    if any(phrase in lower_question for phrase in ['total impressions', 'impressions across all']):
        expected_impressions = csv_metrics['total_impressions']
        impressions_match = re.search(r'([\d,]+)', ai_response)
        if impressions_match:
            response_impressions = int(impressions_match.group(1).replace(',', ''))
            if abs(response_impressions - expected_impressions) < 100:
                return True, f"Impressions match: {expected_impressions:,}"
            else:
                return False, f"Impressions mismatch: expected {expected_impressions:,}, got {response_impressions:,}"
        else:
            return False, "No impressions count found in response"
    
    # 6. Validate total clicks queries
    if any(phrase in lower_question for phrase in ['total clicks', 'clicks across all']):
        expected_clicks = csv_metrics['total_clicks']
        clicks_match = re.search(r'([\d,]+)', ai_response)
        if clicks_match:
            response_clicks = int(clicks_match.group(1).replace(',', ''))
            if abs(response_clicks - expected_clicks) < 10:
                return True, f"Clicks match: {expected_clicks:,}"
            else:
                return False, f"Clicks mismatch: expected {expected_clicks:,}, got {response_clicks:,}"
        else:
            return False, "No clicks count found in response"
    
    # 7. Validate total conversions queries
    if any(phrase in lower_question for phrase in ['total conversions', 'conversions across all']):
        expected_conversions = csv_metrics['total_conversions']
        conversions_match = re.search(r'([\d,]+)', ai_response)
        if conversions_match:
            response_conversions = int(conversions_match.group(1).replace(',', ''))
            if abs(response_conversions - expected_conversions) < 5:
                return True, f"Conversions match: {expected_conversions:,}"
            else:
                return False, f"Conversions mismatch: expected {expected_conversions:,}, got {response_conversions:,}"
        else:
            return False, "No conversions count found in response"
    
    # 8. Validate average CPC queries
    if 'average cpc' in lower_question or 'cost per click' in lower_question:
        expected_cpc = csv_metrics['average_cpc']
        cpc_match = re.search(r'\$(\d+\.?\d*)', ai_response)
        if cpc_match:
            response_cpc = float(cpc_match.group(1))
            if abs(response_cpc - expected_cpc) < 0.5:
                return True, f"CPC matches: ${expected_cpc:.2f}"
            else:
                return False, f"CPC mismatch: expected ${expected_cpc:.2f}, got ${response_cpc:.2f}"
        else:
            return False, "No CPC value found in response"
    
    # 9. Validate average CPM queries
    if 'average cpm' in lower_question or 'cost per thousand' in lower_question:
        expected_cpm = csv_metrics['average_cpm']
        cpm_match = re.search(r'\$(\d+\.?\d*)', ai_response)
        if cpm_match:
            response_cpm = float(cpm_match.group(1))
            if abs(response_cpm - expected_cpm) < 5:
                return True, f"CPM matches: ${expected_cpm:.2f}"
            else:
                return False, f"CPM mismatch: expected ${expected_cpm:.2f}, got ${response_cpm:.2f}"
        else:
            return False, "No CPM value found in response"
    
    # 10. Validate average CPA queries
    if 'average cpa' in lower_question or 'cost per acquisition' in lower_question:
        expected_cpa = csv_metrics['average_cpa']
        cpa_match = re.search(r'\$(\d+\.?\d*)', ai_response)
        if cpa_match:
            response_cpa = float(cpa_match.group(1))
            if abs(response_cpa - expected_cpa) < 2:
                return True, f"CPA matches: ${expected_cpa:.2f}"
            else:
                return False, f"CPA mismatch: expected ${expected_cpa:.2f}, got ${response_cpa:.2f}"
        else:
            return False, "No CPA value found in response"
    
    # 11. Validate platform-specific queries
    platform_queries = ['meta', 'amazon', 'dv360', 'cm360', 'sa360', 'tradedesk']
    for platform in platform_queries:
        if platform in lower_question:
            platform_metrics = csv_metrics['platform_metrics'].get(platform.title(), {})
            
            # Platform ROAS
            if 'roas' in lower_question:
                expected_roas = platform_metrics.get('roas', 0)
                roas_match = re.search(r'(\d+\.?\d*)x', ai_response)
                if roas_match:
                    response_roas = float(roas_match.group(1))
                    if abs(response_roas - expected_roas) < 0.1:
                        return True, f"{platform.title()} ROAS matches: {expected_roas:.2f}x"
                    else:
                        return False, f"{platform.title()} ROAS mismatch: expected {expected_roas:.2f}x, got {response_roas:.2f}x"
                else:
                    return False, f"No {platform.title()} ROAS value found in response"
            
            # Platform spend
            if 'spend' in lower_question:
                expected_spend = platform_metrics.get('spend', 0)
                spend_match = re.search(r'\$([\d,]+\.?\d*)', ai_response)
                if spend_match:
                    response_spend = float(spend_match.group(1).replace(',', ''))
                    if abs(response_spend - expected_spend) < 1:
                        return True, f"{platform.title()} spend matches: ${expected_spend:,.2f}"
                    else:
                        return False, f"{platform.title()} spend mismatch: expected ${expected_spend:,.2f}, got ${response_spend:,.2f}"
                else:
                    return False, f"No {platform.title()} spend amount found in response"
    
    # 12. Validate campaign-specific queries
    campaign_queries = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
    for campaign in campaign_queries:
        if campaign in lower_question:
            campaign_metrics = csv_metrics['campaign_metrics'].get(campaign.title(), {})
            
            # Campaign CTR
            if 'ctr' in lower_question:
                expected_ctr = campaign_metrics.get('ctr', 0)
                ctr_match = re.search(r'(\d+\.?\d*)%', ai_response)
                if ctr_match:
                    response_ctr = float(ctr_match.group(1)) / 100
                    if abs(response_ctr - expected_ctr) < 0.001:
                        return True, f"{campaign.title()} CTR matches: {expected_ctr*100:.2f}%"
                    else:
                        return False, f"{campaign.title()} CTR mismatch: expected {expected_ctr*100:.2f}%, got {response_ctr*100:.2f}%"
                else:
                    return False, f"No {campaign.title()} CTR percentage found in response"
            
            # Campaign ROAS
            if 'roas' in lower_question:
                expected_roas = campaign_metrics.get('roas', 0)
                roas_match = re.search(r'(\d+\.?\d*)x', ai_response)
                if roas_match:
                    response_roas = float(roas_match.group(1))
                    if abs(response_roas - expected_roas) < 0.1:
                        return True, f"{campaign.title()} ROAS matches: {expected_roas:.2f}x"
                    else:
                        return False, f"{campaign.title()} ROAS mismatch: expected {expected_roas:.2f}x, got {response_roas:.2f}x"
                else:
                    return False, f"No {campaign.title()} ROAS value found in response"
    
    # For other queries, check if response is not empty and not error
    if len(ai_response.strip()) > 10 and 'error' not in lower_response:
        return True, "Response appears valid (no specific CSV validation available)"
    else:
        return False, "Response too short or contains errors"

# Test questions that should have specific CSV validation
CSV_VALIDATION_QUESTIONS = [
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
    "What is the CTR for FreshNest Summer Grilling?",
    "What is the CTR for FreshNest Back to School?",
    "What is the CTR for FreshNest Holiday Recipes?",
    "What is the CTR for FreshNest Pantry Staples?",
    "What is the ROAS for FreshNest Summer Grilling?",
    "What is the ROAS for FreshNest Back to School?",
    "What is the ROAS for FreshNest Holiday Recipes?",
    "What is the ROAS for FreshNest Pantry Staples?"
]

def run_comprehensive_csv_validation():
    """Run comprehensive CSV validation test"""
    print("Starting Comprehensive CSV Validation Test...")
    print("=" * 80)
    print(f"Testing {len(CSV_VALIDATION_QUESTIONS)} questions with detailed CSV validation")
    print(f"UI URL: {BASE_URL}/ai-analysis")
    print("=" * 80)
    
    csv_data = get_csv_data()
    csv_metrics = calculate_comprehensive_csv_metrics(csv_data)
    
    print("CSV Data Summary:")
    print(f"Total Spend: ${csv_metrics['total_spend']:,.2f}")
    print(f"Total Revenue: ${csv_metrics['total_revenue']:,.2f}")
    print(f"Overall ROAS: {csv_metrics['overall_roas']:.2f}")
    print(f"Average CTR: {csv_metrics['average_ctr']:.4f} ({csv_metrics['average_ctr']*100:.2f}%)")
    print(f"Average CPC: ${csv_metrics['average_cpc']:.2f}")
    print(f"Average CPM: ${csv_metrics['average_cpm']:.2f}")
    print(f"Average CPA: ${csv_metrics['average_cpa']:.2f}")
    print()
    
    print("Platform Metrics (Expected):")
    for platform, metrics in csv_metrics['platform_metrics'].items():
        print(f"  {platform}: CTR={metrics['ctr']*100:.2f}%, ROAS={metrics['roas']:.2f}x, Spend=${metrics['spend']:,.2f}")
    print()
    
    print("Campaign Metrics (Expected):")
    for campaign, metrics in csv_metrics['campaign_metrics'].items():
        print(f"  {campaign}: CTR={metrics['ctr']*100:.2f}%, ROAS={metrics['roas']:.2f}x, Spend=${metrics['spend']:,.2f}")
    print()
    
    results = []
    valid_count = 0
    invalid_count = 0
    
    for i, question in enumerate(CSV_VALIDATION_QUESTIONS, 1):
        print(f"Testing Question {i}/{len(CSV_VALIDATION_QUESTIONS)}: {question}")
        
        # Test AI response through UI
        ai_response = test_ui_ai_query(question)
        
        # Validate response against CSV
        is_valid, validation_note = validate_against_csv(question, ai_response, csv_metrics)
        
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
        
        # Print progress every 5 questions
        if i % 5 == 0:
            print(f"\nProgress: {i}/{len(CSV_VALIDATION_QUESTIONS)} questions completed")
            print(f"Current Score: {valid_count}/{i} ({valid_count/i*100:.1f}%)\n")
    
    # Final analysis
    print("\n" + "=" * 80)
    print("COMPREHENSIVE CSV VALIDATION RESULTS")
    print("=" * 80)
    
    print(f"Total Questions Tested: {len(CSV_VALIDATION_QUESTIONS)}")
    print(f"Valid Responses: {valid_count} ({valid_count/len(CSV_VALIDATION_QUESTIONS)*100:.1f}%)")
    print(f"Invalid Responses: {invalid_count} ({invalid_count/len(CSV_VALIDATION_QUESTIONS)*100:.1f}%)")
    
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
    
    return results, csv_metrics

if __name__ == "__main__":
    results, csv_metrics = run_comprehensive_csv_validation() 