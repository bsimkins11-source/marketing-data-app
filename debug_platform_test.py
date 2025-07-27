#!/usr/bin/env python3
"""
DEBUG PLATFORM TEST - Test platform detection logic
"""

import json
import urllib.request

def query_api(query):
    """Query the AI API"""
    url = 'https://marketing-data-app.vercel.app/api/ai/query'
    data = json.dumps({'query': query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get('content', '')
    except Exception as e:
        return f'Error: {str(e)}'

def test_platform_detection():
    """Test platform detection logic"""
    
    test_queries = [
        "What is Dv360's performance?",
        "What is dv360's performance?", 
        "What is DV360's performance?",
        "Dv360 performance",
        "dv360 performance",
        "DV360 performance",
        "What is Dv360's conversions?",
        "What is dv360's conversions?",
        "Dv360 conversions",
        "dv360 conversions"
    ]
    
    print('🔍 DEBUGGING PLATFORM DETECTION')
    print('=' * 50)
    
    for i, query in enumerate(test_queries, 1):
        print(f'\n📝 Test {i}: {query}')
        response = query_api(query)
        
        if 'I understand you\'re asking about' in response:
            print('❌ FAILED: Generic help response')
        elif 'Error:' in response:
            print('🚨 ERROR: API error')
        else:
            print('✅ SUCCESS: Meaningful response')
            print(f'Response: {response[:100]}...')

if __name__ == "__main__":
    test_platform_detection() 