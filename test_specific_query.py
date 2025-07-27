import urllib.request
import json

def query_api(query):
    """Query the API endpoint"""
    url = "https://marketing-data-app.vercel.app/api/ai/query"
    data = json.dumps({"query": query}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result
    except Exception as e:
        return f"Error: {e}"

# Test the failing query
query = "How much did Meta spend?"
print(f"Testing: {query}")
result = query_api(query)
print(f"Response: {result}")
print(f"Content: {result.get('content', 'No content')}")
print(f"Data type: {result.get('data', {}).get('type', 'No type')}") 