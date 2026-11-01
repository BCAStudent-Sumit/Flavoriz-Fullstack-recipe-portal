// frontend/js/forgotPassword.js
const forgotForm = document.getElementById('forgotForm');
const statusMsg = document.getElementById('statusMsg');

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
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
    if (data.resetLink) {
      statusMsg.innerHTML = `
        <span>${data.message}</span><br><br>
        <div style="background: rgba(232, 85, 47, 0.1); border: 1px dashed var(--primary-color); border-radius: 8px; padding: 0.8rem; margin-top: 0.5rem;">
          <strong style="color: var(--primary-color);">Reset Link Ready:</strong><br>
          <a href="${data.resetLink}" style="color: var(--primary-color); font-weight: bold; text-decoration: underline; word-break: break-all;">
            Click here to reset your password &rarr;
          </a>
        </div>
      `;
    } else {
      statusMsg.textContent = data.message || 'If that email exists, a reset link has been sent.';
    }

    forgotForm.reset();
  } catch (err) {
    statusMsg.style.color = '#dc2626';
    statusMsg.textContent = 'Something went wrong. Is the backend running?';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
});
