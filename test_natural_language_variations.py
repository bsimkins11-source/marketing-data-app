#!/usr/bin/env python3

import urllib.request
import json
import time

def test_natural_language_variations():
    """Test various natural language variations for follow-up chart requests"""

    print("🧪 Testing Natural Language Variations for Follow-up Charts")
    print("=" * 70)

    # Initial query to set up context
    initial_query = "what were the top performing campaigns"
    
    # Various natural language variations for follow-up chart requests
    follow_up_variations = [
        "can I get a chart of this for download",
        "show me a graph of that",
        "create a visualization of this data",
        "i would like to see this as a chart",
        "can you make a graph of these results",
        "please show me a chart of the information",
        "turn this into a visualization",
        "put that in a chart format",
        "i want to see this data visualized",
        "could you create a graph of what you showed",
        "display this information as a chart",
        "generate a visualization of the results",
        "make a chart out of this data",
        "show me a diagram of the performance",
        "i need to see this as a graph",
        "present this information in chart form",
        "draw a chart of the metrics",
        "illustrate this data visually",
        "depict the results in a chart",
        "render this information as a graph"
    ]

    session_id = f"test_natural_language_{int(time.time())}"
    
    print(f"\n📊 Initial Query: {initial_query}")
    print("-" * 50)
    
    # Send initial query
    try:
        data = json.dumps({"query": initial_query, "sessionId": session_id}).encode('utf-8')
        req = urllib.request.Request("http://localhost:3000/api/ai/query", data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        print(f"✅ Initial query successful")
        print(f"📋 Data type: {result.get('data', {}).get('type', 'none')}")
        print(f"📊 Has campaigns: {bool(result.get('data', {}).get('campaigns'))}")
        
    except Exception as e:
        print(f"❌ Initial query failed: {str(e)}")
        return

    print(f"\n🔄 Testing {len(follow_up_variations)} follow-up variations:")
    print("-" * 50)
    
    successful_variations = 0
    
    for i, variation in enumerate(follow_up_variations, 1):
        print(f"\n{i:2d}. Testing: {variation}")
        
        try:
            data = json.dumps({"query": variation, "sessionId": session_id}).encode('utf-8')
            req = urllib.request.Request("http://localhost:3000/api/ai/query", data=data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            data_type = result.get('data', {}).get('type', 'none')
            has_campaigns = bool(result.get('data', {}).get('campaigns'))
            content = result.get('content', '')
            
            if data_type == 'chart_data' and has_campaigns:
                print(f"   ✅ SUCCESS - Generated chart data")
                successful_variations += 1
            elif 'PREVIOUS RESULTS' in content or 'CHART GENERATED' in content:
                print(f"   ✅ SUCCESS - Chart response detected")
                successful_variations += 1
            else:
                print(f"   ❌ FAILED - No chart generated")
                print(f"      Data type: {data_type}")
                print(f"      Has campaigns: {has_campaigns}")
                print(f"      Content preview: {content[:100]}...")
            
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
        
        time.sleep(0.3)  # Small delay between requests
    
    print(f"\n" + "=" * 70)
    print(f"📊 RESULTS SUMMARY:")
    print(f"✅ Successful variations: {successful_variations}/{len(follow_up_variations)}")
    print(f"📈 Success rate: {(successful_variations/len(follow_up_variations)*100):.1f}%")
    
    if successful_variations == len(follow_up_variations):
        print(f"🎉 PERFECT! All natural language variations work!")
    elif successful_variations >= len(follow_up_variations) * 0.8:
        print(f"👍 EXCELLENT! Most variations work well!")
    elif successful_variations >= len(follow_up_variations) * 0.6:
        print(f"✅ GOOD! Majority of variations work!")
    else:
        print(f"⚠️  NEEDS IMPROVEMENT! Many variations failed")

if __name__ == "__main__":
    test_natural_language_variations() 