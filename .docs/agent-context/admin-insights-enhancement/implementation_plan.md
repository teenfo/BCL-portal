# Admin Insights Real Data Integration Plan

## Goal Description
The goal is to replace all hardcoded mock data in the **Admin Insights** module with real data fetched from Supabase. This requires schema updates to support specific metrics (Coach Ratings, Granular Revenue) and a robust data seeding strategy to visualize realistic patterns (Heatmaps, Trends).

## User Review Required
> [!IMPORTANT]
> **Schema Changes**: We may need to add a `session_feedback` table or `ratings` column to `sessions` to support Coach Performance metrics.
> **Dependencies**: Visualizations might require a charting library (e.g., `recharts` or `chart.js`) if CSS-only charts are insufficient for complex Heatmaps. Currently sticking to CSS-only for "Zero Dependency" unless requested otherwise.

## Proposed Changes

### 1. Database Schema & Seeding
#### [NEW] `scripts/seed_insights_data.js`
- Script to populate:
  - `checkins`: 500+ records distributed over 30 days with peak times (18:00-21:00).
  - `transactions`: Records with `category` (Membership, PT, Goods) and `method`.
  - `session_feedback`: (New Table) To link members -> sessions -> rating (1-5).

#### [MODIFY] Database Schema (DDL)
- **Create `session_feedback` table**:
  ```sql
  CREATE TABLE session_feedback (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID REFERENCES sessions(id),
      member_id UUID REFERENCES members(id),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- **Update `transactions` table**:
  ```sql
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Membership';
  ```

### 2. Dashboard (`/admin/dashboard`)
#### [MODIFY] usage of `useDashboardStats` hook
- Replace `facilitiesStatus` mock with real "Today's Check-ins vs Capacity" or similar logic.
- Replace `Expiring Members` mock with `supabase.from('members').lte('end_date', next7days)`.

### 3. Reports
#### [MODIFY] `reports/attendance/page.js`
- Implement **Heatmap Logic**:
  - Fetch `checkins` grouped by `dow` (Day of Week) and `hour`.
  - Process data in Client (or RPC) to generate a 7x24 grid.
  - Render using Grid Layout with opacity based on count.

#### [MODIFY] `reports/revenue/page.js`
- Fetch `transactions` grouped by `category` and `payment_method`.
- Visualization: Stacked Bar or Pie Chart (CSS based).

#### [MODIFY] `reports/coaches/page.js`
- Fetch `sessions` joined with `coaches` and `session_feedback`.
- Calc `Avg Rating` and `Attendance Rate` per coach.

## Verification Plan
### Automated Tests
- Run Seeding script and verify record counts in Supabase.
### Manual Verification
- Check Dashboard KPIs match the seeded count.
- Verify Heatmap visual density matches the "Peak Time" defined in seeding script.
- Verify Coach List is sorted by Performance correctly.
