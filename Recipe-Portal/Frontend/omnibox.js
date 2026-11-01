/**
 * omnibox.js — Unified Global Omnibox for Flavoriz
 * Provides a single prominent search bar across all pages.
 * Autocomplete dynamically partitions results into:
 *  1. 🍳 Recipes
 *  2. 👤 Chefs & Creators
 *  3. 🏷️ Cuisines & Dietary Tags
 *  4. 🔎 Full catalog search
 */

(function initUnifiedOmnibox() {
  const navbar = document.querySelector('.navbar');
  const navLinks = document.querySelector('.nav-links');
  if (!navbar) return;

  // Don't inject twice if already present
  if (document.getElementById('omniboxWrap')) return;

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const getImageUrl = (img) => {
    if (!img) return 'https://via.placeholder.com/80?text=No+Img';
    return img.startsWith('http') ? img : `http://localhost:5000${img}`;
  };

  const getAvatarUrl = (u) => (u && u.profilePic)
    ? (u.profilePic.startsWith('http') ? u.profilePic : `http://localhost:5000${u.profilePic}`)
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent((u && u.username) || 'User')}`;

  // Build the prominent omnibox
  const wrap = document.createElement('div');
  wrap.id = 'omniboxWrap';
  wrap.className = 'nav-search omnibox-container';
  wrap.innerHTML = `
    <span class="nav-search-icon" aria-hidden="true">🔍</span>
    <input id="omniboxInput" class="nav-search-input" type="search"
           placeholder="Search recipes, chefs, ingredients..." autocomplete="off"
           aria-label="Search recipes, chefs, and tags"
           role="combobox" aria-expanded="false" aria-controls="omniboxResults">
    <div id="omniboxResults" class="nav-search-results omnibox-dropdown" role="listbox" hidden></div>
  `;

  if (navLinks) {
    navbar.insertBefore(wrap, navLinks);
  } else {
    navbar.appendChild(wrap);
  }

  const input = wrap.querySelector('#omniboxInput');
  const results = wrap.querySelector('#omniboxResults');

  // Pre-fill search query if on index.html?search=...
  const currentParams = new URLSearchParams(window.location.search);
  const currentSearch = currentParams.get('search');
  if (currentSearch && input) {
    input.value = currentSearch;
  }

  const openList = () => {
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const closeList = () => {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  };

  function renderOmnibox(data, query) {
    const recipes = data.recipes || [];
    const chefs = data.chefs || [];
    const tags = data.tags || [];

    const hasAny = recipes.length > 0 || chefs.length > 0 || tags.length > 0;

    if (!hasAny) {
      results.innerHTML = `
        <div class="omnibox-empty">
          <p>No exact matches for <strong>"${esc(query)}"</strong></p>
          <a href="index.html?search=${encodeURIComponent(query)}" class="omnibox-see-all">
            Search full recipe catalog for "${esc(query)}" &rarr;
          </a>
        </div>
      `;
      openList();
      return;
    }

    let html = '';

    // 1. Recipes Section
    if (recipes.length > 0) {
      html += `
        <div class="omnibox-section">
          <div class="omnibox-section-title">🍳 Recipes</div>
          ${recipes.map(r => `
            <a class="nav-search-item omnibox-recipe-item" href="recipe-detail.html?id=${r._id}">
              <img class="omnibox-recipe-thumb" src="${getImageUrl(r.image)}" alt="">
              <div class="omnibox-recipe-info">
                <span class="omnibox-recipe-title">${esc(r.title)}</span>
                <span class="omnibox-recipe-meta">
                  <span>${esc(r.cuisine || 'General')}</span>
                  ${r.averageRating > 0 ? `<span class="omnibox-star">★ ${r.averageRating}</span>` : ''}
                </span>
              </div>
            </a>
          `).join('')}
        </div>
      `;
    }

    // 2. Chefs / Creators Section
    if (chefs.length > 0) {
      html += `
        <div class="omnibox-section">
          <div class="omnibox-section-title">👤 Chefs &amp; Creators</div>
          ${chefs.map(u => `
            <a class="nav-search-item omnibox-chef-item" href="profile.html?id=${u._id}">
              <img class="nav-search-avatar" src="${getAvatarUrl(u)}" alt="">
              <span class="nav-search-names">
                <span class="nav-search-name">${esc(u.name || u.username)}</span>
                <span class="nav-search-handle">@${esc(u.username)}</span>
              </span>
            </a>
          `).join('')}
        </div>
      `;
    }

    // 3. Cuisines & Dietary Tags Section
    if (tags.length > 0) {
      html += `
        <div class="omnibox-section">
          <div class="omnibox-section-title">🏷️ Cuisines &amp; Tags</div>
          <div class="omnibox-tags-container">
            ${tags.map(t => {
              const url = t.type === 'cuisine' ? `index.html?cuisine=${encodeURIComponent(t.name)}` : `index.html?dietary=${encodeURIComponent(t.name)}`;
              return `
                <a class="omnibox-tag-pill" href="${url}">
                  <span>${t.type === 'cuisine' ? '🍽️' : '🌱'}</span>
                  <span>${esc(t.name)}</span>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // 4. Footer: See All Results in Feed
    html += `
      <div class="omnibox-footer">
        <a href="index.html?search=${encodeURIComponent(query)}" class="omnibox-see-all-btn">
          <span>🔍</span> See all recipe results for "${esc(query)}" &rarr;
        </a>
      </div>
    `;

    results.innerHTML = html;
    openList();
  }

  let timer = null;
  let lastQuery = '';

  async function fetchOmnibox(q) {
    try {
      const res = await fetch(`http://localhost:5000/api/recipes/omnibox?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (q !== lastQuery) return; // Ignore stale response
      if (!res.ok) throw new Error('Search failed');
      renderOmnibox(data, q);
    } catch (err) {
      results.innerHTML = `<p class="nav-search-empty">Search unavailable right now.</p>`;
      openList();
    }
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    lastQuery = q;
    clearTimeout(timer);
    if (q.length < 1) {
      closeList();
      results.innerHTML = '';
      return;
    }
    timer = setTimeout(() => fetchOmnibox(q), 220); // Fast responsive debounce
  });

  input.addEventListener('focus', () => {
    if (input.value.trim() && results.innerHTML.trim()) {
      openList();
    }
  });

  // Handle Enter key -> search the feed
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) {
        closeList();
        window.location.href = `index.html?search=${encodeURIComponent(q)}`;
      }
    } else if (e.key === 'Escape') {
      closeList();
      input.blur();
    }
  });

  // Click outside to dismiss
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      closeList();
    }
  });
})();
