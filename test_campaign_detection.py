#!/usr/bin/env python3

def test_campaign_detection(query):
    """Test the exact campaign detection logic used in the code"""
    lower_query = query.lower()
    
    # Campaign names from the code
    campaign_names = ['freshnest summer grilling', 'freshnest back to school', 'freshnest holiday recipes', 'freshnest pantry staples']
    
    # Test the exact logic from the code
    detected_campaign = None
    for campaign in campaign_names:
        if campaign in lower_query:
            detected_campaign = campaign
            break
    
    # CTR keywords from the code
    ctr_keywords = ['ctr', 'click-through rate', 'click through rate', 'click rate', 'click-through', 'clickthrough']
    is_ctr_query = any(keyword in lower_query for keyword in ctr_keywords)
    
    # ROAS keywords from the code
    roas_keywords = ['roas', 'return on ad spend', 'return on advertising spend', 'return on investment', 'roi']
    is_roas_query = any(keyword in lower_query for keyword in roas_keywords)
    
    return {
        'query': query,
        'lower_query': lower_query,
        'detected_campaign': detected_campaign,
        'is_ctr_query': is_ctr_query,
        'is_roas_query': is_roas_query,
        'has_each': 'each' in lower_query or 'individual' in lower_query
    }

def main():
    print("=== TESTING CAMPAIGN DETECTION LOGIC ===")
    
    test_queries = [
        "test",
        "ctr",
        "freshnest",
        "summer grilling",
        "freshnest summer grilling",
        "freshnest summer grilling ctr",
        "What is the CTR for FreshNest Summer Grilling?",
        "What's the CTR for FreshNest Summer Grilling?",
        "freshnest summer grilling roas",
        "What's the ROAS for FreshNest Summer Grilling?"
    ]
    
    for query in test_queries:
        result = test_campaign_detection(query)
        print(f"\nQuery: '{query}'")
        print(f"  Lower query: '{result['lower_query']}'")
        print(f"  Detected campaign: {result['detected_campaign']}")
        print(f"  Is CTR query: {result['is_ctr_query']}")
        print(f"  Is ROAS query: {result['is_roas_query']}")
        print(f"  Has 'each': {result['has_each']}")
        
        # Check if it should trigger campaign handlers
        if result['detected_campaign'] and result['is_ctr_query'] and not result['has_each']:
            print(f"  ✅ SHOULD TRIGGER CTR HANDLER")
        elif result['detected_campaign'] and result['is_roas_query'] and not result['has_each']:
            print(f"  ✅ SHOULD TRIGGER ROAS HANDLER")
        else:
            print(f"  ❌ SHOULD NOT TRIGGER CAMPAIGN HANDLERS")

if __name__ == "__main__":
    main() 