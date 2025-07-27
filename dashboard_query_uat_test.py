#!/usr/bin/env python3
"""
Dashboard Query Builder UAT Test
Comprehensive testing of the QueryBuilder component functionality
"""
import urllib.request
import json
import time
import random
from datetime import datetime, timedelta

API_URL = "http://localhost:3000/api/data/query"

def send_query(query_data):
    """Send a query to the dashboard QueryBuilder API"""
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
            response_time = time.time() - start_time
            
            return {
                'success': True,
                'data': response_data,
                'response_time': response_time,
                'status_code': response.status
            }
    except urllib.error.HTTPError as e:
        return {
            'success': False,
            'error': f'HTTP {e.code}: {e.reason}',
            'response_time': 0
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'response_time': 0
        }

def test_basic_queries():
    """Test basic query functionality"""
    print("🧪 Testing Basic Queries...")
    
    tests = [
        {
            'name': 'Simple Metrics Query',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': []
            }
        },
        {
            'name': 'Brand Analysis',
            'query': {
                'metrics': ['spend', 'revenue', 'impressions'],
                'dimensions': ['brand']
            }
        },
        {
            'name': 'Brand + Campaign Grouping',
            'query': {
                'metrics': ['spend', 'revenue', 'impressions'],
                'dimensions': ['brand', 'campaign']
            }
        },
        {
            'name': 'Platform Analysis',
            'query': {
                'metrics': ['spend', 'revenue', 'ctr'],
                'dimensions': ['platform']
            }
        },
        {
            'name': 'Creative Performance',
            'query': {
                'metrics': ['spend', 'revenue', 'clicks'],
                'dimensions': ['creative']
            }
        }
    ]
    
    results = []
    for test in tests:
        print(f"  Testing: {test['name']}")
        result = send_query(test['query'])
        results.append({
            'test': test['name'],
            'success': result['success'],
            'response_time': result['response_time'],
            'data_count': len(result.get('data', {}).get('data', [])) if result['success'] else 0
        })
        
        if result['success']:
            print(f"    ✅ Success - {result['data']['totalRows']} rows in {result['response_time']:.2f}s")
        else:
            print(f"    ❌ Failed: {result['error']}")
    
    return results

def test_filtering():
    """Test filtering functionality"""
    print("\n🔍 Testing Filtering...")
    
    tests = [
        {
            'name': 'Brand Filter',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': ['brand'],
                'filters': [
                    {
                        'field': 'brand',
                        'operator': 'equals',
                        'value': 'FreshNest'
                    }
                ]
            }
        },
        {
            'name': 'Campaign Filter',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': ['campaign'],
                'filters': [
                    {
                        'field': 'campaign',
                        'operator': 'contains',
                        'value': 'FreshNest'
                    }
                ]
            }
        },
        {
            'name': 'Spend Threshold',
            'query': {
                'metrics': ['spend', 'revenue', 'roas'],
                'dimensions': ['campaign'],
                'filters': [
                    {
                        'field': 'spend',
                        'operator': 'greater_than',
                        'value': 100000
                    }
                ]
            }
        },
        {
            'name': 'Platform Specific',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': ['platform'],
                'filters': [
                    {
                        'field': 'platform',
                        'operator': 'equals',
                        'value': 'Facebook'
                    }
                ]
            }
        }
    ]
    
    results = []
    for test in tests:
        print(f"  Testing: {test['name']}")
        result = send_query(test['query'])
        results.append({
            'test': test['name'],
            'success': result['success'],
            'response_time': result['response_time'],
            'data_count': len(result.get('data', {}).get('data', [])) if result['success'] else 0
        })
        
        if result['success']:
            print(f"    ✅ Success - {result['data']['totalRows']} rows in {result['response_time']:.2f}s")
        else:
            print(f"    ❌ Failed: {result['error']}")
    
    return results

def test_complex_queries():
    """Test complex multi-dimensional queries"""
    print("\n🎯 Testing Complex Queries...")
    
    tests = [
        {
            'name': 'Brand + Campaign Analysis',
            'query': {
                'metrics': ['spend', 'revenue', 'ctr', 'roas'],
                'dimensions': ['brand', 'campaign']
            }
        },
        {
            'name': 'Campaign + Platform Analysis',
            'query': {
                'metrics': ['spend', 'revenue', 'ctr', 'roas'],
                'dimensions': ['campaign', 'platform']
            }
        },
        {
            'name': 'Creative + Audience Performance',
            'query': {
                'metrics': ['spend', 'revenue', 'clicks', 'impressions'],
                'dimensions': ['creative', 'audience']
            }
        },
        {
            'name': 'Brand + Platform + Creative',
            'query': {
                'metrics': ['spend', 'revenue', 'roas'],
                'dimensions': ['brand', 'platform', 'creative']
            }
        }
    ]
    
    results = []
    for test in tests:
        print(f"  Testing: {test['name']}")
        result = send_query(test['query'])
        results.append({
            'test': test['name'],
            'success': result['success'],
            'response_time': result['response_time'],
            'data_count': len(result.get('data', {}).get('data', [])) if result['success'] else 0
        })
        
        if result['success']:
            print(f"    ✅ Success - {result['data']['totalRows']} rows in {result['response_time']:.2f}s")
        else:
            print(f"    ❌ Failed: {result['error']}")
    
    return results

def test_date_range():
    """Test date range filtering"""
    print("\n📅 Testing Date Range...")
    
    # Create date ranges
    today = datetime.now()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    tests = [
        {
            'name': 'Last Week',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': ['campaign'],
                'date_range': {
                    'start': week_ago.strftime('%Y-%m-%d'),
                    'end': today.strftime('%Y-%m-%d')
                }
            }
        },
        {
            'name': 'Last Month',
            'query': {
                'metrics': ['spend', 'revenue'],
                'dimensions': ['platform'],
                'date_range': {
                    'start': month_ago.strftime('%Y-%m-%d'),
                    'end': today.strftime('%Y-%m-%d')
                }
            }
        }
    ]
    
    results = []
    for test in tests:
        print(f"  Testing: {test['name']}")
        result = send_query(test['query'])
        results.append({
            'test': test['name'],
            'success': result['success'],
            'response_time': result['response_time'],
            'data_count': len(result.get('data', {}).get('data', [])) if result['success'] else 0
        })
        
        if result['success']:
            print(f"    ✅ Success - {result['data']['totalRows']} rows in {result['response_time']:.2f}s")
        else:
            print(f"    ❌ Failed: {result['error']}")
    
    return results

def test_performance():
    """Test performance with large queries"""
    print("\n⚡ Testing Performance...")
    
    # Test with all metrics and dimensions
    large_query = {
        'metrics': ['spend', 'revenue', 'impressions', 'clicks', 'conversions', 'ctr', 'cpc', 'cpa', 'roas'],
        'dimensions': ['brand', 'campaign', 'platform', 'audience', 'creative']
    }
    
    print("  Testing: Large Query (All Metrics + Dimensions)")
    result = send_query(large_query)
    
    performance_result = {
        'test': 'Large Query Performance',
        'success': result['success'],
        'response_time': result['response_time'],
        'data_count': len(result.get('data', {}).get('data', [])) if result['success'] else 0
    }
    
    if result['success']:
        print(f"    ✅ Success - {result['data']['totalRows']} rows in {result['response_time']:.2f}s")
        if result['response_time'] < 1.0:
            print("    🚀 Excellent performance (< 1s)")
        elif result['response_time'] < 3.0:
            print("    ⚡ Good performance (< 3s)")
        else:
            print("    ⚠️  Slow performance (> 3s)")
    else:
        print(f"    ❌ Failed: {result['error']}")
    
    return [performance_result]

def run_dashboard_uat():
    """Run comprehensive dashboard UAT test"""
    print("🎯 Dashboard Query Builder UAT Test")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    all_results = []
    
    # Run all test categories
    all_results.extend(test_basic_queries())
    all_results.extend(test_filtering())
    all_results.extend(test_complex_queries())
    all_results.extend(test_date_range())
    all_results.extend(test_performance())
    
    # Calculate summary statistics
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r['success'])
    failed_tests = total_tests - successful_tests
    avg_response_time = sum(r['response_time'] for r in all_results if r['success']) / max(successful_tests, 1)
    
    print("\n" + "=" * 50)
    print("📊 UAT Test Summary")
    print("=" * 50)
    print(f"Total Tests: {total_tests}")
    print(f"Successful: {successful_tests} ✅")
    print(f"Failed: {failed_tests} ❌")
    print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
    print(f"Average Response Time: {avg_response_time:.2f}s")
    
    # Save detailed results
    results_data = {
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'failed_tests': failed_tests,
            'success_rate': (successful_tests/total_tests)*100,
            'avg_response_time': avg_response_time
        },
        'detailed_results': all_results
    }
    
    filename = f"dashboard_uat_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(results_data, f, indent=2)
    
    print(f"\n📁 Detailed results saved to: {filename}")
    
    # Return success if > 90% pass rate
    return (successful_tests/total_tests) >= 0.9

if __name__ == "__main__":
    success = run_dashboard_uat()
    exit(0 if success else 1) 