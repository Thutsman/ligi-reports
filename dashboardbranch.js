// Check if dashboard is loading properly
console.log('Dashboard JavaScript loaded');

// Initialize Supabase client
const SUPABASE_URL = 'https://veohdpcvkzouuyjpwmis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hkcGN2a3pvdXV5anB3bWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjUwNTIsImV4cCI6MjA3NDEwMTA1Mn0.d2MyXV4nl7G3kRLGgekWUioFlXesHXgCn1ezbt812UA';

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

// Manual refresh function for testing (call from console)
window.refreshActivities = function() {
  console.log('🔄 Manual refresh triggered');
  loadRecentActivities();
};

// Function to format time in UTC+2 timezone for display
// Converts UTC timestamps from Supabase to UTC+2 local time
function formatTimeUTC2(date) {
  const utcDate = new Date(date);
  
  // Create a date object representing the time in UTC+2
  // We do this by creating a new date with the UTC time + 2 hours
  const utc2Timestamp = utcDate.getTime() + (2 * 60 * 60 * 1000);
  const utc2Date = new Date(utc2Timestamp);
  
  // Get the current time in UTC+2 for comparison
  const now = new Date();
  const nowUTC2Timestamp = now.getTime() + (2 * 60 * 60 * 1000);
  const nowUTC2 = new Date(nowUTC2Timestamp);
  
  // Check if the date is today (in UTC+2)
  const isToday = utc2Date.getUTCDate() === nowUTC2.getUTCDate() &&
                  utc2Date.getUTCMonth() === nowUTC2.getUTCMonth() &&
                  utc2Date.getUTCFullYear() === nowUTC2.getUTCFullYear();
  
  // Check if the date is yesterday (in UTC+2)
  const yesterdayUTC2 = new Date(nowUTC2Timestamp - 24 * 60 * 60 * 1000);
  const isYesterday = utc2Date.getUTCDate() === yesterdayUTC2.getUTCDate() &&
                      utc2Date.getUTCMonth() === yesterdayUTC2.getUTCMonth() &&
                      utc2Date.getUTCFullYear() === yesterdayUTC2.getUTCFullYear();
  
  // Extract the time components from the UTC+2 adjusted date
  // Since we added 2 hours to the timestamp, getUTCHours() will give us the correct UTC+2 hour
  const hours = utc2Date.getUTCHours().toString().padStart(2, '0');
  const minutes = utc2Date.getUTCMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  
  // Time conversion is working correctly - logs removed for performance
  
  if (isToday) {
    return timeString;
  } else if (isYesterday) {
    return `Yesterday ${timeString}`;
  } else {
    // For older dates, show the date
    const day = utc2Date.getUTCDate().toString().padStart(2, '0');
    const month = (utc2Date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month} ${timeString}`;
  }
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
    // Generate alerts without timeout for now to avoid issues
    const alerts = await generateBranchAlerts(branchId, branchName);
    
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
    
    // Show fallback activities with UTC+2 times
    const now = new Date();
    const fallbackActivities = [
      {
        message: 'Recent system activity',
        type: 'info',
        timeAgo: formatTimeUTC2(new Date(now.getTime() - 1 * 60 * 60 * 1000))
      },
      {
        message: 'Dashboard loaded successfully',
        type: 'success', 
        timeAgo: formatTimeUTC2(new Date(now.getTime() - 30 * 60 * 1000))
      }
    ];
    
    container.innerHTML = '';
    fallbackActivities.forEach((alert, index) => {
      const div = document.createElement('div');
      div.className = 'activity-item';
      if (index < fallbackActivities.length - 1) {
        div.classList.add('activity-divider');
      }

      const alertClass = alert.type === 'success' ? 'activity-status-completed' : 'activity-status-approved';
      const alertColor = alert.type === 'success' ? '#dcfce7' : '#dbeafe';

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
        const alertTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        alerts.push({
          message: `${branchName} exceeded daily target by ${Math.round(changePercent)}%`,
          type: 'success',
          timeAgo: formatTimeUTC2(alertTime),
          timestamp: alertTime.getTime()
        });
      } else if (changePercent <= -20) {
        const alertTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        alerts.push({
          message: `${branchName} revenue down ${Math.abs(Math.round(changePercent))}% today`,
          type: 'warning',
          timeAgo: formatTimeUTC2(alertTime),
          timestamp: alertTime.getTime()
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
      const alertTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      alerts.push({
        message: `${branchName} exceeded monthly target by ${Math.round(((projectedMonthly - targetMonthly) / targetMonthly) * 100)}%`,
        type: 'success',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
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
      const alertTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      alerts.push({
        message: `Low staffing: Only ${activeStaffCount} active staff members`,
        type: 'warning',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
      });
    }
    
    // Simulate new staff addition
    if (Math.random() > 0.7) {
      const alertTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      alerts.push({
        message: `New staff member added to ${branchName}`,
        type: 'info',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
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
      const alertTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      alerts.push({
        message: `${pendingCount} stock requisitions pending approval`,
        type: 'info',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
      });
    }
    
    // Simulate inventory alerts
    const inventoryItems = Math.floor(Math.random() * 30) + 10;
    if (inventoryItems > 20) {
      const alertTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      alerts.push({
        message: `${inventoryItems} items are running low in inventory`,
        type: 'warning',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
      });
    }
    
    // Simulate supplier delivery
    if (Math.random() > 0.6) {
      const alertTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      alerts.push({
        message: `New supplier delivery received at ${branchName}`,
        type: 'info',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
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
        const alertTime = new Date(now.getTime() - 30 * 60 * 1000);
        alerts.push({
          message: `EOD report for ${branchName} is overdue`,
          type: 'critical',
          timeAgo: formatTimeUTC2(alertTime),
          timestamp: alertTime.getTime()
        });
      }
    } else {
      const alertTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      alerts.push({
        message: `EOD report submitted successfully for ${branchName}`,
        type: 'success',
        timeAgo: formatTimeUTC2(alertTime),
        timestamp: alertTime.getTime()
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
      timeAgo: formatTimeUTC2(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000
    },
    {
      message: `New inventory management features available`,
      type: 'info',
      timeAgo: formatTimeUTC2(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
      timestamp: now.getTime() - 3 * 24 * 60 * 60 * 1000
    },
    {
      message: `Monthly performance review scheduled`,
      type: 'info',
      timeAgo: formatTimeUTC2(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
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
          eodBranchDate.textContent = `${branchName}`;
          
          // Initialize date selector with today's date
          const dateSelector = document.getElementById('eod-date-selector');
          if (dateSelector) {
              const todayStr = today.toISOString().split('T')[0];
              
              // Remove any existing event listeners to prevent duplicates
              const newDateSelector = dateSelector.cloneNode(true);
              dateSelector.parentNode.replaceChild(newDateSelector, dateSelector);
              const freshDateSelector = document.getElementById('eod-date-selector');
              
              freshDateSelector.value = todayStr;
              freshDateSelector.max = todayStr; // Don't allow future dates
              
              // Allow dates from up to 30 days ago
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              freshDateSelector.min = thirtyDaysAgo.toISOString().split('T')[0];
              
              // Store reference to date selector for later use
              window.currentEODDateSelector = freshDateSelector;
              
              // Load data when date changes
              freshDateSelector.addEventListener('change', async () => {
                  console.log('📅 Date changed to:', freshDateSelector.value);
                  // Wait a bit to ensure department fields exist
                  setTimeout(async () => {
                      await loadEODDataForDate(freshDateSelector.value);
                  }, 150);
              });
          }
          
          // Fetch departments for this branch from branch_departments
          const branchId = window.currentUserProfile?.branchId;
          console.log('🔍 EOD Modal - Branch ID:', branchId);
          if (branchId) {
              console.log('🔍 Querying branch_departments for branch_id:', branchId);
              const { data: branchDepts, error } = await supabase
                  .from('branch_departments')
                  .select(`
                      department_id,
                      departments(name)
                  `)
                  .eq('branch_id', branchId);
              console.log('🔍 Branch departments query result:', { branchDepts, error });
              console.log('🔍 First department structure:', branchDepts?.[0]);
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
                  console.log('🔍 No departments found for branch_id:', branchId);
                  eodDepartmentFields.innerHTML = '<div class="text-gray-400">No departments found for this branch. Please contact admin.</div>';
              }
              // Reset totals
              eodTotalSales.textContent = '$0.00';
              eodProfitLoss.textContent = '$0.00';

              // Add live calculation listeners and load existing data
              setTimeout(() => {
                // Add calculation listeners
                document.querySelectorAll('.eod-dept-sales').forEach(input => {
                  input.addEventListener('input', updateEODTotals);
                });
                document.getElementById('eod-expenses').addEventListener('input', updateEODTotals);
                document.getElementById('eod-cash').addEventListener('input', updateEODTotals);
                document.getElementById('eod-discrepancies').addEventListener('input', updateEODTotals);
                
                // IMPORTANT: Load data for the selected date AFTER departments are created
                const currentDate = window.currentEODDateSelector ? window.currentEODDateSelector.value : todayStr;
                console.log('📅 Departments loaded, now loading EOD data for date:', currentDate);
                console.log('📅 Branch ID:', branchId, 'User ID:', window.currentUserProfile?.userId);
                loadEODDataForDate(currentDate).catch(err => {
                  console.error('❌ Error loading EOD data after departments loaded:', err);
                });
              }, 150);
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
      
      // Function to load existing EOD data for a specific date
      async function loadEODDataForDate(dateStr) {
        const branchId = window.currentUserProfile?.branchId;
        const userId = window.currentUserProfile?.userId;
        
        console.log('🔍 loadEODDataForDate called with:', { dateStr, branchId, userId });
        
        if (!branchId || !userId) {
          console.warn('⚠️ Missing branchId or userId:', { branchId, userId });
          return;
        }
        
        // Ensure date is in YYYY-MM-DD format
        if (dateStr && !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.warn('⚠️ Date format issue, expected YYYY-MM-DD, got:', dateStr);
          // Try to convert if it's in a different format
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toISOString().split('T')[0];
            console.log('✅ Converted date to:', dateStr);
          }
        }
        
        try {
          // Query for existing report for this date, branch, and user
          console.log('🔍 Querying eod_reports for:', { branch_id: branchId, date: dateStr, submitted_by: userId });
          const { data: existingReport, error } = await supabase
            .from('eod_reports')
            .select('*')
            .eq('branch_id', branchId)
            .eq('date', dateStr)
            .eq('submitted_by', userId)
            .maybeSingle();
          
          if (error) {
            console.error('❌ Error loading EOD report:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return;
          }
          
          if (existingReport) {
            // Populate form with existing data
            console.log('✅ Found existing EOD report:', existingReport);
            console.log('📊 Report ID:', existingReport.id);
            console.log('💰 Total Sales:', existingReport.total_sales);
            
            // Load financial summary fields
            const expensesEl = document.getElementById('eod-expenses');
            const cashEl = document.getElementById('eod-cash');
            const discrepanciesEl = document.getElementById('eod-discrepancies');
            const notesEl = document.getElementById('eod-notes');
            
            if (expensesEl) expensesEl.value = existingReport.total_expenses || 0;
            if (cashEl) cashEl.value = existingReport.cash_on_hand || 0;
            if (discrepanciesEl) discrepanciesEl.value = existingReport.discrepancies || 0;
            if (notesEl) notesEl.value = existingReport.notes || '';
            
            console.log('✅ Financial summary fields populated');
            
            // Load department sales from eod_report_departments table
            console.log('🔍 Loading department sales for report ID:', existingReport.id);
            const { data: departmentSales, error: deptError } = await supabase
              .from('eod_report_departments')
              .select('department_id, sales_amount')
              .eq('eod_report_id', existingReport.id);
            
            if (deptError) {
              console.warn('⚠️ Error loading department sales:', deptError);
              console.warn('This might be normal if the table doesn\'t exist yet or RLS is blocking access');
              // If table doesn't exist, just show total_sales in a message
              console.log('💰 Total sales from report:', existingReport.total_sales);
            } else {
              console.log('📊 Department sales query result:', departmentSales);
              
              if (departmentSales && departmentSales.length > 0) {
                console.log(`✅ Found ${departmentSales.length} department sales records`);
                let populatedCount = 0;
                
                // Populate department sales fields
                departmentSales.forEach(deptSale => {
                  const input = document.querySelector(`.eod-dept-sales[data-dept-id="${deptSale.department_id}"]`);
                  if (input) {
                    input.value = parseFloat(deptSale.sales_amount) || 0;
                    populatedCount++;
                    console.log(`✅ Populated department ${deptSale.department_id} with $${deptSale.sales_amount}`);
                  } else {
                    console.warn(`⚠️ Could not find input for department_id: ${deptSale.department_id}`);
                  }
                });
                
                console.log(`✅ Populated ${populatedCount} out of ${departmentSales.length} department fields`);
              } else {
                console.log('ℹ️ No department sales found for this report (might be an old report)');
                // No department sales stored yet - this might be an old report
                // Clear department fields
                document.querySelectorAll('.eod-dept-sales').forEach(input => { input.value = ''; });
              }
            }
            
            // Update totals
            updateEODTotals();
            console.log('✅ EOD data loaded successfully');
          } else {
            // No existing report - clear form
            console.log('ℹ️ No existing report found for date:', dateStr);
            console.log('ℹ️ Clearing form for new entry');
            
            const expensesEl = document.getElementById('eod-expenses');
            const cashEl = document.getElementById('eod-cash');
            const discrepanciesEl = document.getElementById('eod-discrepancies');
            const notesEl = document.getElementById('eod-notes');
            
            if (expensesEl) expensesEl.value = '';
            if (cashEl) cashEl.value = '';
            if (discrepanciesEl) discrepanciesEl.value = '';
            if (notesEl) notesEl.value = '';
            document.querySelectorAll('.eod-dept-sales').forEach(input => { input.value = ''; });
            updateEODTotals();
          }
        } catch (error) {
          console.error('❌ Exception in loadEODDataForDate:', error);
          console.error('Stack trace:', error.stack);
        }
      }

      // Handle EOD form submission
      if (eodForm) {
        eodForm.onsubmit = async function(e) {
          e.preventDefault();
          
          // Get the selected date from date picker
          const dateSelector = document.getElementById('eod-date-selector');
          const dateStr = dateSelector ? dateSelector.value : new Date().toISOString().split('T')[0];
          
          // Gather data
          const branchId = window.currentUserProfile?.branchId || null;
          const userId = window.currentUserProfile?.userId || null;
          
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

          // Check if report already exists for this date
          const { data: existingReport } = await supabase
            .from('eod_reports')
            .select('id')
            .eq('branch_id', branchId)
            .eq('date', dateStr)
            .eq('submitted_by', userId)
            .maybeSingle();

          let eodReportId;
          let eodError;
          
          if (existingReport) {
            // Update existing report
            eodReportId = existingReport.id;
            const { error, data } = await supabase
              .from('eod_reports')
              .update({
                total_sales: totalSales,
                total_profit: profitLoss,
                notes: notes,
                total_expenses: expenses,
                cash_on_hand: cash,
                discrepancies: discrepancies,
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingReport.id)
              .select('id')
              .single();
            eodError = error;
            if (data) eodReportId = data.id;
          } else {
            // Insert new report
            const { error, data } = await supabase.from('eod_reports').insert({
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
            }).select('id').single();
            eodError = error;
            if (data) eodReportId = data.id;
          }
          
          if (eodError) {
            console.log('EOD save error:', eodError);
            alert('Error saving report: ' + (eodError.message || JSON.stringify(eodError)));
            return;
          }
          
          // Save individual department sales
          if (eodReportId) {
            // Collect department sales from form
            const departmentSales = [];
            document.querySelectorAll('.eod-dept-sales').forEach(input => {
              const deptId = input.getAttribute('data-dept-id');
              const salesAmount = parseFloat(input.value) || 0;
              // Option A: always store a row per department, even when sales are 0
              if (deptId) {
                departmentSales.push({
                  eod_report_id: eodReportId,
                  department_id: parseInt(deptId),
                  sales_amount: salesAmount
                });
              }
            });
            
            if (departmentSales.length > 0) {
              // Delete existing department sales for this report (if updating)
              if (existingReport) {
                await supabase
                  .from('eod_report_departments')
                  .delete()
                  .eq('eod_report_id', eodReportId);
              }
              
              // Insert new department sales
              const { error: deptError } = await supabase
                .from('eod_report_departments')
                .insert(departmentSales);
              
              if (deptError) {
                console.log('Error saving department sales (table may not exist yet):', deptError);
                // Don't fail the whole submission if department table doesn't exist
                // This allows graceful degradation
              } else {
                console.log('Saved department sales:', departmentSales);
              }
            }
          }
          
          // Log activity
          const selectedDate = new Date(dateStr);
          const today = new Date();
          const isBackdated = selectedDate.toDateString() !== today.toDateString();
          
          await supabase.from('activities').insert({
            branch_id: branchId,
            user_id: userId,
            type: 'eod_report',
            message: isBackdated 
              ? `EOD Report ${existingReport ? 'updated' : 'submitted'} for ${selectedDate.toLocaleDateString()}`
              : `EOD Report ${existingReport ? 'updated' : 'submitted'}`,
            status: 'completed',
            timestamp: new Date().toISOString()
          });
          
          alert(`EOD Report ${existingReport ? 'updated' : 'submitted'} successfully for ${selectedDate.toLocaleDateString()}!`);
          eodModal.classList.add('hidden');
          
          // Clear form fields
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
