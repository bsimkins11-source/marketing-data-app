#!/usr/bin/env python3

import urllib.request
import json
import time

def test_chart_download_query():
    """Test the specific query that was failing"""
    
    print("🧪 Testing Chart Download Query")
    print("=" * 50)
    
    # Test the specific query that was failing
    test_query = "can I get a chart of this for download"
    
    print(f"Testing: {test_query}")
    
    try:
        # Prepare the request
        data = json.dumps({"query": test_query}).encode('utf-8')
        req = urllib.request.Request(
            "http://localhost:3000/api/ai/query",
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        
        # Send request
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # Check if response has chart data
        has_chart_data = result.get('data', {}).get('type') == 'chart_data'
        has_campaigns = has_chart_data and result.get('data', {}).get('campaigns')
        
        print(f"   ✅ Chart data: {has_chart_data}")
        print(f"   📊 Campaigns: {len(result.get('data', {}).get('campaigns', []))}")
        
        if has_campaigns:
            campaigns = result.get('data', {}).get('campaigns', [])
            print(f"   💰 Total Revenue: ${sum(c['revenue'] for c in campaigns):,.0f}")
            print(f"   📈 Chart Type: {result.get('data', {}).get('chartType', 'unknown')}")
            print("   🎯 Download buttons should be available in UI")
            print("\n   📝 Content Preview:")
            content = result.get('content', '')
            print(f"   {content[:200]}...")
        else:
            print("   ❌ No chart data generated")
            print("   📝 Content Preview:")
            content = result.get('content', '')
            print(f"   {content[:200]}...")
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎯 Expected Behavior:")
    print("✅ Should generate chart data for download")
    print("✅ Should include PNG and CSV download buttons")
    print("✅ Should show top 5 campaigns by revenue")

if __name__ == "__main__":
    test_chart_download_query() 