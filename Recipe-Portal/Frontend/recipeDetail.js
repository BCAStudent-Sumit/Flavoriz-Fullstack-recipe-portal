// frontend/js/recipeDetail.js
const getImageUrl = (img) => {
  if (!img) return 'https://via.placeholder.com/800x350?text=No+Image';
  return img.startsWith('http') ? img : `http://localhost:5000${img}`;
};
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// Read the recipe ID from the URL: recipe-detail.html?id=XXXXX
const params = new URLSearchParams(window.location.search);
const recipeId = params.get('id');

const ttsSupported = 'speechSynthesis' in window;

let currentRecipe = null;
let baseServings = 4;
let currentServings = 4;
let userRatingScore = 5;

function skeletonMarkup() {
  return `
    <div class="skeleton-card" style="box-shadow:none;background:transparent">
      <div class="sk-img" style="height:320px;border-radius:var(--radius)"></div>
    </div>
    <div class="skeleton-line" style="width:40%;height:26px;margin-top:1.5rem"></div>
    <div class="skeleton-card" style="margin-top:1.5rem"><div class="sk-body">
      <div class="skeleton-line"></div><div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div></div>
    <div class="skeleton-card" style="margin-top:1rem"><div class="sk-body">
      <div class="skeleton-line"></div><div class="skeleton-line short"></div>
    </div></div>`;
}

function stateBox(container, emoji, title, msg, retry) {
  container.innerHTML =
    `<div class="state-box"><span class="state-emoji">${emoji}</span>
       <h3>${title}</h3><p>${msg}</p>
       ${retry ? '<button class="btn-retry" type="button" id="retryBtn">Try again</button>' : '<a class="btn-retry" href="index.html">Back to recipes</a>'}
     </div>`;
  const r = document.getElementById('retryBtn');
  if (r && retry) r.addEventListener('click', retry);
}

// Parse and scale ingredient amounts (e.g., "1/2 cup sugar" -> "1 cup sugar")
function scaleIngredient(line, factor) {
  if (factor === 1) return line;

  // Fraction pattern (e.g., 1/2, 3/4)
  const fractionRegex = /^(\d+)\/(\d+)\s*(.*)$/;
  // Mixed number pattern (e.g., 1 1/2)
  const mixedRegex = /^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/;
  // Decimal or integer pattern (e.g., 2, 1.5, 0.25)
  const numberRegex = /^(\d+(?:\.\d+)?)\s*(.*)$/;

  const trimmed = line.trim();

  const mixedMatch = trimmed.match(mixedRegex);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    const val = (whole + num / den) * factor;
    return `${formatQuantity(val)} ${mixedMatch[4]}`;
  }

  const fractionMatch = trimmed.match(fractionRegex);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    const val = (num / den) * factor;
    return `${formatQuantity(val)} ${fractionMatch[3]}`;
  }

  const numMatch = trimmed.match(numberRegex);
  if (numMatch) {
    const val = parseFloat(numMatch[1]) * factor;
    return `${formatQuantity(val)} ${numMatch[2]}`;
  }

  return line;
}

function formatQuantity(num) {
  if (Math.abs(num - Math.round(num)) < 0.05) return Math.round(num);
  // Convert standard decimals to friendly fractions
  const rounded = Math.round(num * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  if (frac === 0.25) return whole > 0 ? `${whole} ¼` : '¼';
  if (frac === 0.5) return whole > 0 ? `${whole} ½` : '½';
  if (frac === 0.75) return whole > 0 ? `${whole} ¾` : '¾';
  return rounded.toFixed(1).replace(/\.0$/, '');
}

function renderIngredients() {
  const listEl = document.getElementById('ingredientList');
  if (!listEl || !currentRecipe) return;

  const factor = currentServings / (baseServings || 1);
  listEl.innerHTML = currentRecipe.ingredients.map((ing, i) => {
    const scaled = scaleIngredient(ing, factor);
    return `
      <li class="ingredient-item" data-index="${i}">
        <input type="checkbox" aria-label="Mark as ready">
        <span>${scaled}</span>
      </li>
    `;
  }).join('');

  listEl.querySelectorAll('.ingredient-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('checked');
      const cb = item.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = item.classList.contains('checked');
    });
  });
}

function updateServings(newServings) {
  if (newServings < 1 || newServings > 30) return;
  currentServings = newServings;
  const countEl = document.getElementById('servingsCount');
  if (countEl) countEl.textContent = currentServings;
  renderIngredients();
}

// Toggle Bookmark / Favorite
async function toggleFavorite(btn) {
  try {
    const res = await fetch(`http://localhost:5000/api/recipes/${recipeId}/favorite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (res.ok) {
      btn.classList.toggle('active', data.isFavorite);
      const countEl = btn.querySelector('.fav-count');
      if (countEl) countEl.textContent = data.favoritesCount;
      const textEl = btn.querySelector('.fav-text');
      if (textEl) textEl.textContent = data.isFavorite ? 'Saved to Favorites' : 'Save to Favorites';
    }
  } catch (err) {
    console.error('Error toggling favorite:', err);
  }
}

// Submit a star rating & review
async function submitReview() {
  const reviewTextEl = document.getElementById('reviewText');
  const reviewMsgEl = document.getElementById('reviewMsg');
  const text = reviewTextEl ? reviewTextEl.value.trim() : '';

  try {
    const res = await fetch(`http://localhost:5000/api/recipes/${recipeId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        rating: userRatingScore,
        review: text,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (reviewMsgEl) {
        reviewMsgEl.textContent = 'Thank you for your review!';
        reviewMsgEl.style.color = 'green';
      }
      if (reviewTextEl) reviewTextEl.value = '';
      currentRecipe.ratings = data.ratings;
      currentRecipe.averageRating = data.averageRating;
      currentRecipe.numReviews = data.numReviews;
      renderReviewsList();
      updateRatingHeaders();
    } else {
      if (reviewMsgEl) {
        reviewMsgEl.textContent = data.error || 'Failed to submit review';
        reviewMsgEl.style.color = 'red';
      }
    }
  } catch (err) {
    console.error('Submit review error:', err);
  }
}

function updateRatingHeaders() {
  const avgEl = document.getElementById('avgRatingNum');
  const countEl = document.getElementById('reviewsCountNum');
  const starsEl = document.getElementById('avgStarsDisplay');
  if (avgEl) avgEl.textContent = currentRecipe.averageRating || '0.0';
  if (countEl) countEl.textContent = `(${currentRecipe.numReviews || 0} reviews)`;
  if (starsEl) starsEl.textContent = '★'.repeat(Math.round(currentRecipe.averageRating || 0)) + '☆'.repeat(5 - Math.round(currentRecipe.averageRating || 0));
}

function renderReviewsList() {
  const container = document.getElementById('reviewsList');
  if (!container || !currentRecipe) return;

  const ratings = currentRecipe.ratings || [];
  if (ratings.length === 0) {
    container.innerHTML = '<p style="color: #64748b; font-style: italic;">No reviews yet. Be the first to rate this recipe!</p>';
    return;
  }

  container.innerHTML = ratings.map(r => `
    <div class="review-item">
      <div class="review-header">
        <span class="reviewer-name">${r.user?.username || 'Community Cook'}</span>
        <span class="stars-display">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </div>
      ${r.review ? `<p class="review-text">${r.review}</p>` : ''}
    </div>
  `).join('');
}

async function loadRecipe() {
  const container = document.getElementById('recipeContent');

  if (!recipeId) {
    stateBox(container, '🤔', 'No recipe specified', 'We couldn\'t tell which recipe to open.', null);
    return;
  }

  container.innerHTML = skeletonMarkup();

  try {
    const res = await fetch(`http://localhost:5000/api/recipes/${recipeId}`);
    const recipe = await res.json();

    if (!res.ok) {
      stateBox(container, '🍽️', 'Recipe not found', 'This recipe may have been removed.', null);
      return;
    }

    currentRecipe = recipe;
    baseServings = recipe.servings || 4;
    currentServings = baseServings;

    const listenBtn = ttsSupported
      ? `<button id="listenBtn" class="listen-btn" type="button" aria-pressed="false">
           <span aria-hidden="true">🔊</span><span id="listenLabel">Listen to recipe</span>
         </button>` : '';

    const dietaryTags = (recipe.dietary || []).map(d => `<span class="recipe-tag" style="background:#10b981">${d}</span>`).join(' ');

    container.innerHTML = `
      <a href="index.html" class="back-link">← Back to recipes</a>

      <div class="recipe-actions-bar">
        ${listenBtn}
        <button id="favoriteBtn" class="btn-favorite" type="button">
          <span>❤️</span>
          <span class="fav-text">Save to Favorites</span>
          <span class="fav-count" style="font-weight:700">(${recipe.favoritesCount || 0})</span>
        </button>
      </div>

      <div class="recipe-hero">
        <img src="${getImageUrl(recipe.image)}" alt="${recipe.title}">
      </div>

      <div class="recipe-tags">
        <span class="recipe-tag">${recipe.cuisine || 'General'}</span>
        ${recipe.difficulty ? `<span class="recipe-tag" style="background:#6366f1">${recipe.difficulty}</span>` : ''}
        ${dietaryTags}
      </div>

      <h1 class="recipe-title">${recipe.title}</h1>

      <div class="recipe-author-row">
        <span aria-hidden="true">👤</span>
        ${recipe.author?._id
          ? `<span>By <a class="author-link" href="profile.html?id=${recipe.author._id}">${recipe.author.username || 'Unknown'}</a></span>`
          : `<span>By ${recipe.author?.username || 'Unknown'}</span>`}
        <span style="margin-left:auto; display:flex; align-items:center; gap:0.3rem">
          <span style="color:#f59e0b">★</span>
          <strong id="avgRatingNum">${recipe.averageRating || '0.0'}</strong>
          <span id="reviewsCountNum" style="color:#64748b; font-size:0.85rem">(${recipe.numReviews || 0} reviews)</span>
        </span>
      </div>

      <div class="info-box">
        <h3>Recipe Time &amp; Details</h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon" aria-hidden="true">⏱️</div>
            <div class="stat-label">Prep</div>
            <div class="stat-value">${recipe.prepTime || '-'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon" aria-hidden="true">🍳</div>
            <div class="stat-label">Cook</div>
            <div class="stat-value">${recipe.cookTime || '-'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon" aria-hidden="true">🔥</div>
            <div class="stat-label">Calories</div>
            <div class="stat-value">${recipe.calories ? `${recipe.calories} kcal` : '-'}</div>
          </div>
        </div>
      </div>

      <div class="info-box">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem">
          <h3 style="margin-bottom:0">Ingredients</h3>
          <!-- Dynamic Portion Scaler -->
          <div class="portion-scaler" title="Scale recipe measurements by servings">
            <span class="label">Servings:</span>
            <button class="scaler-btn" id="btnScaleDown" type="button" aria-label="Decrease servings">-</button>
            <span class="scaler-count" id="servingsCount">${currentServings}</span>
            <button class="scaler-btn" id="btnScaleUp" type="button" aria-label="Increase servings">+</button>
          </div>
        </div>

        <ul class="ingredient-list" id="ingredientList"></ul>
      </div>

      <div class="info-box">
        <h3>Instructions</h3>
        ${recipe.steps.map((step, i) => `
          <div class="instruction-step">
            <div class="step-number">${String(i + 1).padStart(2, '0')}.</div>
            <div class="step-text">${step}</div>
          </div>
        `).join('')}
      </div>

      <!-- Community Reviews Section -->
      <div class="info-box reviews-section">
        <div class="rating-summary-header">
          <div>
            <h3>Community Reviews &amp; Ratings</h3>
            <span class="stars-display" id="avgStarsDisplay"></span>
          </div>
        </div>

        <!-- Add Review Form -->
        <div class="add-review-card">
          <h4 style="margin-bottom:0.4rem; color:var(--secondary-color)">Rate this Recipe</h4>
          <div class="star-picker" id="starPicker">
            <button class="star-pick-btn active" data-val="1" type="button">★</button>
            <button class="star-pick-btn active" data-val="2" type="button">★</button>
            <button class="star-pick-btn active" data-val="3" type="button">★</button>
            <button class="star-pick-btn active" data-val="4" type="button">★</button>
            <button class="star-pick-btn active" data-val="5" type="button">★</button>
          </div>
          <textarea id="reviewText" class="review-textarea" placeholder="Share your experience, cooking tips, or tweaks..."></textarea>
          <div style="display:flex; justify-content:space-between; align-items:center">
            <button id="btnSubmitReview" class="btn-submit-review" type="button">Post Review</button>
            <span id="reviewMsg" style="font-size:0.9rem"></span>
          </div>
        </div>

        <div class="reviews-list" id="reviewsList"></div>
      </div>
    `;

    renderIngredients();
    renderReviewsList();
    updateRatingHeaders();

    // Setup Scaler Event Listeners
    const btnDown = document.getElementById('btnScaleDown');
    const btnUp = document.getElementById('btnScaleUp');
    if (btnDown) btnDown.addEventListener('click', () => updateServings(currentServings - 1));
    if (btnUp) btnUp.addEventListener('click', () => updateServings(currentServings + 1));

    // Setup Favorite Toggle
    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) favBtn.addEventListener('click', () => toggleFavorite(favBtn));

    // Setup Star Rating Picker
    const starBtns = document.querySelectorAll('.star-pick-btn');
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        userRatingScore = parseInt(btn.getAttribute('data-val'));
        starBtns.forEach(b => {
          const val = parseInt(b.getAttribute('data-val'));
          b.classList.toggle('active', val <= userRatingScore);
        });
      });
    });

    const submitReviewBtn = document.getElementById('btnSubmitReview');
    if (submitReviewBtn) submitReviewBtn.addEventListener('click', submitReview);

    // Setup Text-to-Speech
    if (ttsSupported) setupListen(recipe);

  } catch (err) {
    console.error(err);
    stateBox(container, '📡', 'Couldn\'t load the recipe',
      'We couldn\'t reach the kitchen. Check that the server is running, then try again.', loadRecipe);
  }
}

function setupListen(recipe) {
  const btn = document.getElementById('listenBtn');
  const label = document.getElementById('listenLabel');
  if (!btn) return;

  const timing = [];
  if (recipe.prepTime) timing.push(`prep ${recipe.prepTime}`);
  if (recipe.cookTime) timing.push(`cook ${recipe.cookTime}`);
  if (recipe.servings) timing.push(`serves ${recipe.servings}`);

  function buildSegments() {
    const intro = [
      `${recipe.title}.`,
      recipe.cuisine ? `A ${recipe.cuisine} recipe.` : '',
      timing.length ? `${timing.join(', ')}.` : ''
    ].filter(Boolean).join(' ');

    const ingredients = `Ingredients: ${(recipe.ingredients || []).join(', ')}.`;
    const instructions = `Instructions. ${(recipe.steps || []).map((s, i) => `Step ${i + 1}. ${s}`).join(' ')}`;

    return [intro, ingredients, instructions].filter(Boolean);
  }

  function setState(on) {
    btn.classList.toggle('speaking', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    label.textContent = on ? 'Stop reading' : 'Listen to recipe';
  }

  function playSegments(segments, lang, isEnglish, callbacks) {
    const translated = segments.map(seg =>
      isEnglish ? Promise.resolve(seg) : window.FlavorizAssistant.translate(seg, lang)
    );

    let index = 0;
    let stopped = false;

    function playNext() {
      if (stopped) return;
      if (index >= translated.length) { callbacks.onend && callbacks.onend(); return; }
      const mySeq = index;
      translated[mySeq]
        .then(text => {
          if (stopped) return;
          window.FlavorizAssistant.speak(text, lang, {
            onstart: mySeq === 0 ? callbacks.onstart : undefined,
            onend: () => { index++; playNext(); },
            onerror: () => { index++; playNext(); }
          });
        })
        .catch(() => { index++; playNext(); });
    }

    playNext();
    return { stop: () => { stopped = true; } };
  }

  let activePlayer = null;

  btn.addEventListener('click', () => {
    if (btn.classList.contains('speaking')) {
      if (activePlayer) activePlayer.stop();
      if (window.FlavorizAssistant) window.FlavorizAssistant.stopSpeaking();
      else window.speechSynthesis.cancel();
      setState(false);
      return;
    }

    if (window.FlavorizAssistant) window.FlavorizAssistant.stopSpeaking();
    else window.speechSynthesis.cancel();

    btn.classList.add('speaking');
    btn.setAttribute('aria-pressed', 'true');
    label.textContent = 'Preparing…';

    if (window.FlavorizAssistant && window.FlavorizAssistant.translate) {
      const lang = window.FlavorizAssistant.getLanguage ? window.FlavorizAssistant.getLanguage() : 'en-US';
      const isEnglish = lang.toLowerCase().indexOf('en') === 0;
      activePlayer = playSegments(buildSegments(), lang, isEnglish, {
        onstart: () => { label.textContent = 'Stop reading'; },
        onend: () => setState(false),
        onerror: () => setState(false)
      });
    } else {
      const narration = buildSegments().join(' ');
      const u = new SpeechSynthesisUtterance(narration);
      u.lang = 'en-US'; u.rate = 1; u.pitch = 1;
      u.onstart = () => { label.textContent = 'Stop reading'; };
      u.onend = () => setState(false);
      u.onerror = () => setState(false);
      window.speechSynthesis.speak(u);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (activePlayer) activePlayer.stop();
    if (window.FlavorizAssistant) window.FlavorizAssistant.stopSpeaking();
    else window.speechSynthesis.cancel();
  });
}

loadRecipe();

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
  });
}
