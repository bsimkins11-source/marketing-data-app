#!/usr/bin/env python3
"""
TEST PLATFORM LOGIC - Debug platform detection
"""

def test_platform_detection():
    """Test the platform detection logic"""
    
    # Simulate the KEYWORDS.PLATFORMS array
    platforms = ['meta', 'dv360', 'cm360', 'sa360', 'amazon', 'tradedesk']
    
    # Test queries
    test_queries = [
        "What is Dv360's performance?",
        "What is dv360's performance?",
        "What is DV360's performance?",
        "Dv360 performance",
        "dv360 performance",
        "DV360 performance"
    ]
    
    print('🔍 TESTING PLATFORM DETECTION LOGIC')
    print('=' * 50)
    print(f'Platforms array: {platforms}')
    print()
    
    for query in test_queries:
        lower_query = query.lower()
        print(f'Query: "{query}"')
        print(f'Lower query: "{lower_query}"')
        
        # Test the exact logic from our handler
        has_performance = 'performance' in lower_query or 'performing' in lower_query or 'results' in lower_query
        has_platform = any(platform in lower_query for platform in platforms)
        
        print(f'Has performance: {has_performance}')
        print(f'Has platform: {has_platform}')
        
        # Test platform detection
        detected_platform = None
        for platform in platforms:
            if platform in lower_query:
                detected_platform = platform
                break
        
        print(f'Detected platform: {detected_platform}')
        print('-' * 30)

if __name__ == "__main__":
    test_platform_detection() 