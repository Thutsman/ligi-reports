// --- Supabase Setup ---
const SUPABASE_URL = 'https://veohdpcvkzouuyjpwmis.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2hkcGN2a3pvdXV5anB3bWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjUwNTIsImV4cCI6MjA3NDEwMTA1Mn0.d2MyXV4nl7G3kRLGgekWUioFlXesHXgCn1ezbt812UA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentBranchId = null;
let branchName = '';
let staffList = [];

// --- Utility: Toast Notification ---
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-content').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

// --- 1. Get current user's branch_id and branch name ---
async function getCurrentBranchInfo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showToast('Not logged in!');
        return null;
    }
    // Get profile (branch_id)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('branch_id')
        .eq('id', user.id)
        .single();
    if (profileError || !profile) {
        showToast('Error fetching profile!');
        return null;
    }
    // Get branch name
    const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('name')
        .eq('id', profile.branch_id)
        .single();
    if (branchError || !branch) {
        showToast('Error fetching branch!');
        return null;
    }
    branchName = branch.name;
    return profile.branch_id;
}

// --- 2. Fetch staff for this branch ---
async function fetchStaff(branchId) {
    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
    if (error) {
        showToast('Error fetching staff!');
        return [];
    }
    return data;
}

// --- 3. Add new staff ---
async function addStaff(staffData) {
    const { error } = await supabase
        .from('staff')
        .insert([staffData]);
    if (error) {
        showToast('Error adding staff!');
        return false;
    }
    showToast('Staff added!');
    return true;
}

// --- 4. Delete staff ---
async function deleteStaff(staffId) {
    const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);
    if (error) {
        showToast('Error deleting staff!');
        return false;
    }
    showToast('Staff deleted!');
    return true;
}

// --- 5. Render staff list ---
function renderStaffList(staffList) {
    const grid = document.getElementById('staff-grid');
    grid.innerHTML = '';
    if (staffList.length === 0) {
        grid.innerHTML = '<p>No staff found for this branch.</p>';
        document.getElementById('staff-count').textContent = '0';
        document.getElementById('active-count').textContent = '0';
        return;
    }
    let activeCount = 0;
    staffList.forEach(staff => {
        if (staff.status === 'active') activeCount++;
        const card = document.createElement('div');
        card.className = 'staff-card';
        card.innerHTML = `
            <div>
                <strong>${staff.name}</strong><br>
                <span>${staff.position} (${staff.department})</span><br>
                <span>Hired: ${staff.hire_date}</span><br>
                <span>Status: <b>${staff.status}</b></span>
            </div>
            <button class="delete-btn" data-id="${staff.id}">Delete</button>
        `;
        grid.appendChild(card);
    });
    document.getElementById('staff-count').textContent = activeCount;
    document.getElementById('active-count').textContent = activeCount;

    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const staffId = btn.getAttribute('data-id');
            if (confirm('Delete this staff member?')) {
                const success = await deleteStaff(staffId);
                if (success) {
                    staffList = staffList.filter(s => s.id !== staffId);
                    renderStaffList(staffList);
                }
            }
        };
    });
}

// --- 6. UI Tab Logic ---
function setupTabs() {
    const staffListTab = document.getElementById('staff-list-tab');
    const addStaffTab = document.getElementById('add-staff-tab');
    const staffListContent = document.getElementById('staff-list');
    const addStaffContent = document.getElementById('add-staff');
    const addNewStaffBtn = document.getElementById('add-new-staff-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    function showTab(tab) {
        if (tab === 'staff-list') {
            staffListTab.classList.add('active');
            addStaffTab.classList.remove('active');
            staffListContent.classList.add('active');
            addStaffContent.classList.remove('active');
        } else {
            staffListTab.classList.remove('active');
            addStaffTab.classList.add('active');
            staffListContent.classList.remove('active');
            addStaffContent.classList.add('active');
        }
    }

    staffListTab.onclick = () => showTab('staff-list');
    addStaffTab.onclick = () => showTab('add-staff');
    addNewStaffBtn.onclick = () => showTab('add-staff');
    cancelBtn.onclick = () => showTab('staff-list');
}

// --- 7. On page load, wire everything up ---
document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();

    currentBranchId = await getCurrentBranchInfo();
    if (!currentBranchId) return;

    // Set branch name in header
    document.getElementById('branch-title').innerHTML = `${branchName} - <span id="active-count">0</span> Active Staff`;

    // Fetch and render staff
    staffList = await fetchStaff(currentBranchId);
    renderStaffList(staffList);

    // Handle add staff form submission
    document.getElementById('staff-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Collect form data
        const name = document.getElementById('staff-name').value.trim();
        const position = document.getElementById('staff-position').value;
        const department = document.getElementById('staff-department').value;
        const hire_date = document.getElementById('hire-date').value;
        const status = document.getElementById('staff-status').value;

        if (!name || !position || !department || !hire_date || !status) {
            showToast('Please fill all fields.');
            return;
        }

        const staffData = {
            branch_id: currentBranchId,
            name,
            position,
            department,
            hire_date,
            status
        };

        const success = await addStaff(staffData);
        if (success) {
            staffList = await fetchStaff(currentBranchId);
            renderStaffList(staffList);
            e.target.reset();
            // Switch back to staff list tab
            document.getElementById('staff-list-tab').click();
        }
    });

    // Back to dashboard button
    document.getElementById('back-btn').onclick = () => {
        window.location.href = 'dashboardbranch.html';
    };
});