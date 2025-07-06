// Check if dashboard is loading properly
console.log('Dashboard JavaScript loaded');

// Initialize Supabase client
const SUPABASE_URL = 'https://rgbgcaxolxxyqvqmmqnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYmdjYXhvbHh4eXF2cW1tcW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODcwMTEsImV4cCI6MjA2NjE2MzAxMX0.u6H4-hfSjrf4u2lx02hf0L_3LsIvQXDrJBoIUa5Iyb8';

// Initialize Supabase with error handling
let supabase;
try {
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Dashboard Supabase client initialized successfully');
  } else {
    console.error('Supabase library not loaded in dashboard');
    throw new Error('Supabase library not found');
  }
} catch (error) {
  console.error('Failed to initialize Supabase in dashboard:', error);
  // Create mock supabase object to prevent errors
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not available') }),
      onAuthStateChange: () => ({ data: { subscription: null } }),
      signOut: () => Promise.resolve({ error: new Error('Supabase not available') })
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

// Track authentication state
let isAuthenticated = false;
let authCheckInProgress = false;

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email);
  
  if (event === 'SIGNED_OUT' || !session) {
    console.log('User signed out or no session');
    isAuthenticated = false;
    window.location.href = 'index.html';
  } else if (event === 'SIGNED_IN' && session) {
    console.log('User signed in');
    isAuthenticated = true;
  }
});

// Handle page visibility changes (when user returns to tab)
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && !isAuthenticated && !authCheckInProgress) {
    console.log('Page became visible and user not authenticated, checking auth...');
    setTimeout(() => {
      fetchUserProfileAndBranch();
    }, 500);
  }
});

// Placeholder: Show loading spinner
function showLoading(show) {
  document.getElementById('dashboard-loading').classList.toggle('hidden', !show);
}

// Placeholder: Animate metric update
function animateMetric(id, newValue) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('count-animate');
  let start = 0;
  const end = parseInt(newValue, 10) || 0;
  const duration = 800;
  const step = Math.ceil(end / (duration / 16));
  function count() {
    start += step;
    if (start >= end) {
      el.textContent = end;
      el.classList.remove('count-animate');
    } else {
      el.textContent = start;
      requestAnimationFrame(count);
    }
  }
  count();
}

// Placeholder: Update all metrics (to be filled with Supabase data)
function updateDashboardMetrics(metrics) {
  animateMetric('todaysSales', metrics.todaysSales || 0);
  animateMetric('pendingRequisitions', metrics.pendingRequisitions || 0);
  animateMetric('activeStaff', metrics.activeStaff || 0);
  animateMetric('daysActive', metrics.daysActive || 0);
  document.getElementById('quickReportDailySales').textContent = `$${metrics.todaysSales || 0}`;
  document.getElementById('quickReportWeeklySales').textContent = `$${metrics.weeklySales || 0}`;
  document.getElementById('quickReportMonthlySales').textContent = `$${metrics.monthlySales || 0}`;
}

// Helper to show '2 hours ago', etc.
function formatLocalTime(date) {
  const d = new Date(date);
  return d.toLocaleString();
}

function toUTCPlus2(date) {
  // date: string or Date
  const d = new Date(date);
  d.setHours(d.getHours() + 2);
  return d;
}

function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`;
  return `${Math.floor(diff/86400)} days ago`;
}

function formatLocalTimeUTC2(date) {
  const d = toUTCPlus2(date);
  return d.toLocaleString();
}
async function updateActiveStaffMetric() {
  const branchId = window.currentUserProfile?.branchId;
  if (!branchId) {
    const staffEl = document.getElementById('activeStaff');
    if (staffEl) staffEl.textContent = '0';
    return;
  }
  
  try {
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Staff metric timeout')), 5000)
    );
    
    const staffPromise = supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('status', 'active');
    
    const { count, error } = await Promise.race([staffPromise, timeoutPromise]);
    
    const activeCount = count || 0;
    const staffEl = document.getElementById('activeStaff');
    if (staffEl) {
      staffEl.textContent = activeCount;
    }
  } catch (error) {
    console.warn('Error updating staff metric:', error);
    const staffEl = document.getElementById('activeStaff');
    if (staffEl) staffEl.textContent = '0';
  }
}
async function loadRecentActivities() {
  const branchId = window.currentUserProfile?.branchId;
  const branchName = window.currentUserProfile?.branchName || 'Branch';
  const container = document.getElementById('recent-activity');
  
  if (!container) {
    console.warn('Recent activity container not found');
    return;
  }
  
  if (!branchId) {
    container.innerHTML = '<div class="activity-item" style="text-align: center; color: #6b7280;">No branch data available</div>';
    return;
  }

  try {
    // Add timeout protection for alerts generation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Activities load timeout')), 10000)
    );
    
    const alertsPromise = generateBranchAlerts(branchId, branchName);
    const alerts = await Promise.race([alertsPromise, timeoutPromise]);
    
    container.innerHTML = '';
    
    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<div class="activity-item" style="text-align: center; color: #6b7280;">All systems running smoothly</div>';
      return;
    }

    alerts.forEach((alert, index) => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      if (index < alerts.length - 1) {
        div.classList.add('activity-divider');
      }

      // Style the alert based on type
      let alertClass = 'activity-status-info';
      let alertColor = '#dbeafe';
      
      switch (alert.type) {
        case 'warning':
          alertClass = 'activity-status-pending';
          alertColor = '#fef3c7';
          break;
        case 'success':
          alertClass = 'activity-status-completed';
          alertColor = '#dcfce7';
          break;
        case 'critical':
          alertClass = 'activity-status-cancelled';
          alertColor = '#fee2e2';
          break;
        default:
          alertClass = 'activity-status-approved';
          alertColor = '#dbeafe';
      }

      div.innerHTML = `
        <div class="activity-content">
          <div class="activity-main">
            <div class="activity-title">${alert.message}</div>
            <div class="activity-time">${alert.timeAgo}</div>
          </div>
          <div class="activity-status ${alertClass}" style="background: ${alertColor};">${alert.type}</div>
        </div>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error loading recent activities:', error);
    container.innerHTML = '<div class="activity-item" style="text-align: center; color: #6b7280;">Unable to load activities</div>';
  }
}

async function generateBranchAlerts(branchId, branchName) {
  const alerts = [];
  const now = new Date();
  
  try {
    // 1. Sales Performance Alerts
    const salesAlerts = await generateSalesAlerts(branchId, branchName);
    alerts.push(...salesAlerts);
    
    // 2. Staff Management Alerts
    const staffAlerts = await generateStaffAlerts(branchId, branchName);
    alerts.push(...staffAlerts);
    
    // 3. Inventory & Stock Alerts
    const stockAlerts = await generateStockAlerts(branchId, branchName);
    alerts.push(...stockAlerts);
    
    // 4. EOD Report Alerts
    const eodAlerts = await generateEODAlerts(branchId, branchName);
    alerts.push(...eodAlerts);
    
    // 5. System/General Alerts
    const systemAlerts = generateSystemAlerts(branchName);
    alerts.push(...systemAlerts);
    
    // Sort by priority and time, limit to 5 most recent
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
      .slice(0, 5);
      
  } catch (error) {
    console.error('Error generating alerts:', error);
    return [];
  }
}

async function generateSalesAlerts(branchId, branchName) {
  const alerts = [];
  const now = new Date();
  
  try {
    // Get today's and yesterday's sales
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: todayData } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', today);
    
    const { data: yesterdayData } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', yesterday);
    
    const todayTotal = todayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
    const yesterdayTotal = yesterdayData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
    
    // Sales performance alerts
    if (yesterdayTotal > 0) {
      const changePercent = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
      
      if (changePercent >= 15) {
        alerts.push({
          message: `${branchName} exceeded daily target by ${Math.round(changePercent)}%`,
          type: 'success',
          timeAgo: '2 hours ago',
          timestamp: now.getTime() - 2 * 60 * 60 * 1000
        });
      } else if (changePercent <= -20) {
        alerts.push({
          message: `${branchName} revenue down ${Math.abs(Math.round(changePercent))}% today`,
          type: 'warning',
          timeAgo: '1 hour ago',
          timestamp: now.getTime() - 1 * 60 * 60 * 1000
        });
      }
    }
    
    // Monthly performance check
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: monthData } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .gte('date', monthStart)
      .lte('date', today);
    
    const monthTotal = monthData?.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0) || 0;
    
    // Simulate monthly target achievement
    const daysInMonth = now.getDate();
    const avgDaily = monthTotal / daysInMonth;
    const projectedMonthly = avgDaily * 30;
    const targetMonthly = 50000; // Example target
    
    if (projectedMonthly > targetMonthly * 1.1) {
      alerts.push({
        message: `${branchName} exceeded monthly target by ${Math.round(((projectedMonthly - targetMonthly) / targetMonthly) * 100)}%`,
        type: 'success',
        timeAgo: '1 day ago',
        timestamp: now.getTime() - 24 * 60 * 60 * 1000
      });
    }
    
  } catch (error) {
    console.error('Error generating sales alerts:', error);
  }
  
  return alerts;
}

async function generateStaffAlerts(branchId, branchName) {
  const alerts = [];
  const now = new Date();
  
  try {
    // Check staff count
    const { count: activeStaffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('status', 'active');
    
    // Staff-related alerts
    if (activeStaffCount < 5) {
      alerts.push({
        message: `Low staffing: Only ${activeStaffCount} active staff members`,
        type: 'warning',
        timeAgo: '3 hours ago',
        timestamp: now.getTime() - 3 * 60 * 60 * 1000
      });
    }
    
    // Simulate new staff addition
    if (Math.random() > 0.7) {
      alerts.push({
        message: `New staff member added to ${branchName}`,
        type: 'info',
        timeAgo: '5 hours ago',
        timestamp: now.getTime() - 5 * 60 * 60 * 1000
      });
    }
    
  } catch (error) {
    console.error('Error generating staff alerts:', error);
  }
  
  return alerts;
}

async function generateStockAlerts(branchId, branchName) {
  const alerts = [];
  const now = new Date();
  
  try {
    // Check pending stock requisitions
    const { count: pendingCount } = await supabase
      .from('stock_requisitions')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('status', 'pending');
    
    // Stock-related alerts
    if (pendingCount > 0) {
      alerts.push({
        message: `${pendingCount} stock requisitions pending approval`,
        type: 'info',
        timeAgo: '4 hours ago',
        timestamp: now.getTime() - 4 * 60 * 60 * 1000
      });
    }
    
    // Simulate inventory alerts
    const inventoryItems = Math.floor(Math.random() * 30) + 10;
    if (inventoryItems > 20) {
      alerts.push({
        message: `${inventoryItems} items are running low in inventory`,
        type: 'warning',
        timeAgo: '1 day ago',
        timestamp: now.getTime() - 24 * 60 * 60 * 1000
      });
    }
    
    // Simulate supplier delivery
    if (Math.random() > 0.6) {
      alerts.push({
        message: `New supplier delivery received at ${branchName}`,
        type: 'info',
        timeAgo: '6 hours ago',
        timestamp: now.getTime() - 6 * 60 * 60 * 1000
      });
    }
    
  } catch (error) {
    console.error('Error generating stock alerts:', error);
  }
  
  return alerts;
}

async function generateEODAlerts(branchId, branchName) {
  const alerts = [];
  const now = new Date();
  
  try {
    // Check if today's EOD report is submitted
    const today = now.toISOString().split('T')[0];
    const { data: todayEOD } = await supabase
      .from('eod_reports')
      .select('id')
      .eq('branch_id', branchId)
      .eq('date', today);
    
    const currentHour = now.getHours();
    
    // EOD report alerts
    if (!todayEOD || todayEOD.length === 0) {
      if (currentHour >= 18) { // After 6 PM
        alerts.push({
          message: `EOD report for ${branchName} is overdue`,
          type: 'critical',
          timeAgo: '30 minutes ago',
          timestamp: now.getTime() - 30 * 60 * 1000
        });
      }
    } else {
      alerts.push({
        message: `EOD report submitted successfully for ${branchName}`,
        type: 'success',
        timeAgo: '2 hours ago',
        timestamp: now.getTime() - 2 * 60 * 60 * 1000
      });
    }
    
  } catch (error) {
    console.error('Error generating EOD alerts:', error);
  }
  
  return alerts;
}

function generateSystemAlerts(branchName) {
  const alerts = [];
  const now = new Date();
  
  // System/general alerts (simulated)
  const systemAlerts = [
    {
      message: `System maintenance scheduled for this weekend`,
      type: 'info',
      timeAgo: '2 days ago',
      timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000
    },
    {
      message: `New inventory management features available`,
      type: 'info',
      timeAgo: '3 days ago',
      timestamp: now.getTime() - 3 * 24 * 60 * 60 * 1000
    },
    {
      message: `Monthly performance review scheduled`,
      type: 'info',
      timeAgo: '1 week ago',
      timestamp: now.getTime() - 7 * 24 * 60 * 60 * 1000
    }
  ];
  
  // Randomly include some system alerts
  return systemAlerts.filter(() => Math.random() > 0.7);
}

// Dashboard tab switching for Quick Reports
function setQuickReportTab(tab) {
  // Remove active class from all tab contents
  document.getElementById('quick-report-daily').classList.remove('active');
  document.getElementById('quick-report-weekly').classList.remove('active');
  document.getElementById('quick-report-monthly').classList.remove('active');
  
  // Remove active class from all tab buttons
  document.getElementById('tab-daily').classList.remove('active');
  document.getElementById('tab-weekly').classList.remove('active');
  document.getElementById('tab-monthly').classList.remove('active');
  
  // Add active class to selected tab content and button
  if (tab === 'daily') {
    document.getElementById('quick-report-daily').classList.add('active');
    document.getElementById('tab-daily').classList.add('active');
  } else if (tab === 'weekly') {
    document.getElementById('quick-report-weekly').classList.add('active');
    document.getElementById('tab-weekly').classList.add('active');
  } else if (tab === 'monthly') {
    document.getElementById('quick-report-monthly').classList.add('active');
    document.getElementById('tab-monthly').classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, starting initialization');
  
  // Test if elements exist
  console.log('Testing element existence:');
  console.log('quickReportDailySales:', document.getElementById('quickReportDailySales'));
  console.log('quickReportDailyChange:', document.getElementById('quickReportDailyChange'));
  console.log('tab-daily:', document.getElementById('tab-daily'));
  console.log('quick-report-daily:', document.getElementById('quick-report-daily'));
  
  // Wire up logout button
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
          e.preventDefault();
          logout();
      });
  }

  // Add navigation for Manage Staff button
  var manageStaffBtn = document.getElementById('manage-staff-btn');
  if (manageStaffBtn) {
      manageStaffBtn.addEventListener('click', function() {
          window.location.href = 'staffmanagement.html';
      });
  }
  
  // EOD Modal logic
  var eodBtn = document.getElementById('eod-btn');
  var eodModal = document.getElementById('eod-modal');
  var closeEodModal = document.getElementById('close-eod-modal');
  var eodDepartmentFields = document.getElementById('eod-department-fields');
  var eodBranchDate = document.getElementById('eod-branch-date');
  var eodForm = document.getElementById('eod-form');
  var eodTotalSales = document.getElementById('eod-total-sales');
  var eodProfitLoss = document.getElementById('eod-profit-loss');

  if (eodBtn && eodModal && closeEodModal) {
      eodBtn.addEventListener('click', async function() {
          // Show modal
          eodModal.classList.remove('hidden');
          // Set branch and date info
          const branchName = window.currentUserProfile?.branchName || document.getElementById('branch-name').textContent || 'Branch';
          const today = new Date();
          eodBranchDate.textContent = `${branchName} • ${today.toLocaleDateString()}`;
          // Fetch departments for this branch from branch_departments
          const branchId = window.currentUserProfile?.branchId;
          if (branchId) {
              const { data: branchDepts, error } = await supabase
                  .from('branch_departments')
                  .select('department_id, departments(name)')
                  .eq('branch_id', branchId);
              eodDepartmentFields.innerHTML = '';
              if (branchDepts && branchDepts.length > 0) {
                  branchDepts.forEach(bd => {
                      const field = document.createElement('div');
                      field.innerHTML = `
                          <div>
                              <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 4px;">${bd.departments.name} Sales ($)</label>
                              <input type="number" step="0.01" min="0" class="eod-dept-sales" data-dept-id="${bd.department_id}" placeholder="e.g. 1000.00" style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px;" />
                          </div>
                      `;
                      eodDepartmentFields.appendChild(field);
                  });
              } else {
                  eodDepartmentFields.innerHTML = '<div class="text-gray-400">No departments found for this branch. Please contact admin.</div>';
              }
              // Reset totals
              eodTotalSales.textContent = '$0.00';
              eodProfitLoss.textContent = '$0.00';

              // Add live calculation listeners
              setTimeout(() => {
                document.querySelectorAll('.eod-dept-sales').forEach(input => {
                  input.addEventListener('input', updateEODTotals);
                });
                document.getElementById('eod-expenses').addEventListener('input', updateEODTotals);
                document.getElementById('eod-cash').addEventListener('input', updateEODTotals);
                document.getElementById('eod-discrepancies').addEventListener('input', updateEODTotals);
              }, 100);
          }
      });
      closeEodModal.addEventListener('click', function() {
          eodModal.classList.add('hidden');
      });
      // Optional: close modal on outside click
      eodModal.addEventListener('click', function(e) {
          if (e.target === eodModal) eodModal.classList.add('hidden');
      });

      // Live calculation for totals and profit/loss
      function updateEODTotals() {
        let totalSales = 0;
        document.querySelectorAll('.eod-dept-sales').forEach(input => {
          totalSales += parseFloat(input.value) || 0;
        });
        eodTotalSales.textContent = `$${totalSales.toFixed(2)}`;
        // Profit/Loss = Total Sales - Expenses - Discrepancies
        const expenses = parseFloat(document.getElementById('eod-expenses').value) || 0;
        const discrepancies = parseFloat(document.getElementById('eod-discrepancies').value) || 0;
        const profitLoss = totalSales - expenses - discrepancies;
        eodProfitLoss.textContent = `$${profitLoss.toFixed(2)}`;
      }

      // Handle EOD form submission
      if (eodForm) {
        eodForm.onsubmit = async function(e) {
          e.preventDefault();
          // Gather data
          const branchId = window.currentUserProfile?.branchId || null;
          const userId = window.currentUserProfile?.userId || null;
          const today = new Date();
          const dateStr = today.toISOString().split('T')[0];
          let totalSales = 0;
          document.querySelectorAll('.eod-dept-sales').forEach(input => {
            const value = parseFloat(input.value) || 0;
            totalSales += value;
          });
          const expenses = parseFloat(document.getElementById('eod-expenses').value) || 0;
          const cash = parseFloat(document.getElementById('eod-cash').value) || 0;
          const discrepancies = parseFloat(document.getElementById('eod-discrepancies').value) || 0;
          const notes = document.getElementById('eod-notes').value || '';
          const profitLoss = totalSales - expenses - discrepancies;

          // Save to Supabase
          // Insert summary to eod_reports (always create new row)
          const { error: eodError } = await supabase.from('eod_reports').insert({
            branch_id: branchId,
            date: dateStr,
            total_sales: totalSales,
            total_profit: profitLoss,
            notes: notes,
            submitted_by: userId,
            total_expenses: expenses,
            cash_on_hand: cash,
            discrepancies: discrepancies,
            submitted_at: new Date().toISOString()
          });
          if (eodError) {
            console.log('EOD insert error:', eodError);
            alert('Supabase error: ' + (eodError.message || JSON.stringify(eodError)));
            return;
          }
          // Log activity
          await supabase.from('activities').insert({
            branch_id: branchId,
            user_id: userId,
            type: 'eod_report',
            message: 'EOD Report submitted',
            status: 'completed',
            timestamp: new Date().toISOString()
          });
          alert('EOD Report submitted successfully!');
          eodModal.classList.add('hidden');
          // Clear Financial Summary and department sales fields
          document.getElementById('eod-expenses').value = '';
          document.getElementById('eod-cash').value = '';
          document.getElementById('eod-discrepancies').value = '';
          document.getElementById('eod-notes').value = '';
          document.querySelectorAll('.eod-dept-sales').forEach(input => { input.value = ''; });
          eodTotalSales.textContent = '$0.00';
          eodProfitLoss.textContent = '$0.00';
          // Reload recent activities and update sales metrics
          loadRecentActivities();
          updateTodaysSalesMetric();
          updateYesterdaysSalesMetric();
          updateQuickReportDailySales(); // Update Quick Reports too
        };
      }
  }
  
  // Initialize dashboard with better error handling
  console.log('Starting dashboard initialization...');
  
  // Show loading initially
  showLoading(true);
  
  // Use async function to handle await properly
  (async () => {
    try {
      // Check if we're already authenticated
      if (isAuthenticated && window.currentUserProfile) {
        console.log('Already authenticated, skipping auth check');
      } else {
        console.log('Starting authentication check...');
        await fetchUserProfileAndBranch();
      }
      
      // Always initialize dashboard
      console.log('Initializing dashboard...');
      initializeDashboard();
      
      // Initialize with default values
      updateDashboardMetrics({
        todaysSales: 0,
        pendingRequisitions: 0,
        activeStaff: 0,
        daysActive: 0,
        weeklySales: 0,
        monthlySales: 0
      });
      
      // Load activities in background
      loadRecentActivities().catch(error => {
        console.warn('Recent activities failed to load:', error);
      });
      
    } catch (error) {
      console.error('Error during dashboard initialization:', error);
      // Still initialize dashboard with fallback content
      console.log('Initializing dashboard with fallback content...');
      initializeDashboard();
    } finally {
      // Hide loading after 2 seconds max
      setTimeout(() => {
        showLoading(false);
      }, 2000);
    }
  })(); // 1 second delay to allow session to initialize
});

// Function to initialize dashboard after authentication
function initializeDashboard() {
  console.log('Initializing dashboard...');
  
  // Load all data in background with error handling - don't block UI
  loadRecentActivities().catch(error => {
    console.warn('Recent activities failed to load:', error);
  });
  
  updateTodaysSalesMetric().catch(error => {
    console.warn('Today\'s sales metric failed to load:', error);
  });
  
  updateYesterdaysSalesMetric().catch(error => {
    console.warn('Yesterday\'s sales metric failed to load:', error);
  });
  
  updateActiveStaffMetric().catch(error => {
    console.warn('Active staff metric failed to load:', error);
  });
  
  updatePendingRequisitionsMetric().catch(error => {
    console.warn('Pending requisitions metric failed to load:', error);
  });

  // --- Add tab click handlers for Quick Reports ---
  var tabDaily = document.getElementById('tab-daily');
  var tabWeekly = document.getElementById('tab-weekly');
  var tabMonthly = document.getElementById('tab-monthly');
  if (tabDaily) tabDaily.onclick = function() { 
    console.log('Daily tab clicked');
    setQuickReportTab('daily'); 
    updateQuickReportDailySales().catch(error => {
      console.warn('Daily sales update failed:', error);
    });
  };
  if (tabWeekly) tabWeekly.onclick = function() { 
    console.log('Weekly tab clicked');
    setQuickReportTab('weekly'); 
    updateQuickReportWeeklySales().catch(error => {
      console.warn('Weekly sales update failed:', error);
    });
  };
  if (tabMonthly) tabMonthly.onclick = function() { 
    console.log('Monthly tab clicked');
    setQuickReportTab('monthly'); 
    updateQuickReportMonthlySales().catch(error => {
      console.warn('Monthly sales update failed:', error);
    });
  };
  // Set default tab and load daily sales
  console.log('Setting default tab and loading daily sales');
  setQuickReportTab('daily');
  updateQuickReportDailySales().catch(error => {
    console.warn('Initial daily sales update failed:', error);
  });
}

// Placeholder for EOD Report button
function showEODReport() {
    alert('Show EOD Report form (to be implemented)');
}
// Placeholder for section switching
function showSection(sectionId) {
    alert('Show section: ' + sectionId + ' (to be implemented)');
}
// Placeholder for logout
async function logout() {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        // Optionally show an error message
        alert('Logout failed. Please try again.');
        return;
    }
    // Redirect to login page
    window.location.href = 'index.html';
}

// Remove duplicate DOMContentLoaded handler - this is handled by the main one above

async function fetchUserProfileAndBranch() {
  console.log('fetchUserProfileAndBranch called');
  
  if (authCheckInProgress) {
    console.log('Auth check already in progress, skipping...');
    return true;
  }
  
  authCheckInProgress = true;
  
  try {
    // 1. Get current user with timeout protection
    console.log('Checking authentication status...');
    
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 8000)
    );
    
    const { data: { user }, error: authError } = await Promise.race([userPromise, timeoutPromise]);
    
    console.log('Auth result:', { user: user?.email, error: authError });
    
    if (authError) {
      console.error('Authentication error:', authError);
      if (authError.message.includes('timeout')) {
        console.log('Auth timeout, using fallback');
        throw new Error('Authentication timeout');
      }
      if (authError.message.includes('Invalid JWT') || authError.message.includes('expired')) {
        console.log('Session expired, redirecting to login');
        window.location.href = 'index.html';
        return false;
      }
      throw authError;
    }
    
    if (!user) {
      console.log('No user found, redirecting to login');
      window.location.href = 'index.html';
      return false;
    }

    console.log('User authenticated:', user.email);
    isAuthenticated = true;

    // 2. Get profile with timeout protection
    console.log('Fetching user profile...');
    let profile = null;
    
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('role, branch_id')
        .eq('id', user.id)
        .single();
        
      const profileTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile timeout')), 5000)
      );
      
      const { data: profileData, error: profileError } = await Promise.race([profilePromise, profileTimeoutPromise]);
      
      if (profileError) {
        console.warn('Profile error:', profileError);
        throw profileError;
      }
      
      profile = profileData;
    } catch (error) {
      console.warn('Profile fetch failed, using fallback:', error);
      profile = {
        role: 'branch-manager',
        branch_id: 1
      };
    }

    console.log('Profile loaded:', profile);

    // 3. Fetch branch name with timeout protection
    let branchName = 'Unknown Branch';
    if (profile.branch_id) {
      try {
        const branchPromise = supabase
          .from('branches')
          .select('name')
          .eq('id', profile.branch_id)
          .single();
          
        const branchTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Branch timeout')), 5000)
        );
        
        const { data: branch, error: branchError } = await Promise.race([branchPromise, branchTimeoutPromise]);
        
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

    // 4. Store profile information
    window.currentUserProfile = {
      userId: user.id,
      role: profile.role,
      branchId: profile.branch_id,
      branchName: branchName
    };
    
    console.log('User profile stored:', window.currentUserProfile);
    
    // 5. Update UI with profile information
    updateUIWithProfileInfo(branchName);
    
    return true;
    
  } catch (error) {
    console.error('Error in fetchUserProfileAndBranch:', error);
    
    // Create fallback profile
    window.currentUserProfile = {
      userId: 'fallback-user',
      role: 'branch-manager',
      branchId: 1,
      branchName: 'Default Branch'
    };
    
    updateUIWithBasicInfo();
    console.log('Using fallback profile due to error');
    return true; // Continue with fallback
    
  } finally {
    authCheckInProgress = false;
  }
}

// Function to update UI with profile information
function updateUIWithProfileInfo(branchName) {
  const branchNameEl = document.getElementById('branch-name');
  const welcomeMessageEl = document.getElementById('welcome-message');
  const userNameEl = document.getElementById('user-name');
  
  if (branchNameEl) {
    branchNameEl.textContent = branchName;
  }
  if (welcomeMessageEl) {
    welcomeMessageEl.textContent = `Welcome, ${branchName} Branch Manager!`;
  }
  if (userNameEl) {
    userNameEl.textContent = 'Manager';
  }
  
  // Initialize Quick Reports now that profile is loaded
  console.log('Profile loaded, initializing Quick Reports...');
  setTimeout(() => {
    updateQuickReportDailySales();
  }, 100);
}

// Function to update UI with basic information when profile fails
function updateUIWithBasicInfo() {
  const branchNameEl = document.getElementById('branch-name');
  const welcomeMessageEl = document.getElementById('welcome-message');
  const userNameEl = document.getElementById('user-name');
  
  if (branchNameEl) {
    branchNameEl.textContent = 'Unknown Branch';
  }
  if (welcomeMessageEl) {
    welcomeMessageEl.textContent = 'Welcome, Branch Manager!';
  }
  if (userNameEl) {
    userNameEl.textContent = 'Manager';
  }
  
  // Initialize Quick Reports with fallback content
  console.log('Basic info loaded, initializing Quick Reports with fallback...');
  setTimeout(() => {
    updateQuickReportDailySales();
  }, 100);
}

async function updateTodaysSalesMetric() {
  const branchId = window.currentUserProfile?.branchId;
  if (!branchId) {
    // Set fallback values when no branch ID
    const salesEl = document.getElementById('todaysSales');
    const changeEl = document.getElementById('todaysSalesChange');
    if (salesEl) salesEl.textContent = formatCurrency(0);
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) changeTextEl.textContent = '—';
    }
    return;
  }
  
  try {
    // Get today's and yesterday's dates
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Add timeout protection for database queries
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sales metric timeout')), 5000)
    );
    
    // Get today's sales with timeout
    const todayPromise = supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', todayStr);
    
    // Get yesterday's sales with timeout
    const yesterdayPromise = supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', yesterdayStr);
    
    const [todayResult, yesterdayResult] = await Promise.race([
      Promise.all([todayPromise, yesterdayPromise]),
      timeoutPromise
    ]);
    
    const { data: todayData, error: todayError } = todayResult;
    const { data: yesterdayData, error: yesterdayError } = yesterdayResult;
    
    let todayTotal = 0;
    let yesterdayTotal = 0;
    
    if (todayData && todayData.length > 0) {
      todayTotal = todayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    if (yesterdayData && yesterdayData.length > 0) {
      yesterdayTotal = yesterdayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    // Update the sales amount
    const salesEl = document.getElementById('todaysSales');
    if (salesEl) {
      salesEl.textContent = formatCurrency(todayTotal);
    }
    
    // Calculate and update percentage change
    const changeEl = document.getElementById('todaysSalesChange');
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) {
        let changeText = '—';
        let isPositive = true;
        
        if (yesterdayTotal > 0) {
          const percentChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
          const sign = percentChange >= 0 ? '+' : '';
          changeText = `${sign}${percentChange.toFixed(0)}%`;
          isPositive = percentChange >= 0;
          console.log(`Today's sales change: ${changeText} (Today: ${formatCurrency(todayTotal)}, Yesterday: ${formatCurrency(yesterdayTotal)})`);
        } else if (todayTotal > 0) {
          changeText = '+100%';
          isPositive = true;
          console.log(`Today's sales change: ${changeText} (Today: ${formatCurrency(todayTotal)}, No yesterday data)`);
        }
        
        changeTextEl.textContent = changeText;
        
        // Update the styling based on positive/negative change
        const parentEl = changeTextEl.closest('.stat-change');
        if (parentEl) {
          parentEl.classList.remove('positive', 'negative');
          parentEl.classList.add(isPositive ? 'positive' : 'negative');
        }
      }
    }
    
  } catch (error) {
    console.error('Error in updateTodaysSalesMetric:', error);
    // Set fallback values on error
    const salesEl = document.getElementById('todaysSales');
    const changeEl = document.getElementById('todaysSalesChange');
    if (salesEl) salesEl.textContent = formatCurrency(0);
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) changeTextEl.textContent = '—';
    }
  }
}

// Helper: Format as currency
function formatCurrency(amount) {
  return `$${(amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Fetch and display daily sales
async function updateQuickReportDailySales() {
  console.log('updateQuickReportDailySales called');
  console.log('Current user profile:', window.currentUserProfile);
  
  const branchId = window.currentUserProfile?.branchId;
  console.log('Branch ID:', branchId);
  
  const salesElement = document.getElementById('quickReportDailySales');
  const changeElement = document.getElementById('quickReportDailyChange');
  
  console.log('Elements found:', { salesElement, changeElement });
  
  // Check if elements exist
  if (!salesElement || !changeElement) {
    console.error('Quick Reports elements not found in DOM');
    return;
  }
  
  if (!branchId) {
    console.log('No branch ID found, showing fallback content');
    // Show fallback content
    salesElement.textContent = formatCurrency(0);
    changeElement.textContent = 'No branch data available';
    return;
  }
  
  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log('Querying for dates:', { today: todayStr, yesterday: yesterdayStr });
    
    // Add timeout protection for database queries
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quick report timeout')), 5000)
    );
    
    // Get today's sales with timeout
    const todayPromise = supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', todayStr);
    
    // Get yesterday's sales with timeout
    const yesterdayPromise = supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', yesterdayStr);
    
    const [todayResult, yesterdayResult] = await Promise.race([
      Promise.all([todayPromise, yesterdayPromise]),
      timeoutPromise
    ]);
    
    const { data: todayData, error: todayError } = todayResult;
    const { data: yesterdayData, error: yesterdayError } = yesterdayResult;
    
    console.log('Today data:', todayData, 'Error:', todayError);
    console.log('Yesterday data:', yesterdayData, 'Error:', yesterdayError);
    
    let todayTotal = 0;
    let yesterdayTotal = 0;
    
    if (todayData && todayData.length > 0) {
      todayTotal = todayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    if (yesterdayData && yesterdayData.length > 0) {
      yesterdayTotal = yesterdayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    console.log('Calculated totals:', { todayTotal, yesterdayTotal });
    
    // Calculate percentage change
    let changeText = "No previous data";
    if (yesterdayTotal > 0) {
      const percentChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
      const sign = percentChange >= 0 ? "+" : "";
      changeText = `${sign}${percentChange.toFixed(0)}% from yesterday`;
    } else if (todayTotal > 0) {
      changeText = "New sales today";
    } else {
      changeText = "No sales data";
    }
    
    console.log('Updating elements with:', { sales: formatCurrency(todayTotal), change: changeText });
    
    if (salesElement) {
      salesElement.textContent = formatCurrency(todayTotal);
    }
    if (changeElement) {
      changeElement.textContent = changeText;
    }
  } catch (error) {
    console.error('Error in updateQuickReportDailySales:', error);
    // Show error fallback
    if (salesElement) salesElement.textContent = formatCurrency(0);
    if (changeElement) changeElement.textContent = 'Error loading data';
  }
}

// Fetch and display weekly sales (last 7 days)
async function updateQuickReportWeeklySales() {
  console.log('updateQuickReportWeeklySales called');
  const branchId = window.currentUserProfile?.branchId;
  console.log('Branch ID:', branchId);
  
  const salesElement = document.getElementById('quickReportWeeklySales');
  const changeElement = document.getElementById('quickReportWeeklyChange');
  
  if (!branchId) {
    console.log('No branch ID found, showing fallback content');
    if (salesElement) salesElement.textContent = formatCurrency(0);
    if (changeElement) changeElement.textContent = 'No branch data available';
    return;
  }
  
  try {
    const today = new Date();
    
    // This week (last 7 days including today)
    const thisWeekStart = new Date();
    thisWeekStart.setDate(today.getDate() - 6);
    
    // Previous week (7 days before this week)
    const lastWeekStart = new Date();
    lastWeekStart.setDate(today.getDate() - 13);
    const lastWeekEnd = new Date();
    lastWeekEnd.setDate(today.getDate() - 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];
    
    console.log('Weekly date ranges:', { thisWeek: `${thisWeekStartStr} to ${todayStr}`, lastWeek: `${lastWeekStartStr} to ${lastWeekEndStr}` });
    
    // Get this week's sales
    const { data: thisWeekData, error: thisWeekError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .gte('date', thisWeekStartStr)
      .lte('date', todayStr);
    
    // Get last week's sales
    const { data: lastWeekData, error: lastWeekError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .gte('date', lastWeekStartStr)
      .lte('date', lastWeekEndStr);
    
    console.log('Weekly data:', { thisWeek: thisWeekData, lastWeek: lastWeekData });
    
    let thisWeekTotal = 0;
    let lastWeekTotal = 0;
    
    if (thisWeekData && thisWeekData.length > 0) {
      thisWeekTotal = thisWeekData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    if (lastWeekData && lastWeekData.length > 0) {
      lastWeekTotal = lastWeekData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    console.log('Weekly totals:', { thisWeek: thisWeekTotal, lastWeek: lastWeekTotal });
    
    // Calculate percentage change
    let changeText = "No previous data";
    if (lastWeekTotal > 0) {
      const percentChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
      const sign = percentChange >= 0 ? "+" : "";
      changeText = `${sign}${percentChange.toFixed(0)}% from last week`;
    } else if (thisWeekTotal > 0) {
      changeText = "New sales this week";
    } else {
      changeText = "No sales data";
    }
    
    if (salesElement) {
      salesElement.textContent = formatCurrency(thisWeekTotal);
    }
    if (changeElement) {
      changeElement.textContent = changeText;
    }
  } catch (error) {
    console.error('Error in updateQuickReportWeeklySales:', error);
    if (salesElement) salesElement.textContent = formatCurrency(0);
    if (changeElement) changeElement.textContent = 'Error loading data';
  }
}

// Fetch and display monthly sales (current month)
async function updateQuickReportMonthlySales() {
  console.log('updateQuickReportMonthlySales called');
  const branchId = window.currentUserProfile?.branchId;
  console.log('Branch ID:', branchId);
  
  const salesElement = document.getElementById('quickReportMonthlySales');
  const changeElement = document.getElementById('quickReportMonthlyChange');
  
  if (!branchId) {
    console.log('No branch ID found, showing fallback content');
    if (salesElement) salesElement.textContent = formatCurrency(0);
    if (changeElement) changeElement.textContent = 'No branch data available';
    return;
  }
  
  try {
    const today = new Date();
    
    // This month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
    
    const todayStr = today.toISOString().split('T')[0];
    const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];
    const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];
    
    console.log('Monthly date ranges:', { thisMonth: `${thisMonthStartStr} to ${todayStr}`, lastMonth: `${lastMonthStartStr} to ${lastMonthEndStr}` });
    
    // Get this month's sales
    const { data: thisMonthData, error: thisMonthError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .gte('date', thisMonthStartStr)
      .lte('date', todayStr);
    
    // Get last month's sales
    const { data: lastMonthData, error: lastMonthError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .gte('date', lastMonthStartStr)
      .lte('date', lastMonthEndStr);
    
    console.log('Monthly data:', { thisMonth: thisMonthData, lastMonth: lastMonthData });
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    
    if (thisMonthData && thisMonthData.length > 0) {
      thisMonthTotal = thisMonthData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    if (lastMonthData && lastMonthData.length > 0) {
      lastMonthTotal = lastMonthData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    console.log('Monthly totals:', { thisMonth: thisMonthTotal, lastMonth: lastMonthTotal });
    
    // Calculate percentage change
    let changeText = "No previous data";
    if (lastMonthTotal > 0) {
      const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      const sign = percentChange >= 0 ? "+" : "";
      changeText = `${sign}${percentChange.toFixed(0)}% from last month`;
    } else if (thisMonthTotal > 0) {
      changeText = "New sales this month";
    } else {
      changeText = "No sales data";
    }
    
    if (salesElement) {
      salesElement.textContent = formatCurrency(thisMonthTotal);
    }
    if (changeElement) {
      changeElement.textContent = changeText;
    }
  } catch (error) {
    console.error('Error in updateQuickReportMonthlySales:', error);
    if (salesElement) salesElement.textContent = formatCurrency(0);
    if (changeElement) changeElement.textContent = 'Error loading data';
  }
}
async function updateYesterdaysSalesMetric() {
  const branchId = window.currentUserProfile?.branchId;
  if (!branchId) {
    // Set fallback values when no branch ID
    const salesEl = document.getElementById('yesterdaysSales');
    const changeEl = document.getElementById('yesterdaysSalesChange');
    if (salesEl) salesEl.textContent = formatCurrency(0);
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) changeTextEl.textContent = '—';
    }
    return;
  }
  
  try {
    // Get yesterday's and day before yesterday's dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];
    
    // Get yesterday's sales
    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', yesterdayStr);
    
    // Get day before yesterday's sales
    const { data: dayBeforeData, error: dayBeforeError } = await supabase
      .from('eod_reports')
      .select('total_sales')
      .eq('branch_id', branchId)
      .eq('date', dayBeforeYesterdayStr);
    
    let yesterdayTotal = 0;
    let dayBeforeTotal = 0;
    
    if (yesterdayData && yesterdayData.length > 0) {
      yesterdayTotal = yesterdayData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    if (dayBeforeData && dayBeforeData.length > 0) {
      dayBeforeTotal = dayBeforeData.reduce((sum, row) => sum + (parseFloat(row.total_sales) || 0), 0);
    }
    
    // Update the sales amount
    const salesEl = document.getElementById('yesterdaysSales');
    if (salesEl) {
      salesEl.textContent = formatCurrency(yesterdayTotal);
    }
    
    // Calculate and update percentage change
    const changeEl = document.getElementById('yesterdaysSalesChange');
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) {
        let changeText = '—';
        let isPositive = true;
        
        if (dayBeforeTotal > 0) {
          const percentChange = ((yesterdayTotal - dayBeforeTotal) / dayBeforeTotal) * 100;
          const sign = percentChange >= 0 ? '+' : '';
          changeText = `${sign}${percentChange.toFixed(0)}%`;
          isPositive = percentChange >= 0;
          console.log(`Yesterday's sales change: ${changeText} (Yesterday: ${formatCurrency(yesterdayTotal)}, Day before: ${formatCurrency(dayBeforeTotal)})`);
        } else if (yesterdayTotal > 0) {
          changeText = '+100%';
          isPositive = true;
          console.log(`Yesterday's sales change: ${changeText} (Yesterday: ${formatCurrency(yesterdayTotal)}, No day before data)`);
        }
        
        changeTextEl.textContent = changeText;
        
        // Update the styling based on positive/negative change
        const parentEl = changeTextEl.closest('.stat-change');
        if (parentEl) {
          parentEl.classList.remove('positive', 'negative');
          parentEl.classList.add(isPositive ? 'positive' : 'negative');
        }
      }
    }
    
  } catch (error) {
    console.error('Error in updateYesterdaysSalesMetric:', error);
    // Set fallback values on error
    const salesEl = document.getElementById('yesterdaysSales');
    const changeEl = document.getElementById('yesterdaysSalesChange');
    if (salesEl) salesEl.textContent = formatCurrency(0);
    if (changeEl) {
      const changeTextEl = changeEl.querySelector('.change-text');
      if (changeTextEl) changeTextEl.textContent = '—';
    }
  }
}

// Test function for debugging Quick Reports
window.testQuickReports = function() {
  console.log('=== Testing Quick Reports ===');
  console.log('Current user profile:', window.currentUserProfile);
  console.log('Branch ID:', window.currentUserProfile?.branchId);
  
  // Test element existence
  const dailySales = document.getElementById('quickReportDailySales');
  const dailyChange = document.getElementById('quickReportDailyChange');
  const weeklySales = document.getElementById('quickReportWeeklySales');
  const weeklyChange = document.getElementById('quickReportWeeklyChange');
  const monthlySales = document.getElementById('quickReportMonthlySales');
  const monthlyChange = document.getElementById('quickReportMonthlyChange');
  
  console.log('Elements found:', {
    dailySales, dailyChange,
    weeklySales, weeklyChange,
    monthlySales, monthlyChange
  });
  
  // Test tab visibility
  const dailyTab = document.getElementById('quick-report-daily');
  const weeklyTab = document.getElementById('quick-report-weekly');
  const monthlyTab = document.getElementById('quick-report-monthly');
  
  console.log('Tab visibility (active class):', {
    daily: dailyTab?.classList.contains('active'),
    weekly: weeklyTab?.classList.contains('active'),
    monthly: monthlyTab?.classList.contains('active')
  });
  
  // Test tab button active state
  const dailyBtn = document.getElementById('tab-daily');
  const weeklyBtn = document.getElementById('tab-weekly');
  const monthlyBtn = document.getElementById('tab-monthly');
  
  console.log('Tab button active state:', {
    daily: dailyBtn?.classList.contains('active'),
    weekly: weeklyBtn?.classList.contains('active'),
    monthly: monthlyBtn?.classList.contains('active')
  });
  
  // Test tab switching
  console.log('Testing tab switching...');
  console.log('Switching to weekly...');
  setQuickReportTab('weekly');
  setTimeout(() => {
    console.log('Weekly tab visibility:', weeklyTab?.classList.contains('active'));
    console.log('Switching back to daily...');
    setQuickReportTab('daily');
    setTimeout(() => {
      console.log('Daily tab visibility:', dailyTab?.classList.contains('active'));
    }, 100);
  }, 100);
  
  // Force update
  console.log('Forcing Quick Reports update...');
  updateQuickReportDailySales();
  
  return 'Test completed - check console for results';
};

async function updatePendingRequisitionsMetric() {
  const branchId = window.currentUserProfile?.branchId;
  if (!branchId) {
    const requisitionsEl = document.getElementById('pendingRequisitions');
    if (requisitionsEl) requisitionsEl.textContent = '0';
    return;
  }
  
  try {
    const { count: pendingCount } = await supabase
      .from('stock_requisitions')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('status', 'pending');
    
    const requisitionsEl = document.getElementById('pendingRequisitions');
    if (requisitionsEl) {
      requisitionsEl.textContent = pendingCount || 0;
    }
  } catch (error) {
    console.error('Error updating pending requisitions:', error);
  }
}
