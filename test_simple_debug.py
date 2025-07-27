#!/usr/bin/env python3
"""
SIMPLE DEBUG TEST - Test basic API functionality
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

def test_simple():
    """Test simple queries"""
    
    test_queries = [
        "What is Dv360's spend?",
        "What is Dv360's performance?",
        "How much did we spend on Dv360?",
        "What is the spend for Dv360?"
    ]
    
    print('🔍 SIMPLE DEBUG TEST')
    print('=' * 30)
    
    for i, query in enumerate(test_queries, 1):
        print(f'\n📝 Test {i}: {query}')
        response = query_api(query)
        
        if 'Error:' in response:
            print('🚨 ERROR: API error')
        elif 'I understand you\'re asking about' in response:
            print('❌ FAILED: Generic help response')
        else:
            print('✅ SUCCESS: Meaningful response')
            print(f'Response: {response[:100]}...')

if __name__ == "__main__":
    test_simple() 