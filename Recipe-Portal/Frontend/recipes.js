// frontend/js/recipes.js

const getImageUrl = (img) => {
  if (!img) return 'https://via.placeholder.com/300x180?text=No+Image';
  return img.startsWith('http') ? img : `http://localhost:5000${img}`;
};

const token = localStorage.getItem('token');
const currentUserId = localStorage.getItem('userId');

if (!token) {
  window.location.href = 'landing.html';
}

// --- shared UI helpers: skeletons + friendly states ---
function skeletonCards(n) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="skeleton-card"><div class="sk-img"></div>
      <div class="sk-body"><div class="skeleton-line"></div>
      <div class="skeleton-line short"></div></div></div>`;
  }
  return html;
}
function stateBox(container, emoji, title, msg, opts) {
  opts = opts || {};
  const action = opts.retry
    ? '<button class="btn-retry" type="button" id="stateRetry">Try again</button>'
    : (opts.link ? `<a class="btn-retry" href="${opts.link}">${opts.linkText || 'Go'}</a>` : '');
  container.innerHTML =
    `<div class="state-box"><span class="state-emoji">${emoji}</span>
       <h3>${title}</h3><p>${msg}</p>${action}</div>`;
  if (opts.retry) {
    const b = document.getElementById('stateRetry');
    if (b) b.addEventListener('click', opts.retry);
  }
}

async function loadRecipes() {
  const container = document.getElementById('recipeContainer');
  const headingEl = document.getElementById('feedHeading');

  const params = new URLSearchParams(window.location.search);
  const cuisine = params.get('cuisine');

  if (headingEl) {
    headingEl.innerHTML = cuisine
      ? `${cuisine} <span>Recipes</span>`
      : `Discover <span>Recipes</span>`;
  }

  const clearFilterEl = document.getElementById('clearFilter');
  if (clearFilterEl) {
    clearFilterEl.style.display = cuisine ? 'inline-block' : 'none';
  }

  container.innerHTML = skeletonCards(8);

  try {
    const apiUrl = cuisine
      ? `http://localhost:5000/api/recipes?cuisine=${encodeURIComponent(cuisine)}`
      : `http://localhost:5000/api/recipes`;

    const res = await fetch(apiUrl);
    const recipes = await res.json();

    if (!res.ok) {
      stateBox(container, '😕', 'Could not load recipes',
        'Something went wrong fetching the feed.', { retry: loadRecipes });
      return;
    }

    if (recipes.length === 0) {
      stateBox(container, '🍳',
        cuisine ? `No ${cuisine} recipes yet` : 'No recipes yet',
        'Be the first to share one with the community!',
        { link: 'recipe.html', linkText: 'Add a recipe' });
      return;
    }

    container.innerHTML = recipes.map(recipe => `
      <div class="recipe-card">
        <img src="${getImageUrl(recipe.image)}" alt="${recipe.title}" onclick="window.location.href='recipe-detail.html?id=${recipe._id}'">
        <div class="recipe-card-body">
          <h4 onclick="window.location.href='recipe-detail.html?id=${recipe._id}'">${recipe.title}</h4>
          <div class="recipe-card-author">
            <span>👤</span>
            ${recipe.author?._id
              ? `<a class="author-link" href="profile.html?id=${recipe.author._id}">${recipe.author.username || 'Unknown'}</a>`
              : `<span>${recipe.author?.username || 'Unknown'}</span>`}
          </div>
          <div class="recipe-card-stats">
            <span>📊</span>
            <span>${Math.floor(Math.random() * 3000)} reads</span>
          </div>
          ${recipe.author?._id === currentUserId ? `
            <div class="recipe-card-actions">
              <button class="btn-edit" onclick="window.location.href='edit-recipe.html?id=${recipe._id}'">✎ Edit</button>
              <button class="btn-delete" onclick="deleteRecipe('${recipe._id}')">🗑 Delete</button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    stateBox(container, '📡', 'Can\'t reach the kitchen',
      'We couldn\'t connect to the server. Make sure the backend is running, then try again.',
      { retry: loadRecipes });
  }
}

async function deleteRecipe(id) {
  if (!confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
    return;
  }
  try {
    const res = await fetch(`http://localhost:5000/api/recipes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      loadRecipes();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete recipe');
    }
  } catch (err) {
    alert('Error deleting recipe');
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  });
}

loadRecipes();

/* ============================================================
   Navbar people search (Instagram-style)
   • Injected into the navbar so no HTML file needs editing.
   • Type a name or @username -> live dropdown of matching people.
   • Click a result to open that person's profile.
   ============================================================ */
(function initUserSearch() {
  const navbar   = document.querySelector('.navbar');
  const navLinks = document.querySelector('.nav-links');
  if (!navbar) return;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const avatarUrl = (u) => (u && u.profilePic)
    ? `http://localhost:5000${u.profilePic}`
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent((u && u.username) || 'User')}`;

  // Build the search box and place it between the logo and the nav links.
  const wrap = document.createElement('div');
  wrap.className = 'nav-search';
  wrap.innerHTML = `
    <span class="nav-search-icon" aria-hidden="true">🔍</span>
    <input id="userSearchInput" class="nav-search-input" type="search"
           placeholder="Search people…" autocomplete="off" aria-label="Search people"
           role="combobox" aria-expanded="false" aria-controls="userSearchResults">
    <div id="userSearchResults" class="nav-search-results" role="listbox" hidden></div>`;
  if (navLinks) navbar.insertBefore(wrap, navLinks);
  else navbar.appendChild(wrap);

  const input   = wrap.querySelector('#userSearchInput');
  const results = wrap.querySelector('#userSearchResults');

  const openList  = () => { results.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const closeList = () => { results.hidden = true;  input.setAttribute('aria-expanded', 'false'); };

  function render(people) {
    if (!Array.isArray(people) || people.length === 0) {
      results.innerHTML = `<p class="nav-search-empty">No people found.</p>`;
      openList();
      return;
    }
    results.innerHTML = people.map((u) => `
      <a class="nav-search-item" role="option" href="profile.html?id=${u._id}">
        <img class="nav-search-avatar" src="${avatarUrl(u)}" alt="">
        <span class="nav-search-names">
          <span class="nav-search-name">${esc(u.name || u.username)}</span>
          <span class="nav-search-handle">@${esc(u.username || '')}</span>
        </span>
      </a>`).join('');
    openList();
  }

  let timer = null;
  let lastQuery = '';
  async function runSearch(q) {
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/search?q=${encodeURIComponent(q)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const people = await res.json();
      if (q !== lastQuery) return;            // a newer keystroke already won
      if (!res.ok) throw new Error('search');
      render(people);
    } catch (err) {
      results.innerHTML = `<p class="nav-search-empty">Search is unavailable. Is the server running?</p>`;
      openList();
    }
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    lastQuery = q;
    clearTimeout(timer);
    if (q.length < 1) { closeList(); results.innerHTML = ''; return; }
    timer = setTimeout(() => runSearch(q), 250);   // debounce
  });

  // Re-open the last results when the box regains focus.
  input.addEventListener('focus', () => {
    if (input.value.trim() && results.innerHTML.trim()) openList();
  });

  // Close when clicking away or pressing Escape.
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeList();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeList(); input.blur(); }
  });
})();