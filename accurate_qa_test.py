#!/usr/bin/env python3
"""
Accurate QA Test for Marketing Data Query App
Tests against the actual data the app uses (sample-campaign-data.csv)
"""

import csv
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Dict, List, Any

class AccurateQATester:
    def __init__(self, csv_file: str = "sample-campaign-data.csv", api_url: str = "https://marketing-data-app.vercel.app/api/ai/query"):
        self.csv_file = csv_file
        self.api_url = api_url
        self.data = self.load_csv_data()
        self.test_results = []
        
    def load_csv_data(self) -> List[Dict[str, Any]]:
        """Load CSV data into list of dictionaries"""
        data = []
        try:
            with open(self.csv_file, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Convert numeric fields
                    row['spend'] = float(row['spend'])
                    row['impressions'] = int(row['impressions'])
                    row['clicks'] = int(row['clicks'])
                    row['conversions'] = int(row['conversions'])
                    row['ctr'] = float(row['ctr'])
                    row['cpc'] = float(row['cpc'])
                    row['cpm'] = float(row['cpm'])
                    row['roas'] = float(row['roas'])
                    data.append(row)
            print(f"✅ Loaded {len(data)} rows from {self.csv_file}")
            return data
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return []
    
    def calculate_expected_values(self) -> Dict[str, Any]:
        """Calculate expected values from the actual CSV data"""
        expected = {}
        
        # Basic metrics
        expected['total_spend'] = sum(row['spend'] for row in self.data)
        expected['total_impressions'] = sum(row['impressions'] for row in self.data)
        expected['total_clicks'] = sum(row['clicks'] for row in self.data)
        expected['total_conversions'] = sum(row['conversions'] for row in self.data)
        
        # Calculate revenue from ROAS
        total_revenue = sum(row['spend'] * row['roas'] for row in self.data)
        expected['total_revenue'] = total_revenue
        
        # Overall metrics
        expected['overall_roas'] = total_revenue / expected['total_spend'] if expected['total_spend'] > 0 else 0
        expected['overall_ctr'] = expected['total_clicks'] / expected['total_impressions'] if expected['total_impressions'] > 0 else 0
        
        # Platform analysis
        platforms = {}
        for row in self.data:
            platform = row['platform']
            if platform not in platforms:
                platforms[platform] = {
                    'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0,
                    'revenue': 0, 'roas_values': []
                }
            platforms[platform]['spend'] += row['spend']
            platforms[platform]['impressions'] += row['impressions']
            platforms[platform]['clicks'] += row['clicks']
            platforms[platform]['conversions'] += row['conversions']
            platforms[platform]['revenue'] += row['spend'] * row['roas']
            platforms[platform]['roas_values'].append(row['roas'])
        
        # Calculate platform metrics
        platform_list = []
        for platform, metrics in platforms.items():
            avg_roas = sum(metrics['roas_values']) / len(metrics['roas_values'])
            ctr = metrics['clicks'] / metrics['impressions'] if metrics['impressions'] > 0 else 0
            platform_list.append({
                'platform': platform,
                'spend': metrics['spend'],
                'revenue': metrics['revenue'],
                'impressions': metrics['impressions'],
                'clicks': metrics['clicks'],
                'conversions': metrics['conversions'],
                'roas': avg_roas,
                'ctr': ctr
            })
        
        expected['platforms'] = platform_list
        expected['platform_count'] = len(platform_list)
        
        # Campaign analysis
        campaigns = {}
        for row in self.data:
            campaign = row['campaign_name']
            if campaign not in campaigns:
                campaigns[campaign] = {
                    'spend': 0, 'impressions': 0, 'clicks': 0, 'conversions': 0,
                    'revenue': 0, 'roas_values': []
                }
            campaigns[campaign]['spend'] += row['spend']
            campaigns[campaign]['impressions'] += row['impressions']
            campaigns[campaign]['clicks'] += row['clicks']
            campaigns[campaign]['conversions'] += row['conversions']
            campaigns[campaign]['revenue'] += row['spend'] * row['roas']
            campaigns[campaign]['roas_values'].append(row['roas'])
        
        # Calculate campaign metrics
        campaign_list = []
        for campaign, metrics in campaigns.items():
            avg_roas = sum(metrics['roas_values']) / len(metrics['roas_values'])
            ctr = metrics['clicks'] / metrics['impressions'] if metrics['impressions'] > 0 else 0
            campaign_list.append({
                'campaign': campaign,
                'spend': metrics['spend'],
                'revenue': metrics['revenue'],
                'impressions': metrics['impressions'],
                'clicks': metrics['clicks'],
                'conversions': metrics['conversions'],
                'roas': avg_roas,
                'ctr': ctr
            })
        
        expected['campaigns'] = campaign_list
        expected['campaign_count'] = len(campaign_list)
        
        # Find top performers
        if platform_list:
            expected['top_platform_by_roas'] = max(platform_list, key=lambda x: x['roas'])
            expected['top_platform_by_spend'] = max(platform_list, key=lambda x: x['spend'])
            expected['top_platform_by_revenue'] = max(platform_list, key=lambda x: x['revenue'])
        
        if campaign_list:
            expected['top_campaign_by_roas'] = max(campaign_list, key=lambda x: x['roas'])
            expected['top_campaign_by_spend'] = max(campaign_list, key=lambda x: x['spend'])
            expected['top_campaign_by_revenue'] = max(campaign_list, key=lambda x: x['revenue'])
        
        return expected
    
    def query_app(self, question: str) -> Dict[str, Any]:
        """Send query to the app and get response"""
        try:
            payload = {
                "query": question,
                "sessionId": "qa_test"
            }
            
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                self.api_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                return result
                
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
    
    def extract_numeric_value(self, text: str, metric_type: str = "decimal") -> float:
        """Extract numeric value from app response text"""
        import re
        
        # Remove commas and common formatting
        text = text.replace(',', '').replace('$', '').replace('%', '')
        
        # Different patterns for different metric types
        patterns = {
            'currency': r'\$?([\d,]+\.?\d*)',
            'percentage': r'(\d+\.?\d*)%',
            'decimal': r'(\d+\.?\d*)x?',
            'integer': r'(\d+)'
        }
        
        pattern = patterns.get(metric_type, patterns['decimal'])
        matches = re.findall(pattern, text)
        
        if matches:
            try:
                return float(matches[0])
            except:
                pass
        
        return 0.0
    
    def extract_value_from_response(self, response: Dict[str, Any]) -> float:
        """Extract numeric value from app response using structured data"""
        try:
            # First try to get value from structured data
            if 'data' in response and 'value' in response['data']:
                return float(response['data']['value'])
            
            # Fallback to parsing content text
            content = response.get("content", "")
            return self.extract_numeric_value(content, "decimal")
            
        except Exception as e:
            print(f"Error extracting value: {e}")
            return 0.0
    
    def test_question(self, question: str, expected_value: Any, tolerance: float = 0.02) -> Dict[str, Any]:
        """Test a single question and compare with expected value"""
        print(f"🔍 Testing: {question}")
        
        # Query the app
        response = self.query_app(question)
        
        if "error" in response:
            return {
                "question": question,
                "expected": expected_value,
                "actual": None,
                "response": response,
                "passed": False,
                "error": response["error"]
            }
        
        # Extract actual value from response
        actual_value = self.extract_value_from_response(response)
        
        # Calculate accuracy
        if isinstance(expected_value, (int, float)) and expected_value != 0:
            accuracy = 1 - abs(actual_value - expected_value) / abs(expected_value)
            passed = accuracy >= (1 - tolerance)
        else:
            accuracy = 1.0 if actual_value == expected_value else 0.0
            passed = accuracy >= (1 - tolerance)
        
        result = {
            "question": question,
            "expected": expected_value,
            "actual": actual_value,
            "response": response,
            "accuracy": accuracy,
            "passed": passed
        }
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - Expected: {expected_value}, Actual: {actual_value}, Accuracy: {accuracy:.2%}")
        
        return result
    
    def generate_test_questions(self, expected: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate comprehensive test questions based on actual data"""
        questions = []
        
        # Basic metrics (50 questions)
        basic_questions = [
            "How much money did we spend?",
            "How much revenue did we generate?",
            "How many impressions did we get?",
            "How many clicks did we get?",
            "What is our average ROAS?",
            "What is our overall CTR?",
            "How much did we spend in total?",
            "What is our total revenue?",
            "How many total impressions?",
            "How many total clicks?",
            "What is our overall return on ad spend?",
            "What is our overall click-through rate?",
            "How much budget did we use?",
            "What is our total earnings?",
            "How many views did we get?",
            "How many interactions did we get?",
            "What is our average return on investment?",
            "What is our average click rate?",
            "How much cost did we incur?",
            "What is our total income?",
            "How many displays did we get?",
            "How many engagements did we get?",
            "What is our average ROAS across all campaigns?",
            "What is our average CTR across all campaigns?",
            "How much total spend?",
            "What is our total return?",
            "How many total views?",
            "How many total engagements?",
            "What is our overall performance?",
            "What is our average performance?",
            "How much money was spent?",
            "What revenue was generated?",
            "How many impressions were received?",
            "How many clicks were received?",
            "What is the average ROAS?",
            "What is the average CTR?",
            "How much total budget was used?",
            "What total revenue was earned?",
            "How many total impressions were shown?",
            "How many total clicks were made?",
            "What is the overall return on ad spend?",
            "What is the overall click-through rate?",
            "How much money did we invest?",
            "What income did we generate?",
            "How many views did we receive?",
            "How many interactions did we receive?",
            "What is our average return on investment?",
            "What is our average click rate?",
            "How much cost did we have?",
            "What earnings did we make?"
        ]
        
        for question in basic_questions:
            if "spend" in question.lower() or "money" in question.lower() or "budget" in question.lower() or "cost" in question.lower() or "invest" in question.lower():
                questions.append({"question": question, "expected": expected['total_spend'], "category": "basic_metrics"})
            elif "revenue" in question.lower() or "earnings" in question.lower() or "income" in question.lower() or "return" in question.lower() or "generate" in question.lower():
                questions.append({"question": question, "expected": expected['total_revenue'], "category": "basic_metrics"})
            elif "impressions" in question.lower() or "views" in question.lower() or "displays" in question.lower() or "shown" in question.lower():
                questions.append({"question": question, "expected": expected['total_impressions'], "category": "basic_metrics"})
            elif "clicks" in question.lower() or "interactions" in question.lower() or "engagements" in question.lower() or "made" in question.lower():
                questions.append({"question": question, "expected": expected['total_clicks'], "category": "basic_metrics"})
            elif "roas" in question.lower() or "return on ad spend" in question.lower() or "return on investment" in question.lower():
                questions.append({"question": question, "expected": expected['overall_roas'], "category": "basic_metrics"})
            elif "ctr" in question.lower() or "click-through rate" in question.lower() or "click rate" in question.lower():
                questions.append({"question": question, "expected": expected['overall_ctr'], "category": "basic_metrics"})
        
        # Platform questions (100 questions)
        platform_questions = [
            "How many platforms do we have?",
            "Which platform performed best?",
            "Which platform spent the most?",
            "Which platform had the highest revenue?",
            "Which platform had the most impressions?",
            "Which platform had the most clicks?",
            "Which platform is the most profitable?",
            "Which platform is the most expensive?",
            "Which platform is doing the best?",
            "Which platform is winning?",
            "What is the top platform?",
            "Which platform had the best performance?",
            "Which platform generated the most revenue?",
            "Which platform cost the most?",
            "Which platform is the most efficient?",
            "Which platform had the highest ROAS?",
            "Which platform had the highest CTR?",
            "Which platform is the most successful?",
            "Which platform is the most effective?",
            "Which platform is the most valuable?",
            "Which platform is the most productive?",
            "Which platform is the most lucrative?",
            "Which platform is the most beneficial?",
            "Which platform is the most advantageous?",
            "Which platform is the most worthwhile?",
            "Which platform is the most rewarding?",
            "Which platform is the most fruitful?",
            "Which platform is the most gainful?",
            "Which platform is the most profitable?",
            "Which platform is the most successful?",
            "Which platform is the most effective?",
            "Which platform is the most efficient?",
            "Which platform is the most valuable?",
            "Which platform is the most productive?",
            "Which platform is the most lucrative?",
            "Which platform is the most beneficial?",
            "Which platform is the most advantageous?",
            "Which platform is the most worthwhile?",
            "Which platform is the most rewarding?",
            "Which platform is the most fruitful?",
            "Which platform is the most gainful?"
        ]
        
        for question in platform_questions:
            if "how many platforms" in question.lower():
                questions.append({"question": question, "expected": expected['platform_count'], "category": "platform_count"})
            elif "performed best" in question.lower() or "doing the best" in question.lower() or "winning" in question.lower() or "top platform" in question.lower() or "best performance" in question.lower() or "most profitable" in question.lower() or "highest roas" in question.lower() or "most successful" in question.lower() or "most effective" in question.lower() or "most efficient" in question.lower() or "most valuable" in question.lower() or "most productive" in question.lower() or "most lucrative" in question.lower() or "most beneficial" in question.lower() or "most advantageous" in question.lower() or "most worthwhile" in question.lower() or "most rewarding" in question.lower() or "most fruitful" in question.lower() or "most gainful" in question.lower():
                questions.append({"question": question, "expected": expected['top_platform_by_roas']['roas'], "category": "platform_performance"})
            elif "spent the most" in question.lower() or "highest revenue" in question.lower() or "most revenue" in question.lower() or "generated the most revenue" in question.lower() or "cost the most" in question.lower() or "most expensive" in question.lower():
                if "revenue" in question.lower():
                    questions.append({"question": question, "expected": expected['top_platform_by_revenue']['revenue'], "category": "platform_revenue"})
                else:
                    questions.append({"question": question, "expected": expected['top_platform_by_spend']['spend'], "category": "platform_spend"})
            elif "most impressions" in question.lower() or "most clicks" in question.lower():
                if "impressions" in question.lower():
                    max_impressions = max(p['impressions'] for p in expected['platforms'])
                    questions.append({"question": question, "expected": max_impressions, "category": "platform_impressions"})
                else:
                    max_clicks = max(p['clicks'] for p in expected['platforms'])
                    questions.append({"question": question, "expected": max_clicks, "category": "platform_clicks"})
        
        # Platform-specific questions (200 questions)
        for platform in expected['platforms']:
            platform_name = platform['platform']
            
            platform_specific_questions = [
                f"How much did we spend on {platform_name}?",
                f"What is the ROAS for {platform_name}?",
                f"What is the CTR for {platform_name}?",
                f"How much revenue did {platform_name} generate?",
                f"How many impressions did {platform_name} get?",
                f"How many clicks did {platform_name} get?",
                f"What is the return on ad spend for {platform_name}?",
                f"What is the click-through rate for {platform_name}?",
                f"How much money did we spend on {platform_name}?",
                f"What is the average ROAS for {platform_name}?",
                f"What is the average CTR for {platform_name}?",
                f"How much budget did we use on {platform_name}?",
                f"What revenue did {platform_name} generate?",
                f"How many views did {platform_name} get?",
                f"How many interactions did {platform_name} get?",
                f"What is the return on investment for {platform_name}?",
                f"What is the click rate for {platform_name}?",
                f"How much cost did we incur on {platform_name}?",
                f"What income did {platform_name} generate?",
                f"How much did {platform_name} spend?",
                f"What is {platform_name}'s ROAS?",
                f"What is {platform_name}'s CTR?",
                f"How much did {platform_name} cost?",
                f"What did {platform_name} earn?",
                f"How many impressions did {platform_name} receive?",
                f"How many clicks did {platform_name} receive?",
                f"What is {platform_name}'s performance?",
                f"What is {platform_name}'s return on ad spend?",
                f"What is {platform_name}'s click-through rate?",
                f"How much money was spent on {platform_name}?",
                f"What revenue was generated by {platform_name}?",
                f"How many impressions were shown on {platform_name}?",
                f"How many clicks were made on {platform_name}?",
                f"What is the overall return on ad spend for {platform_name}?",
                f"What is the overall click-through rate for {platform_name}?",
                f"How much budget was used on {platform_name}?",
                f"What total revenue was earned by {platform_name}?",
                f"How many total impressions were shown on {platform_name}?",
                f"How many total clicks were made on {platform_name}?",
                f"What is the overall return on ad spend for {platform_name}?",
                f"What is the overall click-through rate for {platform_name}?",
                f"How much money did we invest in {platform_name}?",
                f"What income did {platform_name} generate?",
                f"How many views did {platform_name} receive?",
                f"How many interactions did {platform_name} receive?",
                f"What is the average return on investment for {platform_name}?",
                f"What is the average click rate for {platform_name}?",
                f"How much cost did we have on {platform_name}?",
                f"What earnings did {platform_name} make?"
            ]
            
            for question in platform_specific_questions:
                if "spend" in question.lower() or "money" in question.lower() or "budget" in question.lower() or "cost" in question.lower() or "invest" in question.lower():
                    questions.append({"question": question, "expected": platform['spend'], "category": "platform_specific"})
                elif "roas" in question.lower() or "return on ad spend" in question.lower() or "return on investment" in question.lower():
                    questions.append({"question": question, "expected": platform['roas'], "category": "platform_specific"})
                elif "ctr" in question.lower() or "click-through rate" in question.lower() or "click rate" in question.lower():
                    questions.append({"question": question, "expected": platform['ctr'], "category": "platform_specific"})
                elif "revenue" in question.lower() or "earnings" in question.lower() or "income" in question.lower() or "generate" in question.lower():
                    questions.append({"question": question, "expected": platform['revenue'], "category": "platform_specific"})
                elif "impressions" in question.lower() or "views" in question.lower() or "shown" in question.lower():
                    questions.append({"question": question, "expected": platform['impressions'], "category": "platform_specific"})
                elif "clicks" in question.lower() or "interactions" in question.lower() or "made" in question.lower():
                    questions.append({"question": question, "expected": platform['clicks'], "category": "platform_specific"})
        
        return questions
    
    def run_accurate_tests(self) -> Dict[str, Any]:
        """Run accurate QA tests"""
        print("🚀 Starting Accurate QA Test")
        print("=" * 80)
        
        # Calculate expected values from actual data
        expected = self.calculate_expected_values()
        
        # Print expected values for verification
        print(f"📊 EXPECTED VALUES FROM {self.csv_file}:")
        print(f"Total Spend: ${expected['total_spend']:,.2f}")
        print(f"Total Revenue: ${expected['total_revenue']:,.2f}")
        print(f"Total Impressions: {expected['total_impressions']:,}")
        print(f"Total Clicks: {expected['total_clicks']:,}")
        print(f"Overall ROAS: {expected['overall_roas']:.2f}x")
        print(f"Overall CTR: {expected['overall_ctr']:.2%}")
        print(f"Platform Count: {expected['platform_count']}")
        print(f"Campaign Count: {expected['campaign_count']}")
        print("=" * 80)
        
        # Generate test questions
        questions = self.generate_test_questions(expected)
        
        print(f"📋 Generated {len(questions)} test questions")
        print(f"🎯 Target accuracy: 98%")
        print("=" * 80)
        
        # Run tests
        all_tests = []
        passed_tests = 0
        failed_tests = 0
        
        for i, q in enumerate(questions, 1):
            print(f"\n[{i}/{len(questions)}] Testing: {q['question']}")
            
            result = self.test_question(q['question'], q['expected'])
            all_tests.append(result)
            
            if result['passed']:
                passed_tests += 1
            else:
                failed_tests += 1
            
            # Progress update every 50 tests
            if i % 50 == 0:
                current_accuracy = passed_tests / i
                print(f"\n📊 Progress: {i}/{len(questions)} tests completed")
                print(f"✅ Passed: {passed_tests}, ❌ Failed: {failed_tests}")
                print(f"🎯 Current Accuracy: {current_accuracy:.2%}")
                print("-" * 40)
            
            # Small delay to avoid overwhelming the API
            time.sleep(0.1)
        
        # Calculate final results
        total_tests = len(all_tests)
        overall_accuracy = passed_tests / total_tests if total_tests > 0 else 0
        
        # Categorize failures
        failures = [test for test in all_tests if not test.get('passed', False)]
        
        # Analyze failures by category
        failure_categories = {}
        for failure in failures:
            category = failure.get('category', 'unknown')
            if category not in failure_categories:
                failure_categories[category] = 0
            failure_categories[category] += 1
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "overall_accuracy": overall_accuracy,
            "target_accuracy": 0.98,
            "target_met": overall_accuracy >= 0.98,
            "test_results": all_tests,
            "failures": failures,
            "failure_categories": failure_categories,
            "expected_values": expected
        }
        
        # Print final summary
        print("\n" + "=" * 80)
        print("📋 ACCURATE QA TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Overall Accuracy: {overall_accuracy:.2%}")
        print(f"Target Accuracy: 98.00%")
        print(f"Target Met: {'✅ YES' if results['target_met'] else '❌ NO'}")
        
        if failure_categories:
            print(f"\n❌ FAILURES BY CATEGORY:")
            for category, count in failure_categories.items():
                print(f"• {category}: {count} failures")
        
        if failures:
            print(f"\n❌ SAMPLE FAILURES (first 10):")
            for i, failure in enumerate(failures[:10], 1):
                print(f"{i}. {failure['question']}")
                print(f"   Expected: {failure['expected']}, Actual: {failure['actual']}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                print()
        
        return results
    
    def save_results(self, results: Dict[str, Any], filename: str = None):
        """Save test results to file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"accurate_qa_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"💾 Results saved to: {filename}")

def main():
    """Main function to run accurate QA tests"""
    # Initialize tester
    tester = AccurateQATester()
    
    # Check if data loaded successfully
    if not tester.data:
        print("❌ Failed to load CSV data. Exiting.")
        return
    
    # Run accurate tests
    results = tester.run_accurate_tests()
    
    # Save results
    tester.save_results(results)
    
    # Exit with appropriate code
    if results['target_met']:
        print("🎉 Accurate QA tests passed! App meets 98% accuracy target.")
        exit(0)
    else:
        print("⚠️ Accurate QA tests failed. App does not meet 98% accuracy target.")
        print("🔧 Review failures and improve the app's query handling.")
        exit(1)

if __name__ == "__main__":
    main() 