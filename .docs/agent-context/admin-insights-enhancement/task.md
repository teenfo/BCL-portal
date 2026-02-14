# Admin Insights Enhancement Task List

## Phase 1: Data Model & Seeding
- [ ] Analyze existing DB schema against `01-insights.md` requirements
- [ ] Create/Update DB Schema for missing metrics (e.g., Coach Feedback, Detailed Transaction Types)
- [ ] Create Data Seeding Script (`scripts/seed-insights.js` or `.sql`)
    - [ ] Generate Members with varying expiration dates
    - [ ] Generate Check-in history (past 30 days) with realistic density
    - [ ] Generate Transactions with different payment methods and items
    - [ ] Generate Class Sessions & Coach Assignments
    - [ ] Generate User Feedback/Ratings for sessions

## Phase 2: Dashboard Widgets (Real Data)
- [ ] `/admin/dashboard`: Implement "Expiring Members" widget (Real DB Query)
- [ ] `/admin/dashboard`: Implement "System Status" widget (Real Data/Logs)

## Phase 3: Reports Implementation
- [ ] `/admin/reports/attendance`: Implement real Heatmap visualization (Aggregation Query)
- [ ] `/admin/reports/revenue`: Implement Breakdown Chart (By Payment Method / Item Type)
- [ ] `/admin/reports/coaches`: Implement Coach Performance Table (Sessions + Ratings Aggregation)

## Phase 4: Verification
- [ ] Verify Data accuracy against Seeded values
- [ ] Check UI performance with realistic data volume
