// frontend/js/resetPassword.js
const resetForm = document.getElementById('resetForm');
const statusMsg = document.getElementById('statusMsg');

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
  statusMsg.style.color = '#dc2626';
  statusMsg.textContent = 'Missing or invalid reset link.';
  resetForm.style.display = 'none';
}

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    statusMsg.style.color = '#dc2626';
    statusMsg.textContent = 'Passwords do not match.';
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (res.ok) {
      statusMsg.style.color = '#1a5653';
      statusMsg.textContent = 'Password updated! Redirecting to login...';
      setTimeout(() => window.location.href = 'login.html', 1800);
    } else {
      statusMsg.style.color = '#dc2626';
      statusMsg.textContent = data.error;
    }
  } catch (err) {
    statusMsg.style.color = '#dc2626';
    statusMsg.textContent = 'Something went wrong. Is the backend running?';
  }
});