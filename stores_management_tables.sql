-- SQL Tables for Stores Management Dashboard
-- Execute these commands in your Supabase SQL Editor

-- 1. Create pending_requisitions table
CREATE TABLE IF NOT EXISTS pending_requisitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requisition_id VARCHAR(50) UNIQUE NOT NULL, -- REQ-001, REQ-002, etc.
    branch_id INTEGER, -- References branches(id) - remove constraint if branches table doesn't exist
    branch_name VARCHAR(100) NOT NULL,
    requested_by UUID, -- References auth.users(id) - remove constraint for now
    requester_name VARCHAR(100),
    items_count INTEGER NOT NULL DEFAULT 0,
    total_estimated_value DECIMAL(10,2) DEFAULT 0.00,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'fulfilled')),
    request_details TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID, -- References auth.users(id) - remove constraint for now
    approved_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create requisition_items table (detailed items for each requisition)
CREATE TABLE IF NOT EXISTS requisition_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requisition_id UUID REFERENCES pending_requisitions(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity_requested INTEGER NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pieces',
    estimated_unit_price DECIMAL(8,2) DEFAULT 0.00,
    estimated_total_price DECIMAL(10,2) DEFAULT 0.00,
    urgency_level VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create supplier_deliveries table
CREATE TABLE IF NOT EXISTS supplier_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id VARCHAR(50) UNIQUE NOT NULL, -- DEL-001, DEL-002, etc.
    supplier_name VARCHAR(200) NOT NULL,
    supplier_contact VARCHAR(100),
    supplier_email VARCHAR(100),
    items_count INTEGER NOT NULL DEFAULT 0,
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    delivery_date DATE,
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'received', 'cancelled')),
    received_by UUID, -- References auth.users(id) - remove constraint for now
    received_by_name VARCHAR(100),
    delivery_notes TEXT,
    quality_check_status VARCHAR(20) DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'passed', 'failed', 'partial')),
    quality_check_notes TEXT,
    invoice_number VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create delivery_items table (detailed items for each delivery)
CREATE TABLE IF NOT EXISTS delivery_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID REFERENCES supplier_deliveries(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_of_measure VARCHAR(20) DEFAULT 'pieces',
    unit_price DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    expiry_date DATE,
    batch_number VARCHAR(100),
    quality_status VARCHAR(20) DEFAULT 'good' CHECK (quality_status IN ('good', 'damaged', 'expired', 'rejected')),
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    item_count INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0.00,
    low_stock_count INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    category_manager UUID, -- References auth.users(id) - remove constraint for now
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create inventory_items table (detailed inventory tracking)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES inventory_categories(id),
    category_name VARCHAR(100) NOT NULL,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    maximum_stock INTEGER DEFAULT 1000,
    unit_of_measure VARCHAR(20) DEFAULT 'pieces',
    unit_cost DECIMAL(8,2) DEFAULT 0.00,
    total_value DECIMAL(10,2) DEFAULT 0.00,
    supplier_name VARCHAR(200),
    last_restocked_date DATE,
    expiry_date DATE,
    storage_location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create stock_movements table (track all inventory movements)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES inventory_items(id),
    item_name VARCHAR(200) NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'transfer', 'adjustment', 'damaged', 'expired')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(8,2) DEFAULT 0.00,
    total_value DECIMAL(10,2) DEFAULT 0.00,
    reference_type VARCHAR(20) CHECK (reference_type IN ('delivery', 'requisition', 'sale', 'transfer', 'adjustment')),
    reference_id UUID, -- Can reference delivery_id, requisition_id, etc.
    reference_number VARCHAR(50),
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    moved_by UUID, -- References auth.users(id) - remove constraint for now
    moved_by_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create stores_stats table (for dashboard quick stats)
CREATE TABLE IF NOT EXISTS stores_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE DEFAULT CURRENT_DATE,
    pending_requisitions INTEGER DEFAULT 0,
    pending_change INTEGER DEFAULT 0,
    items_in_stock INTEGER DEFAULT 0,
    stock_change INTEGER DEFAULT 0,
    dispatched_today INTEGER DEFAULT 0,
    dispatched_change INTEGER DEFAULT 0,
    low_stock_items INTEGER DEFAULT 0,
    low_stock_change INTEGER DEFAULT 0,
    total_inventory_value DECIMAL(15,2) DEFAULT 0.00,
    deliveries_pending INTEGER DEFAULT 0,
    deliveries_received_today INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_requisitions_status ON pending_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_pending_requisitions_priority ON pending_requisitions(priority);
CREATE INDEX IF NOT EXISTS idx_pending_requisitions_branch ON pending_requisitions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pending_requisitions_created ON pending_requisitions(created_at);

CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_status ON supplier_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_supplier ON supplier_deliveries(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_date ON supplier_deliveries(delivery_date);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- Create functions to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_pending_requisitions_updated_at BEFORE UPDATE ON pending_requisitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_deliveries_updated_at BEFORE UPDATE ON supplier_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing

-- Sample inventory categories
INSERT INTO inventory_categories (name, description, item_count, low_stock_count, low_stock_threshold) VALUES
('Grocery', 'General grocery items including canned goods, dry goods, and packaged foods', 450, 3, 20),
('Butchery', 'Fresh and frozen meat products', 89, 2, 15),
('Confectionery', 'Sweets, chocolates, and confectionery items', 234, 1, 10),
('Beverages', 'Soft drinks, juices, and other beverages', 156, 5, 25),
('Dairy', 'Milk, cheese, yogurt, and other dairy products', 78, 4, 12),
('Bakery', 'Bread, pastries, and baked goods', 92, 6, 8)
ON CONFLICT (name) DO NOTHING;

-- Sample pending requisitions
INSERT INTO pending_requisitions (requisition_id, branch_name, items_count, priority, request_details, requester_name) VALUES
('REQ-001', 'Main Branch', 15, 'urgent', 'Urgent restocking needed for weekend rush', 'John Manager'),
('REQ-002', 'Downtown Branch', 8, 'high', 'Low stock on popular items', 'Sarah Wilson'),
('REQ-003', 'Eastside Branch', 12, 'normal', 'Regular monthly restocking', 'Mike Johnson'),
('REQ-004', 'Westside Branch', 6, 'high', 'Dairy products running low', 'Lisa Chen'),
('REQ-005', 'Northside Branch', 20, 'normal', 'General inventory replenishment', 'David Brown')
ON CONFLICT (requisition_id) DO NOTHING;

-- Sample supplier deliveries
INSERT INTO supplier_deliveries (delivery_id, supplier_name, items_count, total_value, status, delivery_notes) VALUES
('DEL-001', 'Fresh Foods Ltd', 45, 2500.00, 'received', 'All items received in good condition'),
('DEL-002', 'Meat Masters', 20, 1800.00, 'pending', 'Expected delivery tomorrow'),
('DEL-003', 'Bakery Supplies Co', 30, 950.00, 'received', 'Delivered this morning'),
('DEL-004', 'Dairy Fresh Inc', 25, 1200.00, 'in_transit', 'Out for delivery'),
('DEL-005', 'Beverage Distributors', 60, 3200.00, 'delivered', 'Awaiting quality check')
ON CONFLICT (delivery_id) DO NOTHING;

-- Sample inventory items
INSERT INTO inventory_items (item_code, item_name, category_name, current_stock, minimum_stock, unit_cost, supplier_name) VALUES
('GRC-001', 'Rice 5kg Bag', 'Grocery', 45, 20, 12.50, 'Fresh Foods Ltd'),
('GRC-002', 'Cooking Oil 1L', 'Grocery', 8, 15, 8.75, 'Fresh Foods Ltd'),
('BUT-001', 'Chicken Breast 1kg', 'Butchery', 12, 10, 15.00, 'Meat Masters'),
('BUT-002', 'Ground Beef 1kg', 'Butchery', 5, 8, 18.50, 'Meat Masters'),
('CON-001', 'Chocolate Bars Mixed', 'Confectionery', 25, 12, 3.25, 'Sweet Treats Co'),
('BEV-001', 'Soft Drinks 2L', 'Beverages', 30, 20, 2.50, 'Beverage Distributors'),
('DAI-001', 'Fresh Milk 1L', 'Dairy', 15, 25, 4.50, 'Dairy Fresh Inc'),
('BAK-001', 'White Bread Loaf', 'Bakery', 8, 15, 2.75, 'Bakery Supplies Co')
ON CONFLICT (item_code) DO NOTHING;

-- Update inventory categories with correct counts
UPDATE inventory_categories SET 
    item_count = (SELECT COUNT(*) FROM inventory_items WHERE category_name = inventory_categories.name),
    low_stock_count = (SELECT COUNT(*) FROM inventory_items WHERE category_name = inventory_categories.name AND current_stock <= minimum_stock),
    total_value = (SELECT COALESCE(SUM(current_stock * unit_cost), 0) FROM inventory_items WHERE category_name = inventory_categories.name);

-- Sample stores stats for today
INSERT INTO stores_stats (pending_requisitions, pending_change, items_in_stock, stock_change, dispatched_today, dispatched_change, low_stock_items, low_stock_change, total_inventory_value) VALUES
(5, 2, 1247, 45, 23, 15, 8, 3, 125750.00)
ON CONFLICT (stat_date) DO UPDATE SET
    pending_requisitions = EXCLUDED.pending_requisitions,
    pending_change = EXCLUDED.pending_change,
    items_in_stock = EXCLUDED.items_in_stock,
    stock_change = EXCLUDED.stock_change,
    dispatched_today = EXCLUDED.dispatched_today,
    dispatched_change = EXCLUDED.dispatched_change,
    low_stock_items = EXCLUDED.low_stock_items,
    low_stock_change = EXCLUDED.low_stock_change,
    total_inventory_value = EXCLUDED.total_inventory_value;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE pending_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your security requirements)
-- Allow stores managers to read/write all data
CREATE POLICY "Stores managers can manage all data" ON pending_requisitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

-- Allow branch managers to create and read their own requisitions
CREATE POLICY "Branch managers can create requisitions" ON pending_requisitions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'branch-manager'
        )
    );

CREATE POLICY "Branch managers can read their own requisitions" ON pending_requisitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'branch-manager'
            AND (requested_by = auth.uid() OR branch_id = profiles.branch_id)
        )
    );

CREATE POLICY "Stores managers can manage requisition items" ON requisition_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

-- Allow branch managers to create requisition items for their requisitions
CREATE POLICY "Branch managers can create requisition items" ON requisition_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'branch-manager'
        )
    );

CREATE POLICY "Branch managers can read their requisition items" ON requisition_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN pending_requisitions pr ON pr.id = requisition_items.requisition_id
            WHERE p.id = auth.uid() 
            AND p.role = 'branch-manager'
            AND pr.requested_by = auth.uid()
        )
    );

CREATE POLICY "Stores managers can manage deliveries" ON supplier_deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

CREATE POLICY "Stores managers can manage delivery items" ON delivery_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

CREATE POLICY "Stores managers can manage inventory categories" ON inventory_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

CREATE POLICY "Stores managers can manage inventory items" ON inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

CREATE POLICY "Stores managers can manage stock movements" ON stock_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'stores-manager'
        )
    );

CREATE POLICY "Stores managers can view stats" ON stores_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('stores-manager', 'business-owner')
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 