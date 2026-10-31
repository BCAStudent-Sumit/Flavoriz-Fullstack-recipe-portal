// frontend/js/forgotPassword.js
const forgotForm = document.getElementById('forgotForm');
const statusMsg = document.getElementById('statusMsg');

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const submitBtn = forgotForm.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    statusMsg.style.color = '#1a5653';
    statusMsg.textContent = data.message || 'If that email exists, a reset link has been sent.';
    forgotForm.reset();
  } catch (err) {
    statusMsg.style.color = '#dc2626';
    statusMsg.textContent = 'Something went wrong. Is the backend running?';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
});