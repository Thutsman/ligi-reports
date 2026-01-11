-- =====================================================
-- CREATE EOD REPORT DEPARTMENTS TABLE
-- =====================================================
-- This table stores individual department sales for each EOD report
-- Allows full editing of EOD reports including department breakdown

-- Create eod_report_departments table
CREATE TABLE IF NOT EXISTS eod_report_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    eod_report_id UUID REFERENCES eod_reports(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(eod_report_id, department_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_eod_report_departments_eod_report_id 
    ON eod_report_departments(eod_report_id);

CREATE INDEX IF NOT EXISTS idx_eod_report_departments_department_id 
    ON eod_report_departments(department_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_eod_report_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eod_report_departments_updated_at
    BEFORE UPDATE ON eod_report_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_eod_report_departments_updated_at();

-- =====================================================
-- RLS POLICIES FOR eod_report_departments
-- =====================================================

-- Enable RLS
ALTER TABLE eod_report_departments ENABLE ROW LEVEL SECURITY;

-- Allow branch managers to view department sales for their branch's EOD reports
CREATE POLICY "Branch managers can view their EOD department sales" ON eod_report_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eod_reports er
            JOIN profiles p ON p.id = auth.uid()
            WHERE er.id = eod_report_departments.eod_report_id
            AND p.role = 'branch-manager'
            AND p.branch_id = er.branch_id
        )
    );

-- Allow branch managers to insert department sales for their branch's EOD reports
CREATE POLICY "Branch managers can create EOD department sales" ON eod_report_departments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM eod_reports er
            JOIN profiles p ON p.id = auth.uid()
            WHERE er.id = eod_report_departments.eod_report_id
            AND p.role = 'branch-manager'
            AND p.branch_id = er.branch_id
        )
    );

-- Allow branch managers to update department sales for their branch's EOD reports
CREATE POLICY "Branch managers can update their EOD department sales" ON eod_report_departments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM eod_reports er
            JOIN profiles p ON p.id = auth.uid()
            WHERE er.id = eod_report_departments.eod_report_id
            AND p.role = 'branch-manager'
            AND p.branch_id = er.branch_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM eod_reports er
            JOIN profiles p ON p.id = auth.uid()
            WHERE er.id = eod_report_departments.eod_report_id
            AND p.role = 'branch-manager'
            AND p.branch_id = er.branch_id
        )
    );

-- Allow branch managers to delete department sales for their branch's EOD reports
CREATE POLICY "Branch managers can delete their EOD department sales" ON eod_report_departments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM eod_reports er
            JOIN profiles p ON p.id = auth.uid()
            WHERE er.id = eod_report_departments.eod_report_id
            AND p.role = 'branch-manager'
            AND p.branch_id = er.branch_id
        )
    );

-- Allow business owners to manage all department sales
CREATE POLICY "Business owners can manage all EOD department sales" ON eod_report_departments
    FOR ALL USING (
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
