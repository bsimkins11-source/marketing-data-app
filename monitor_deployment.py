#!/usr/bin/env python3

import urllib.request
import json
import time
import datetime

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    
    data = {
        "query": query,
        "sessionId": "deployment-monitor"
    }
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result.get('content', 'No content')
    except Exception as e:
        return f"Error: {e}"

def monitor_deployment():
    """Monitor deployment by testing if new handlers are working"""
    print("🚀 MONITORING DEPLOYMENT 🚀")
    print("=" * 50)
    print("Testing for new handlers every 30 seconds...")
    print("Looking for: 'platform performed best' to return actual data instead of help message")
    print("=" * 50)
    
    test_query = "platform performed best"
    old_response = "I understand you're asking about"
    
    attempt = 1
    while True:
        print(f"\n[{datetime.datetime.now().strftime('%H:%M:%S')}] Attempt {attempt}: Testing deployment...")
        
        try:
            response = query_api(test_query)
            
            if old_response in response:
                print("❌ Still old code - deployment not complete")
                print(f"Response: {response[:100]}...")
            else:
                print("🎉 DEPLOYMENT COMPLETE! 🎉")
                print("✅ New handlers are working!")
                print(f"Response: {response[:200]}...")
                break
                
        except Exception as e:
            print(f"⚠️  Error testing: {e}")
        
        attempt += 1
        print("Waiting 30 seconds...")
        time.sleep(30)

if __name__ == "__main__":
    monitor_deployment() 