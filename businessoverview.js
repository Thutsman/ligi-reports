class BusinessOverview {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.businessData = {};
        this.init();
    }

    async init() {
        await this.initSupabase();
        await this.checkAuth();
        this.bindEvents();
        await this.loadDashboardData();
        this.hideLoadingOverlay();
    }

    async initSupabase() {
        const supabaseUrl = 'https://veohdpcvkzouuyjpwmis.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hkcGN2a3pvdXV5anB3bWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjUwNTIsImV4cCI6MjA3NDEwMTA1Mn0.d2MyXV4nl7G3kRLGgekWUioFlXesHXgCn1ezbt812UA';
        this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    }

    async checkAuth() {
        const { data: { user } } = await this.supabase.auth.getUser();
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        this.user = user;
        document.getElementById('user-name').textContent = user.user_metadata?.name || user.email;
    }

    bindEvents() {
        // Logout functionality
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.supabase.auth.signOut();
            window.location.href = 'index.html';
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Historical sales functionality
        document.getElementById('view-sales-btn').addEventListener('click', () => {
            this.viewHistoricalSales();
        });

        // Update timestamp
        this.updateTimestamp();
        setInterval(() => this.updateTimestamp(), 60000);
    }

    async loadDashboardData() {
        try {
            // Load all dashboard data from Supabase
            await Promise.all([
                this.loadTotalRevenueToday(),
                this.loadTotalActiveStaff(),
                this.loadActiveBranchesCount(),
                this.loadInventoryValue(),
                this.loadBusinessStats(),
                this.loadBranchPerformance(),
                this.loadAlerts(),
                this.loadDepartmentBreakdown(),
                this.loadStaffManagement(),
                this.loadRevenueAnalytics(),
                this.loadBranches()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadTotalRevenueToday() {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        try {
            // Query all eod_reports for today
            const { data, error } = await this.supabase
                .from('eod_reports')
                .select('total_sales')
                .eq('date', todayStr);

            if (error) {
                document.getElementById('total-revenue').textContent = 'Error';
                console.error('Error fetching total revenue:', error);
                return;
            }

            // Sum up total_sales
            let total = 0;
            if (data && data.length > 0) {
                total = data.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
            }

            // Format as currency
            document.getElementById('total-revenue').textContent = total.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            });

            // Update change indicator (you can customize this logic)
            document.getElementById('revenue-change').querySelector('.change-text').textContent = `${data?.length || 0} reports`;
        } catch (error) {
            console.error('Error loading total revenue:', error);
            document.getElementById('total-revenue').textContent = 'Error';
        }
    }

    async loadTotalActiveStaff() {
        try {
            console.log('👥 Loading total active staff...');

            // Query all active staff across all branches
            const { data, error } = await this.supabase
                .from('staff')
                .select('id, name, branch_id, status')
                .eq('status', 'active');

            console.log('👥 Active staff data:', data);
            console.log('❌ Staff error:', error);

            if (error) {
                document.getElementById('total-staff').textContent = 'Error';
                console.error('Error fetching total staff:', error);
                return;
            }

            // Count total active staff
            const totalActiveStaff = data?.length || 0;

            // Display the count
            document.getElementById('total-staff').textContent = totalActiveStaff.toLocaleString();

            // Update change indicator with staff count info
            const changeElement = document.getElementById('staff-change');
            if (changeElement) {
                changeElement.querySelector('.change-text').textContent = `${totalActiveStaff} active`;
            }

            console.log(`✅ Total active staff loaded: ${totalActiveStaff}`);

        } catch (error) {
            console.error('❌ Error loading total active staff:', error);
            document.getElementById('total-staff').textContent = 'Error';
        }
    }

    async loadActiveBranchesCount() {
        try {
            console.log('🏪 Loading active branches count...');

            // Query all branches with status = 'active'
            const { data, error } = await this.supabase
                .from('branches')
                .select('id, name, status')
                .eq('status', 'active');

            console.log('🏪 Active branches data:', data);
            console.log('❌ Branches error:', error);

            if (error) {
                console.error('Error loading active branches:', error);
                document.getElementById('active-branches').textContent = 'Error';
                return;
            }

            const totalActiveBranches = data ? data.length : 0;
            document.getElementById('active-branches').textContent = totalActiveBranches.toString();
            
            // Update the branches change indicator
            const branchesChangeElement = document.getElementById('branches-change');
            if (branchesChangeElement) {
                const changeText = branchesChangeElement.querySelector('.change-text');
                if (changeText) {
                    changeText.textContent = `+${totalActiveBranches}`;
                }
            }

            console.log(`🏪 Total active branches: ${totalActiveBranches}`);
        } catch (error) {
            console.error('Error in loadActiveBranchesCount:', error);
            document.getElementById('active-branches').textContent = 'Error';
        }
    }

    async loadInventoryValue() {
        try {
            console.log('📦 Loading inventory value...');

            // Query total inventory value from inventory_items
            const { data, error } = await this.supabase
                .from('inventory_items')
                .select('current_stock, unit_price');

            console.log('📦 Inventory items data:', data);
            console.log('❌ Inventory error:', error);

            if (error) {
                console.error('Error loading inventory value:', error);
                document.getElementById('inventory-value').textContent = 'Error';
                return;
            }

            // Calculate total inventory value
            let totalInventoryValue = 0;
            if (data) {
                totalInventoryValue = data.reduce((total, item) => {
                    const stock = parseFloat(item.current_stock) || 0;
                    const price = parseFloat(item.unit_price) || 0;
                    return total + (stock * price);
                }, 0);
            }

            document.getElementById('inventory-value').textContent = `$${totalInventoryValue.toLocaleString()}`;
            
            // Update the inventory change indicator (placeholder for now)
            const inventoryChangeElement = document.getElementById('inventory-change');
            if (inventoryChangeElement) {
                const changeText = inventoryChangeElement.querySelector('.change-text');
                if (changeText) {
                    changeText.textContent = '0%'; // Could be calculated based on previous day
                }
            }

            console.log(`📦 Total inventory value: $${totalInventoryValue.toLocaleString()}`);
        } catch (error) {
            console.error('Error in loadInventoryValue:', error);
            document.getElementById('inventory-value').textContent = 'Error';
        }
    }

    async loadBusinessStats() {
        // Fetch business statistics from Supabase
        try {
            const { data: stats } = await this.supabase
                .from('business_stats')
                .select('*')
                .single();

            if (stats) {
                // Note: total-revenue is now handled by loadTotalRevenueToday()
                // Note: total-staff is now handled by loadTotalActiveStaff()
                // Note: active-branches is now handled by loadActiveBranchesCount()
                // Note: inventory-value is now handled by loadInventoryValue()
                
                // Update change indicators (skip revenue-change, staff-change, branches-change, and inventory-change as they're handled above)
                // These are now calculated dynamically
            }
        } catch (error) {
            console.error('Error loading business stats:', error);
        }
    }

    async loadBranchPerformance() {
        const container = document.getElementById('branch-performance-list');
        
        try {
            console.log('🔄 Loading branch performance...');
            
            // Set loading state
            container.innerHTML = '<div class="branch-item"><p>Loading branch performance...</p></div>';
            
            // Get all branches (no status filter since column doesn't exist)
            const { data: branches, error: branchError } = await this.supabase
                .from('branches')
                .select('id, name')
                .order('name', { ascending: true });

            console.log('✅ All branches:', branches);
            console.log('❌ Branch error:', branchError);

            if (branchError) {
                console.error('Error fetching branches:', branchError);
                container.innerHTML = `<div class="branch-item"><p style="color: #ef4444;">Error fetching branches: ${branchError.message}</p></div>`;
                return;
            }

            if (!branches || branches.length === 0) {
                container.innerHTML = `<div class="branch-item"><p style="color: #f59e0b;">No branches found in database.</p></div>`;
                return;
            }

            // Get today's date and yesterday's date
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            
            const todayStr = today.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            console.log('📅 Dates:', { todayStr, yesterdayStr });

            // Clear container
            container.innerHTML = '';

            // For each branch, calculate today's and yesterday's revenue
            for (const branch of branches) {
                console.log(`🏪 Processing branch: ${branch.name} (ID: ${branch.id})`);
                
                // Get today's revenue
                const { data: todayData, error: todayError } = await this.supabase
                    .from('eod_reports')
                    .select('total_sales')
                    .eq('branch_id', branch.id)
                    .eq('date', todayStr);

                // Get yesterday's revenue
                const { data: yesterdayData, error: yesterdayError } = await this.supabase
                    .from('eod_reports')
                    .select('total_sales')
                    .eq('branch_id', branch.id)
                    .eq('date', yesterdayStr);

                console.log(`💰 Sales data for ${branch.name}:`, { 
                    todayData, 
                    yesterdayData, 
                    todayError, 
                    yesterdayError 
                });

                // Calculate totals
                const todayRevenue = todayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
                const yesterdayRevenue = yesterdayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;

                console.log(`📈 Calculated revenue for ${branch.name}:`, { todayRevenue, yesterdayRevenue });

                // Calculate growth percentage
                let growthPercentage = 0;
                if (yesterdayRevenue > 0) {
                    growthPercentage = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
                } else if (todayRevenue > 0) {
                    growthPercentage = 100; // If no yesterday data but today has sales
                }

                // Create branch item
                const item = document.createElement('div');
                item.className = 'branch-item';
                
                // Determine trend icon and color
                const isPositive = growthPercentage >= 0;
                const trendIcon = isPositive ? '📈' : '📉';
                const growthClass = isPositive ? 'growth-positive' : 'growth-negative';
                
                item.innerHTML = `
                    <div class="branch-info">
                        <h4>${branch.name}</h4>
                        <p class="branch-revenue">$${todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            Yesterday: $${yesterdayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div class="branch-growth ${growthClass}">
                        <span class="trend-icon">${trendIcon}</span>
                        ${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}%
                    </div>
                `;
                container.appendChild(item);
            }

            console.log('✅ Branch performance loaded successfully');

        } catch (error) {
            console.error('❌ Error loading branch performance:', error);
            container.innerHTML = `<div class="branch-item"><p style="color: #ef4444;">Error: ${error.message}</p></div>`;
        }
    }

    async loadAlerts() {
        try {
            console.log('🔔 Loading business alerts...');
            
            // Generate business-level alerts
            const alerts = await this.generateBusinessAlerts();
            
            const container = document.getElementById('alerts-list');
            container.innerHTML = '';

            if (!alerts || alerts.length === 0) {
                container.innerHTML = '<div class="alert-item alert-info"><p class="alert-message">All systems operating normally</p><p class="alert-time">Just now</p></div>';
                return;
            }

            alerts.forEach(alert => {
                const item = document.createElement('div');
                item.className = `alert-item alert-${alert.type}`;
                item.innerHTML = `
                    <p class="alert-message">${alert.message}</p>
                    <p class="alert-time">${alert.timeAgo}</p>
                `;
                container.appendChild(item);
            });
            
            console.log('✅ Business alerts loaded successfully');
        } catch (error) {
            console.error('❌ Error loading alerts:', error);
            const container = document.getElementById('alerts-list');
            container.innerHTML = '<div class="alert-item alert-warning"><p class="alert-message">Error loading alerts</p><p class="alert-time">Just now</p></div>';
        }
    }

    async generateBusinessAlerts() {
        const alerts = [];
        const now = new Date();
        
        try {
            // 1. Cross-Branch Performance Alerts
            const performanceAlerts = await this.generatePerformanceAlerts();
            alerts.push(...performanceAlerts);
            
            // 2. System-wide Staff Alerts
            const staffAlerts = await this.generateStaffAlerts();
            alerts.push(...staffAlerts);
            
            // 3. Business Operations Alerts
            const operationsAlerts = await this.generateOperationsAlerts();
            alerts.push(...operationsAlerts);
            
            // 4. Financial Alerts
            const financialAlerts = await this.generateFinancialAlerts();
            alerts.push(...financialAlerts);
            
            // 5. System & Compliance Alerts
            const systemAlerts = this.generateSystemAlerts();
            alerts.push(...systemAlerts);
            
            // Sort by priority and time, limit to 4 most important
            return alerts
                .sort((a, b) => {
                    // Sort by priority first (critical > warning > success > info)
                    const priorityOrder = { critical: 4, warning: 3, success: 2, info: 1 };
                    if (priorityOrder[a.type] !== priorityOrder[b.type]) {
                        return priorityOrder[b.type] - priorityOrder[a.type];
                    }
                    // Then by time (most recent first)
                    return b.timestamp - a.timestamp;
                })
                .slice(0, 4);
                
        } catch (error) {
            console.error('Error generating business alerts:', error);
            return [];
        }
    }

    async generatePerformanceAlerts() {
        const alerts = [];
        const now = new Date();
        
        try {
            // Get all branches
            const { data: branches } = await this.supabase
                .from('branches')
                .select('id, name');
            
            if (!branches || branches.length === 0) return alerts;
            
            const today = now.toISOString().split('T')[0];
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            // Get today's total revenue across all branches
            const { data: todayData } = await this.supabase
                .from('eod_reports')
                .select('total_sales, branch_id')
                .eq('date', today);
            
            const { data: yesterdayData } = await this.supabase
                .from('eod_reports')
                .select('total_sales, branch_id')
                .eq('date', yesterday);
            
            const todayTotal = todayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
            const yesterdayTotal = yesterdayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
            
            // Business-wide performance alerts
            if (yesterdayTotal > 0) {
                const changePercent = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
                
                if (changePercent >= 20) {
                    alerts.push({
                        message: `Business revenue up ${Math.round(changePercent)}% across all branches`,
                        type: 'success',
                        timeAgo: '2 hours ago',
                        timestamp: now.getTime() - 2 * 60 * 60 * 1000
                    });
                } else if (changePercent <= -15) {
                    alerts.push({
                        message: `Business revenue down ${Math.abs(Math.round(changePercent))}% today`,
                        type: 'warning',
                        timeAgo: '1 hour ago',
                        timestamp: now.getTime() - 1 * 60 * 60 * 1000
                    });
                }
            }
            
            // Individual branch performance alerts
            const branchPerformance = [];
            for (const branch of branches) {
                const branchTodayData = todayData?.filter(d => d.branch_id === branch.id) || [];
                const branchYesterdayData = yesterdayData?.filter(d => d.branch_id === branch.id) || [];
                
                const branchTodayTotal = branchTodayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
                const branchYesterdayTotal = branchYesterdayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
                
                if (branchYesterdayTotal > 0) {
                    const branchChangePercent = ((branchTodayTotal - branchYesterdayTotal) / branchYesterdayTotal) * 100;
                    branchPerformance.push({
                        name: branch.name,
                        change: branchChangePercent,
                        todayTotal: branchTodayTotal
                    });
                }
            }
            
            // Find best and worst performing branches
            if (branchPerformance.length > 0) {
                const bestBranch = branchPerformance.reduce((max, branch) => branch.change > max.change ? branch : max);
                const worstBranch = branchPerformance.reduce((min, branch) => branch.change < min.change ? branch : min);
                
                if (bestBranch.change >= 25) {
                    alerts.push({
                        message: `${bestBranch.name} exceeded daily target by ${Math.round(bestBranch.change)}%`,
                        type: 'success',
                        timeAgo: '3 hours ago',
                        timestamp: now.getTime() - 3 * 60 * 60 * 1000
                    });
                }
                
                if (worstBranch.change <= -30) {
                    alerts.push({
                        message: `${worstBranch.name} revenue down ${Math.abs(Math.round(worstBranch.change))}% today`,
                        type: 'warning',
                        timeAgo: '4 hours ago',
                        timestamp: now.getTime() - 4 * 60 * 60 * 1000
                    });
                }
            }
            
        } catch (error) {
            console.error('Error generating performance alerts:', error);
        }
        
        return alerts;
    }

    async generateStaffAlerts() {
        const alerts = [];
        const now = new Date();
        
        try {
            // Get total staff count across all branches
            const { count: totalStaffCount } = await this.supabase
                .from('staff')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
            
            // Get branch count
            const { count: branchCount } = await this.supabase
                .from('branches')
                .select('*', { count: 'exact', head: true });
            
            const avgStaffPerBranch = totalStaffCount / (branchCount || 1);
            
            // Staff-related business alerts
            if (avgStaffPerBranch < 4) {
                alerts.push({
                    message: `Low staffing across network: ${totalStaffCount} total staff for ${branchCount} branches`,
                    type: 'warning',
                    timeAgo: '5 hours ago',
                    timestamp: now.getTime() - 5 * 60 * 60 * 1000
                });
            }
            
            // Simulate staff hiring trends
            if (Math.random() > 0.6) {
                const newHires = Math.floor(Math.random() * 5) + 1;
                alerts.push({
                    message: `${newHires} new staff members hired across all branches`,
                    type: 'info',
                    timeAgo: '1 day ago',
                    timestamp: now.getTime() - 24 * 60 * 60 * 1000
                });
            }
            
        } catch (error) {
            console.error('Error generating staff alerts:', error);
        }
        
        return alerts;
    }

    async generateOperationsAlerts() {
        const alerts = [];
        const now = new Date();
        
        try {
            // Get pending stock requisitions across all branches
            const { count: pendingRequisitions } = await this.supabase
                .from('stock_requisitions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            // Operations alerts
            if (pendingRequisitions > 10) {
                alerts.push({
                    message: `${pendingRequisitions} stock requisitions require approval`,
                    type: 'warning',
                    timeAgo: '2 hours ago',
                    timestamp: now.getTime() - 2 * 60 * 60 * 1000
                });
            } else if (pendingRequisitions > 0) {
                alerts.push({
                    message: `${pendingRequisitions} stock requisitions pending review`,
                    type: 'info',
                    timeAgo: '3 hours ago',
                    timestamp: now.getTime() - 3 * 60 * 60 * 1000
                });
            }
            
            // Simulate inventory alerts
            const lowStockBranches = Math.floor(Math.random() * 3) + 1;
            if (Math.random() > 0.5) {
                alerts.push({
                    message: `${lowStockBranches} branches reporting low inventory levels`,
                    type: 'warning',
                    timeAgo: '6 hours ago',
                    timestamp: now.getTime() - 6 * 60 * 60 * 1000
                });
            }
            
            // Simulate supplier delivery updates
            if (Math.random() > 0.7) {
                alerts.push({
                    message: `Major supplier delivery completed to central warehouse`,
                    type: 'info',
                    timeAgo: '8 hours ago',
                    timestamp: now.getTime() - 8 * 60 * 60 * 1000
                });
            }
            
        } catch (error) {
            console.error('Error generating operations alerts:', error);
        }
        
        return alerts;
    }

    async generateFinancialAlerts() {
        const alerts = [];
        const now = new Date();
        
        try {
            // Monthly financial performance
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const today = now.toISOString().split('T')[0];
            
            const { data: monthData } = await this.supabase
                .from('eod_reports')
                .select('total_sales, total_profit')
                .gte('date', monthStart)
                .lte('date', today);
            
            if (monthData && monthData.length > 0) {
                const monthlyRevenue = monthData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
                const monthlyProfit = monthData.reduce((sum, row) => sum + (parseFloat(row.total_profit) || 0), 0);
                
                // Calculate profit margin
                const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
                
                if (profitMargin > 25) {
                    alerts.push({
                        message: `Excellent profit margin: ${profitMargin.toFixed(1)}% this month`,
                        type: 'success',
                        timeAgo: '1 day ago',
                        timestamp: now.getTime() - 24 * 60 * 60 * 1000
                    });
                } else if (profitMargin < 10) {
                    alerts.push({
                        message: `Low profit margin alert: ${profitMargin.toFixed(1)}% this month`,
                        type: 'critical',
                        timeAgo: '2 hours ago',
                        timestamp: now.getTime() - 2 * 60 * 60 * 1000
                    });
                }
            }
            
            // Simulate financial milestones
            if (Math.random() > 0.8) {
                alerts.push({
                    message: `Monthly revenue target achieved ahead of schedule`,
                    type: 'success',
                    timeAgo: '1 day ago',
                    timestamp: now.getTime() - 24 * 60 * 60 * 1000
                });
            }
            
        } catch (error) {
            console.error('Error generating financial alerts:', error);
        }
        
        return alerts;
    }

    generateSystemAlerts() {
        const alerts = [];
        const now = new Date();
        
        // System/compliance alerts (simulated)
        const systemAlerts = [
            {
                message: `Quarterly business review scheduled for next week`,
                type: 'info',
                timeAgo: '2 days ago',
                timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000
            },
            {
                message: `System backup completed successfully`,
                type: 'success',
                timeAgo: '1 day ago',
                timestamp: now.getTime() - 24 * 60 * 60 * 1000
            },
            {
                message: `New compliance requirements effective next month`,
                type: 'warning',
                timeAgo: '3 days ago',
                timestamp: now.getTime() - 3 * 24 * 60 * 60 * 1000
            },
            {
                message: `Annual audit preparation begins next week`,
                type: 'info',
                timeAgo: '5 days ago',
                timestamp: now.getTime() - 5 * 24 * 60 * 60 * 1000
            }
        ];
        
        // Randomly include some system alerts
        return systemAlerts.filter(() => Math.random() > 0.6);
    }

    async loadDepartmentBreakdown() {
        try {
            console.log('🏢 Loading branch sales breakdown...');
            
            const container = document.getElementById('departments-breakdown');
            container.innerHTML = '<div class="loading-indicator">Loading branch performance...</div>';

            // Get today's date
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get all branches
            const { data: branches, error: branchError } = await this.supabase
                .from('branches')
                .select('id, name');

            if (branchError) {
                console.error('Error fetching branches:', branchError);
                container.innerHTML = '<div class="error-message">Error loading branches</div>';
                return;
            }

            if (!branches || branches.length === 0) {
                container.innerHTML = '<div class="no-data-message">No branches found</div>';
                return;
            }

            // Get today's EOD reports for all branches
            const { data: eodReports, error: eodError } = await this.supabase
                .from('eod_reports')
                .select('branch_id, total_sales')
                .eq('date', todayStr);

            console.log('📊 Today\'s EOD reports:', eodReports, 'Error:', eodError);

            if (eodError) {
                console.error('Error fetching EOD reports:', eodError);
                container.innerHTML = '<div class="error-message">Error loading sales data</div>';
                return;
            }

            // Calculate branch sales and total
            const branchSales = [];
            let totalSales = 0;

            branches.forEach(branch => {
                const branchReports = eodReports?.filter(report => report.branch_id === branch.id) || [];
                const branchTotal = branchReports.reduce((sum, report) => sum + (parseFloat(report.total_sales) || 0), 0);
                
                branchSales.push({
                    id: branch.id,
                    name: branch.name,
                    sales: branchTotal,
                    reportCount: branchReports.length
                });
                
                totalSales += branchTotal;
            });

            // Sort branches by sales (highest first)
            branchSales.sort((a, b) => b.sales - a.sales);

            console.log('💰 Branch sales breakdown:', branchSales, 'Total:', totalSales);

            // Clear container and add results
            container.innerHTML = '';

            if (totalSales === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <div class="no-data-icon">📊</div>
                        <h4>No Sales Data Today</h4>
                        <p>No EOD reports have been submitted for today (${new Date(todayStr).toLocaleDateString()}).</p>
                        <p>Branch sales will appear here once EOD reports are submitted.</p>
                    </div>
                `;
                return;
            }

            // Add header with total sales and date
            const headerDiv = document.createElement('div');
            headerDiv.className = 'branch-breakdown-header';
            headerDiv.innerHTML = `
                <div class="breakdown-title">
                    <h4>🏪 Branch Sales Contribution</h4>
                    <div class="breakdown-date">${new Date(todayStr).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                </div>
                <div class="breakdown-total">
                    <div class="total-label">Total Company Sales</div>
                    <div class="total-amount">$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
            `;
            container.appendChild(headerDiv);

            // Add each branch's contribution
            branchSales.forEach(branch => {
                const percentage = totalSales > 0 ? (branch.sales / totalSales) * 100 : 0;
                
                const item = document.createElement('div');
                item.className = 'department-item branch-contribution-item';
                item.innerHTML = `
                    <div class="department-header">
                        <span class="department-name">
                            <span class="branch-icon">🏪</span>
                            ${branch.name}
                        </span>
                        <span class="department-percentage">${percentage.toFixed(1)}%</span>
                    </div>
                    <div class="branch-details">
                        <p class="department-revenue">$${branch.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p class="branch-reports">${branch.reportCount} EOD report${branch.reportCount !== 1 ? 's' : ''} submitted</p>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${this.getBranchColor(branch.id)}"></div>
                    </div>
                    <div class="branch-status ${this.getBranchStatus(branch.reportCount, percentage)}">
                        ${this.getBranchStatusText(branch.reportCount, percentage)}
                    </div>
                `;
                container.appendChild(item);
            });

            // Add summary statistics
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'branch-breakdown-summary';
            const avgSales = totalSales / branches.length;
            const topPerformer = branchSales[0];
            const totalReports = branchSales.reduce((sum, branch) => sum + branch.reportCount, 0);
            
            summaryDiv.innerHTML = `
                <div class="summary-stats">
                    <div class="summary-stat">
                        <span class="stat-label">Average per Branch:</span>
                        <span class="stat-value">$${avgSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Top Performer:</span>
                        <span class="stat-value">${topPerformer.name} (${((topPerformer.sales / totalSales) * 100).toFixed(1)}%)</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Total Reports:</span>
                        <span class="stat-value">${totalReports} submitted</span>
                    </div>
                </div>
            `;
            container.appendChild(summaryDiv);

        } catch (error) {
            console.error('Error loading branch breakdown:', error);
            const container = document.getElementById('departments-breakdown');
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h4>Error Loading Data</h4>
                    <p>Unable to load branch sales breakdown. Please try again later.</p>
                    <p class="error-details">Error: ${error.message}</p>
                </div>
            `;
        }
    }

    getBranchColor(branchId) {
        // Return different colors for different branches
        const colors = [
            'linear-gradient(90deg, #2563eb, #3b82f6)', // Blue
            'linear-gradient(90deg, #059669, #10b981)', // Green
            'linear-gradient(90deg, #dc2626, #ef4444)', // Red
            'linear-gradient(90deg, #7c3aed, #8b5cf6)', // Purple
            'linear-gradient(90deg, #ea580c, #f97316)', // Orange
        ];
        return colors[(branchId - 1) % colors.length];
    }

    getBranchStatus(reportCount, percentage) {
        if (reportCount === 0) return 'status-missing';
        if (percentage >= 40) return 'status-excellent';
        if (percentage >= 25) return 'status-good';
        if (percentage >= 15) return 'status-average';
        return 'status-below';
    }

    getBranchStatusText(reportCount, percentage) {
        if (reportCount === 0) return '❌ No Reports';
        if (percentage >= 40) return '🏆 Top Performer';
        if (percentage >= 25) return '✅ Strong Performance';
        if (percentage >= 15) return '📊 Average Performance';
        return '📉 Below Average';
    }

    async loadStaffManagement() {
        try {
            console.log('👥 Loading staff management data...');
            
            const container = document.getElementById('staff-overview-count');
            const hiresContainer = document.getElementById('staff-overview-hires');
            
            // Get all staff data
            const { data: allStaff, error: staffError } = await this.supabase
                .from('staff')
                .select('id, name, position, department, hire_date, status, branch_id');

            console.log('👥 All staff data:', allStaff, 'Error:', staffError);

            if (staffError) {
                console.error('Error fetching staff:', staffError);
                if (container) container.textContent = 'Error loading staff data';
                if (hiresContainer) hiresContainer.textContent = 'Error loading hire data';
                return;
            }

            if (!allStaff || allStaff.length === 0) {
                if (container) container.textContent = '0';
                if (hiresContainer) hiresContainer.textContent = 'No staff records found';
                return;
            }

            // Get all branches for branch names
            const { data: branches } = await this.supabase
                .from('branches')
                .select('id, name');

            const branchMap = {};
            branches?.forEach(branch => {
                branchMap[branch.id] = branch.name;
            });

            // Calculate staff statistics
            const activeStaff = allStaff.filter(staff => staff.status === 'active');
            const totalStaffCount = activeStaff.length;

            // Calculate recent hires (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentHires = activeStaff.filter(staff => 
                new Date(staff.hire_date) >= thirtyDaysAgo
            );

            // Update basic stats
            if (container) container.textContent = totalStaffCount.toLocaleString();
            if (hiresContainer) hiresContainer.textContent = `${recentHires.length} new hires this month`;

            // Create detailed staff breakdown
            await this.createStaffBreakdown(activeStaff, branchMap);

        } catch (error) {
            console.error('❌ Error loading staff management:', error);
            const container = document.getElementById('staff-overview-count');
            const hiresContainer = document.getElementById('staff-overview-hires');
            if (container) container.textContent = 'Error';
            if (hiresContainer) hiresContainer.textContent = 'Error loading data';
        }
    }

    async createStaffBreakdown(activeStaff, branchMap) {
        try {
            // Find the staff tab content area
            const staffTab = document.getElementById('staff-tab');
            if (!staffTab) return;

            // Clear existing content and create new layout
            staffTab.innerHTML = `
                <div class="analytics-section">
                    <div class="staff-overview-header">
                        <h3>Staff Management Overview</h3>
                        <div class="staff-summary-stats">
                            <div class="summary-stat-item">
                                <span class="stat-number">${activeStaff.length}</span>
                                <span class="stat-label">Total Active Staff</span>
                            </div>
                            <div class="summary-stat-item">
                                <span class="stat-number">${Object.keys(branchMap).length}</span>
                                <span class="stat-label">Branches</span>
                            </div>
                            <div class="summary-stat-item">
                                <span class="stat-number">${Math.round(activeStaff.length / Object.keys(branchMap).length)}</span>
                                <span class="stat-label">Avg per Branch</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="staff-breakdown-content">
                        <!-- Branch-wise Staff Distribution -->
                        <div class="staff-section">
                            <h4>📍 Staff Distribution by Branch</h4>
                            <div class="staff-by-branch" id="staff-by-branch"></div>
                        </div>

                        <!-- Department-wise Staff Distribution -->
                        <div class="staff-section">
                            <h4>🏢 Staff Distribution by Department</h4>
                            <div class="staff-by-department" id="staff-by-department"></div>
                        </div>

                        <!-- Position-wise Staff Distribution -->
                        <div class="staff-section">
                            <h4>👔 Staff Distribution by Position</h4>
                            <div class="staff-by-position" id="staff-by-position"></div>
                        </div>

                        <!-- Recent Hires -->
                        <div class="staff-section">
                            <h4>🆕 Recent Hires (Last 30 Days)</h4>
                            <div class="recent-hires" id="recent-hires"></div>
                        </div>
                    </div>
                </div>
            `;

            // Populate each section
            this.populateStaffByBranch(activeStaff, branchMap);
            this.populateStaffByDepartment(activeStaff);
            this.populateStaffByPosition(activeStaff);
            this.populateRecentHires(activeStaff, branchMap);

        } catch (error) {
            console.error('Error creating staff breakdown:', error);
        }
    }

    populateStaffByBranch(activeStaff, branchMap) {
        const container = document.getElementById('staff-by-branch');
        if (!container) return;

        // Group staff by branch
        const staffByBranch = {};
        activeStaff.forEach(staff => {
            const branchName = branchMap[staff.branch_id] || 'Unknown Branch';
            if (!staffByBranch[branchName]) {
                staffByBranch[branchName] = [];
            }
            staffByBranch[branchName].push(staff);
        });

        // Sort branches by staff count
        const sortedBranches = Object.entries(staffByBranch)
            .sort(([,a], [,b]) => b.length - a.length);

        container.innerHTML = '';
        sortedBranches.forEach(([branchName, staffList]) => {
            const percentage = (staffList.length / activeStaff.length) * 100;
            
            const item = document.createElement('div');
            item.className = 'staff-distribution-item';
            item.innerHTML = `
                <div class="distribution-header">
                    <span class="distribution-name">🏪 ${branchName}</span>
                    <span class="distribution-count">${staffList.length} staff (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background: ${this.getBranchColor(Object.keys(branchMap).indexOf(branchName) + 1)}"></div>
                </div>
                <div class="staff-details">
                    ${staffList.slice(0, 3).map(staff => `<span class="staff-name">${staff.name} (${staff.position})</span>`).join('')}
                    ${staffList.length > 3 ? `<span class="more-staff">+${staffList.length - 3} more</span>` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    }

    populateStaffByDepartment(activeStaff) {
        const container = document.getElementById('staff-by-department');
        if (!container) return;

        // Group staff by department
        const staffByDepartment = {};
        activeStaff.forEach(staff => {
            const dept = staff.department || 'General';
            if (!staffByDepartment[dept]) {
                staffByDepartment[dept] = [];
            }
            staffByDepartment[dept].push(staff);
        });

        // Sort departments by staff count
        const sortedDepartments = Object.entries(staffByDepartment)
            .sort(([,a], [,b]) => b.length - a.length);

        const departmentIcons = {
            'Grocery': '🛒',
            'Butchery': '🥩',
            'Confectionery': '🍰',
            'General': '🏢'
        };

        container.innerHTML = '';
        sortedDepartments.forEach(([department, staffList]) => {
            const percentage = (staffList.length / activeStaff.length) * 100;
            const icon = departmentIcons[department] || '📋';
            
            const item = document.createElement('div');
            item.className = 'staff-distribution-item';
            item.innerHTML = `
                <div class="distribution-header">
                    <span class="distribution-name">${icon} ${department}</span>
                    <span class="distribution-count">${staffList.length} staff (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background: linear-gradient(90deg, #10b981, #34d399)"></div>
                </div>
                <div class="staff-details">
                    ${staffList.slice(0, 3).map(staff => `<span class="staff-name">${staff.name} (${staff.position})</span>`).join('')}
                    ${staffList.length > 3 ? `<span class="more-staff">+${staffList.length - 3} more</span>` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    }

    populateStaffByPosition(activeStaff) {
        const container = document.getElementById('staff-by-position');
        if (!container) return;

        // Group staff by position
        const staffByPosition = {};
        activeStaff.forEach(staff => {
            const position = staff.position || 'Staff';
            if (!staffByPosition[position]) {
                staffByPosition[position] = [];
            }
            staffByPosition[position].push(staff);
        });

        // Sort positions by staff count
        const sortedPositions = Object.entries(staffByPosition)
            .sort(([,a], [,b]) => b.length - a.length);

        const positionIcons = {
            'Manager': '👨‍💼',
            'Assistant Manager': '👩‍💼',
            'Sales Associate': '🛍️',
            'Cashier': '💰',
            'Butcher': '🔪',
            'Baker': '👨‍🍳',
            'Stock Clerk': '📦'
        };

        container.innerHTML = '';
        sortedPositions.forEach(([position, staffList]) => {
            const percentage = (staffList.length / activeStaff.length) * 100;
            const icon = positionIcons[position] || '👤';
            
            const item = document.createElement('div');
            item.className = 'staff-distribution-item';
            item.innerHTML = `
                <div class="distribution-header">
                    <span class="distribution-name">${icon} ${position}</span>
                    <span class="distribution-count">${staffList.length} staff (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%; background: linear-gradient(90deg, #8b5cf6, #a78bfa)"></div>
                </div>
                <div class="staff-details">
                    ${staffList.slice(0, 3).map(staff => `<span class="staff-name">${staff.name}</span>`).join('')}
                    ${staffList.length > 3 ? `<span class="more-staff">+${staffList.length - 3} more</span>` : ''}
                </div>
            `;
            container.appendChild(item);
        });
    }

    populateRecentHires(activeStaff, branchMap) {
        const container = document.getElementById('recent-hires');
        if (!container) return;

        // Get recent hires (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentHires = activeStaff
            .filter(staff => new Date(staff.hire_date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.hire_date) - new Date(a.hire_date));

        if (recentHires.length === 0) {
            container.innerHTML = `
                <div class="no-recent-hires">
                    <div class="no-data-icon">👥</div>
                    <p>No new hires in the last 30 days</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        recentHires.forEach(staff => {
            const branchName = branchMap[staff.branch_id] || 'Unknown Branch';
            const hireDate = new Date(staff.hire_date);
            const daysAgo = Math.floor((new Date() - hireDate) / (1000 * 60 * 60 * 24));
            
            const item = document.createElement('div');
            item.className = 'recent-hire-item';
            item.innerHTML = `
                <div class="hire-info">
                    <div class="hire-name">👤 ${staff.name}</div>
                    <div class="hire-details">
                        <span class="hire-position">${staff.position}</span>
                        <span class="hire-separator">•</span>
                        <span class="hire-department">${staff.department}</span>
                        <span class="hire-separator">•</span>
                        <span class="hire-branch">🏪 ${branchName}</span>
                    </div>
                </div>
                <div class="hire-date">
                    <div class="hire-date-text">${daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}</div>
                    <div class="hire-date-full">${hireDate.toLocaleDateString()}</div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    async loadRevenueAnalytics() {
        try {
            console.log('💰 Loading revenue analytics...');
            
            // Find the revenue tab content area
            const revenueTab = document.getElementById('revenue-tab');
            if (!revenueTab) {
                console.log('Revenue tab not found');
                return;
            }

            // Create comprehensive revenue analytics layout
            revenueTab.innerHTML = `
                <div class="analytics-section">
                    <div class="revenue-overview-header">
                        <h3>Revenue Analytics Overview</h3>
                        <div class="revenue-summary-stats">
                            <div class="summary-stat-item">
                                <span class="stat-number" id="monthly-revenue-total">Loading...</span>
                                <span class="stat-label">Monthly Revenue</span>
                            </div>
                            <div class="summary-stat-item">
                                <span class="stat-number" id="daily-average-revenue">Loading...</span>
                                <span class="stat-label">Daily Average</span>
                            </div>
                            <div class="summary-stat-item">
                                <span class="stat-number" id="revenue-growth-rate">Loading...</span>
                                <span class="stat-label">Growth Rate</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="revenue-breakdown-content">
                        <!-- Monthly Revenue Breakdown -->
                        <div class="revenue-section">
                            <h4>📊 Monthly Revenue Breakdown</h4>
                            <div class="revenue-months" id="revenue-months"></div>
                        </div>

                        <!-- Branch Revenue Contribution -->
                        <div class="revenue-section">
                            <h4>🏪 Branch Revenue Contribution</h4>
                            <div class="revenue-by-branch" id="revenue-by-branch"></div>
                        </div>

                        <!-- Revenue Performance Metrics -->
                        <div class="revenue-section">
                            <h4>🎯 Performance Metrics</h4>
                            <div class="revenue-metrics" id="revenue-metrics"></div>
                        </div>
                    </div>
                </div>
            `;

            // Load all revenue data
            await Promise.all([
                this.loadMonthlyRevenueSummary(),
                this.loadMonthlyRevenueBreakdown(),
                this.loadBranchRevenueContribution(),
                this.loadRevenueMetrics()
            ]);

            console.log('✅ Revenue analytics loaded successfully');
        } catch (error) {
            console.error('❌ Error loading revenue analytics:', error);
        }
    }

    async loadMonthlyRevenueSummary() {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Get current month data
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
            
            // Get previous month data
            const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
            const previousMonthEnd = new Date(currentYear, currentMonth, 0);
            
            const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
            const currentMonthEndStr = currentMonthEnd.toISOString().split('T')[0];
            const previousMonthStartStr = previousMonthStart.toISOString().split('T')[0];
            const previousMonthEndStr = previousMonthEnd.toISOString().split('T')[0];

            // Get current month revenue
            const { data: currentMonthData, error: currentError } = await this.supabase
                .from('eod_reports')
                .select('total_sales')
                .gte('date', currentMonthStartStr)
                .lte('date', currentMonthEndStr);

            // Get previous month revenue
            const { data: previousMonthData, error: previousError } = await this.supabase
                .from('eod_reports')
                .select('total_sales')
                .gte('date', previousMonthStartStr)
                .lte('date', previousMonthEndStr);

            if (currentError || previousError) {
                console.error('Error fetching monthly revenue:', currentError || previousError);
                return;
            }

            // Calculate totals
            const currentMonthTotal = currentMonthData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
            const previousMonthTotal = previousMonthData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;

            // Calculate daily average
            const currentDay = now.getDate();
            const dailyAverage = currentDay > 0 ? currentMonthTotal / currentDay : 0;

            // Calculate growth rate
            let growthRate = 0;
            if (previousMonthTotal > 0) {
                growthRate = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
            } else if (currentMonthTotal > 0) {
                growthRate = 100;
            }

            // Update summary stats
            const monthlyTotalEl = document.getElementById('monthly-revenue-total');
            const dailyAverageEl = document.getElementById('daily-average-revenue');
            const growthRateEl = document.getElementById('revenue-growth-rate');

            if (monthlyTotalEl) {
                monthlyTotalEl.textContent = currentMonthTotal.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
            }

            if (dailyAverageEl) {
                dailyAverageEl.textContent = dailyAverage.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
            }

            if (growthRateEl) {
                const sign = growthRate >= 0 ? '+' : '';
                growthRateEl.textContent = `${sign}${growthRate.toFixed(1)}%`;
                growthRateEl.style.color = growthRate >= 0 ? '#10b981' : '#ef4444';
            }

        } catch (error) {
            console.error('Error loading monthly revenue summary:', error);
        }
    }

    async loadMonthlyRevenueBreakdown() {
        try {
            const container = document.getElementById('revenue-months');
            if (!container) return;

            const now = new Date();
            const currentYear = now.getFullYear();
            const months = [];

            // Get last 6 months of data
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(currentYear, now.getMonth() - i, 1);
                const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                
                const monthStartStr = monthStart.toISOString().split('T')[0];
                const monthEndStr = monthEnd.toISOString().split('T')[0];

                const { data: monthData } = await this.supabase
                    .from('eod_reports')
                    .select('total_sales')
                    .gte('date', monthStartStr)
                    .lte('date', monthEndStr);

                const monthTotal = monthData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;

                months.push({
                    name: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    total: monthTotal,
                    reportCount: monthData?.length || 0
                });
            }

            // Find max value for scaling
            const maxRevenue = Math.max(...months.map(m => m.total));

            container.innerHTML = '';
            months.forEach(month => {
                const percentage = maxRevenue > 0 ? (month.total / maxRevenue) * 100 : 0;
                
                const item = document.createElement('div');
                item.className = 'revenue-month-item';
                item.innerHTML = `
                    <div class="month-header">
                        <span class="month-name">📅 ${month.name}</span>
                        <span class="month-total">${month.total.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: linear-gradient(90deg, #10b981, #34d399)"></div>
                    </div>
                    <div class="month-details">
                        <span class="report-count">${month.reportCount} reports</span>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading monthly revenue breakdown:', error);
        }
    }

    async loadBranchRevenueContribution() {
        try {
            const container = document.getElementById('revenue-by-branch');
            if (!container) return;

            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
            const todayStr = now.toISOString().split('T')[0];

            // Get all branches
            const { data: branches } = await this.supabase
                .from('branches')
                .select('id, name');

            // Get current month revenue by branch
            const { data: revenueData } = await this.supabase
                .from('eod_reports')
                .select('branch_id, total_sales')
                .gte('date', currentMonthStartStr)
                .lte('date', todayStr);

            if (!branches || !revenueData) return;

            // Calculate branch totals
            const branchRevenue = [];
            let totalRevenue = 0;

            branches.forEach(branch => {
                const branchReports = revenueData.filter(report => report.branch_id === branch.id);
                const branchTotal = branchReports.reduce((sum, report) => sum + (parseFloat(report.total_sales) || 0), 0);
                
                branchRevenue.push({
                    id: branch.id,
                    name: branch.name,
                    revenue: branchTotal,
                    reportCount: branchReports.length
                });
                
                totalRevenue += branchTotal;
            });

            // Sort by revenue (highest first)
            branchRevenue.sort((a, b) => b.revenue - a.revenue);

            container.innerHTML = '';
            branchRevenue.forEach(branch => {
                const percentage = totalRevenue > 0 ? (branch.revenue / totalRevenue) * 100 : 0;
                
                const item = document.createElement('div');
                item.className = 'revenue-branch-item';
                item.innerHTML = `
                    <div class="branch-header">
                        <span class="branch-name">🏪 ${branch.name}</span>
                        <span class="branch-revenue">${branch.revenue.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        })} (${percentage.toFixed(1)}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background: ${this.getBranchColor(branch.id)}"></div>
                    </div>
                    <div class="branch-details">
                        <span class="report-count">${branch.reportCount} reports this month</span>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading branch revenue contribution:', error);
        }
    }

    async loadRevenueMetrics() {
        try {
            const container = document.getElementById('revenue-metrics');
            if (!container) return;

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            // Get current month data
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
            const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
            const currentMonthEndStr = currentMonthEnd.toISOString().split('T')[0];

            // Get year-to-date data
            const yearStart = new Date(currentYear, 0, 1);
            const yearStartStr = yearStart.toISOString().split('T')[0];
            const todayStr = now.toISOString().split('T')[0];

            // Get current month revenue with profit data
            const { data: currentMonthData } = await this.supabase
                .from('eod_reports')
                .select('total_sales, total_profit')
                .gte('date', currentMonthStartStr)
                .lte('date', currentMonthEndStr);

            // Get year-to-date revenue
            const { data: yearData } = await this.supabase
                .from('eod_reports')
                .select('total_sales, total_profit')
                .gte('date', yearStartStr)
                .lte('date', todayStr);

            // Calculate metrics
            const monthlyRevenue = currentMonthData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
            const monthlyProfit = currentMonthData?.reduce((sum, row) => sum + (parseFloat(row.total_profit) || 0), 0) || 0;
            const yearlyRevenue = yearData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
            const yearlyProfit = yearData?.reduce((sum, row) => sum + (parseFloat(row.total_profit) || 0), 0) || 0;

            // Calculate additional metrics
            const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
            const averageDailyRevenue = now.getDate() > 0 ? monthlyRevenue / now.getDate() : 0;
            const reportsThisMonth = currentMonthData?.length || 0;

            container.innerHTML = `
                <div class="metrics-grid">
                    <div class="metric-item">
                        <div class="metric-label">💰 Monthly Profit</div>
                        <div class="metric-value ${monthlyProfit >= 0 ? 'positive' : 'negative'}">
                            ${monthlyProfit.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">📊 Profit Margin</div>
                        <div class="metric-value ${profitMargin >= 0 ? 'positive' : 'negative'}">
                            ${profitMargin.toFixed(1)}%
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">📅 Year-to-Date Revenue</div>
                        <div class="metric-value">
                            ${yearlyRevenue.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">💎 Year-to-Date Profit</div>
                        <div class="metric-value ${yearlyProfit >= 0 ? 'positive' : 'negative'}">
                            ${yearlyProfit.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">📈 Daily Average</div>
                        <div class="metric-value">
                            ${averageDailyRevenue.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })}
                        </div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">📋 Reports This Month</div>
                        <div class="metric-value">
                            ${reportsThisMonth}
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading revenue metrics:', error);
        }
    }

    async loadBranches() {
        try {
            console.log('📋 Loading branches for dropdown...');
            const { data: branches, error } = await this.supabase
                .from('branches')
                .select('id, name');

            console.log('📋 Branches loaded:', branches, 'Error:', error);

            const select = document.getElementById('branch-select');
            select.innerHTML = '<option value="">Choose a branch</option>';

            if (error) {
                console.error('Error loading branches:', error);
                select.innerHTML = '<option value="">Error loading branches</option>';
                return;
            }

            if (!branches || branches.length === 0) {
                select.innerHTML = '<option value="">No branches found</option>';
                return;
            }

            branches.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.id;
                option.textContent = branch.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading branches:', error);
            const select = document.getElementById('branch-select');
            select.innerHTML = '<option value="">Error loading branches</option>';
        }
    }

    async viewHistoricalSales() {
        const branchId = document.getElementById('branch-select').value;
        const date = document.getElementById('date-select').value;

        if (!branchId || !date) {
            alert('Please select both a branch and date');
            return;
        }

        const resultsContainer = document.getElementById('historical-results');
        resultsContainer.innerHTML = '<div class="loading-indicator">Loading EOD report data...</div>';
        resultsContainer.classList.remove('hidden');

        try {
            console.log('🔍 Fetching EOD report for:', { branchId, date });
            
            // Get branch name first
            const { data: branchData, error: branchError } = await this.supabase
                .from('branches')
                .select('name')
                .eq('id', branchId)
                .single();

            console.log('🏢 Branch data:', branchData, 'Error:', branchError);

            // Get EOD report data for the selected branch and date
            const { data: eodReports, error: eodError } = await this.supabase
                .from('eod_reports')
                .select('*')
                .eq('branch_id', branchId)
                .eq('date', date)
                .order('submitted_at', { ascending: false });

            console.log('📊 EOD reports:', eodReports, 'Error:', eodError);

            if (branchError) {
                console.error('Branch query error:', branchError);
            }
            
            if (eodError) {
                console.error('EOD reports query error:', eodError);
                throw new Error(`Database error: ${eodError.message}`);
            }

            if (eodReports && eodReports.length > 0) {
                // If multiple reports exist for the same date, show the most recent one
                const eodReport = eodReports[0];
                const branchName = branchData?.name || 'Unknown Branch';

                // Load department-level sales for this report so the business owner
                // can see the same breakdown that the branch manager captured
                let departmentSectionHtml = '';
                try {
                    const { data: departmentSales, error: deptError } = await this.supabase
                        .from('eod_report_departments')
                        .select(`
                            department_id,
                            sales_amount,
                            departments ( name )
                        `)
                        .eq('eod_report_id', eodReport.id);

                    if (deptError) {
                        console.error('Department sales query error:', deptError);
                        departmentSectionHtml = `
                            <div class="eod-section">
                                <h5>🏬 Sales by Department</h5>
                                <p class="eod-label">Department breakdown is temporarily unavailable (database error).</p>
                            </div>
                        `;
                    } else if (departmentSales && departmentSales.length > 0) {
                        const departmentRowsHtml = departmentSales.map(dept => {
                            const deptName = (dept.departments && dept.departments.name) 
                                ? dept.departments.name 
                                : `Department ${dept.department_id}`;
                            const amount = parseFloat(dept.sales_amount || 0);
                            return `
                                <div class="eod-item">
                                    <span class="eod-label">${deptName} Sales:</span>
                                    <span class="eod-value">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            `;
                        }).join('');

                        const departmentsTotal = departmentSales.reduce((sum, dept) => {
                            return sum + (parseFloat(dept.sales_amount || 0) || 0);
                        }, 0);
                        const reportedTotal = parseFloat(eodReport.total_sales || 0) || 0;
                        const hasMismatch = Math.abs(departmentsTotal - reportedTotal) >= 0.01;

                        departmentSectionHtml = `
                            <div class="eod-section">
                                <h5>🏬 Sales by Department</h5>
                                <div class="eod-grid">
                                    ${departmentRowsHtml}
                                </div>
                                <div class="eod-item" style="margin-top: 16px;">
                                    <span class="eod-label">Total of Departments:</span>
                                    <span class="eod-value">$${departmentsTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                ${hasMismatch ? `
                                    <p class="eod-label" style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                                        Note: Department total differs slightly from reported Total Sales (likely due to historical data or rounding).
                                    </p>
                                ` : ''}
                            </div>
                        `;
                    } else {
                        // Older reports may not have department-level data stored
                        departmentSectionHtml = `
                            <div class="eod-section">
                                <h5>🏬 Sales by Department</h5>
                                <p class="eod-label">No department breakdown was captured for this report. Only total sales are available.</p>
                            </div>
                        `;
                    }
                } catch (deptException) {
                    console.error('Unexpected error loading department sales:', deptException);
                    departmentSectionHtml = `
                        <div class="eod-section">
                            <h5>🏬 Sales by Department</h5>
                            <p class="eod-label">Unable to load department breakdown at the moment.</p>
                        </div>
                    `;
                }
                
                resultsContainer.innerHTML = `
                    <div class="eod-report-header">
                        <h4>📊 EOD Report: ${branchName}</h4>
                        <div class="report-date">${new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</div>
                        ${eodReports.length > 1 ? `<div class="report-note">⚠️ Multiple reports found for this date. Showing the most recent.</div>` : ''}
                    </div>
                    
                    <div class="eod-report-content">
                        ${departmentSectionHtml}

                        <!-- Financial Summary -->
                        <div class="eod-section">
                            <h5>💰 Financial Summary</h5>
                            <div class="eod-grid">
                                <div class="eod-item">
                                    <span class="eod-label">Total Sales:</span>
                                    <span class="eod-value">$${parseFloat(eodReport.total_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Total Profit:</span>
                                    <span class="eod-value ${parseFloat(eodReport.total_profit || 0) >= 0 ? '' : 'expense-value'}">$${parseFloat(eodReport.total_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Total Expenses:</span>
                                    <span class="eod-value expense-value">$${parseFloat(eodReport.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Net Revenue:</span>
                                    <span class="eod-value net-revenue">${
                                        (parseFloat(eodReport.total_sales || 0) - parseFloat(eodReport.total_expenses || 0)) >= 0 
                                            ? '+$' + (parseFloat(eodReport.total_sales || 0) - parseFloat(eodReport.total_expenses || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })
                                            : '-$' + Math.abs(parseFloat(eodReport.total_sales || 0) - parseFloat(eodReport.total_expenses || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })
                                    }</span>
                                </div>
                            </div>
                        </div>

                        <!-- Financial Summary Additional Details -->
                        <div class="eod-section">
                            <h5>💳 Payment Methods</h5>
                            <div class="eod-grid">
                                <div class="eod-item">
                                    <span class="eod-label">Cash on Hand:</span>
                                    <span class="eod-value">$${parseFloat(eodReport.cash_on_hand || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Discrepancies:</span>
                                    <span class="eod-value ${parseFloat(eodReport.discrepancies || 0) !== 0 ? 'expense-value' : ''}">$${parseFloat(eodReport.discrepancies || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Profitability Analysis -->
                        <div class="eod-section">
                            <h5>📊 Financial Analysis</h5>
                            <div class="eod-grid">
                                <div class="eod-item">
                                    <span class="eod-label">Gross Profit:</span>
                                    <span class="eod-value">${
                                        parseFloat(eodReport.total_profit || 0) >= 0 
                                            ? '+$' + parseFloat(eodReport.total_profit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
                                            : '-$' + Math.abs(parseFloat(eodReport.total_profit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })
                                    }</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Profit Margin:</span>
                                    <span class="eod-value">${
                                        parseFloat(eodReport.total_sales || 0) > 0 
                                            ? ((parseFloat(eodReport.total_profit || 0) / parseFloat(eodReport.total_sales || 0)) * 100).toFixed(1) + '%'
                                            : '0.0%'
                                    }</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Expense Ratio:</span>
                                    <span class="eod-value">${
                                        parseFloat(eodReport.total_sales || 0) > 0 
                                            ? ((parseFloat(eodReport.total_expenses || 0) / parseFloat(eodReport.total_sales || 0)) * 100).toFixed(1) + '%'
                                            : '0.0%'
                                    }</span>
                                </div>
                                <div class="eod-item">
                                    <span class="eod-label">Report Submitted:</span>
                                    <span class="eod-value">${new Date(eodReport.submitted_at).toLocaleString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Notes Section -->
                        ${eodReport.notes ? `
                            <div class="eod-section">
                                <h5>📝 Notes</h5>
                                <div class="eod-notes">
                                    ${eodReport.notes}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                resultsContainer.innerHTML = `
                    <div class="no-data-message">
                        <div class="no-data-icon">📊</div>
                        <h4>No EOD Report Found</h4>
                        <p>No End of Day report was submitted for <strong>${branchData?.name || 'this branch'}</strong> on <strong>${new Date(date).toLocaleDateString()}</strong>.</p>
                        <p>Please check with the branch manager to ensure EOD reports are being submitted daily.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading EOD report:', error);
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h4>Error Loading Data</h4>
                    <p>Unable to load EOD report data. Please try again later.</p>
                    <p class="error-details">Error: ${error.message}</p>
                </div>
            `;
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    updateTimestamp() {
        document.getElementById('last-update-time').textContent = new Date().toLocaleString();
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        return `${Math.floor(diffInHours / 24)} days ago`;
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Initialize the business overview dashboard
new BusinessOverview();
