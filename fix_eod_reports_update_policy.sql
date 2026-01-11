-- =====================================================
-- FIX: Add UPDATE Policy for EOD Reports
-- =====================================================
-- This migration adds the missing UPDATE policy for eod_reports table
-- to allow branch managers to edit their previously submitted reports

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
