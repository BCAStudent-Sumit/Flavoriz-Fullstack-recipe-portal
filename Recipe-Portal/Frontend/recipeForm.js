// frontend/js/recipeForm.js
const recipeForm = document.getElementById('recipeForm');
const errorMsg = document.getElementById('errorMsg');
const imageInput = document.getElementById('image');
const imageUploadBox = document.getElementById('imageUploadBox');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');

// Clicking anywhere in the box opens the file picker
imageUploadBox.addEventListener('click', () => imageInput.click());

// Show a live preview once a file is chosen
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

recipeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // FormData lets us send both text fields and a file together
  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('cuisine', document.getElementById('cuisine').value);
  formData.append('servings', document.getElementById('servings').value);
  formData.append('prepTime', document.getElementById('prepTime').value);
  formData.append('cookTime', document.getElementById('cookTime').value);
  formData.append('ingredients', document.getElementById('ingredients').value);
  formData.append('steps', document.getElementById('steps').value);

  if (imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  }

  try {
    const res = await fetch('http://localhost:5000/api/recipes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // NOTE: no Content-Type header - browser sets multipart/form-data automatically
      },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = 'index.html';
    } else {
      errorMsg.textContent = data.error;
    }
  } catch (err) {
    errorMsg.textContent = 'Something went wrong. Is the backend running?';
  }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  });
}