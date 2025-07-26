#!/usr/bin/env python3
"""
OPTIMIZATION ANALYSIS
====================
Analyze campaign data to identify optimization opportunities
"""

import csv
from collections import defaultdict

def load_csv_data():
    """Load and process CSV data"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Calculate revenue from spend and ROAS
            spend = float(row['spend'])
            roas = float(row['roas'])
            revenue = spend * roas
            
            data.append({
                'platform': row['platform'],
                'campaign_name': row['campaign_name'],
                'spend': spend,
                'revenue': revenue,
                'impressions': float(row['impressions']),
                'clicks': float(row['clicks']),
                'conversions': float(row['conversions']),
                'ctr': float(row['clicks']) / float(row['impressions']) if float(row['impressions']) > 0 else 0,
                'roas': roas,
                'cpa': spend / float(row['conversions']) if float(row['conversions']) > 0 else 0
            })
    return data

def analyze_optimizations():
    """Analyze optimization opportunities"""
    data = load_csv_data()
    
    print('📊 CAMPAIGN PERFORMANCE ANALYSIS')
    print('=' * 50)
    
    # Platform analysis
    platform_groups = defaultdict(list)
    for item in data:
        platform_groups[item['platform']].append(item)
    
    platform_metrics = {}
    for platform, items in platform_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        platform_metrics[platform] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0
        }
    
    # Campaign analysis
    campaign_groups = defaultdict(list)
    for item in data:
        campaign_groups[item['campaign_name']].append(item)
    
    campaign_metrics = {}
    for campaign, items in campaign_groups.items():
        total_spend = sum(item['spend'] for item in items)
        total_revenue = sum(item['revenue'] for item in items)
        total_impressions = sum(item['impressions'] for item in items)
        total_clicks = sum(item['clicks'] for item in items)
        
        campaign_metrics[campaign] = {
            'spend': total_spend,
            'revenue': total_revenue,
            'impressions': total_impressions,
            'clicks': total_clicks,
            'roas': total_revenue / total_spend if total_spend > 0 else 0,
            'ctr': total_clicks / total_impressions if total_impressions > 0 else 0
        }
    
    # Platform performance by ROAS
    print('\n🏆 PLATFORM PERFORMANCE BY ROAS:')
    platform_roas = [(platform, metrics['roas']) for platform, metrics in platform_metrics.items()]
    platform_roas.sort(key=lambda x: x[1], reverse=True)
    for i, (platform, roas) in enumerate(platform_roas, 1):
        print(f'{i}. {platform}: {roas:.2f}x ROAS')
    
    # Platform performance by CTR
    print('\n🎯 PLATFORM PERFORMANCE BY CTR:')
    platform_ctr = [(platform, metrics['ctr']) for platform, metrics in platform_metrics.items()]
    platform_ctr.sort(key=lambda x: x[1], reverse=True)
    for i, (platform, ctr) in enumerate(platform_ctr, 1):
        print(f'{i}. {platform}: {ctr*100:.2f}% CTR')
    
    # Campaign performance by ROAS
    print('\n💰 CAMPAIGN PERFORMANCE BY ROAS:')
    campaign_roas = [(campaign, metrics['roas']) for campaign, metrics in campaign_metrics.items()]
    campaign_roas.sort(key=lambda x: x[1], reverse=True)
    for i, (campaign, roas) in enumerate(campaign_roas, 1):
        print(f'{i}. {campaign}: {roas:.2f}x ROAS')
    
    # Campaign performance by CTR
    print('\n🎯 CAMPAIGN PERFORMANCE BY CTR:')
    campaign_ctr = [(campaign, metrics['ctr']) for campaign, metrics in campaign_metrics.items()]
    campaign_ctr.sort(key=lambda x: x[1], reverse=True)
    for i, (campaign, ctr) in enumerate(campaign_ctr, 1):
        print(f'{i}. {campaign}: {ctr*100:.2f}% CTR')
    
    # Optimization opportunities
    print('\n💡 OPTIMIZATION OPPORTUNITIES:')
    print('\n1. HIGHEST ROAS PLATFORMS (Increase spend here):')
    for platform, roas in platform_roas[:3]:
        print(f'   • {platform}: {roas:.2f}x ROAS')
    
    print('\n2. LOWEST ROAS PLATFORMS (Optimize or reduce spend):')
    for platform, roas in platform_roas[-3:]:
        print(f'   • {platform}: {roas:.2f}x ROAS')
    
    print('\n3. HIGHEST CTR PLATFORMS (Good engagement):')
    for platform, ctr in platform_ctr[:3]:
        print(f'   • {platform}: {ctr*100:.2f}% CTR')
    
    print('\n4. LOWEST CTR PLATFORMS (Need creative optimization):')
    for platform, ctr in platform_ctr[-3:]:
        print(f'   • {platform}: {ctr*100:.2f}% CTR')
    
    # Revenue optimization potential
    print('\n📈 REVENUE OPTIMIZATION POTENTIAL:')
    total_spend = sum(metrics['spend'] for metrics in platform_metrics.values())
    total_revenue = sum(metrics['revenue'] for metrics in platform_metrics.values())
    
    # If we moved all spend to Amazon (highest ROAS)
    amazon_roas = platform_metrics['Amazon']['roas']
    potential_revenue = total_spend * amazon_roas
    revenue_increase = potential_revenue - total_revenue
    
    print(f'\nIf all spend went to Amazon (3.60x ROAS):')
    print(f'   • Current revenue: ${total_revenue:,.0f}')
    print(f'   • Potential revenue: ${potential_revenue:,.0f}')
    print(f'   • Revenue increase: ${revenue_increase:,.0f} (+{(revenue_increase/total_revenue)*100:.1f}%)')
    
    # Specific recommendations
    print('\n🎯 SPECIFIC RECOMMENDATIONS:')
    print('\n1. BUDGET REALLOCATION:')
    print(f'   • Move budget from Sa360 (2.70x ROAS) to Amazon (3.60x ROAS)')
    print(f'   • Consider reducing Meta spend (2.80x ROAS) and increasing Cm360 (3.56x ROAS)')
    
    print('\n2. CREATIVE OPTIMIZATION:')
    print(f'   • Focus on improving Sa360 CTR (3.84%) - lowest among platforms')
    print(f'   • Meta has good CTR (3.70%) but lower ROAS - optimize conversion funnel')
    
    print('\n3. CAMPAIGN OPTIMIZATION:')
    print(f'   • FreshNest Holiday Recipes has highest ROAS (3.43x) - consider expanding')
    print(f'   • FreshNest Summer Grilling has lowest ROAS (2.76x) - needs optimization')
    
    print('\n4. SCALING OPPORTUNITIES:')
    print(f'   • Amazon: Smallest spend ($17.6K) but highest ROAS (3.60x) - major scaling opportunity')
    print(f'   • Cm360: Good ROAS (3.56x) with moderate spend ($30.5K) - room to scale')

if __name__ == "__main__":
    analyze_optimizations() 