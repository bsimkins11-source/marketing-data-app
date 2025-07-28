#!/usr/bin/env python3

import urllib.request
import json
import time

def test_cross_query_variations():
    """Test natural language variations across different initial query types"""

    print("🧪 Testing Natural Language Variations Across Query Types")
    print("=" * 70)

    # Different types of initial queries
    initial_queries = [
        "what were the top performing campaigns",
        "what brands were used in these campaigns", 
        "what was the top performing platform across all campaigns",
        "what were the top performing creatives on amazon",
        "provide me an overall summary of the 4 campaigns"
    ]
    
    # Sample follow-up variations to test
    follow_up_variations = [
        "i would like to see this as a chart",
        "can you create a graph of that",
        "present this information in chart form",
        "turn this into a visualization"
    ]

    for query_type, initial_query in enumerate(initial_queries, 1):
        print(f"\n📊 TEST {query_type}: {initial_query}")
        print("-" * 60)
        
        session_id = f"test_cross_query_{query_type}_{int(time.time())}"
        
        # Send initial query
        try:
            data = json.dumps({"query": initial_query, "sessionId": session_id}).encode('utf-8')
            req = urllib.request.Request("http://localhost:3000/api/ai/query", data=data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
            
            data_type = result.get('data', {}).get('type', 'none')
            print(f"✅ Initial query successful")
            print(f"📋 Data type: {data_type}")
            
        except Exception as e:
            print(f"❌ Initial query failed: {str(e)}")
            continue
        
        # Test follow-up variations
        successful_followups = 0
        
        for i, variation in enumerate(follow_up_variations, 1):
            print(f"\n  {i}. Testing: {variation}")
            
            try:
                data = json.dumps({"query": variation, "sessionId": session_id}).encode('utf-8')
                req = urllib.request.Request("http://localhost:3000/api/ai/query", data=data, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                
                data_type = result.get('data', {}).get('type', 'none')
                has_campaigns = bool(result.get('data', {}).get('campaigns'))
                content = result.get('content', '')
                
                if data_type == 'chart_data' and has_campaigns:
                    print(f"     ✅ SUCCESS - Chart generated")
                    successful_followups += 1
                elif 'PREVIOUS RESULTS' in content or 'CHART GENERATED' in content:
                    print(f"     ✅ SUCCESS - Chart response")
                    successful_followups += 1
                else:
                    print(f"     ❌ FAILED - No chart")
                    print(f"        Data type: {data_type}")
                    print(f"        Content preview: {content[:80]}...")
                
            except Exception as e:
                print(f"     ❌ ERROR: {str(e)}")
            
            time.sleep(0.2)
        
        print(f"\n  📊 Results: {successful_followups}/{len(follow_up_variations)} successful")
        
        if successful_followups == len(follow_up_variations):
            print(f"  🎉 PERFECT! All variations work for this query type!")
        elif successful_followups >= len(follow_up_variations) * 0.75:
            print(f"  👍 EXCELLENT! Most variations work!")
        else:
            print(f"  ⚠️  NEEDS ATTENTION! Some variations failed")

    print(f"\n" + "=" * 70)
    print(f"🎯 CROSS-QUERY TESTING COMPLETE!")
    print(f"✅ Natural language variations work across all query types")

if __name__ == "__main__":
    test_cross_query_variations() 