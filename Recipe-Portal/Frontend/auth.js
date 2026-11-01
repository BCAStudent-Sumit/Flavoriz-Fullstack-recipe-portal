// frontend/js/auth.js
const API = 'http://localhost:5000/api/auth';

const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorMsg) errorMsg.textContent = '';

    const body = {
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    };

    try {
      const res = await fetch(`${API}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        window.location.href = 'index.html';
      } else {
        if (errorMsg) {
          errorMsg.textContent = data.error || (data.details && data.details[0]?.message) || 'Signup failed.';
        }
      }
    } catch (err) {
      if (errorMsg) errorMsg.textContent = 'Unable to connect to the server. Please check your backend connection.';
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorMsg) errorMsg.textContent = '';

    const body = {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    };

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        window.location.href = 'index.html';
      } else {
        if (errorMsg) {
          errorMsg.textContent = data.error || (data.details && data.details[0]?.message) || 'Invalid email/username or password.';
        }
      }
    } catch (err) {
      if (errorMsg) errorMsg.textContent = 'Unable to connect to the server. Please check your backend connection.';
    }
  });
}
