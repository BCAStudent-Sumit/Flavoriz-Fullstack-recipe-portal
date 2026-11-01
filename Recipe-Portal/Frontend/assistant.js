/* ============================================================
   assistant.js — "Chef Flavo", the Flavoriz cooking assistant
   ------------------------------------------------------------
   • Talks to the backend LLM (/api/assistant) when a key is set,
     and always falls back to a capable offline engine that uses
     your real recipe data + a built-in cooking knowledge base.
   • Skills: find/recommend recipes, "what can I make with…",
     substitutions & conversions, cooking tips, site help,
     step-by-step help adding a recipe, and full AI AUTO-FILL of
     the Add Recipe form (title -> cuisine, servings, prep/cook
     time, ingredients, steps — user only supplies the photo).
   • Voice: speak-to-type (SpeechRecognition) and read-aloud
     replies + recipes (speechSynthesis) — in a user-selectable
     language, including Indian and foreign languages, with
     replies translated on the fly for spoken output.
   ============================================================ */
(function () {
  'use strict';

  var API_BASE = 'http://localhost:5000';
  var TTS_KEY = 'flavoriz-tts';
  var LANG_KEY = 'flavoriz-lang';
  var AUTOFILL_KEY = 'flavoriz-autofill-title'; // carries a title across a page navigation

  // Languages offered for voice input/output. code = BCP-47 tag used by both
  // SpeechRecognition and SpeechSynthesis. Actual voice availability for
  // synthesis depends on the browser/OS's installed voices.
  var LANGUAGES = [
    // Indian languages
    { code: 'hi-IN', name: 'Hindi', group: 'Indian' },
    { code: 'bn-IN', name: 'Bengali', group: 'Indian' },
    { code: 'ta-IN', name: 'Tamil', group: 'Indian' },
    { code: 'te-IN', name: 'Telugu', group: 'Indian' },
    { code: 'mr-IN', name: 'Marathi', group: 'Indian' },
    { code: 'gu-IN', name: 'Gujarati', group: 'Indian' },
    { code: 'kn-IN', name: 'Kannada', group: 'Indian' },
    { code: 'ml-IN', name: 'Malayalam', group: 'Indian' },
    { code: 'pa-IN', name: 'Punjabi', group: 'Indian' },
    { code: 'ur-IN', name: 'Urdu', group: 'Indian' },
    { code: 'or-IN', name: 'Odia', group: 'Indian' },
    { code: 'as-IN', name: 'Assamese', group: 'Indian' },
    { code: 'en-IN', name: 'English (India)', group: 'Indian' },
    // Foreign languages
    { code: 'en-US', name: 'English (US)', group: 'Foreign' },
    { code: 'en-GB', name: 'English (UK)', group: 'Foreign' },
    { code: 'es-ES', name: 'Spanish', group: 'Foreign' },
    { code: 'fr-FR', name: 'French', group: 'Foreign' },
    { code: 'de-DE', name: 'German', group: 'Foreign' },
    { code: 'it-IT', name: 'Italian', group: 'Foreign' },
    { code: 'pt-PT', name: 'Portuguese', group: 'Foreign' },
    { code: 'ru-RU', name: 'Russian', group: 'Foreign' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)', group: 'Foreign' },
    { code: 'ja-JP', name: 'Japanese', group: 'Foreign' },
    { code: 'ko-KR', name: 'Korean', group: 'Foreign' },
    { code: 'ar-SA', name: 'Arabic', group: 'Foreign' },
    { code: 'tr-TR', name: 'Turkish', group: 'Foreign' },
    { code: 'id-ID', name: 'Indonesian', group: 'Foreign' },
    { code: 'vi-VN', name: 'Vietnamese', group: 'Foreign' },
    { code: 'th-TH', name: 'Thai', group: 'Foreign' }
  ];

  /* ---------------- state ---------------- */
  var state = {
    open: false,
    history: [],           // {role, content} for the LLM
    recipes: null,         // cached recipe list
    llm: null,             // null=unknown, true/false once probed
    listening: false,
    tts: false,
    lang: 'en-US',
    speechSeq: 0,          // bumped on every stop/new speak so stale, in-flight translations don't speak late
    greeted: false
  };

  /* ---------------- small helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function imgUrl(img) {
    if (!img) return 'https://via.placeholder.com/96?text=%F0%9F%8D%BD%EF%B8%8F';
    return /^https?:/.test(img) ? img : API_BASE + img;
  }
  function stripForSpeech(t) {
    return String(t)
      .replace(/<[^>]+>/g, ' ')
      .replace(/[*_`#>]/g, '')
      .replace(/[\u{1F000}-\u{1FFFF}←-➿⬀-⯿️]/gu, '')
      .replace(/\s+/g, ' ').trim();
  }

  /* ============================================================
     COOKING KNOWLEDGE BASE (offline)
     ============================================================ */
  var SUBS = {
    'buttermilk': '1 cup buttermilk = 1 cup milk + 1 tbsp lemon juice or white vinegar (rest 5 min).',
    'egg': '1 egg = 1/4 cup unsweetened applesauce, OR 1 tbsp ground flax + 3 tbsp water (rest 5 min), OR 1/4 cup mashed banana (in bakes).',
    'butter': '1 cup butter = 1 cup oil (for many bakes) or 1 cup margarine; in cakes, 3/4 cup applesauce works.',
    'heavy cream': '1 cup heavy cream = 3/4 cup milk + 1/4 cup melted butter (not for whipping).',
    'sour cream': '1 cup sour cream = 1 cup plain Greek yogurt, 1:1.',
    'sugar': '1 cup white sugar = 1 cup packed brown sugar, or 3/4 cup honey (reduce other liquid slightly).',
    'brown sugar': '1 cup brown sugar = 1 cup white sugar + 1 tbsp molasses.',
    'baking powder': '1 tsp baking powder = 1/4 tsp baking soda + 1/2 tsp cream of tartar.',
    'cornstarch': '1 tbsp cornstarch (thickener) = 2 tbsp all-purpose flour.',
    'self-rising flour': '1 cup self-rising flour = 1 cup plain flour + 1 1/2 tsp baking powder + 1/4 tsp salt.',
    'honey': '1 cup honey = 1 1/4 cup sugar + 1/4 cup extra liquid.',
    'garlic': '1 clove garlic = 1/8 tsp garlic powder.',
    'onion': '1 medium onion = 1 tbsp onion powder or 1/4 cup dried minced onion.',
    'wine': 'Cooking wine = stock, broth, or a splash of vinegar/grape juice for acidity.',
    'breadcrumbs': 'Breadcrumbs = crushed crackers, rolled oats, or crushed cornflakes.',
    'milk': '1 cup milk = 1 cup water + 1 tbsp butter, or any unsweetened plant milk.',
    'lemon juice': 'Lemon juice = lime juice (1:1) or 1/2 as much white vinegar.',
    'yogurt': 'Yogurt = sour cream or buttermilk, 1:1.',
    'mayonnaise': 'Mayo = plain Greek yogurt or mashed avocado (in dressings).'
  };

  var TIPS = [
    { k: ['boil egg', 'hard boil', 'soft boil', 'boiled egg'], a: 'Eggs: soft = 6 min, jammy = 7 min, hard = 9–10 min in gently boiling water, then straight into an ice bath so they peel cleanly.' },
    { k: ['rest meat', 'rest steak', 'resting'], a: 'Rest cooked meat 5–10 minutes before slicing so the juices redistribute instead of running out.' },
    { k: ['pasta water', 'salt pasta', 'season pasta'], a: 'Salt pasta water until it "tastes like the sea" (~1 tbsp per 4 cups), and save a cup of the starchy water to loosen your sauce.' },
    { k: ['dice onion', 'chop onion', 'cut onion'], a: 'Dice an onion: halve through the root, keep the root intact, slice horizontally then vertically, then cut across — the root holds it together.' },
    { k: ['sear', 'brown meat', 'crust'], a: 'For a good sear: pat the surface dry, use a hot pan, don\'t crowd it, and don\'t move the food until it releases on its own.' },
    { k: ['ripe avocado', 'avocado'], a: 'Speed-ripen avocados in a paper bag with a banana; the ethylene gas softens them in a day or two.' },
    { k: ['fluffy rice', 'cook rice'], a: 'Fluffy rice: rinse until the water runs clear, use a 1:1.5 rice-to-water ratio for white rice, and let it steam off-heat 10 min before fluffing.' }
  ];

  var CONVERSIONS =
    '<strong>Handy conversions</strong><ul>' +
    '<li>1 cup = 16 tbsp = 48 tsp = 240 ml</li>' +
    '<li>1 tbsp = 3 tsp = 15 ml</li>' +
    '<li>1 stick butter = 1/2 cup = 8 tbsp = 113 g</li>' +
    '<li>1 cup flour ≈ 120 g · 1 cup sugar ≈ 200 g · 1 cup brown sugar ≈ 220 g</li>' +
    '<li>Oven: 350°F = 175°C · 375°F = 190°C · 400°F = 200°C · 425°F = 220°C</li></ul>';

  var HELP = {
    add: 'To add a recipe: open <a href="recipe.html">Add Recipe</a> in the nav, fill in the title, cuisine, servings, prep &amp; cook time, tap the photo box to upload an image, then list your ingredients and steps <em>one per line</em>, and hit <strong>Publish Recipe</strong>. You need to be logged in.<br><br>Or just tell me: <em>“generate recipe for Chicken Biryani”</em> and I\'ll fill everything in for you — you\'ll only need to add the photo.',
    filter: 'To browse by category, hover <strong>Recipes ▾</strong> in the nav and pick a type, cuisine, or diet — or tap a dish and use <strong>✕ Clear filter</strong> to reset.',
    profile: 'Your <a href="profile.html">Profile</a> shows your recipes and stats. Tap the ✎ on your avatar to change your photo.',
    password: 'Forgot your password? On the <a href="login.html">login page</a> use <strong>Forgot password?</strong> — you\'ll get a reset link by email.',
    editdelete: 'On recipes you created, the card shows <strong>✎ Edit</strong> and <strong>🗑 Delete</strong> buttons. They only appear on your own recipes.',
    account: 'Use <a href="signup.html">Sign Up</a> to create an account or <a href="login.html">Log In</a> if you already have one. <strong>Logout</strong> is in the top-right of the nav.'
  };

  /* ============================================================
     RECIPE DATA (offline grounding)
     ============================================================ */
  function fetchRecipes() {
    if (state.recipes) return Promise.resolve(state.recipes);
    return fetch(API_BASE + '/api/recipes')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { state.recipes = Array.isArray(list) ? list : []; return state.recipes; })
      .catch(function () { state.recipes = []; return state.recipes; });
  }

  var STOP = {the:1,a:1,an:1,and:1,or:1,with:1,some:1,i:1,have:1,got:1,make:1,cook:1,
    can:1,what:1,using:1,use:1,for:1,to:1,me:1,my:1,of:1,in:1,'':1,recipe:1,recipes:1,
    find:1,show:1,want:1,like:1,please:1,something:1,dish:1,any:1,got:1};

  function tokens(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(function (w) { return w && !STOP[w] && w.length > 1; });
  }

  function searchRecipes(query, limit) {
    var q = String(query).toLowerCase();
    var terms = tokens(query);
    return (state.recipes || []).map(function (r) {
      var hay = (r.title + ' ' + (r.cuisine || '') + ' ' + (r.ingredients || []).join(' ')).toLowerCase();
      var score = 0;
      if (r.title && q.indexOf(r.title.toLowerCase()) > -1) score += 6;
      if (r.cuisine && q.indexOf(r.cuisine.toLowerCase()) > -1) score += 4;
      terms.forEach(function (t) {
        if ((r.title || '').toLowerCase().indexOf(t) > -1) score += 3;
        else if ((r.cuisine || '').toLowerCase().indexOf(t) > -1) score += 2;
        else if (hay.indexOf(t) > -1) score += 1;
      });
      return { r: r, score: score };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 4).map(function (x) { return x.r; });
  }

  function whatCanIMake(ingredients, limit) {
    var have = ingredients.map(function (s) { return s.toLowerCase().trim(); }).filter(Boolean);
    return (state.recipes || []).map(function (r) {
      var ing = (r.ingredients || []).join(' ').toLowerCase();
      var matched = have.filter(function (h) { return ing.indexOf(h) > -1; });
      return { r: r, matched: matched, score: matched.length };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 4);
  }

  /* ============================================================
     AI AUTO-FILL: "generate recipe for <title>" -> fills the
     Add Recipe form (cuisine, servings, prep/cook time,
     ingredients, steps). User only supplies the photo, then
     taps Publish.
     ============================================================ */
  function isOnAddRecipePage() {
    return /(^|\/)recipe\.html(\?|$)/i.test(location.pathname + location.search) ||
           /add-recipe/i.test(location.pathname);
  }

  // Recognizes things like:
  //   "generate recipe for Chicken Biryani"
  //   "auto-fill recipe: Paneer Butter Masala"
  //   "add recipe for Mango Lassi"
  //   "create a recipe called Veg Pulao"
  function matchAutoFillIntent(text) {
    var m = text.match(/^(?:ai\s+)?(?:auto[- ]?generate|auto[- ]?fill|autofill|generate)\s+(?:a\s+|the\s+)?recipe\b\s*(?:for|called|named|titled)?\s*[:\-]?\s*(.+)$/i);
    if (m && m[1]) return m[1];
    m = text.match(/^(?:add|create|make)\s+(?:a\s+|the\s+)?recipe\s+(?:for|called|named|titled)\s+(.+)$/i);
    if (m && m[1]) return m[1];
    return null;
  }

  function cleanTitle(raw) {
    return String(raw || '')
      .replace(/^["'“]+|["'”]+$/g, '')
      .replace(/[.?!]+$/, '')
      .trim();
  }

  // Catches cases like sending just "generate recipe for" with nothing after it,
  // where the regex would otherwise capture a leftover connector word as the title.
  var TITLE_STOPWORDS = { for: 1, called: 1, named: 1, titled: 1, a: 1, an: 1, the: 1, recipe: 1, me: 1 };
  function isTitleTooVague(title) {
    var words = title.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length === 0 || (words.length === 1 && TITLE_STOPWORDS[words[0]]);
  }

  function startAutoFill(rawTitle) {
    var title = cleanTitle(rawTitle);
    if (!title || isTitleTooVague(title)) {
      return reply('What should I call the recipe? Try “generate recipe for Chicken Biryani”.');
    }
    if (!isOnAddRecipePage()) {
      try { sessionStorage.setItem(AUTOFILL_KEY, title); } catch (e) {}
      setTimeout(function () { window.location.href = 'recipe.html'; }, 600);
      return reply('Taking you to <strong>Add Recipe</strong> — I\'ll fill in the details for <strong>' + esc(title) + '</strong> as soon as we land there. 🍳');
    }
    return runAutoFill(title);
  }

  function authHeaders(extra) {
    var token = null;
    try { token = localStorage.getItem('token'); } catch (e) {}
    var headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  // Does the actual generation + form fill. Returns a Promise<payload>.
  function runAutoFill(title) {
    addBot(reply('Generating details for <strong>' + esc(title) + '</strong>… 🍳'));

    return fetch(API_BASE + '/api/ai/generate-recipe', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: title })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error((data && data.message) || 'Generation failed');
        return data;
      });
    }).then(function (data) {
      fillRecipeForm(title, data);
      return {
        html: 'Done! I\'ve filled in the <strong>cuisine, servings, prep &amp; cook time, ingredients</strong> and <strong>steps</strong> for you. 📸 Please choose a photo, then tap <strong>Publish Recipe</strong> below when you\'re ready.',
        plain: 'I filled in the recipe details. Please upload a photo, then publish.',
        actions: [{ label: 'Publish Recipe', run: publishRecipe }]
      };
    }).catch(function (err) {
      return reply('I couldn\'t auto-generate that recipe (' + esc(err && err.message ? err.message : 'unknown error') + '). You can still fill the form in yourself, or try a different title.');
    });
  }

  // Fills the Add Recipe form fields.
  // NOTE: verify these ids/names match your recipe.html markup exactly —
  // update the selectors below if your field names differ.
  function fillRecipeForm(title, data) {
    function setVal(el, v) { if (el && v !== undefined && v !== null) el.value = v; }

    setVal(document.getElementById('title') || document.querySelector('[name="title"]'), data.title || title);
    setVal(document.getElementById('cuisine') || document.querySelector('[name="cuisine"]'), data.cuisine || 'General');
    setVal(document.getElementById('servings') || document.querySelector('[name="servings"]'), data.servings || 4);
    setVal(document.getElementById('prepTime') || document.querySelector('[name="prepTime"]'), data.prepTime || 15);
    setVal(document.getElementById('cookTime') || document.querySelector('[name="cookTime"]'), data.cookTime || 30);

    var ingredientsEl = document.getElementById('ingredients') || document.querySelector('[name="ingredients"]');
    if (ingredientsEl) {
      ingredientsEl.value = Array.isArray(data.ingredients) ? data.ingredients.join('\n') : (data.ingredients || '');
    }

    var stepsEl = document.getElementById('instructions') || document.getElementById('steps') ||
      document.querySelector('[name="instructions"], [name="steps"]');
    if (stepsEl) {
      stepsEl.value = Array.isArray(data.instructions) ? data.instructions.join('\n') : (data.instructions || '');
    }

    // dispatch input events so any live character-counters / validators update
    [ingredientsEl, stepsEl].forEach(function (el) {
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    var imageInput = document.getElementById('image') || document.querySelector('input[type="file"]');
    if (imageInput) {
      imageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      imageInput.focus();
    }
  }

  function publishRecipe() {
    var imageInput = document.getElementById('image') || document.querySelector('input[type="file"]');
    if (imageInput && imageInput.files && imageInput.files.length === 0) {
      addBot(reply('⚠️ Please choose a photo first — tap the image box, then hit Publish again.'));
      imageInput.click();
      return;
    }
    var form = document.getElementById('recipeForm') || document.getElementById('recipe-form') || document.querySelector('form');
    if (!form) {
      addBot(reply('I couldn\'t find the recipe form on this page — please hit Publish Recipe manually.'));
      return;
    }
    if (form.requestSubmit) form.requestSubmit();
    else form.submit();
  }

  // If the assistant sent the user to recipe.html from another page,
  // pick up the pending title and auto-run once the page has loaded.
  function checkPendingAutofill() {
    if (!isOnAddRecipePage()) return;
    var pending = null;
    try {
      pending = sessionStorage.getItem(AUTOFILL_KEY);
      sessionStorage.removeItem(AUTOFILL_KEY);
    } catch (e) {}
    if (!pending) return;

    state.greeted = true; // skip the normal page greeting
    open();
    addBot(reply('Welcome! Let\'s get <strong>' + esc(pending) + '</strong> set up. 🍳'));
    fetchRecipes().then(function () {
      runAutoFill(pending).then(function (payload) { addBot(payload); });
    });
  }

  /* ============================================================
     OFFLINE REPLY ENGINE
     returns { html, plain, recipes?, chips?, actions? }
     ============================================================ */
  function reply(html, plain) { return { html: html, plain: plain || stripForSpeech(html) }; }

  function localReply(text) {
    return fetchRecipes().then(function () {
      var t = text.toLowerCase().trim();

      // greetings / thanks / help
      if (/^(hi|hey|hello|yo|hola|howdy)\b/.test(t))
        return withChips(reply('Hey! I\'m <strong>Chef Flavo</strong> 👨‍🍳 I can find recipes, tell you what to cook with what\'s in your fridge, suggest ingredient swaps, auto-generate a whole recipe for you, and walk you through publishing it. What are you in the mood for?'));
      if (/thank|thanks|thx|cheers/.test(t))
        return reply('Anytime — happy cooking! 🍳');
      if (/^help$|what can you do|who are you|your name/.test(t))
        return withChips(reply('I\'m <strong>Chef Flavo</strong>. I can:<ul><li>🔎 Find &amp; recommend recipes</li><li>🥕 Tell you what to make from ingredients you have</li><li>🔁 Suggest substitutions &amp; conversions</li><li>✨ Auto-generate &amp; publish a recipe for you (just add a photo)</li><li>🌐 Speak in your preferred language</li><li>🧭 Explain how the site works</li></ul>Ask me anything!'));

      // dark mode control
      if (/(dark|light|night) mode|theme/.test(t)) {
        if (window.FlavorizTheme) {
          if (/light|day/.test(t)) { window.FlavorizTheme.set('light'); return reply('Switched to <strong>light</strong> mode. ☀️'); }
          if (/dark|night/.test(t)) { window.FlavorizTheme.set('dark'); return reply('Switched to <strong>dark</strong> mode. 🌙'); }
          window.FlavorizTheme.toggle(); return reply('Toggled the theme for you.');
        }
      }

      // AI auto-fill a whole recipe (must run before the generic "add recipe" help below)
      var autoTitle = matchAutoFillIntent(text.trim());
      if (autoTitle) return startAutoFill(autoTitle);

      // add / edit a recipe (generic help)
      if (/(add|create|post|share|publish|upload|write|submit).*(recipe|dish)|how.*(add|post|share|upload).*recipe|add a recipe/.test(t))
        return withChips(reply(HELP.add), ['Take me to Add Recipe', 'Generate a recipe for me']);
      if (/take me to add recipe|go to add recipe|open add recipe/.test(t)) {
        setTimeout(function () { window.location.href = 'recipe.html'; }, 500);
        return reply('Opening the Add Recipe page for you… ✍️');
      }
      if (/(edit|update|change|delete|remove).*recipe/.test(t))
        return reply(HELP.editdelete);

      // what can I make with...
      if (/what can i (make|cook)|i have|what.*(do|can).*with|make with|cook with/.test(t)) {
        var after = text.replace(/^.*?(with|have|from)\s+/i, '');
        if (after === text) after = text.replace(/what can i (make|cook)/i, '');
        var ings = after.split(/,| and |&|\n/).map(function (s) { return s.trim(); })
          .filter(function (s) { return s && !STOP[s.toLowerCase()]; });
        if (!ings.length)
          return reply('Tell me a few ingredients you have (e.g. “chicken, rice, tomato”) and I\'ll find matches.');
        var hits = whatCanIMake(ings);
        if (!hits.length)
          return reply('I couldn\'t find a recipe here using <strong>' + esc(ings.join(', ')) + '</strong> yet. Try fewer or more common ingredients — or add a recipe with them yourself!');
        var names = hits.map(function (h) { return h.r.title; });
        return {
          html: 'With <strong>' + esc(ings.join(', ')) + '</strong> you could make:',
          plain: 'With ' + ings.join(', ') + ', you could make: ' + names.join(', ') + '.',
          recipes: hits.map(function (h) {
            return { r: h.r, sub: h.matched.length + ' of your ingredients match' };
          })
        };
      }

      // substitutions
      if (/substitut|instead of|replace|replacement|don'?t have|no more|out of|alternative/.test(t)) {
        var key = Object.keys(SUBS).filter(function (k) { return t.indexOf(k) > -1; })
          .sort(function (a, b) { return b.length - a.length; })[0];
        if (key) return reply('🔁 <strong>' + key + '</strong>: ' + SUBS[key]);
        return withChips(reply('I\'ve got swaps for eggs, butter, buttermilk, sugar, baking powder, cream, and more. Which ingredient are you missing?'));
      }

      // conversions / measurements
      if (/convert|conversion|how many|how much|tbsp|tsp|tablespoon|teaspoon|grams|ounce|cup|celsius|fahrenheit|°|degrees|oven temp/.test(t))
        return reply(CONVERSIONS);

      // cooking tips
      var tip = TIPS.filter(function (x) { return x.k.some(function (k) { return t.indexOf(k) > -1; }); })[0];
      if (tip) return reply('💡 ' + tip.a);

      // site help / navigation
      if (/filter|categor|cuisine|browse|dropdown/.test(t)) return reply(HELP.filter);
      if (/profile|avatar|my recipes|followers/.test(t)) return reply(HELP.profile);
      if (/password|reset|forgot|can'?t log ?in/.test(t)) return reply(HELP.password);
      if (/log ?in|log ?out|sign ?up|account|register/.test(t)) return reply(HELP.account);

      // recipe search (find / recommend / cuisine / anything else)
      var found = searchRecipes(text, 4);
      if (found.length) {
        return {
          html: 'Here\'s what I found for “' + esc(text.trim()) + '”:',
          plain: 'I found: ' + found.map(function (r) { return r.title; }).join(', ') + '.',
          recipes: found.map(function (r) { return { r: r, sub: r.cuisine || 'Recipe' }; })
        };
      }

      // graceful fallback
      return withChips(reply(
        'I don\'t have a recipe matching that yet. You can try a cuisine (like <em>Italian</em> or <em>Indian</em>), tell me ingredients you have, ask for a substitution, say “generate recipe for …” to have me fill one in, or <a href="recipe.html">add the recipe</a> yourself.'));
    });
  }

  function withChips(payload, extra) {
    payload.chips = extra || ['Find a recipe', 'What can I make with…', 'Generate a recipe for me', 'Ingredient substitute'];
    return payload;
  }

  /* ============================================================
     LLM PATH (backend proxy) with offline fallback
     ============================================================ */
  function probeLLM() {
    if (state.llm !== null) return Promise.resolve(state.llm);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2500);
    return fetch(API_BASE + '/api/assistant/health', { signal: ctrl.signal })
      .then(function (r) { return r.ok ? r.json() : { llm: false }; })
      .then(function (d) { state.llm = !!(d && d.llm); return state.llm; })
      .catch(function () { state.llm = false; return state.llm; })
      .finally(function () { clearTimeout(timer); });
  }

  function askLLM(text) {
    return fetch(API_BASE + '/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: state.history.slice(-8) })
    }).then(function (r) {
      if (!r.ok) throw new Error('offline');
      return r.json();
    }).then(function (d) {
      if (!d || !d.reply) throw new Error('empty');
      var recipes = (d.recipes || []).map(function (r) { return { r: r, sub: r.cuisine || 'Recipe' }; });
      return { html: mdToHtml(d.reply), plain: stripForSpeech(d.reply), recipes: recipes };
    });
  }

  // tiny, safe markdown → html (bold, links, line breaks, "- " lists)
  function mdToHtml(md) {
    var safe = esc(md);
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\[(.+?)\]\((https?:[^)\s]+|[a-z0-9._-]+\.html[^)\s]*)\)/gi, '<a href="$2">$1</a>');
    safe = safe.replace(/(^|\n)-\s+(.+)/g, '$1• $2');
    return safe.replace(/\n/g, '<br>');
  }

  function respond(text) {
    typing(true);
    return probeLLM().then(function (hasLLM) {
      // AI auto-fill intent takes priority even when the backend LLM is up,
      // since it needs to actually manipulate the page, not just chat.
      var autoTitle = matchAutoFillIntent(text.trim());
      if (autoTitle) return startAutoFill(autoTitle);

      var chain = hasLLM
        ? askLLM(text).catch(function () { return localReply(text); })
        : localReply(text);
      return chain;
    }).then(function (payload) {
      typing(false);
      addBot(payload);
      state.history.push({ role: 'assistant', content: payload.plain });
    }).catch(function () {
      typing(false);
      addBot(reply('Hmm, something went wrong on my end. Please try again.'));
    });
  }

  /* ============================================================
     VOICE — input (SpeechRecognition) + output (speechSynthesis),
     both driven by the user's selected language (state.lang).
     ============================================================ */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;
  function initSpeech() {
    if (!SR) return null;
    var r = new SR();
    r.lang = state.lang || 'en-US';
    r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    r.onresult = function (e) {
      var txt = '';
      for (var i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      els.input.value = txt;
      autosize();
      if (e.results[e.results.length - 1].isFinal) {
        stopListening();
        if (txt.trim()) send();
      }
    };
    r.onerror = function () { stopListening(); };
    r.onend = function () { stopListening(); };
    return r;
  }
  function startListening() {
    if (!recog) recog = initSpeech();
    if (!recog) return;
    recog.lang = state.lang || 'en-US'; // pick up any language change since recog was created
    try { stopSpeaking(); recog.start(); state.listening = true; els.mic.classList.add('listening');
      els.mic.setAttribute('aria-label', 'Stop voice input'); showHint('Listening… speak now'); } catch (e) {}
  }
  function stopListening() {
    state.listening = false;
    if (els.mic) { els.mic.classList.remove('listening'); els.mic.setAttribute('aria-label', 'Start voice input'); }
    showHint('');
    if (recog) { try { recog.stop(); } catch (e) {} }
  }

  // Finds a browser-installed voice matching the given language code,
  // falling back to a same-language-family voice, then to none (browser default).
  function pickVoice(langCode) {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    var exact = voices.filter(function (v) { return v.lang && v.lang.toLowerCase() === langCode.toLowerCase(); })[0];
    if (exact) return exact;
    var prefix = langCode.split('-')[0].toLowerCase();
    var partial = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(prefix) === 0; })[0];
    return partial || null;
  }

  function speak(text, langCode, callbacks) {
    if (!('speechSynthesis' in window)) { if (callbacks && callbacks.onerror) callbacks.onerror(); return; }
    var clean = stripForSpeech(text);
    if (!clean) { if (callbacks && callbacks.onerror) callbacks.onerror(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(clean);
      var lang = langCode || state.lang || 'en-US';
      u.lang = lang;
      var voice = pickVoice(lang);
      if (voice) u.voice = voice;
      u.rate = 1; u.pitch = 1;
      if (callbacks) {
        if (callbacks.onstart) u.onstart = callbacks.onstart;
        if (callbacks.onend) u.onend = callbacks.onend;
        if (callbacks.onerror) u.onerror = callbacks.onerror;
      }
      window.speechSynthesis.speak(u);
    } catch (e) { if (callbacks && callbacks.onerror) callbacks.onerror(); }
  }
  function stopSpeaking() {
    state.speechSeq++; // invalidate any in-flight translation so it won't speak late
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  // Translates text into the currently selected language via the backend
  // (which proxies to Gemini), so spoken replies are actually in that
  // language rather than just read with an accented voice.
  function translateText(text, langCode) {
    var name = (LANGUAGES.filter(function (l) { return l.code === langCode; })[0] || {}).name || langCode;
    return fetch(API_BASE + '/api/ai/translate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text: text, targetLangName: name, targetLangCode: langCode })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.message) || 'Translate failed');
        return d.translated;
      });
    });
  }

  // Speaks text in the user's chosen language: English needs no translation,
  // anything else is translated first, with a silent fallback to the
  // original text (still read in the chosen voice) if translation fails.
  // Optional callbacks: { onstart, onend, onerror } — used by pages like
  // recipe-detail to drive their own "Listen to recipe" button state.
  function speakLocalized(text, callbacks) {
    if (!text) { if (callbacks && callbacks.onerror) callbacks.onerror(); return; }
    var seq = ++state.speechSeq; // this call "owns" this sequence number
    var lang = state.lang || 'en-US';
    if (lang.toLowerCase().indexOf('en') === 0) { speak(text, lang, callbacks); return; }
    translateText(stripForSpeech(text), lang)
      .then(function (translated) {
        if (seq !== state.speechSeq) return; // stopped/superseded while translating — don't speak late
        speak(translated || text, lang, callbacks);
      })
      .catch(function (err) {
        console.error('Chef Flavo: translation failed, falling back to original text —', err); // TEMP: for debugging
        if (seq !== state.speechSeq) return;
        speak(text, lang, callbacks);
      });
  }

  function setLang(code) {
    state.lang = code;
    try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    if (els.lang) els.lang.value = code;
    var name = (LANGUAGES.filter(function (l) { return l.code === code; })[0] || {}).name || code;
    addBot(reply('🌐 Got it — I\'ll listen for and reply in <strong>' + esc(name) + '</strong> from now on.'));
  }

  function setTts(on) {
    state.tts = on;
    try { localStorage.setItem(TTS_KEY, on ? '1' : '0'); } catch (e) {}
    if (els.speaker) {
      els.speaker.setAttribute('aria-pressed', on ? 'true' : 'false');
      els.speaker.textContent = on ? '🔊' : '🔈';
      els.speaker.setAttribute('aria-label', on ? 'Voice replies on' : 'Voice replies off');
      els.speaker.setAttribute('title', on ? 'Voice replies: on' : 'Voice replies: off');
    }
    if (!on) stopSpeaking();
  }

  /* ============================================================
     UI
     ============================================================ */
  var els = {};

  function buildLangOptions() {
    var groups = {};
    var order = [];
    LANGUAGES.forEach(function (l) {
      if (!groups[l.group]) { groups[l.group] = []; order.push(l.group); }
      groups[l.group].push(l);
    });
    var html = '';
    order.forEach(function (g) {
      html += '<optgroup label="' + esc(g) + '">';
      groups[g].forEach(function (l) {
        html += '<option value="' + esc(l.code) + '">' + esc(l.name) + '</option>';
      });
      html += '</optgroup>';
    });
    return html;
  }

  function build() {
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'flavo-fab';
    fab.setAttribute('aria-label', 'Ask Chef AI - your cooking assistant');
    fab.setAttribute('title', 'Ask Chef AI');
    fab.innerHTML = '<span class="flavo-fab-emoji" aria-hidden="true">👨‍🍳</span><span class="flavo-fab-label">Ask Chef AI</span>';
    fab.addEventListener('click', open);

    var panel = document.createElement('section');
    panel.className = 'flavo-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chef Flavo cooking assistant');
    panel.setAttribute('aria-modal', 'false');
    panel.innerHTML =
      '<header class="flavo-head">' +
        '<div class="flavo-avatar" aria-hidden="true">👨‍🍳</div>' +
        '<div class="flavo-title"><strong>Chef Flavo</strong>' +
          '<span><span class="flavo-status-dot"></span>Your cooking assistant</span></div>' +
        '<button class="flavo-speaker no-theme-anim" type="button" aria-pressed="false" aria-label="Voice replies off" title="Voice replies: off">🔈</button>' +
        '<button class="flavo-close no-theme-anim" type="button" aria-label="Close assistant">✕</button>' +
      '</header>' +
      '<div class="flavo-lang-bar">' +
        '<label for="flavoLang">🌐 Voice language</label>' +
        '<select id="flavoLang" aria-label="Voice language">' + buildLangOptions() + '</select>' +
      '</div>' +
      '<div class="flavo-log" id="flavoLog" role="log" aria-live="polite" aria-atomic="false"></div>' +
      '<div class="flavo-listening-hint" id="flavoHint"></div>' +
      '<div class="flavo-chips" id="flavoChips"></div>' +
      '<form class="flavo-input" id="flavoForm">' +
        '<textarea id="flavoText" rows="1" placeholder="Ask about recipes, swaps, or cooking…" aria-label="Message Chef Flavo"></textarea>' +
        '<button class="flavo-icon-btn flavo-mic no-theme-anim" id="flavoMic" type="button" aria-label="Start voice input" title="Speak">🎤</button>' +
        '<button class="flavo-icon-btn flavo-send no-theme-anim" id="flavoSend" type="submit" aria-label="Send message" title="Send">➤</button>' +
      '</form>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    els.fab = fab; els.panel = panel;
    els.log = panel.querySelector('#flavoLog');
    els.chips = panel.querySelector('#flavoChips');
    els.form = panel.querySelector('#flavoForm');
    els.input = panel.querySelector('#flavoText');
    els.mic = panel.querySelector('#flavoMic');
    els.send = panel.querySelector('#flavoSend');
    els.speaker = panel.querySelector('.flavo-speaker');
    els.close = panel.querySelector('.flavo-close');
    els.hint = panel.querySelector('#flavoHint');
    els.lang = panel.querySelector('#flavoLang');

    els.close.addEventListener('click', close);
    els.speaker.addEventListener('click', function () { setTts(!state.tts); });
    els.lang.addEventListener('change', function () { setLang(els.lang.value); });
    els.form.addEventListener('submit', function (e) { e.preventDefault(); send(); });
    els.input.addEventListener('input', autosize);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    els.mic.addEventListener('click', function () { state.listening ? stopListening() : startListening(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });

    if (!SR) { els.mic.hidden = true; }              // hide mic if unsupported
    if (!('speechSynthesis' in window)) { els.speaker.hidden = true; els.lang.hidden = true; panel.querySelector('.flavo-lang-bar').hidden = true; }

    // restore TTS + language preferences
    var pref = null; try { pref = localStorage.getItem(TTS_KEY); } catch (e) {}
    setTts(pref === '1');

    var langPref = null; try { langPref = localStorage.getItem(LANG_KEY); } catch (e) {}
    state.lang = langPref || 'en-US';
    if (els.lang) els.lang.value = state.lang;

    // if the user asked to auto-generate a recipe from another page,
    // resume that now that we're on recipe.html
    checkPendingAutofill();
  }

  function autosize() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 96) + 'px';
  }
  function showHint(txt) { if (els.hint) els.hint.textContent = txt || ''; }

  function scrollDown() { els.log.scrollTop = els.log.scrollHeight; }

  function addUser(text) {
    var m = document.createElement('div');
    m.className = 'flavo-msg user';
    m.innerHTML = '<div class="bubble">' + esc(text) + '</div>';
    els.log.appendChild(m); scrollDown();
  }

  function recipeCardsHtml(recipes) {
    if (!recipes || !recipes.length) return '';
    return '<div class="flavo-recipes">' + recipes.map(function (item) {
      var r = item.r;
      return '<a class="flavo-rcard" href="recipe-detail.html?id=' + esc(r._id) + '">' +
        '<img src="' + esc(imgUrl(r.image)) + '" alt="" loading="lazy">' +
        '<div class="rc-body"><div class="rc-title">' + esc(r.title) + '</div>' +
        '<div class="rc-sub">' + esc(item.sub || r.cuisine || 'Recipe') + '</div></div></a>';
    }).join('') + '</div>';
  }

  // Renders any action buttons attached to a payload (e.g. "Publish Recipe").
  function actionsHtml(bubble, actions) {
    if (!actions || !actions.length) return;
    var wrap = document.createElement('div');
    wrap.className = 'flavo-actions';
    actions.forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flavo-action-btn';
      btn.textContent = a.label;
      btn.addEventListener('click', a.run);
      wrap.appendChild(btn);
    });
    bubble.appendChild(wrap);
  }

  function addBot(payload) {
    var m = document.createElement('div');
    m.className = 'flavo-msg bot';
    m.innerHTML = '<div class="bubble">' + payload.html + recipeCardsHtml(payload.recipes) + '</div>';
    actionsHtml(m.querySelector('.bubble'), payload.actions);
    els.log.appendChild(m); scrollDown();
    renderChips(payload.chips);
    if (state.tts) speakLocalized(payload.plain || payload.html);
  }

  function typing(on) {
    var existing = els.log.querySelector('.flavo-typing');
    if (on) {
      if (existing) return;
      var m = document.createElement('div');
      m.className = 'flavo-msg bot flavo-typing';
      m.innerHTML = '<div class="bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
      els.log.appendChild(m); scrollDown();
    } else if (existing) { existing.remove(); }
  }

  function renderChips(chips) {
    els.chips.innerHTML = '';
    var list = chips || ['Find a recipe', 'What can I make with…', 'Generate a recipe for me', 'Surprise me'];
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'flavo-chip'; b.textContent = c;
      b.addEventListener('click', function () {
        if (c === 'What can I make with…') { els.input.value = 'What can I make with '; els.input.focus(); autosize(); return; }
        if (c === 'Find a recipe') { els.input.value = ''; els.input.placeholder = 'Try “Italian” or “chocolate cake”…'; els.input.focus(); return; }
        if (c === 'Ingredient substitute') { els.input.value = 'What can I use instead of '; els.input.focus(); autosize(); return; }
        if (c === 'Generate a recipe for me') { els.input.value = 'Generate recipe for '; els.input.focus(); autosize(); return; }
        if (c === 'Take me to Add Recipe') { send('Take me to add recipe'); return; }
        if (c === 'Surprise me') { send('Recommend me something to cook'); return; }
        send(c);
      });
      els.chips.appendChild(b);
    });
  }

  function send(forced) {
    var text = (forced != null ? forced : els.input.value).trim();
    if (!text) return;
    stopSpeaking();
    addUser(text);
    state.history.push({ role: 'user', content: text });
    els.input.value = ''; autosize();
    respond(text);
  }

  function greet() {
    if (state.greeted) return;
    state.greeted = true;
    var path = location.pathname.toLowerCase();
    var msg, chips;
    if (/recipe\.html|add-recipe/.test(path)) {
      msg = reply('Adding a recipe? 🙌 List ingredients and steps <em>one per line</em> — or just tell me a dish name and I\'ll fill the whole form in for you, you\'ll only need to add the photo.');
      chips = ['Generate a recipe for me', 'Measurement conversions', 'Ingredient substitute'];
    } else if (/recipe-detail/.test(path)) {
      msg = reply('Viewing a recipe? I can read it aloud (tap <strong>🔊 Listen</strong>), suggest substitutions, or find something similar.');
      chips = ['Ingredient substitute', 'What can I make with…', 'Find a recipe'];
    } else if (/profile/.test(path)) {
      msg = reply('This is your kitchen profile. Want help <a href="recipe.html">adding a recipe</a> or finding something to cook?');
      chips = ['Generate a recipe for me', 'Find a recipe', 'Surprise me'];
    } else {
      msg = reply('Hi, I\'m <strong>Chef Flavo</strong> 👨‍🍳 Ask me to find a recipe, tell me what\'s in your fridge, get a quick cooking tip, or say “generate recipe for …” and I\'ll build and publish the whole thing — you just add the photo. You can also pick your voice language above. 🌐');
      chips = ['Find a recipe', 'What can I make with…', 'Generate a recipe for me', 'Surprise me'];
    }
    msg.chips = chips;
    addBot(msg);
  }

  function open() {
    state.open = true;
    els.panel.classList.add('open');
    els.fab.classList.add('hidden');
    greet();
    setTimeout(function () { els.input.focus(); }, 250);
  }
  function close() {
    state.open = false;
    els.panel.classList.remove('open');
    els.fab.classList.remove('hidden');
    stopListening(); stopSpeaking();
    els.fab.focus();
  }

  /* ---------------- public API ---------------- */
  window.FlavorizAssistant = {
    open: open,
    close: close,
    speak: function (t, langCode, callbacks) { speak(t, langCode, callbacks); },
    speakLocalized: function (t, callbacks) { speakLocalized(t, callbacks); }, // speaks text in the user's selected language; used by recipe-detail's "Listen to recipe"
    translate: function (text, langCode) { return translateText(text, langCode || state.lang); }, // low-level: translate text into a language, returns a Promise<string>
    stopSpeaking: stopSpeaking,
    ask: function (t) { open(); send(t); },
    generateRecipe: function (title) { open(); startAutoFill(title); }, // programmatic hook, e.g. from a page button
    setLanguage: function (code) { setLang(code); }, // programmatic hook, e.g. from a site-wide language switcher
    getLanguage: function () { return state.lang; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();