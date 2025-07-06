// LIGI Reporting System JavaScript

// Initialize Supabase client
const SUPABASE_URL = 'https://rgbgcaxolxxyqvqmmqnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYmdjYXhvbHh4eXF2cW1tcW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1ODcwMTEsImV4cCI6MjA2NjE2MzAxMX0.u6H4-hfSjrf4u2lx02hf0L_3LsIvQXDrJBoIUa5Iyb8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('login-form');
  if (!form) return;
  let errorDiv = document.getElementById('login-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'login-error';
    errorDiv.style.color = 'red';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.textAlign = 'center';
    form.appendChild(errorDiv);
  }

  // Add a success message div
  let successDiv = document.getElementById('login-success');
  if (!successDiv) {
    successDiv = document.createElement('div');
    successDiv.id = 'login-success';
    successDiv.style.color = 'green';
    successDiv.style.marginTop = '10px';
    successDiv.style.textAlign = 'center';
    form.appendChild(successDiv);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorDiv.textContent = '';
    successDiv.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorDiv.textContent = error.message || 'Login failed. Please try again.';
      setTimeout(() => { errorDiv.textContent = ''; }, 4000); // Hide error after 4 seconds
      return;
    }

    // Fetch user profile to get the role
    const user = data.user;
    if (!user) {
      errorDiv.textContent = 'Login failed. No user returned.';
      setTimeout(() => { errorDiv.textContent = ''; }, 4000);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      errorDiv.textContent = 'Could not fetch user role. Please contact support.';
      setTimeout(() => { errorDiv.textContent = ''; }, 4000);
      return;
    }

    // Redirect based on user role
    if (profile.role === 'branch-manager') {
      window.location.href = 'dashboardbranch.html';
    } else if (profile.role === 'business-owner') {
      window.location.href = 'businessoverview.html';
    } else if (profile.role === 'stores-manager') {
      window.location.href = 'storesmanagement.html';
    } else {
      successDiv.textContent = `Login successful! Your role is: ${profile.role}`;
    }
  });
});
