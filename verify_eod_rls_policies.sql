-- =====================================================
-- EOD REPORTS RLS POLICY VERIFICATION SCRIPT
-- =====================================================
-- Run these queries in Supabase SQL Editor to verify your setup

-- 1. Check if RLS is enabled on eod_reports table
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'eod_reports';

-- Expected: rowsecurity should be TRUE


-- 2. List all current policies on eod_reports table
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    permissive as "Type",
    roles as "Roles",
    qual as "USING Expression",
    with_check as "WITH CHECK Expression"
FROM pg_policies 
WHERE tablename = 'eod_reports'
ORDER BY cmd, policyname;

-- Expected: Should see at least 5 policies including UPDATE policies


-- 3. Test if current user can view their profile
SELECT 
    id,
    role,
    branch_id,
    'Current user info' as note
FROM profiles 
WHERE id = auth.uid();

-- Expected: Should return your user profile with role and branch_id


-- 4. Test if you can SELECT your own EOD reports
SELECT 
    id,
    branch_id,
    date,
    total_sales,
    submitted_by,
    'Your EOD reports' as note
FROM eod_reports 
WHERE submitted_by = auth.uid()
ORDER BY date DESC
LIMIT 5;

-- Expected: Should return your EOD reports


-- 5. Test INSERT permission (simulate creating a report)
-- Don't actually run this unless you want to create a test report
/*
INSERT INTO eod_reports (
    branch_id,
    date,
    total_sales,
    total_profit,
    total_expenses,
    cash_on_hand,
    discrepancies,
    notes,
    submitted_by
) VALUES (
    (SELECT branch_id FROM profiles WHERE id = auth.uid()),
    CURRENT_DATE,
    1000.00,
    500.00,
    300.00,
    700.00,
    0.00,
    'Test report from verification script',
    auth.uid()
);
*/


-- 6. Test UPDATE permission (requires an existing report)
-- Replace 'YOUR-REPORT-ID' with an actual report ID from step 4
/*
UPDATE eod_reports 
SET notes = 'Updated via verification script: ' || NOW()::text
WHERE id = 'YOUR-REPORT-ID'
  AND submitted_by = auth.uid();
*/


-- 7. Check for any policy violations in logs
-- (This requires admin access - run in Supabase Dashboard → Logs)


-- 8. Verify the exact policies we need exist
SELECT 
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as "SELECT Policies",
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as "INSERT Policies",
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as "UPDATE Policies",
    COUNT(*) FILTER (WHERE cmd = 'DELETE') as "DELETE Policies"
FROM pg_policies 
WHERE tablename = 'eod_reports';

-- Expected output:
-- SELECT Policies: 2 (branch managers + business owners)
-- INSERT Policies: 1 (branch managers)
-- UPDATE Policies: 2 (branch managers + business owners) ← This should be 2!
-- DELETE Policies: 0 (not needed)


-- 9. Test the specific query used by loadEODDataForDate()
-- Replace the values with your actual data
/*
SELECT * FROM eod_reports
WHERE branch_id = 1  -- Your branch_id
  AND date = '2026-01-11'  -- The date you're testing
  AND submitted_by = auth.uid();
*/


-- =====================================================
-- QUICK FIX VERIFICATION
-- =====================================================
-- After applying fix_eod_reports_update_policy.sql,
-- run this to confirm UPDATE policies exist:

SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'eod_reports' 
  AND cmd = 'UPDATE';

-- Expected: Should return 2 rows:
-- 1. Branch managers can update their EOD reports
-- 2. Business owners can update all EOD reports
