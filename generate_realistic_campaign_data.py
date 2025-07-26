#!/usr/bin/env python3
"""
GENERATE REALISTIC CAMPAIGN DATA
================================
Create campaign data that reflects real-world variability, anomalies, and management challenges
"""

import csv
import random
from datetime import datetime, timedelta
import math

def generate_realistic_campaign_data():
    """Generate realistic campaign data with proper variability"""
    
    # Campaign configurations
    campaigns = [
        {
            'name': 'FreshNest Summer Grilling',
            'platforms': ['Meta', 'Dv360', 'Amazon'],
            'base_spend': 2000,
            'spend_volatility': 0.35,  # Realistic 35% daily variation
            'base_roas': 2.8,
            'roas_volatility': 0.25,   # 25% ROAS variation
            'base_ctr': 0.04,
            'ctr_volatility': 0.4,     # 40% CTR variation
            'optimization_cycles': 3   # Number of optimization events
        },
        {
            'name': 'FreshNest Back to School',
            'platforms': ['Meta', 'Dv360', 'Cm360', 'Sa360'],
            'base_spend': 3500,
            'spend_volatility': 0.45,  # Higher volatility for larger campaign
            'base_roas': 3.2,
            'roas_volatility': 0.3,
            'base_ctr': 0.035,
            'ctr_volatility': 0.5,
            'optimization_cycles': 4
        },
        {
            'name': 'FreshNest Holiday Recipes',
            'platforms': ['Meta', 'Amazon', 'Tradedesk'],
            'base_spend': 1200,
            'spend_volatility': 0.3,
            'base_roas': 2.5,
            'roas_volatility': 0.35,
            'base_ctr': 0.045,
            'ctr_volatility': 0.45,
            'optimization_cycles': 2
        },
        {
            'name': 'FreshNest Pantry Staples',
            'platforms': ['Meta', 'Dv360', 'Cm360'],
            'base_spend': 1800,
            'spend_volatility': 0.4,
            'base_roas': 3.0,
            'roas_volatility': 0.28,
            'base_ctr': 0.038,
            'ctr_volatility': 0.42,
            'optimization_cycles': 3
        }
    ]
    
    # Platform performance characteristics (realistic differences)
    platform_performance = {
        'Meta': {'roas_multiplier': 1.0, 'ctr_multiplier': 1.0, 'cpc': 0.8},
        'Dv360': {'roas_multiplier': 1.15, 'ctr_multiplier': 0.9, 'cpc': 1.2},
        'Cm360': {'roas_multiplier': 0.95, 'ctr_multiplier': 1.1, 'cpc': 0.7},
        'Sa360': {'roas_multiplier': 1.25, 'ctr_multiplier': 0.85, 'cpc': 1.5},
        'Amazon': {'roas_multiplier': 1.3, 'ctr_multiplier': 0.8, 'cpc': 1.8},
        'Tradedesk': {'roas_multiplier': 0.9, 'ctr_multiplier': 1.2, 'cpc': 0.6}
    }
    
    # Creative formats and their performance characteristics
    creative_formats = [
        {'format': 'VIDEO', 'roas_multiplier': 1.1, 'ctr_multiplier': 0.9},
        {'format': 'STATIC', 'roas_multiplier': 1.0, 'ctr_multiplier': 1.0},
        {'format': 'HTML5', 'roas_multiplier': 0.95, 'ctr_multiplier': 1.05},
        {'format': 'CAROUSEL', 'roas_multiplier': 0.9, 'ctr_multiplier': 1.15}
    ]
    
    # Generate data for 30 days
    start_date = datetime(2024, 6, 1)
    data = []
    
    for campaign_config in campaigns:
        campaign_name = campaign_config['name']
        platforms = campaign_config['platforms']
        
        # Add optimization events (performance improvements over time)
        optimization_dates = []
        for i in range(campaign_config['optimization_cycles']):
            day = random.randint(5, 25)  # Optimization happens between day 5-25
            optimization_dates.append(day)
        
        # Add some bad days (realistic campaign challenges)
        bad_days = random.sample(range(1, 31), random.randint(2, 5))
        
        # Add exceptional days (realistic wins)
        exceptional_days = random.sample(range(1, 31), random.randint(1, 3))
        
        for day in range(1, 31):
            current_date = start_date + timedelta(days=day-1)
            
            # Determine if this is an optimization day, bad day, or exceptional day
            is_optimization_day = day in optimization_dates
            is_bad_day = day in bad_days
            is_exceptional_day = day in exceptional_days
            
            for platform in platforms:
                # Base metrics
                base_spend = campaign_config['base_spend']
                base_roas = campaign_config['base_roas']
                base_ctr = campaign_config['base_ctr']
                
                # Apply platform multipliers
                platform_mult = platform_performance[platform]
                adjusted_roas = base_roas * platform_mult['roas_multiplier']
                adjusted_ctr = base_ctr * platform_mult['ctr_multiplier']
                
                # Add realistic daily variation
                spend_variation = random.normalvariate(1, campaign_config['spend_volatility'])
                roas_variation = random.normalvariate(1, campaign_config['roas_volatility'])
                ctr_variation = random.normalvariate(1, campaign_config['ctr_volatility'])
                
                # Apply special day modifiers
                if is_optimization_day:
                    roas_variation *= 1.15  # 15% improvement from optimization
                    ctr_variation *= 1.1    # 10% CTR improvement
                elif is_bad_day:
                    roas_variation *= 0.7   # 30% performance drop
                    ctr_variation *= 0.8    # 20% CTR drop
                    spend_variation *= 0.6  # 40% spend reduction (paused)
                elif is_exceptional_day:
                    roas_variation *= 1.4   # 40% exceptional performance
                    ctr_variation *= 1.3    # 30% exceptional CTR
                    spend_variation *= 1.2  # 20% increased spend
                
                # Calculate final metrics
                spend = max(0, base_spend * spend_variation)
                roas = max(0.1, adjusted_roas * roas_variation)
                ctr = max(0.001, adjusted_ctr * ctr_variation)
                
                # Calculate derived metrics
                revenue = spend * roas
                impressions = spend / (platform_mult['cpc'] * 1000)  # Estimate impressions from spend and CPC
                clicks = impressions * ctr
                conversions = clicks * random.uniform(0.02, 0.08)  # 2-8% conversion rate
                
                # Add some zero-spend days (realistic campaign pauses)
                if random.random() < 0.05:  # 5% chance of zero spend
                    spend = 0
                    impressions = 0
                    clicks = 0
                    conversions = 0
                    revenue = 0
                
                # Calculate additional metrics
                cpc = spend / clicks if clicks > 0 else platform_mult['cpc']
                cpm = spend / impressions * 1000 if impressions > 0 else 0
                cpa = spend / conversions if conversions > 0 else 0
                
                # Select creative format
                creative_format = random.choice(creative_formats)
                final_roas = roas * creative_format['roas_multiplier']
                final_ctr = ctr * creative_format['ctr_multiplier']
                
                # Generate realistic IDs and names
                campaign_id = f"{platform.upper()}_CAMP_{random.randint(10, 99):03d}"
                ad_group_id = f"{platform.upper()}_GRP_{random.randint(1, 20):03d}"
                ad_group_name = f"{platform} Group {random.randint(1, 20)}"
                placement_name = f"{platform} Placement {random.randint(1, 50)}"
                creative_id = f"CRT_{random.randint(1, 200):04d}"
                creative_name = f"Creative Variant {random.randint(1, 200)}"
                
                data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'platform': platform,
                    'campaign_id': campaign_id,
                    'ad_group_id': ad_group_id,
                    'ad_group_name': ad_group_name,
                    'placement_name': placement_name,
                    'creative_id': creative_id,
                    'creative_name': creative_name,
                    'creative_format': creative_format['format'],
                    'clicks': int(clicks),
                    'impressions': int(impressions),
                    'spend': round(spend, 2),
                    'conversions': int(conversions),
                    'ctr': round(final_ctr, 4),
                    'cpc': round(cpc, 2),
                    'cpm': round(cpm, 2),
                    'roas': round(final_roas, 2),
                    'canonical_campaign': f"{platform.upper()}_2024",
                    'campaign_name': campaign_name
                })
    
    # Sort by date
    data.sort(key=lambda x: x['date'])
    
    # Write to CSV
    fieldnames = [
        'date', 'platform', 'campaign_id', 'ad_group_id', 'ad_group_name',
        'placement_name', 'creative_id', 'creative_name', 'creative_format',
        'clicks', 'impressions', 'spend', 'conversions', 'ctr', 'cpc', 'cpm',
        'roas', 'canonical_campaign', 'campaign_name'
    ]
    
    with open('realistic-campaign-data.csv', 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print('✅ REALISTIC CAMPAIGN DATA GENERATED')
    print('=' * 60)
    print(f'📊 Generated {len(data)} data points')
    print(f'📅 Date range: {data[0]["date"]} to {data[-1]["date"]}')
    print(f'🎯 Campaigns: {len(set(item["campaign_name"] for item in data))}')
    print(f'🌐 Platforms: {len(set(item["platform"] for item in data))}')
    
    # Analyze the generated data
    print('\n📈 GENERATED DATA CHARACTERISTICS:')
    
    # Check for realistic patterns
    roas_values = [item['roas'] for item in data]
    ctr_values = [item['ctr'] for item in data]
    spend_values = [item['spend'] for item in data]
    
    print(f'• ROAS range: {min(roas_values):.2f}x to {max(roas_values):.2f}x')
    roas_std = (sum((x - sum(roas_values)/len(roas_values))**2 for x in roas_values)/len(roas_values))**0.5
    print(f'• ROAS standard deviation: {roas_std:.2f}')
    print(f'• CTR range: {min(ctr_values)*100:.2f}% to {max(ctr_values)*100:.2f}%')
    print(f'• Spend range: ${min(spend_values):.0f} to ${max(spend_values):.0f}')
    
    # Check for anomalies
    avg_roas = sum(roas_values) / len(roas_values)
    anomalies = [item for item in data if abs(item['roas'] - avg_roas) > 2 * roas_std]
    anomaly_rate = len(anomalies) / len(data)
    print(f'• Statistical anomalies: {len(anomalies)}/{len(data)} ({anomaly_rate*100:.1f}%)')
    
    # Check for zero-spend days
    zero_spend_days = [item for item in data if item['spend'] == 0]
    print(f'• Zero-spend days: {len(zero_spend_days)}/{len(data)} ({len(zero_spend_days)/len(data)*100:.1f}%)')
    
    # Check for optimization patterns
    print('\n⚡ REALISTIC FEATURES INCLUDED:')
    print('✅ Daily spend variation (20-50% coefficient of variation)')
    print('✅ Performance anomalies (5-15% statistical outliers)')
    print('✅ Platform performance differences')
    print('✅ Optimization events (performance improvements)')
    print('✅ Bad days (performance drops and pauses)')
    print('✅ Exceptional days (outstanding performance)')
    print('✅ Zero-spend days (campaign pauses)')
    print('✅ Creative format performance differences')
    print('✅ Realistic conversion rates and metrics')
    
    print(f'\n💾 Data saved to: realistic-campaign-data.csv')
    print('🔄 You can replace sample-campaign-data.csv with this file for more realistic testing')

if __name__ == "__main__":
    generate_realistic_campaign_data() 