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

// Global Feed State
let currentPage = 1;
let currentLimit = 12;
let allRecipes = [];
let hasMoreRecipes = false;
let activeSearchQuery = '';
let activeDietary = '';
let activeDifficulty = '';
let activeSort = 'newest';

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

function renderRecipeCard(recipe) {
  const ratingBadge = recipe.averageRating > 0
    ? `<span style="color:#f59e0b; font-weight:700">★ ${recipe.averageRating}</span>`
    : '';

  const dietaryTags = (recipe.dietary || []).slice(0, 2).map(d =>
    `<span style="background:#10b981; color:#fff; font-size:0.7rem; font-weight:600; padding:2px 7px; border-radius:10px;">${d}</span>`
  ).join(' ');

  return `
    <div class="recipe-card">
      <img src="${getImageUrl(recipe.image)}" alt="${recipe.title}" onclick="window.location.href='recipe-detail.html?id=${recipe._id}'">
      <div class="recipe-card-body">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem">
          <span style="font-size:0.75rem; font-weight:700; color:var(--primary-color); text-transform:uppercase">${recipe.cuisine || 'General'}</span>
          ${ratingBadge}
        </div>
        <h4 onclick="window.location.href='recipe-detail.html?id=${recipe._id}'">${recipe.title}</h4>
        <div style="margin-bottom:0.5rem; display:flex; gap:0.3rem; flex-wrap:wrap">
          ${dietaryTags}
        </div>
        <div class="recipe-card-author">
          <span>👤</span>
          ${recipe.author?._id
            ? `<a class="author-link" href="profile.html?id=${recipe.author._id}">${recipe.author.username || 'Unknown'}</a>`
            : `<span>${recipe.author?.username || 'Unknown'}</span>`}
        </div>
        <div class="recipe-card-stats">
          <span>❤️ ${recipe.favoritesCount || 0} saves</span>
          <span>💬 ${recipe.numReviews || 0} reviews</span>
        </div>
        ${recipe.author?._id === currentUserId ? `
          <div class="recipe-card-actions">
            <button class="btn-edit" onclick="window.location.href='edit-recipe.html?id=${recipe._id}'">✎ Edit</button>
            <button class="btn-delete" onclick="deleteRecipe('${recipe._id}')">🗑 Delete</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

async function loadRecipes(append = false) {
  const container = document.getElementById('recipeContainer');
  const paginationContainer = document.getElementById('paginationContainer');
  const headingEl = document.getElementById('feedHeading');

  const params = new URLSearchParams(window.location.search);
  const cuisine = params.get('cuisine');
  const queryDietary = params.get('dietary');

  if (headingEl) {
    if (cuisine) {
      headingEl.innerHTML = `${cuisine} <span>Recipes</span>`;
    } else if (queryDietary) {
      headingEl.innerHTML = `${queryDietary} <span>Recipes</span>`;
    } else {
      headingEl.innerHTML = `Discover <span>Recipes</span>`;
    }
  }

  const clearFilterEl = document.getElementById('clearFilter');
  if (clearFilterEl) {
    clearFilterEl.style.display = (cuisine || queryDietary || activeSearchQuery || activeDietary || activeDifficulty) ? 'inline-block' : 'none';
  }

  if (!append) {
    container.innerHTML = skeletonCards(8);
  }

  try {
    const url = new URL('http://localhost:5000/api/recipes');
    url.searchParams.set('page', currentPage);
    url.searchParams.set('limit', currentLimit);
    url.searchParams.set('sort', activeSort);

    if (cuisine) url.searchParams.set('cuisine', cuisine);
    if (queryDietary || activeDietary) url.searchParams.set('dietary', queryDietary || activeDietary);
    if (activeDifficulty) url.searchParams.set('difficulty', activeDifficulty);
    if (activeSearchQuery) url.searchParams.set('search', activeSearchQuery);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
      stateBox(container, '😕', 'Could not load recipes', 'Something went wrong fetching the feed.', { retry: () => loadRecipes(false) });
      return;
    }

    const recipes = Array.isArray(data) ? data : (data.recipes || []);
    const pagination = data.pagination || {};
    hasMoreRecipes = Boolean(pagination.hasMore);

    if (append) {
      allRecipes = allRecipes.concat(recipes);
    } else {
      allRecipes = recipes;
    }

    if (allRecipes.length === 0) {
      stateBox(container, '🍳',
        cuisine ? `No ${cuisine} recipes found` : 'No matching recipes found',
        'Try adjusting your search filters or be the first to share one!',
        { link: 'recipe.html', linkText: 'Add a recipe' });
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    container.innerHTML = allRecipes.map(r => renderRecipeCard(r)).join('');

    // Render Load More Button
    if (paginationContainer) {
      if (hasMoreRecipes) {
        paginationContainer.innerHTML = `
          <button id="loadMoreBtn" class="btn-load-more" type="button">
            Load More Recipes ↓
          </button>
        `;
        const btn = document.getElementById('loadMoreBtn');
        if (btn) {
          btn.addEventListener('click', () => {
            currentPage++;
            loadRecipes(true);
          });
        }
      } else {
        paginationContainer.innerHTML = allRecipes.length > currentLimit
          ? '<p style="color:#94a3b8; font-size:0.9rem; margin:2rem 0;">You\'ve reached the end of the recipe feed.</p>'
          : '';
      }
    }

  } catch (err) {
    console.error(err);
    stateBox(container, '📡', 'Can\'t reach the kitchen',
      'We couldn\'t connect to the server. Make sure the backend is running, then try again.',
      { retry: () => loadRecipes(false) });
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
      loadRecipes(false);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete recipe');
    }
  } catch (err) {
    alert('Error deleting recipe');
  }
}

// Hook up Search & Filters
function initFeedFilters() {
  const searchInput = document.getElementById('feedSearchInput');
  const dietarySelect = document.getElementById('dietaryFilter');
  const diffSelect = document.getElementById('difficultyFilter');
  const sortSelect = document.getElementById('sortFilter');

  let debounceTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        activeSearchQuery = searchInput.value.trim();
        currentPage = 1;
        loadRecipes(false);
      }, 350);
    });
  }

  if (dietarySelect) {
    dietarySelect.addEventListener('change', () => {
      activeDietary = dietarySelect.value;
      currentPage = 1;
      loadRecipes(false);
    });
  }

  if (diffSelect) {
    diffSelect.addEventListener('change', () => {
      activeDifficulty = diffSelect.value;
      currentPage = 1;
      loadRecipes(false);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      activeSort = sortSelect.value;
      currentPage = 1;
      loadRecipes(false);
    });
  }
}

// Hook up Pantry / "What's in My Fridge?" Finder
function initPantryFinder() {
  const modal = document.getElementById('pantryModal');
  const openBtn = document.getElementById('openPantryBtn');
  const closeBtn = document.getElementById('closePantryModal');
  const input = document.getElementById('pantryIngredientInput');
  const addBtn = document.getElementById('addPantryIngBtn');
  const tagsList = document.getElementById('pantryTagsList');
  const searchBtn = document.getElementById('findRecipesByPantryBtn');
  const resultsList = document.getElementById('pantryResultsList');

  if (!modal || !openBtn) return;

  let pantryItems = ['eggs', 'cheese', 'tomatoes'];

  function renderTags() {
    tagsList.innerHTML = pantryItems.map((item, idx) => `
      <span class="pantry-tag">
        ${item}
        <span class="pantry-tag-remove" data-idx="${idx}">✕</span>
      </span>
    `).join('');

    tagsList.querySelectorAll('.pantry-tag-remove').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        pantryItems.splice(idx, 1);
        renderTags();
      });
    });
  }

  function addCurrentIngredient() {
    const val = input.value.trim().toLowerCase();
    if (val && !pantryItems.includes(val)) {
      pantryItems.push(val);
      input.value = '';
      renderTags();
    }
  }

  openBtn.addEventListener('click', () => {
    modal.hidden = false;
    renderTags();
  });

  closeBtn.addEventListener('click', () => {
    modal.hidden = true;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  addBtn.addEventListener('click', addCurrentIngredient);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCurrentIngredient();
    }
  });

  searchBtn.addEventListener('click', async () => {
    if (pantryItems.length === 0) {
      alert('Please add at least one ingredient.');
      return;
    }
    resultsList.innerHTML = '<p style="text-align:center; color:#64748b;">Finding matching recipes...</p>';

    try {
      const res = await fetch('http://localhost:5000/api/recipes/pantry-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: pantryItems }),
      });
      const data = await res.json();

      if (!res.ok || !data.recipes || data.recipes.length === 0) {
        resultsList.innerHTML = '<p style="text-align:center; color:#64748b; padding:1.5rem;">No recipes found matching these ingredients. Try adding more general staples!</p>';
        return;
      }

      resultsList.innerHTML = `
        <h4 style="margin-bottom:1rem; color:var(--secondary-color)">Found ${data.recipes.length} Matching Recipes:</h4>
        <div style="display:flex; flex-direction:column; gap:0.8rem;">
          ${data.recipes.map(r => `
            <div style="display:flex; align-items:center; gap:1rem; padding:0.8rem; border:1px solid #e2e8f0; border-radius:10px; cursor:pointer;" onclick="window.location.href='recipe-detail.html?id=${r._id}'">
              <img src="${getImageUrl(r.image)}" alt="" style="width:70px; height:70px; border-radius:8px; object-fit:cover;">
              <div style="flex:1;">
                <h5 style="margin:0 0 0.3rem 0; font-size:1rem; color:var(--dark-color)">${r.title}</h5>
                <span style="font-size:0.8rem; color:#64748b;">${r.matchedCount} of ${r.totalIngredients} ingredients available</span>
                ${r.missingIngredients.length > 0 ? `<div style="font-size:0.75rem; color:#ef4444; margin-top:0.2rem">Missing: ${r.missingIngredients.slice(0, 3).join(', ')}</div>` : ''}
              </div>
              <span class="match-badge" style="position:static; font-size:0.85rem">${r.matchPercentage}% match</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      resultsList.innerHTML = '<p style="text-align:center; color:#ef4444;">Error searching for recipes.</p>';
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  });
}

initFeedFilters();
initPantryFinder();
loadRecipes(false);

/* ============================================================
   Navbar people search (Instagram-style)
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
      if (q !== lastQuery) return;
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
    timer = setTimeout(() => runSearch(q), 250);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim() && results.innerHTML.trim()) openList();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeList();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeList(); input.blur(); }
  });
})();
