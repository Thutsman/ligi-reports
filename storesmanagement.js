// Initialize Supabase client
const supabaseUrl = 'https://veohdpcvkzouuyjpwmis.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hkcGN2a3pvdXV5anB3bWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjUwNTIsImV4cCI6MjA3NDEwMTA1Mn0.d2MyXV4nl7G3kRLGgekWUioFlXesHXgCn1ezbt812UA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

class StoresManagement {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.authCheckInProgress = false;
        this.init();
    }

    async init() {
        console.log('Initializing Stores Management Dashboard...');
        
        // Add a small delay to allow Supabase to initialize
        setTimeout(async () => {
            try {
                await this.checkAuth();
                if (this.isAuthenticated) {
                    this.bindEvents();
                    await this.loadDashboardData();
                }
                this.hideLoadingOverlay();
            } catch (error) {
                console.error('Error during initialization:', error);
                this.hideLoadingOverlay();
            }
        }, 1000);

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            if (event === 'SIGNED_OUT') {
                window.location.href = 'index.html';
            }
        });
    }

    async checkAuth() {
        if (this.authCheckInProgress) return;
        this.authCheckInProgress = true;

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) {
                console.error('Auth error:', error);
                window.location.href = 'index.html';
                return;
            }

            if (!user) {
                console.log('No user found, redirecting to login');
                window.location.href = 'index.html';
                return;
            }

            // Check user role from profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError || !profile || profile.role !== 'stores-manager') {
                console.log('User is not stores manager, redirecting to login');
                window.location.href = 'index.html';
                return;
            }

            this.user = user;
            this.isAuthenticated = true;
            console.log('Stores manager authenticated:', user.email);
            
            // Update UI with user info
            this.updateUserInfo();
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = 'index.html';
        } finally {
            this.authCheckInProgress = false;
        }
    }

    updateUserInfo() {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.user) {
            const displayName = this.user.user_metadata?.name || 
                              this.user.user_metadata?.full_name || 
                              this.user.email.split('@')[0];
            userNameElement.textContent = displayName;
        }
    }

    bindEvents() {
        console.log('Binding events...');
        
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                console.log('Logging out...');
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }

        // Action buttons
        const receiveDeliveryBtn = document.getElementById('receive-delivery-btn');
        if (receiveDeliveryBtn) {
            receiveDeliveryBtn.addEventListener('click', () => {
                this.showModal('receive-delivery-modal');
            });
        }

        const dispatchItemsBtn = document.getElementById('dispatch-items-btn');
        if (dispatchItemsBtn) {
            dispatchItemsBtn.addEventListener('click', () => {
                this.handleDispatchItems();
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Modal functionality
        document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.dataset.modal || e.target.closest('.modal').id;
                this.hideModal(modal);
            });
        });

        // Form submissions
        const receiveDeliveryForm = document.getElementById('receive-delivery-form');
        if (receiveDeliveryForm) {
            receiveDeliveryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleReceiveDelivery(e);
            });
        }

        // Requisition actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('approve-btn')) {
                this.approveRequisition(e.target.dataset.reqId);
            }
            if (e.target.classList.contains('decline-btn')) {
                this.declineRequisition(e.target.dataset.reqId);
            }
        });
    }

    async loadDashboardData() {
        console.log('Loading dashboard data...');
        try {
            await Promise.all([
                this.loadQuickStats(),
                this.loadPendingRequisitions(),
                this.loadSupplierDeliveries(),
                this.loadInventoryCategories()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadQuickStats() {
        try {
            console.log('Loading quick stats...');
            
            // Set default values first
            document.getElementById('pending-requisitions').textContent = '0';
            document.getElementById('items-in-stock').textContent = '0';
            document.getElementById('dispatched-today').textContent = '0';
            document.getElementById('low-stock-items').textContent = '0';

            // Update change indicators with default values
            document.getElementById('pending-change').querySelector('.change-text').textContent = '—';
            document.getElementById('stock-change').querySelector('.change-text').textContent = '—';
            document.getElementById('dispatched-change').querySelector('.change-text').textContent = '—';
            document.getElementById('low-stock-change').querySelector('.change-text').textContent = '—';

            // Load actual data from database
            const { data: stats, error } = await supabase
                .from('stores_stats')
                .select('*')
                .eq('stat_date', new Date().toISOString().split('T')[0])
                .single();

            if (error) {
                console.log('No stats found for today, using defaults');
                // Use default values if no stats found
                document.getElementById('pending-requisitions').textContent = '0';
                document.getElementById('items-in-stock').textContent = '0';
                document.getElementById('dispatched-today').textContent = '0';
                document.getElementById('low-stock-items').textContent = '0';
            } else {
                // Update with real data
                document.getElementById('pending-requisitions').textContent = stats.pending_requisitions || '0';
                document.getElementById('items-in-stock').textContent = (stats.items_in_stock || 0).toLocaleString();
                document.getElementById('dispatched-today').textContent = stats.dispatched_today || '0';
                document.getElementById('low-stock-items').textContent = stats.low_stock_items || '0';

                // Update change indicators
                document.getElementById('pending-change').querySelector('.change-text').textContent = 
                    stats.pending_change > 0 ? `+${stats.pending_change}` : (stats.pending_change < 0 ? `${stats.pending_change}` : '—');
                document.getElementById('stock-change').querySelector('.change-text').textContent = 
                    stats.stock_change > 0 ? `+${stats.stock_change}` : (stats.stock_change < 0 ? `${stats.stock_change}` : '—');
                document.getElementById('dispatched-change').querySelector('.change-text').textContent = 
                    stats.dispatched_change > 0 ? `+${stats.dispatched_change}` : (stats.dispatched_change < 0 ? `${stats.dispatched_change}` : '—');
                document.getElementById('low-stock-change').querySelector('.change-text').textContent = 
                    stats.low_stock_change > 0 ? `+${stats.low_stock_change}` : (stats.low_stock_change < 0 ? `${stats.low_stock_change}` : '—');
            }

        } catch (error) {
            console.error('Error loading quick stats:', error);
            // Keep default values on error
        }
    }

    async loadPendingRequisitions() {
        try {
            console.log('Loading pending requisitions...');
            
            const container = document.getElementById('requisitions-list');
            if (!container) return;

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading requisitions...</div>';

            // Load actual data from database
            const { data: requisitions, error } = await supabase
                .from('pending_requisitions')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error loading requisitions:', error);
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading requisitions</div>';
                return;
            }

            container.innerHTML = '';

            if (!requisitions || requisitions.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">No pending requisitions</div>';
                return;
            }

            requisitions.forEach(req => {
                const item = document.createElement('div');
                item.className = 'requisition-item';
                item.innerHTML = `
                    <div class="requisition-info">
                        <div class="requisition-header">
                            <span class="requisition-id">${req.requisition_id}</span>
                            <span class="priority-badge priority-${req.priority}">${req.priority.toUpperCase()}</span>
                        </div>
                        <div class="requisition-branch">${req.branch_name}</div>
                        <div class="requisition-details">${req.items_count} items • ${this.formatDate(req.created_at)}</div>
                    </div>
                    <div class="requisition-actions">
                        <button class="action-btn decline-btn" data-req-id="${req.id}">Decline</button>
                        <button class="action-btn approve-btn" data-req-id="${req.id}">Approve</button>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading pending requisitions:', error);
            const container = document.getElementById('requisitions-list');
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading requisitions</div>';
            }
        }
    }

    async loadSupplierDeliveries() {
        try {
            console.log('Loading supplier deliveries...');
            
            const container = document.getElementById('deliveries-list');
            if (!container) return;

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading deliveries...</div>';

            // Load actual data from database
            const { data: deliveries, error } = await supabase
                .from('supplier_deliveries')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error loading deliveries:', error);
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading deliveries</div>';
                return;
            }

            container.innerHTML = '';

            if (!deliveries || deliveries.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">No recent deliveries</div>';
                return;
            }

            deliveries.forEach(delivery => {
                const item = document.createElement('div');
                item.className = 'delivery-item';
                item.innerHTML = `
                    <div class="delivery-info">
                        <h4>${delivery.supplier_name}</h4>
                        <div class="delivery-details">${delivery.items_count} items • $${delivery.total_value.toLocaleString()}</div>
                        <div class="delivery-date">${this.formatDate(delivery.created_at)}</div>
                    </div>
                    <div class="status-badge status-${delivery.status}">${delivery.status.toUpperCase()}</div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading supplier deliveries:', error);
            const container = document.getElementById('deliveries-list');
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading deliveries</div>';
            }
        }
    }

    async loadInventoryCategories() {
        try {
            console.log('Loading inventory categories...');
            
            const container = document.getElementById('categories-breakdown');
            if (!container) return;

            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">Loading categories...</div>';

            // Load actual data from database
            const { data: categories, error } = await supabase
                .from('inventory_categories')
                .select('*')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error loading categories:', error);
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading categories</div>';
                return;
            }

            container.innerHTML = '';

            if (!categories || categories.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">No categories available</div>';
                return;
            }

            categories.forEach(category => {
                const item = document.createElement('div');
                item.className = `category-item ${category.name.toLowerCase()}`;
                item.innerHTML = `
                    <div class="category-name">${category.name}</div>
                    <div class="category-count ${category.name.toLowerCase()}">${category.item_count || 0}</div>
                    <div class="category-low-stock">${category.low_stock_count || 0} low stock</div>
                `;
                container.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading inventory categories:', error);
            const container = document.getElementById('categories-breakdown');
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #ef4444;">Error loading categories</div>';
            }
        }
    }

    async handleReceiveDelivery(e) {
        const supplierName = document.getElementById('supplier-name').value;
        const itemsCount = parseInt(document.getElementById('delivery-items').value);
        const totalValue = parseFloat(document.getElementById('delivery-value').value);

        if (!supplierName || !itemsCount || !totalValue) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            console.log('Receiving delivery:', { supplierName, itemsCount, totalValue });
            
            // Generate delivery ID
            const deliveryId = `DEL-${Date.now().toString().slice(-6)}`;
            
            // Save to database
            const { data, error } = await supabase
                .from('supplier_deliveries')
                .insert([
                    {
                        delivery_id: deliveryId,
                        supplier_name: supplierName,
                        items_count: itemsCount,
                        total_value: totalValue,
                        status: 'received',
                        received_by: this.user.id,
                        received_by_name: this.user.user_metadata?.name || this.user.email,
                        received_at: new Date().toISOString(),
                        delivery_notes: 'Received via stores management dashboard'
                    }
                ])
                .select();

            if (error) {
                console.error('Database error:', error);
                this.showNotification('Error saving delivery to database', 'error');
                return;
            }

            this.hideModal('receive-delivery-modal');
            this.showNotification(`Delivery from ${supplierName} received successfully!`, 'success');
            
            // Reset form
            e.target.reset();
            
            // Refresh data
            await this.loadSupplierDeliveries();
            await this.loadQuickStats();

        } catch (error) {
            console.error('Error receiving delivery:', error);
            this.showNotification('Error receiving delivery', 'error');
        }
    }

    async handleDispatchItems() {
        this.showNotification('Dispatch functionality coming soon!', 'info');
    }

    async approveRequisition(reqId) {
        try {
            console.log('Approving requisition:', reqId);
            
            // Update database
            const { data, error } = await supabase
                .from('pending_requisitions')
                .update({
                    status: 'approved',
                    approved_by: this.user.id,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', reqId)
                .select();

            if (error) {
                console.error('Database error:', error);
                this.showNotification('Error approving requisition', 'error');
                return;
            }

            this.showNotification('Requisition approved successfully!', 'success');
            await this.loadPendingRequisitions();
            await this.loadQuickStats();
            
        } catch (error) {
            console.error('Error approving requisition:', error);
            this.showNotification('Error approving requisition', 'error');
        }
    }

    async declineRequisition(reqId) {
        try {
            console.log('Declining requisition:', reqId);
            
            // Update database
            const { data, error } = await supabase
                .from('pending_requisitions')
                .update({
                    status: 'declined',
                    approved_by: this.user.id,
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', reqId)
                .select();

            if (error) {
                console.error('Database error:', error);
                this.showNotification('Error declining requisition', 'error');
                return;
            }

            this.showNotification('Requisition declined', 'info');
            await this.loadPendingRequisitions();
            await this.loadQuickStats();
            
        } catch (error) {
            console.error('Error declining requisition:', error);
            this.showNotification('Error declining requisition', 'error');
        }
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTabContent = document.getElementById(tabName);
        if (activeTabContent) {
            activeTabContent.classList.add('active');
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        console.log('Showing notification:', message, type);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">×</button>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Manual close
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 60) {
            return `${diffInMinutes} minutes ago`;
        } else if (diffInMinutes < 24 * 60) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }
}

// Initialize the stores management dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Stores Management...');
    new StoresManagement();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page became visible, check auth status
        const storesManagement = window.storesManagement;
        if (storesManagement && !storesManagement.isAuthenticated) {
            storesManagement.checkAuth();
        }
    }
}); 