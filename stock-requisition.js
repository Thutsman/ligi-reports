// Check if page is loading properly
console.log('Stock Requisition JavaScript loaded');

// Initialize Supabase client
const SUPABASE_URL = 'https://veohdpcvkzouuyjpwmis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hkcGN2a3pvdXV5anB3bWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjUwNTIsImV4cCI6MjA3NDEwMTA1Mn0.d2MyXV4nl7G3kRLGgekWUioFlXesHXgCn1ezbt812UA';

// Wait for Supabase library to load
function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.supabase) {
            resolve();
        } else {
            console.log('Waiting for Supabase library...');
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof window !== 'undefined' && window.supabase) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts > 50) { // 5 seconds timeout
                    clearInterval(checkInterval);
                    console.warn('Supabase library not loaded after 5 seconds, continuing with fallback');
                    resolve();
                }
            }, 100);
        }
    });
}

// Initialize Supabase with error handling
let supabase;
async function initializeSupabase() {
    try {
        await waitForSupabase();
        
        if (typeof window !== 'undefined' && window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
        } else {
            console.error('Supabase library not loaded');
            throw new Error('Supabase library not found');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        // Create mock supabase object to prevent errors
        supabase = {
            auth: {
                getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not available') })
            },
            from: () => ({
                select: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: new Error('Supabase not available') }),
                        order: () => ({
                            limit: () => Promise.resolve({ data: [], error: new Error('Supabase not available') })
                        })
                    })
                }),
                insert: () => Promise.resolve({ data: null, error: new Error('Supabase not available') })
            })
        };
    }
}

// Initialize Supabase immediately
initializeSupabase();

async function fetchUserProfileAndBranch() {
    try {
        console.log('Fetching user profile and branch...');
        
        // 1. Get current user with timeout
        const userPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );
        
        const { data: { user }, error: userError } = await Promise.race([userPromise, timeoutPromise]);
        
        if (userError) {
            console.error('User auth error:', userError);
            throw userError;
        }
        
        if (!user) {
            console.log('No user found, redirecting to login');
            window.location.href = 'index.html';
            return false;
        }
        
        console.log('User found:', user.email);
        
        // 2. Get profile with fallback
        let profile = null;
        let branchName = 'Unknown Branch';
        
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, branch_id')
                .eq('id', user.id)
                .single();
                
            if (profileError) {
                console.warn('Profile error:', profileError);
                // Create fallback profile
                profile = {
                    role: 'branch-manager', // Default role
                    branch_id: 1 // Default branch
                };
            } else {
                profile = profileData;
            }
        } catch (error) {
            console.warn('Profile fetch failed, using fallback:', error);
            profile = {
                role: 'branch-manager',
                branch_id: 1
            };
        }
        
        // 3. Fetch branch name with fallback
        if (profile.branch_id) {
            try {
                const { data: branch, error: branchError } = await supabase
                    .from('branches')
                    .select('name')
                    .eq('id', profile.branch_id)
                    .single();
                    
                if (!branchError && branch) {
                    branchName = branch.name;
                } else {
                    console.warn('Branch fetch error:', branchError);
                    branchName = `Branch ${profile.branch_id}`;
                }
            } catch (error) {
                console.warn('Branch fetch failed, using fallback:', error);
                branchName = `Branch ${profile.branch_id}`;
            }
        }
        
        // 4. Store for use
        window.currentUserProfile = {
            userId: user.id,
            role: profile.role,
            branchId: profile.branch_id,
            branchName: branchName,
            userName: user.user_metadata?.name || user.email
        };
        
        console.log('Profile loaded:', window.currentUserProfile);
        
        // 5. Display branch name
        const branchNameElement = document.getElementById('branch-name');
        if (branchNameElement) {
            branchNameElement.textContent = branchName;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error in fetchUserProfileAndBranch:', error);
        
        // Create emergency fallback profile
        window.currentUserProfile = {
            userId: 'fallback-user',
            role: 'branch-manager',
            branchId: 1,
            branchName: 'Default Branch',
            userName: 'Unknown User'
        };
        
        const branchNameElement = document.getElementById('branch-name');
        if (branchNameElement) {
            branchNameElement.textContent = 'Default Branch';
        }
        
        return true; // Continue with fallback data
    }
}

async function loadRecentRequisitions() {
    console.log('loadRecentRequisitions: Starting...');
    const container = document.getElementById('recent-requisitions');
    
    if (!container) {
        console.warn('Recent requisitions container not found');
        return;
    }
    
    const { branchId } = window.currentUserProfile || {};
    console.log('loadRecentRequisitions: branchId =', branchId);
    
    if (!branchId) {
        console.log('loadRecentRequisitions: No branch ID, showing no branch message');
        container.innerHTML = '<div class="loading-state"><span style="color: var(--gray-500);">No branch assigned.</span></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner small"></div><span>Loading recent requisitions...</span></div>';
    console.log('loadRecentRequisitions: Starting database query...');
    
    try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Requisitions load timeout')), 8000)
        );
        
        const dataPromise = supabase
            .from('pending_requisitions')
            .select('*')
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false })
            .limit(5);
            
        const { data, error } = await Promise.race([dataPromise, timeoutPromise]);
        console.log('loadRecentRequisitions: Database query completed', { data, error });
        
        if (error) {
            console.error('Error loading requisitions:', error);
            container.innerHTML = '<div class="loading-state"><span style="color: var(--gray-500);">Unable to load requisitions. You can still submit new ones.</span></div>';
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('loadRecentRequisitions: No data found, showing empty state');
            container.innerHTML = '<div class="loading-state"><span style="color: var(--gray-500);">No requisitions submitted yet.</span></div>';
            return;
        }
        
        console.log('loadRecentRequisitions: Rendering', data.length, 'requisitions');
        container.innerHTML = '';
        
        data.forEach(req => {
            const date = new Date(req.created_at).toLocaleDateString('en-GB', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const status = req.status || 'pending';
            const itemsText = `${req.items_count || 0} items requested`;
            const priorityText = req.priority ? ` • ${req.priority.charAt(0).toUpperCase() + req.priority.slice(1)} priority` : '';
            
            const div = document.createElement('div');
            div.className = 'requisition-item';
            div.innerHTML = `
                <div class="requisition-info">
                    <h4>${req.requisition_id || 'Unknown ID'}</h4>
                    <div class="requisition-details">${itemsText}${priorityText}</div>
                    <div class="requisition-details" style="color: var(--gray-500); font-size: 12px;">${date}</div>
                </div>
                <div class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
            `;
            container.appendChild(div);
        });
        
        console.log('loadRecentRequisitions: Completed successfully');
        
    } catch (error) {
        console.error('Error loading recent requisitions:', error);
        container.innerHTML = '<div class="loading-state"><span style="color: var(--gray-500);">Unable to load requisitions. You can still submit new ones.</span></div>';
    }
}

class StockRequisition {
    constructor() {
        this.itemCounter = 1;
        this.categories = ['Butchery', 'Confectionery', 'Grocery', 'Cleaning Supplies', 'Office Supplies'];
        this.units = ['Pieces', 'Kilograms', 'Liters', 'Packs', 'Boxes', 'Cartons'];
        this.urgencyLevels = [
            { value: 'low', label: 'Low Priority' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High Priority' },
            { value: 'urgent', label: 'Urgent' }
        ];
        this.init();
    }

    async init() {
        console.log('Initializing Stock Requisition...');
        
        // Show loading overlay
        this.showLoadingOverlay();
        
        try {
            // Wait for Supabase to be ready
            console.log('Step 0: Waiting for Supabase...');
            await initializeSupabase();
            
            // Initialize components with individual error handling
            console.log('Step 1: Fetching user profile...');
            const profileLoaded = await fetchUserProfileAndBranch();
            
            if (!profileLoaded) {
                console.log('Profile loading failed, but continuing...');
            }
            
            console.log('Step 2: Setting current date...');
            this.setCurrentDate();
            
            console.log('Step 3: Adding initial item...');
            this.addInitialItem();
            
            console.log('Step 4: Binding events...');
            this.bindEvents();
            
            console.log('Step 5: Loading recent requisitions...');
            // Don't await this - let it load in background
            loadRecentRequisitions().catch(error => {
                console.warn('Recent requisitions failed to load:', error);
            });
            
            console.log('Initialization complete!');
            
        } catch (error) {
            console.error('Error during initialization:', error);
            // Continue anyway - show a notification but don't block
            this.showNotification('Some features may not work properly. Please refresh if needed.', 'warning');
        } finally {
            // Always hide loading overlay
            console.log('Hiding loading overlay...');
            this.hideLoadingOverlay();
            
            // Additional safety check - force hide after 2 seconds
            setTimeout(() => {
                const overlay = document.getElementById('loading-overlay');
                if (overlay && !overlay.classList.contains('hidden')) {
                    console.warn('Force hiding loading overlay after timeout');
                    overlay.style.display = 'none';
                }
            }, 2000);
        }
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            // Add the hidden class which sets opacity to 0 and pointer-events to none
            overlay.classList.add('hidden');
            // After the transition, completely hide the element
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }

    setCurrentDate() {
        const today = new Date();
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        document.getElementById('current-date').textContent = today.toLocaleDateString('en-GB', options);
    }

    bindEvents() {
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = 'dashboardbranch.html';
        });
        
        // Add item button
        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.addItem();
        });
        
        // Form submission
        document.getElementById('requisition-form').addEventListener('submit', (e) => {
            this.handleSubmit(e);
        });
        
        // Modal buttons
        const submitAnotherBtn = document.getElementById('submit-another-btn');
        const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        
        if (submitAnotherBtn) {
            submitAnotherBtn.addEventListener('click', () => {
                this.hideModal('success-modal');
                this.resetForm();
            });
        }
        
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboardbranch.html';
            });
        }
    }

    addItem() {
        const container = document.getElementById('items-container');
        const itemRow = this.createItemRow(this.itemCounter++);
        container.appendChild(itemRow);
    }

    addInitialItem() {
        this.addItem();
    }

    createItemRow(id) {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.dataset.itemId = id;
        row.innerHTML = `
            <div class="form-group">
                <label>Item Name</label>
                <input type="text" name="itemName" required placeholder="e.g. Sugar">
            </div>
            <div class="form-group">
                <label>Category</label>
                <select name="category" required>
                    <option value="">Select category</option>
                    ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" name="quantity" min="1" required placeholder="0">
            </div>
            <div class="form-group">
                <label>Unit</label>
                <select name="unit" required>
                    <option value="">Select unit</option>
                    ${this.units.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Priority</label>
                <select name="urgency" required>
                    ${this.urgencyLevels.map(level => `<option value="${level.value}">${level.label}</option>`).join('')}
                </select>
            </div>
            <button type="button" class="remove-button" title="Remove Item" aria-label="Remove Item">🗑️</button>
        `;
        row.querySelector('.remove-button').addEventListener('click', () => {
            this.removeItem(id);
        });
        return row;
    }

    removeItem(id) {
        const items = document.querySelectorAll('.item-row');
        if (items.length > 1) {
            const item = document.querySelector(`[data-item-id="${id}"]`);
            if (item) {
                item.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    if (item.parentNode) {
                        item.remove();
                    }
                }, 300);
            }
        } else {
            this.showNotification('At least one item is required', 'warning');
        }
    }

    resetForm() {
        // Clear all items except the first one
        const itemsContainer = document.getElementById('items-container');
        itemsContainer.innerHTML = '';
        
        // Reset counter and add initial item
        this.itemCounter = 1;
        this.addInitialItem();
        
        // Clear notes
        document.getElementById('notes').value = '';
        
        this.showNotification('Form reset. You can add new items.', 'info');
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
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const items = this.collectItems();
        const notes = document.getElementById('notes').value;
        
        if (items.length === 0) {
            this.showNotification('Please add at least one complete item to your requisition.', 'error');
            return;
        }
        
        const { branchId, userId } = window.currentUserProfile || {};
        if (!branchId || !userId) {
            this.showNotification('User or branch information missing. Please log in again.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        const requisitionData = {
            branch_id: branchId,
            requested_by: userId,
            items: items,
            notes: notes,
            status: 'pending'
        };
        
        this.submitRequisition(requisitionData);
    }

    collectItems() {
        const items = [];
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const itemName = row.querySelector('[name="itemName"]').value.trim();
            const category = row.querySelector('[name="category"]').value;
            const quantity = row.querySelector('[name="quantity"]').value;
            const unit = row.querySelector('[name="unit"]').value;
            const urgency = row.querySelector('[name="urgency"]').value;
            if (itemName && category && quantity && unit) {
                items.push({
                    item_name: itemName,
                    category,
                    quantity: parseInt(quantity),
                    unit,
                    urgency
                });
            }
        });
        return items;
    }

    async submitRequisition(data) {
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner small"></span> Submitting...';
        
        try {
            // Generate requisition ID
            const requisitionId = `REQ-${Date.now().toString().slice(-6)}`;
            
            // Add requisition ID to data
            data.requisition_id = requisitionId;
            
            // Insert into pending_requisitions table (updated table name)
            const { error } = await supabase.from('pending_requisitions').insert([{
                requisition_id: requisitionId,
                branch_id: data.branch_id,
                branch_name: window.currentUserProfile?.branchName || 'Unknown Branch',
                requested_by: data.requested_by,
                requester_name: window.currentUserProfile?.userName || 'Unknown User',
                items_count: data.items.length,
                total_estimated_value: 0, // Could calculate based on items
                priority: this.getHighestPriority(data.items),
                status: 'pending',
                request_details: data.notes || 'No additional notes',
                notes: data.notes
            }]);
            
            if (error) {
                throw error;
            }
            
            // Show success modal
            document.getElementById('requisition-id').textContent = requisitionId;
            this.showModal('success-modal');
            
            // Refresh recent requisitions
            await loadRecentRequisitions();
            
            this.showNotification('Requisition submitted successfully!', 'success');
            
        } catch (error) {
            console.error('Submission error:', error);
            
            // Handle specific error types
            if (error.message && error.message.includes('403')) {
                this.showNotification('Permission denied: You may not have the required permissions to submit requisitions. Please contact your administrator.', 'error');
            } else if (error.message && error.message.includes('Network')) {
                this.showNotification('Network error: Please check your internet connection and try again.', 'error');
            } else {
                this.showNotification('Submission error: ' + (error.message || 'Unknown error occurred'), 'error');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    getHighestPriority(items) {
        const priorities = ['urgent', 'high', 'normal', 'low'];
        for (const priority of priorities) {
            if (items.some(item => item.urgency === priority)) {
                return priority;
            }
        }
        return 'normal';
    }
}
// Initialize when page loads with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing Stock Requisition...');
        new StockRequisition();
    } catch (error) {
        console.error('Failed to initialize Stock Requisition:', error);
        
        // Emergency fallback - hide loading overlay if it exists
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        
        // Show error message
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #fee; border: 1px solid #fcc; padding: 20px; margin: 20px; border-radius: 8px; color: #c33;';
            errorDiv.innerHTML = `
                <h3>Loading Error</h3>
                <p>There was an error loading the page. Please try refreshing or contact support.</p>
                <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Refresh Page</button>
            `;
            container.insertBefore(errorDiv, container.firstChild);
        }
    }
});

// Additional safety check - if page still loading after 15 seconds, force hide overlay
setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
        console.warn('Force hiding loading overlay after timeout');
        loadingOverlay.classList.add('hidden');
        
        // Show warning message
        const container = document.querySelector('.container');
        if (container) {
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px; border-radius: 8px; color: #856404;';
            warningDiv.innerHTML = `
                <strong>⚠️ Loading Issue:</strong> The page took longer than expected to load. Some features may not work properly.
                <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Refresh</button>
            `;
            container.insertBefore(warningDiv, container.firstChild);
        }
    }
}, 15000); 