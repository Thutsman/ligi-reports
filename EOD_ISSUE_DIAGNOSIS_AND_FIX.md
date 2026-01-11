# 🔍 EOD Report Data Loading Issue - Diagnosis & Fix

## Problem
When selecting a date where an EOD report was already submitted, the form does not load the existing data.

## Root Cause
**Missing RLS (Row Level Security) UPDATE policy** on the `eod_reports` table in Supabase.

### What Was Missing
The `eod_reports` table had RLS policies for:
- ✅ SELECT (viewing reports)
- ✅ INSERT (creating new reports)
- ❌ UPDATE (editing existing reports) - **MISSING!**

Without an UPDATE policy, the application cannot:
1. Update existing EOD reports when resubmitting
2. The SELECT query works, but UPDATE operations fail silently due to RLS restrictions

## The Fix

### Step 1: Apply the SQL Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- Allow branch managers to update their own EOD reports
CREATE POLICY "Branch managers can update their EOD reports" ON eod_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'branch-manager'
            AND profiles.branch_id = eod_reports.branch_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'branch-manager'
            AND profiles.branch_id = eod_reports.branch_id
        )
    );

-- Also allow business owners to update EOD reports (for corrections)
CREATE POLICY "Business owners can update all EOD reports" ON eod_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'business-owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'business-owner'
        )
    );
```

### Step 2: Verify the Fix

After applying the migration:

1. **Check Policies in Supabase Dashboard:**
   - Go to: Database → Tables → eod_reports → Policies
   - You should now see 5 policies:
     - ✅ Branch managers can view their EOD reports (SELECT)
     - ✅ Branch managers can create EOD reports (INSERT)
     - ✅ **Branch managers can update their EOD reports (UPDATE)** ← NEW
     - ✅ Business owners can view all EOD reports (SELECT)
     - ✅ **Business owners can update all EOD reports (UPDATE)** ← NEW

2. **Test the Feature:**
   - Submit an EOD report for today
   - Close and reopen the EOD modal
   - Select today's date from the date picker
   - The form should now load with your previously entered data
   - Make changes and resubmit - it should update successfully

## Technical Details

### RLS Policy Structure

**USING clause**: Controls which rows can be selected/updated
- Determines visibility of existing records

**WITH CHECK clause**: Validates the data being inserted/updated
- Ensures new/updated data meets security requirements

### Why Both Clauses Are Needed for UPDATE

```sql
FOR UPDATE USING (condition)  -- Can I see this row to update it?
    WITH CHECK (condition)    -- Is my updated data valid?
```

### Security Model

The policies ensure:
- ✅ Branch managers can only update reports for their own branch
- ✅ Branch managers can only update reports they can view
- ✅ Business owners can update any report (for administrative corrections)
- ❌ Users cannot update reports from other branches
- ❌ Users cannot change the branch_id to another branch

## Files Updated

1. `fix_eod_reports_update_policy.sql` - Migration file (apply this in Supabase)
2. `complete_supabase_schema.sql` - Updated with new policies for reference

## Testing Checklist

After applying the fix:

- [ ] Can submit a new EOD report
- [ ] Can reopen modal and select same date
- [ ] Form loads with previously entered data
- [ ] Can modify and resubmit (updates existing report)
- [ ] Cannot access EOD reports from other branches
- [ ] Business owner can view and update all reports
- [ ] No console errors when changing dates

## Additional Debugging

If the issue persists after applying the fix:

### 1. Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'eod_reports';
```
Should return: `rowsecurity = true`

### 2. Check Current User's Role
```sql
SELECT role, branch_id 
FROM profiles 
WHERE id = auth.uid();
```
Should return your role and branch

### 3. Test Query Directly
```sql
SELECT * FROM eod_reports 
WHERE branch_id = YOUR_BRANCH_ID 
  AND date = '2026-01-11'
  AND submitted_by = auth.uid();
```
Should return your report if it exists

### 4. Check Browser Console
Open browser console (F12) and look for:
- Supabase errors
- JavaScript errors in `loadEODDataForDate()` function
- Network tab for failed API requests

## Common RLS Mistakes

### ❌ Wrong: Policy without WITH CHECK
```sql
CREATE POLICY "update" ON table
    FOR UPDATE USING (condition);
    -- Missing WITH CHECK - updates may fail
```

### ✅ Correct: Policy with both clauses
```sql
CREATE POLICY "update" ON table
    FOR UPDATE USING (condition)
    WITH CHECK (condition);
```

### ❌ Wrong: Using INSERT when you need UPDATE
The application needs both INSERT (for new reports) and UPDATE (for editing).

## Performance Notes

These policies use EXISTS subqueries which are efficient because:
- They stop at the first matching row
- Use indexed columns (id, role, branch_id)
- Cached by Supabase's query planner

## Next Steps

1. **Apply the migration** in Supabase SQL Editor
2. **Test the feature** with the checklist above
3. **Monitor** browser console for any errors
4. **Verify** in Supabase logs that UPDATE queries succeed

## Support

If you still experience issues:
1. Export your RLS policies from Supabase
2. Check the profiles table has correct role and branch_id
3. Verify auth.uid() matches the submitted_by field in eod_reports
4. Check Supabase logs for policy violations
