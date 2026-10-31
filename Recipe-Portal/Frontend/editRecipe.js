// frontend/js/editRecipe.js

const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const params = new URLSearchParams(window.location.search);
const recipeId = params.get('id');

const editForm = document.getElementById('editForm');
const errorMsg = document.getElementById('errorMsg');
const imageInput = document.getElementById('image');
const imageUploadBox = document.getElementById('imageUploadBox');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');

const getImageUrl = (img) => {
  if (!img) return '';
  return img.startsWith('http') ? img : `http://localhost:5000${img}`;
};

// Load existing recipe data and fill the form
async function loadRecipeForEdit() {
  if (!recipeId) {
    errorMsg.textContent = 'No recipe specified.';
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/api/recipes/${recipeId}`);
    const recipe = await res.json();

    if (!res.ok) {
      errorMsg.textContent = 'Recipe not found.';
      return;
    }

    document.getElementById('title').value = recipe.title;
    document.getElementById('cuisine').value = recipe.cuisine || '';
    document.getElementById('servings').value = recipe.servings || '';
    document.getElementById('prepTime').value = recipe.prepTime || '';
    document.getElementById('cookTime').value = recipe.cookTime || '';
    document.getElementById('ingredients').value = recipe.ingredients.join('\n');
    document.getElementById('steps').value = recipe.steps.join('\n');

    if (recipe.image) {
      imagePreview.src = getImageUrl(recipe.image);
      imagePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
    }
  } catch (err) {
    errorMsg.textContent = 'Error loading recipe.';
  }
}

imageUploadBox.addEventListener('click', () => imageInput.click());

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

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

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
    const res = await fetch(`http://localhost:5000/api/recipes/${recipeId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = 'profile.html';
    } else {
      errorMsg.textContent = data.error;
    }
  } catch (err) {
    errorMsg.textContent = 'Something went wrong. Is the backend running?';
  }
});

loadRecipeForEdit();

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  });
}