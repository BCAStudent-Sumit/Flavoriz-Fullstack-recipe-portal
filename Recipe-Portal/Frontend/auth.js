// frontend/js/auth.js
const API = 'http://localhost:5000/api/auth';

const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      username: document.getElementById('username').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    };
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
      errorMsg.textContent = data.error;
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    };
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
      errorMsg.textContent = data.error;
    }
  });
}