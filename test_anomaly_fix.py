import urllib.request
import json
import time

def query_api(query):
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return f"Error: {e}"

def test_anomaly_fix():
    """Test the anomaly detection fix"""
    test_queries = [
        "were there any anomalies in these campaigns I should be aware of",
        "show me any anomalies",
        "what anomalies do you see",
        "find any problems",
        "are there any issues"
    ]
    
    print("🔧 Testing Anomaly Detection Fix")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        response = query_api(query)
        
        if "Try asking about:" in response or "I can help you analyze" in response:
            status = "❌"
        elif "undefined (undefined)" in response:
            status = "⚠️"
        else:
            status = "✅"
        
        print(f"{i}. {status} {query}")
        if status == "✅":
            print(f"   Response: {str(response)[:150]}...")
        elif status == "⚠️":
            print(f"   Still showing undefined values")
        time.sleep(0.1)
    
    print("\n" + "=" * 50)
    print("Anomaly fix verification complete!")

if __name__ == "__main__":
    test_anomaly_fix() 