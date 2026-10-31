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

    const listenBtn = ttsSupported
      ? `<button id="listenBtn" class="listen-btn" type="button" aria-pressed="false">
           <span aria-hidden="true">🔊</span><span id="listenLabel">Listen to recipe</span>
         </button>` : '';

    container.innerHTML = `
      <a href="index.html" class="back-link">← Back to recipes</a>
      ${listenBtn}

      <div class="recipe-hero">
        <img src="${getImageUrl(recipe.image)}" alt="${recipe.title}">
      </div>

      <div class="recipe-tags">
        <span class="recipe-tag">${recipe.cuisine || 'General'}</span>
      </div>

      <h1 class="recipe-title">${recipe.title}</h1>

      <div class="recipe-author-row">
        <span aria-hidden="true">👤</span>
        ${recipe.author?._id
          ? `<span>By <a class="author-link" href="profile.html?id=${recipe.author._id}">${recipe.author.username || 'Unknown'}</a></span>`
          : `<span>By ${recipe.author?.username || 'Unknown'}</span>`}
      </div>

      <div class="info-box">
        <h3>Recipe Time &amp; More</h3>
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
            <div class="stat-icon" aria-hidden="true">🍽️</div>
            <div class="stat-label">Serves</div>
            <div class="stat-value">${recipe.servings || '-'}</div>
          </div>
        </div>
      </div>

      <div class="info-box">
        <h3>Ingredients</h3>
        <ul class="ingredient-list" id="ingredientList">
          ${recipe.ingredients.map((ing, i) => `
            <li class="ingredient-item" data-index="${i}">
              <input type="checkbox" aria-label="Mark ${ing} as ready">
              <span>${ing}</span>
            </li>
          `).join('')}
        </ul>
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
    `;

    // Make ingredient checkboxes toggle a strikethrough on click
    document.querySelectorAll('.ingredient-item').forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('checked');
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.checked = item.classList.contains('checked');
      });
    });

    // ----- Read the recipe aloud (voice assistant) -----
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

  // Split the narration into small chunks so playback can start after
  // translating just the short intro line, while the (longer) ingredients
  // and instructions translate in the background in parallel.
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

  // Plays a list of text segments back-to-back in the given language.
  // All segments start translating immediately in parallel (not one at a
  // time), so later segments are usually ready well before playback
  // reaches them — only the first (short) segment's translation time is
  // actually felt as a delay.
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
            onerror: () => { index++; playNext(); } // skip a broken segment rather than stalling
          });
        })
        .catch(() => { index++; playNext(); });
    }

    playNext();
    return { stop: () => { stopped = true; } };
  }

  let activePlayer = null;

  btn.addEventListener('click', () => {
    // Currently speaking -> stop
    if (btn.classList.contains('speaking')) {
      if (activePlayer) activePlayer.stop();
      if (window.FlavorizAssistant) window.FlavorizAssistant.stopSpeaking();
      else window.speechSynthesis.cancel();
      setState(false);
      return;
    }

    // Stop anything else (chat replies, a previous read) before starting
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
      // Fallback if assistant.js didn't load for some reason — English only
      const narration = buildSegments().join(' ');
      const u = new SpeechSynthesisUtterance(narration);
      u.lang = 'en-US'; u.rate = 1; u.pitch = 1;
      u.onstart = () => { label.textContent = 'Stop reading'; };
      u.onend = () => setState(false);
      u.onerror = () => setState(false);
      window.speechSynthesis.speak(u);
    }
  });

  // Stop narration if the user leaves the page
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