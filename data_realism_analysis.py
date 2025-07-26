#!/usr/bin/env python3
"""
DATA REALISM ANALYSIS
=====================
Analyze if sample data shows realistic campaign patterns or artificial consistency
"""

import csv
from collections import defaultdict
from datetime import datetime

def analyze_data_realism():
    """Analyze if the data shows realistic campaign patterns"""
    data = []
    with open('sample-campaign-data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            data.append({
                'date': datetime.strptime(row['date'], '%Y-%m-%d'),
                'campaign': row['campaign_name'],
                'platform': row['platform'],
                'spend': float(row['spend']),
                'roas': float(row['roas']),
                'ctr': float(row['clicks']) / float(row['impressions']) if float(row['impressions']) > 0 else 0,
                'impressions': float(row['impressions']),
                'clicks': float(row['clicks'])
            })
    
    print('🔍 DATA REALISM ANALYSIS')
    print('=' * 60)
    
    # Analyze if this looks like real campaign data
    print('\n📊 DATA CHARACTERISTICS:')
    print(f'• Total data points: {len(data)}')
    print(f'• Date range: {min(item["date"] for item in data)} to {max(item["date"] for item in data)}')
    print(f'• Unique campaigns: {len(set(item["campaign"] for item in data))}')
    print(f'• Unique platforms: {len(set(item["platform"] for item in data))}')
    
    # Check for realistic variability
    print('\n📈 PERFORMANCE VARIABILITY:')
    roas_values = [item['roas'] for item in data]
    ctr_values = [item['ctr'] for item in data]
    spend_values = [item['spend'] for item in data]
    
    print(f'• ROAS range: {min(roas_values):.2f}x to {max(roas_values):.2f}x')
    roas_std = (sum((x - sum(roas_values)/len(roas_values))**2 for x in roas_values)/len(roas_values))**0.5
    print(f'• ROAS standard deviation: {roas_std:.2f}')
    print(f'• CTR range: {min(ctr_values)*100:.2f}% to {max(ctr_values)*100:.2f}%')
    print(f'• Spend range: ${min(spend_values):.0f} to ${max(spend_values):.0f}')
    
    # Check for realistic campaign patterns
    print('\n🎯 REALISTIC CAMPAIGN PATTERNS:')
    
    # 1. Check if campaigns have realistic daily spend patterns
    campaign_groups = defaultdict(list)
    for item in data:
        campaign_groups[item['campaign']].append(item)
    
    realistic_patterns = 0
    for campaign, items in campaign_groups.items():
        if len(items) < 3:
            continue
        
        # Check for realistic spend variation
        spends = [item['spend'] for item in items]
        avg_spend = sum(spends) / len(spends)
        spend_variance = sum((x - avg_spend)**2 for x in spends) / len(spends)
        spend_cv = (spend_variance**0.5) / avg_spend if avg_spend > 0 else 0
        
        # Real campaigns typically have 20-50% daily spend variation
        if 0.2 <= spend_cv <= 0.5:
            realistic_patterns += 1
            print(f'✅ {campaign}: Realistic spend variation ({spend_cv:.2f})')
        else:
            print(f'❌ {campaign}: Unrealistic spend variation ({spend_cv:.2f})')
    
    print(f'\n📊 REALISTIC PATTERN SCORE: {realistic_patterns}/{len(campaign_groups)} campaigns')
    
    # 2. Check for realistic performance trends
    print('\n📈 PERFORMANCE TREND ANALYSIS:')
    performance_evolution = 0
    for campaign, items in campaign_groups.items():
        if len(items) < 5:
            continue
        
        items.sort(key=lambda x: x['date'])
        early_roas = sum(item['roas'] for item in items[:len(items)//3]) / (len(items)//3)
        late_roas = sum(item['roas'] for item in items[-len(items)//3:]) / (len(items)//3)
        
        roas_change = ((late_roas - early_roas) / early_roas * 100) if early_roas > 0 else 0
        
        # Real campaigns typically show some performance evolution
        if abs(roas_change) > 5:
            performance_evolution += 1
            print(f'✅ {campaign}: Shows performance evolution ({roas_change:+.1f}%)')
        else:
            print(f'❌ {campaign}: Static performance ({roas_change:+.1f}%)')
    
    # 3. Check for realistic anomalies
    print('\n🚨 ANOMALY REALISM:')
    all_roas = [item['roas'] for item in data]
    avg_roas = sum(all_roas) / len(all_roas)
    roas_std = (sum((x - avg_roas)**2 for x in all_roas) / len(all_roas))**0.5
    
    anomalies = [item for item in data if abs(item['roas'] - avg_roas) > 2 * roas_std]
    anomaly_rate = len(anomalies)/len(data)
    print(f'• Statistical anomalies: {len(anomalies)}/{len(data)} ({anomaly_rate*100:.1f}%)')
    
    # Real campaigns typically have 5-15% statistical anomalies
    if 0.05 <= anomaly_rate <= 0.15:
        print('✅ Realistic anomaly rate')
        anomaly_realistic = True
    else:
        print('❌ Unrealistic anomaly rate (too few or too many)')
        anomaly_realistic = False
    
    # 4. Check for realistic platform performance differences
    print('\n🌐 PLATFORM PERFORMANCE REALISM:')
    platform_groups = defaultdict(list)
    for item in data:
        platform_groups[item['platform']].append(item)
    
    platform_roas = {}
    for platform, items in platform_groups.items():
        platform_roas[platform] = sum(item['roas'] for item in items) / len(items)
    
    # Real campaigns show platform performance differences
    roas_range = max(platform_roas.values()) - min(platform_roas.values())
    if roas_range > 0.5:
        print(f'✅ Realistic platform differences (ROAS range: {roas_range:.2f}x)')
        platform_realistic = True
    else:
        print(f'❌ Unrealistic platform similarity (ROAS range: {roas_range:.2f}x)')
        platform_realistic = False
    
    # 5. Check for realistic spend distribution
    print('\n💰 SPEND DISTRIBUTION REALISM:')
    total_spend = sum(item['spend'] for item in data)
    platform_spend = defaultdict(float)
    for item in data:
        platform_spend[item['platform']] += item['spend']
    
    spend_inequality = max(platform_spend.values()) / min(platform_spend.values())
    if spend_inequality > 2:
        print(f'✅ Realistic spend distribution (inequality: {spend_inequality:.1f}x)')
        spend_realistic = True
    else:
        print(f'❌ Unrealistic spend distribution (inequality: {spend_inequality:.1f}x)')
        spend_realistic = False
    
    # Overall assessment
    print('\n🎯 OVERALL DATA REALISM ASSESSMENT:')
    realism_score = 0
    if realistic_patterns / len(campaign_groups) > 0.5:
        realism_score += 20
    if platform_realistic:
        realism_score += 20
    if anomaly_realistic:
        realism_score += 20
    if performance_evolution > 0:
        realism_score += 20
    if spend_realistic:
        realism_score += 20
    
    print(f'• Data Realism Score: {realism_score}/100')
    
    if realism_score >= 80:
        assessment = "REALISTIC"
        print('• Assessment: REALISTIC - Data shows patterns consistent with real campaign management')
    elif realism_score >= 60:
        assessment = "SUSPICIOUS"
        print('• Assessment: SUSPICIOUS - Some patterns suggest artificial consistency')
    else:
        assessment = "ARTIFICIAL"
        print('• Assessment: ARTIFICIAL - Data appears to be artificially generated')
    
    # Management quality implications
    print('\n💡 MANAGEMENT QUALITY IMPLICATIONS:')
    if assessment == "ARTIFICIAL":
        print('• ⚠️ HIGH MANAGEMENT SCORES ARE MISLEADING')
        print('• The 99/100 management score is due to artificial data consistency')
        print('• Real campaigns would show more variability and optimization challenges')
        print('• The AI should acknowledge this limitation in its analysis')
    elif assessment == "SUSPICIOUS":
        print('• ⚠️ MANAGEMENT SCORES MAY BE INFLATED')
        print('• Data shows some artificial consistency patterns')
        print('• Real campaign management would face more challenges')
    else:
        print('• ✅ MANAGEMENT SCORES ARE LIKELY ACCURATE')
        print('• Data shows realistic campaign patterns')
        print('• High scores reflect actual good management')
    
    return {
        'realism_score': realism_score,
        'assessment': assessment,
        'realistic_patterns': realistic_patterns,
        'total_campaigns': len(campaign_groups),
        'anomaly_rate': anomaly_rate,
        'roas_range': roas_range,
        'spend_inequality': spend_inequality
    }

if __name__ == "__main__":
    analyze_data_realism() 