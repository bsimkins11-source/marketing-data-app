# Marketing Campaign Data Dictionary

## Overview
This document provides a comprehensive data dictionary for the marketing campaign performance data used in the FreshNest marketing analytics application. The dataset contains daily campaign performance metrics across multiple advertising platforms and campaigns.

## File Information
- **File Name**: `sample-campaign-data.csv`
- **Total Records**: 641 data rows + 1 header row
- **Date Range**: June 1-30, 2024
- **Brand**: FreshNest
- **Data Granularity**: Daily performance by platform, campaign, ad group, placement, and creative

---

## Field Definitions

### 1. **date** (Date)
- **Type**: Date (YYYY-MM-DD format)
- **Description**: The date when the campaign performance data was recorded
- **Example**: `2024-06-01`
- **Business Use**: Used for time-based analysis, trend identification, and performance tracking over time

### 2. **brand** (Text)
- **Type**: String
- **Description**: The brand name associated with the campaign
- **Values**: `FreshNest`
- **Business Use**: Brand identification and filtering

### 3. **audience** (Text)
- **Type**: String
- **Description**: Target audience segment for the campaign
- **Values**:
  - `Outdoor Cooking Enthusiasts`
  - `Family Shoppers`
  - `General`
  - `Holiday Entertainers`
  - `Home Cooks`
- **Business Use**: Audience targeting analysis, performance comparison across segments

### 4. **platform** (Text)
- **Type**: String
- **Description**: Advertising platform where the campaign was run
- **Values**:
  - `Meta` (Facebook/Instagram)
  - `Dv360` (Display & Video 360)
  - `Amazon` (Amazon Advertising)
  - `Cm360` (Campaign Manager 360)
  - `Sa360` (Search Ads 360)
  - `Tradedesk` (The Trade Desk)
- **Business Use**: Platform performance comparison, budget allocation analysis

### 5. **campaign_id** (Text)
- **Type**: String
- **Description**: Unique identifier for the campaign
- **Format**: `[PLATFORM]_CAMP_[XXX]` (e.g., `META_CAMP_085`)
- **Business Use**: Campaign identification and tracking

### 6. **ad_group_id** (Text)
- **Type**: String
- **Description**: Unique identifier for the ad group within a campaign
- **Format**: `[PLATFORM]_GRP_[XXX]` (e.g., `META_GRP_002`)
- **Business Use**: Ad group performance analysis and optimization

### 7. **ad_group_name** (Text)
- **Type**: String
- **Description**: Human-readable name for the ad group
- **Format**: `[Platform] Group [Number]` (e.g., `Meta Group 19`)
- **Business Use**: Ad group identification and reporting

### 8. **placement_name** (Text)
- **Type**: String
- **Description**: Name of the placement where the ad was shown
- **Format**: `[Platform] Placement [Number]` (e.g., `Meta Placement 4`)
- **Business Use**: Placement performance analysis and optimization

### 9. **creative_id** (Text)
- **Type**: String
- **Description**: Unique identifier for the creative asset
- **Format**: `CRT_[XXXX]` (e.g., `CRT_0180`)
- **Business Use**: Creative performance tracking and optimization

### 10. **creative_name** (Text)
- **Type**: String
- **Description**: Human-readable name for the creative asset
- **Format**: `Creative Variant [Number]` (e.g., `Creative Variant 85`)
- **Business Use**: Creative identification and performance analysis

### 11. **creative_format** (Text)
- **Type**: String
- **Description**: Type of creative format used
- **Values**:
  - `STATIC` (Static image)
  - `VIDEO` (Video creative)
  - `HTML5` (HTML5 banner)
  - `CAROUSEL` (Carousel ad)
- **Business Use**: Creative format performance analysis and optimization

### 12. **clicks** (Integer)
- **Type**: Whole number
- **Description**: Number of clicks received on the ad
- **Range**: 0 to 15+ clicks per day
- **Business Use**: Click-through rate calculation, engagement measurement

### 13. **impressions** (Integer)
- **Type**: Whole number
- **Description**: Number of times the ad was shown
- **Range**: 1 to 976+ impressions per day
- **Business Use**: Reach measurement, CPM calculation

### 14. **spend** (Decimal)
- **Type**: Decimal number (2 decimal places)
- **Description**: Amount spent on advertising in USD
- **Range**: $0.00 to $6,526.52 per day
- **Business Use**: Budget tracking, cost analysis, ROAS calculation

### 15. **conversions** (Integer)
- **Type**: Whole number
- **Description**: Number of conversions attributed to the ad
- **Range**: 0 to 3 conversions per day
- **Business Use**: Conversion tracking, CPA calculation, ROI measurement

### 16. **ctr** (Decimal)
- **Type**: Decimal number (percentage as decimal)
- **Description**: Click-through rate (clicks divided by impressions)
- **Range**: 0.0016 to 0.0299 (0.16% to 2.99%)
- **Business Use**: Ad performance measurement, engagement analysis

### 17. **cpc** (Decimal)
- **Type**: Decimal number (2 decimal places)
- **Description**: Cost per click in USD
- **Range**: $0.00 to $5,379.18
- **Business Use**: Cost efficiency analysis, bid optimization

### 18. **cpm** (Decimal)
- **Type**: Decimal number (1 decimal place)
- **Description**: Cost per thousand impressions in USD
- **Range**: $0.0 to $2,071,700.0
- **Business Use**: Cost efficiency analysis, pricing comparison

### 19. **roas** (Decimal)
- **Type**: Decimal number (2 decimal places)
- **Description**: Return on ad spend (revenue divided by spend)
- **Range**: 1.50x to 5.00x
- **Business Use**: Campaign profitability measurement, performance evaluation

### 20. **canonical_campaign** (Text)
- **Type**: String
- **Description**: Standardized campaign identifier across platforms
- **Format**: `[PLATFORM]_[YEAR]` (e.g., `META_2024`)
- **Business Use**: Cross-platform campaign grouping and analysis

### 21. **campaign_name** (Text)
- **Type**: String
- **Description**: Human-readable campaign name
- **Values**:
  - `FreshNest Summer Grilling`
  - `FreshNest Back to School`
  - `FreshNest Holiday Recipes`
  - `FreshNest Pantry Staples`
- **Business Use**: Campaign identification and reporting

---

## Calculated Metrics

### Key Performance Indicators (KPIs)

1. **Click-Through Rate (CTR)**
   - **Formula**: `(clicks / impressions) × 100`
   - **Unit**: Percentage
   - **Business Use**: Measures ad engagement and relevance

2. **Cost Per Click (CPC)**
   - **Formula**: `spend / clicks`
   - **Unit**: USD per click
   - **Business Use**: Measures cost efficiency of driving traffic

3. **Cost Per Thousand Impressions (CPM)**
   - **Formula**: `(spend / impressions) × 1000`
   - **Unit**: USD per 1,000 impressions
   - **Business Use**: Measures cost efficiency of reach

4. **Return on Ad Spend (ROAS)**
   - **Formula**: `revenue / spend`
   - **Unit**: Ratio (e.g., 3.29x means $3.29 revenue per $1 spent)
   - **Business Use**: Measures campaign profitability

5. **Cost Per Acquisition (CPA)**
   - **Formula**: `spend / conversions`
   - **Unit**: USD per conversion
   - **Business Use**: Measures cost efficiency of driving conversions

---

## Data Quality Notes

### Missing Values
- Some records show `$0.00` spend with conversions, indicating free placements or promotional campaigns
- All required fields are populated

### Data Consistency
- Date format is consistent (YYYY-MM-DD)
- Currency values are in USD with 2 decimal places
- Platform names are standardized
- Campaign naming follows consistent patterns

### Data Granularity
- Data is aggregated at the daily level
- Each row represents one day of performance for a specific combination of:
  - Platform
  - Campaign
  - Ad Group
  - Placement
  - Creative

---

## Business Context

### Campaign Types
1. **Seasonal Campaigns**
   - Summer Grilling (June-August focus)
   - Back to School (August-September focus)
   - Holiday Recipes (November-December focus)

2. **Evergreen Campaigns**
   - Pantry Staples (year-round)

### Target Audiences
- **Outdoor Cooking Enthusiasts**: BBQ and grilling products
- **Family Shoppers**: Back-to-school and family-oriented products
- **Holiday Entertainers**: Holiday cooking and entertaining products
- **Home Cooks**: Everyday cooking essentials
- **General**: Broad audience targeting

### Platform Strategy
- **Meta**: Social media advertising (Facebook/Instagram)
- **Amazon**: E-commerce platform advertising
- **Dv360**: Programmatic display advertising
- **Cm360**: Campaign management and attribution
- **Sa360**: Search advertising
- **Tradedesk**: Programmatic advertising platform

---

## Usage Guidelines

### Data Analysis Best Practices
1. **Time-based Analysis**: Use date field for trend analysis and seasonality
2. **Platform Comparison**: Compare performance across platforms for budget allocation
3. **Audience Insights**: Analyze performance by audience segment for targeting optimization
4. **Creative Optimization**: Use creative format and performance data for creative strategy
5. **Campaign Performance**: Track ROAS and CPA for campaign optimization

### Reporting Considerations
- Aggregate data appropriately for different reporting levels
- Consider seasonality when analyzing performance trends
- Use multiple metrics for comprehensive performance evaluation
- Account for platform-specific measurement differences

---

## Technical Specifications

### File Format
- **Format**: CSV (Comma-Separated Values)
- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Header Row**: Yes (21 columns)

### Data Types
- **Date**: YYYY-MM-DD
- **Text**: String values
- **Integer**: Whole numbers (clicks, impressions, conversions)
- **Decimal**: Numbers with decimal places (spend, ctr, cpc, cpm, roas)

### File Size
- **Records**: 641 data rows
- **Columns**: 21 fields
- **Estimated Size**: ~50KB

---

*This data dictionary was generated for the FreshNest Marketing Analytics Application. For questions or updates, please contact the development team.* 