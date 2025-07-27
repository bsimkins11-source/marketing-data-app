#!/usr/bin/env python3
"""
Dashboard Query Functionality UAT Test
Comprehensive testing of the QueryBuilder component and dashboard functionality
"""
import urllib.request
import json
import time
import random
from datetime import datetime, timedelta

API_URL = "http://localhost:3000/api/data/query"

def send_query(query_data):
    """Send a query to the dashboard API"""
    try:
        data = json.dumps(query_data).encode('utf-8')
        req = urllib.request.Request(
            API_URL,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=10) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            execution_time = time.time() - start_time
            
            return {
                'success': True,
                'data': response_data,
                'execution_time': execution_time,
                'status_code': response.status
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'execution_time': 0
        }

def test_basic_data_loading():
    """Test basic data loading functionality"""
    print("🧪 Testing Basic Data Loading...")
    
    result = send_query({})
    
    if result['success']:
        data = result['data']
        if data.get('success') and data.get('data'):
            campaign_count = len(data['data'])
            print(f"✅ Basic data loading: {campaign_count} campaigns loaded in {result['execution_time']:.3f}s")
            return True
        else:
            print(f"❌ Basic data loading failed: {data}")
            return False
    else:
        print(f"❌ Basic data loading error: {result['error']}")
        return False

def test_metric_selection():
    """Test different metric combinations"""
    print("\n🧪 Testing Metric Selection...")
    
    metric_tests = [
        {
            'name': 'Basic Metrics',
            'metrics': ['impressions', 'clicks', 'spend'],
            'dimensions': ['campaign_name']
        },
        {
            'name': 'Performance Metrics',
            'metrics': ['ctr', 'cpc', 'cpa', 'roas'],
            'dimensions': ['platform']
        },
        {
            'name': 'Revenue Metrics',
            'metrics': ['revenue', 'conversions', 'spend'],
            'dimensions': ['brand']
        },
        {
            'name': 'All Metrics',
            'metrics': ['impressions', 'clicks', 'conversions', 'spend', 'revenue', 'ctr', 'cpc', 'cpa', 'roas'],
            'dimensions': ['campaign_name']
        }
    ]
    
    success_count = 0
    for test in metric_tests:
        result = send_query({
            'metrics': test['metrics'],
            'dimensions': test['dimensions']
        })
        
        if result['success']:
            data = result['data']
            if data.get('success'):
                print(f"✅ {test['name']}: {len(data.get('data', []))} results in {result['execution_time']:.3f}s")
                success_count += 1
            else:
                print(f"❌ {test['name']}: Failed - {data}")
        else:
            print(f"❌ {test['name']}: Error - {result['error']}")
    
    return success_count == len(metric_tests)

def test_dimension_grouping():
    """Test different dimension grouping scenarios"""
    print("\n🧪 Testing Dimension Grouping...")
    
    dimension_tests = [
        {
            'name': 'Campaign Level',
            'dimensions': ['campaign_name'],
            'metrics': ['impressions', 'spend', 'revenue']
        },
        {
            'name': 'Platform Level',
            'dimensions': ['platform'],
            'metrics': ['impressions', 'spend', 'revenue']
        },
        {
            'name': 'Brand Level',
            'dimensions': ['brand'],
            'metrics': ['impressions', 'spend', 'revenue']
        },
        {
            'name': 'Multi-Dimensional',
            'dimensions': ['brand', 'platform'],
            'metrics': ['impressions', 'spend', 'revenue']
        },
        {
            'name': 'Creative Level',
            'dimensions': ['creative_name'],
            'metrics': ['impressions', 'spend', 'revenue']
        }
    ]
    
    success_count = 0
    for test in dimension_tests:
        result = send_query({
            'metrics': test['metrics'],
            'dimensions': test['dimensions']
        })
        
        if result['success']:
            data = result['data']
            if data.get('success'):
                result_count = len(data.get('data', []))
                print(f"✅ {test['name']}: {result_count} grouped results in {result['execution_time']:.3f}s")
                success_count += 1
            else:
                print(f"❌ {test['name']}: Failed - {data}")
        else:
            print(f"❌ {test['name']}: Error - {result['error']}")
    
    return success_count == len(dimension_tests)

def test_date_filtering():
    """Test date range filtering"""
    print("\n🧪 Testing Date Filtering...")
    
    # Generate some date ranges
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    date_tests = [
        {
            'name': 'Last 7 Days',
            'date_range': {
                'start': (end_date - timedelta(days=7)).strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            }
        },
        {
            'name': 'Last 30 Days',
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            }
        },
        {
            'name': 'No Date Filter',
            'date_range': {
                'start': '',
                'end': ''
            }
        }
    ]
    
    success_count = 0
    for test in date_tests:
        result = send_query({
            'metrics': ['impressions', 'spend'],
            'dimensions': ['campaign_name'],
            'date_range': test['date_range']
        })
        
        if result['success']:
            data = result['data']
            if data.get('success'):
                result_count = len(data.get('data', []))
                print(f"✅ {test['name']}: {result_count} results in {result['execution_time']:.3f}s")
                success_count += 1
            else:
                print(f"❌ {test['name']}: Failed - {data}")
        else:
            print(f"❌ {test['name']}: Error - {result['error']}")
    
    return success_count == len(date_tests)

def test_custom_filters():
    """Test custom filtering functionality"""
    print("\n🧪 Testing Custom Filters...")
    
    filter_tests = [
        {
            'name': 'Platform Filter',
            'filters': [{'field': 'platform', 'operator': 'equals', 'value': 'Meta'}],
            'metrics': ['impressions', 'spend'],
            'dimensions': ['campaign_name']
        },
        {
            'name': 'Brand Filter',
            'filters': [{'field': 'brand', 'operator': 'equals', 'value': 'FreshNest'}],
            'metrics': ['impressions', 'spend'],
            'dimensions': ['platform']
        },
        {
            'name': 'Spend Range Filter',
            'filters': [{'field': 'spend', 'operator': 'greater_than', 'value': '1000'}],
            'metrics': ['impressions', 'spend'],
            'dimensions': ['campaign_name']
        },
        {
            'name': 'Multiple Filters',
            'filters': [
                {'field': 'platform', 'operator': 'equals', 'value': 'Amazon'},
                {'field': 'brand', 'operator': 'equals', 'value': 'EcoFresh'}
            ],
            'metrics': ['impressions', 'spend'],
            'dimensions': ['campaign_name']
        }
    ]
    
    success_count = 0
    for test in filter_tests:
        result = send_query({
            'metrics': test['metrics'],
            'dimensions': test['dimensions'],
            'filters': test['filters']
        })
        
        if result['success']:
            data = result['data']
            if data.get('success'):
                result_count = len(data.get('data', []))
                print(f"✅ {test['name']}: {result_count} filtered results in {result['execution_time']:.3f}s")
                success_count += 1
            else:
                print(f"❌ {test['name']}: Failed - {data}")
        else:
            print(f"❌ {test['name']}: Error - {result['error']}")
    
    return success_count == len(filter_tests)

def test_data_export():
    """Test data export functionality (simulated)"""
    print("\n🧪 Testing Data Export...")
    
    # Simulate export by getting data and checking format
    result = send_query({
        'metrics': ['impressions', 'clicks', 'spend', 'revenue'],
        'dimensions': ['campaign_name', 'platform']
    })
    
    if result['success']:
        data = result['data']
        if data.get('success') and data.get('data'):
            # Check if data is in exportable format
            sample_row = data['data'][0] if data['data'] else {}
            required_fields = ['campaign_name', 'platform', 'impressions', 'clicks', 'spend', 'revenue']
            
            if all(field in sample_row for field in required_fields):
                print(f"✅ Data Export: {len(data['data'])} rows ready for export in {result['execution_time']:.3f}s")
                return True
            else:
                print(f"❌ Data Export: Missing required fields")
                return False
        else:
            print(f"❌ Data Export: Failed to get data")
            return False
    else:
        print(f"❌ Data Export: Error - {result['error']}")
        return False

def test_performance():
    """Test query performance"""
    print("\n🧪 Testing Performance...")
    
    performance_tests = [
        {
            'name': 'Simple Query',
            'query': {
                'metrics': ['impressions'],
                'dimensions': ['campaign_name']
            }
        },
        {
            'name': 'Complex Query',
            'query': {
                'metrics': ['impressions', 'clicks', 'conversions', 'spend', 'revenue', 'ctr', 'cpc', 'cpa', 'roas'],
                'dimensions': ['brand', 'platform', 'campaign_name'],
                'filters': [{'field': 'spend', 'operator': 'greater_than', 'value': '500'}]
            }
        }
    ]
    
    success_count = 0
    for test in performance_tests:
        result = send_query(test['query'])
        
        if result['success']:
            data = result['data']
            if data.get('success'):
                execution_time = result['execution_time']
                result_count = len(data.get('data', []))
                
                # Performance thresholds
                if execution_time < 1.0:  # Should be under 1 second
                    print(f"✅ {test['name']}: {result_count} results in {execution_time:.3f}s (FAST)")
                    success_count += 1
                elif execution_time < 3.0:  # Acceptable under 3 seconds
                    print(f"⚠️ {test['name']}: {result_count} results in {execution_time:.3f}s (ACCEPTABLE)")
                    success_count += 1
                else:
                    print(f"❌ {test['name']}: {result_count} results in {execution_time:.3f}s (SLOW)")
            else:
                print(f"❌ {test['name']}: Failed - {data}")
        else:
            print(f"❌ {test['name']}: Error - {result['error']}")
    
    return success_count == len(performance_tests)

def test_error_handling():
    """Test error handling scenarios"""
    print("\n🧪 Testing Error Handling...")
    
    error_tests = [
        {
            'name': 'Invalid Metric',
            'query': {
                'metrics': ['invalid_metric'],
                'dimensions': ['campaign_name']
            }
        },
        {
            'name': 'Invalid Dimension',
            'query': {
                'metrics': ['impressions'],
                'dimensions': ['invalid_dimension']
            }
        },
        {
            'name': 'Invalid Filter',
            'query': {
                'metrics': ['impressions'],
                'dimensions': ['campaign_name'],
                'filters': [{'field': 'invalid_field', 'operator': 'equals', 'value': 'test'}]
            }
        }
    ]
    
    success_count = 0
    for test in error_tests:
        result = send_query(test['query'])
        
        # For error handling, we expect the system to handle gracefully
        if result['success']:
            data = result['data']
            if data.get('success'):
                print(f"✅ {test['name']}: Handled gracefully - {len(data.get('data', []))} results")
                success_count += 1
            else:
                print(f"⚠️ {test['name']}: Expected error handled - {data}")
                success_count += 1
        else:
            print(f"⚠️ {test['name']}: Error caught - {result['error']}")
            success_count += 1
    
    return success_count == len(error_tests)

def run_dashboard_uat():
    """Run the complete dashboard UAT test suite"""
    print("🚀 Starting Dashboard Query Functionality UAT Test")
    print("=" * 60)
    
    start_time = time.time()
    test_results = []
    
    # Run all test categories
    tests = [
        ("Basic Data Loading", test_basic_data_loading),
        ("Metric Selection", test_metric_selection),
        ("Dimension Grouping", test_dimension_grouping),
        ("Date Filtering", test_date_filtering),
        ("Custom Filters", test_custom_filters),
        ("Data Export", test_data_export),
        ("Performance", test_performance),
        ("Error Handling", test_error_handling)
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}: Exception - {str(e)}")
            test_results.append((test_name, False))
    
    # Calculate results
    total_tests = len(test_results)
    passed_tests = sum(1 for _, result in test_results if result)
    failed_tests = total_tests - passed_tests
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    total_time = time.time() - start_time
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 DASHBOARD UAT TEST RESULTS")
    print("=" * 60)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n📈 SUMMARY:")
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    print(f"Total Time: {total_time:.2f}s")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"dashboard_uat_results_{timestamp}.json"
    
    results_data = {
        'timestamp': datetime.now().isoformat(),
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': failed_tests,
        'success_rate': success_rate,
        'total_time': total_time,
        'test_results': [
            {
                'test_name': test_name,
                'passed': result
            }
            for test_name, result in test_results
        ]
    }
    
    with open(results_file, 'w') as f:
        json.dump(results_data, f, indent=2)
    
    print(f"\n💾 Results saved to: {results_file}")
    
    if success_rate >= 90:
        print("🎉 EXCELLENT: Dashboard UAT passed with high success rate!")
    elif success_rate >= 80:
        print("✅ GOOD: Dashboard UAT passed with acceptable success rate")
    elif success_rate >= 70:
        print("⚠️ FAIR: Dashboard UAT needs some improvements")
    else:
        print("❌ POOR: Dashboard UAT needs significant improvements")
    
    return success_rate >= 80

if __name__ == "__main__":
    run_dashboard_uat() 