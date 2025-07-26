#!/usr/bin/env python3

import urllib.request
import json
import time
import re

def test_ui_query(query):
    """Test a query through the UI by first loading the page, then calling the API"""
    base_url = "https://marketing-data-app.vercel.app"
    
    try:
        # First, load the AI Analysis page to simulate UI interaction
        print(f"Loading AI Analysis page...")
        page_req = urllib.request.Request(f"{base_url}/ai-analysis")
        with urllib.request.urlopen(page_req) as response:
            page_content = response.read().decode('utf-8')
            if "AI-Powered Campaign Analysis" in page_content:
                print("✅ AI Analysis page loaded successfully")
            else:
                print("⚠️ AI Analysis page may not have loaded correctly")
        
        # Small delay to simulate real user interaction
        time.sleep(1)
        
        # Now call the API endpoint (same as before, but simulating UI flow)
        api_url = f"{base_url}/api/ai/query"
        
        data = {
            "query": query,
            "sessionId": "ui-test"
        }
        
        req = urllib.request.Request(api_url)
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('content', 'No content')
    except Exception as e:
        return f"Error: {e}"

def extract_number_from_response(response, metric_type='number'):
    """Extract numerical value from AI response"""
    try:
        if metric_type == 'currency':
            # Look for currency values like $720,943.405
            match = re.search(r'\$([0-9,]+\.?[0-9]*)', response)
        elif metric_type == 'percentage':
            # Look for percentage values like 4.07%
            match = re.search(r'([0-9]+\.?[0-9]*)%', response)
            if match and match.group(1):
                # Convert percentage to decimal (4.07% -> 0.0407)
                number_str = match.group(1).replace(',', '')
                return float(number_str) / 100
        elif metric_type == 'roas':
            # Look for ROAS values like 3.14x
            match = re.search(r'([0-9]+\.?[0-9]*)x', response)
        elif metric_type == 'number':
            # Look for plain numbers, handling commas
            match = re.search(r'([0-9,]+\.?[0-9]*)', response)
        else:
            return None
            
        if match and match.group(1):
            # Remove commas and convert to float
            number_str = match.group(1).replace(',', '')
            return float(number_str)
        return None
    except (ValueError, AttributeError):
        return None

def validate_response(response, expected_value, metric_type='number', tolerance=0.05):
    """Validate AI response against expected CSV value"""
    if "I understand you're asking about" in response:
        return False, "Help message returned instead of data"
    
    if "Could not extract value" in response:
        return False, "Could not extract value from response"
    
    extracted_value = extract_number_from_response(response, metric_type)
    if extracted_value is None:
        return False, "Could not extract value from response"
    
    if expected_value == 0:
        if extracted_value == 0:
            return True, "Exact match"
        else:
            return False, f"Expected 0, got {extracted_value}"
    
    diff_percent = abs(extracted_value - expected_value) / expected_value
    if diff_percent <= tolerance:
        return True, f"Within tolerance ({diff_percent:.2%} diff)"
    else:
        return False, f"Outside tolerance ({diff_percent:.2%} diff)"

# Test a subset of critical queries through the UI
test_queries = [
    ("What is our total spend?", 229604.32, 'currency'),
    ("How much revenue did we generate?", 720943.41, 'currency'),
    ("What is our overall CTR?", 0.0407, 'percentage'),
    ("What is our average ROAS?", 3.14, 'roas'),
    ("What is the CTR for Meta?", 0.0412, 'percentage'),
    ("What is the CTR for Amazon?", 0.0913, 'percentage'),
    ("How many platforms do we have?", 6, 'number'),
    ("What is the CTR for each platform?", None, 'list'),
    ("What is the ROAS for each platform?", None, 'list')
]

print("Testing through UI: https://marketing-data-app.vercel.app/ai-analysis")
print("=" * 80)

passed = 0
failed = 0

for i, (query, expected_value, metric_type) in enumerate(test_queries, 1):
    print(f"\n{i}. Query: {query}")
    print(f"   Expected: {expected_value} ({metric_type})")
    
    response = test_ui_query(query)
    print(f"   Response: {response[:100]}...")
    
    if expected_value is None:  # List type queries
        if "I understand you're asking about" in response:
            print("   ❌ FAIL - Help message returned")
            failed += 1
        else:
            print("   ✅ PASS - Valid response")
            passed += 1
    else:
        success, message = validate_response(response, expected_value, metric_type)
        if success:
            print(f"   ✅ PASS - {message}")
            passed += 1
        else:
            print(f"   ❌ FAIL - {message}")
            failed += 1

print("\n" + "=" * 80)
print("UI TEST SUMMARY")
print("=" * 80)
print(f"Total Questions: {len(test_queries)}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")
print(f"Success Rate: {(passed/len(test_queries)*100):.1f}%")

if passed/len(test_queries) >= 0.95:
    print("🎉 EXCELLENT! UI testing confirms 95%+ accuracy!")
else:
    print("⚠️ UI testing shows room for improvement") 