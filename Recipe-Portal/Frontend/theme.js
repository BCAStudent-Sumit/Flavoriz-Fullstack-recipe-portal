/* ============================================================
   theme.js — Flavoriz light/dark theme controller
   • Applies the saved (or system) theme immediately to avoid a
     flash of the wrong theme. Loaded in <head> (render-blocking).
   • Injects an accessible floating toggle once the DOM is ready.
   ============================================================ */
(function () {
  var STORAGE_KEY = 'flavoriz-theme';

  function systemPref() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
  }

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // 1) Apply as early as possible (this runs before <body> paints).
  var initial = stored() || systemPref();
  apply(initial);

  // 2) If the user has never chosen, follow later OS changes live.
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function (e) {
          if (!stored()) apply(e.matches ? 'dark' : 'light');
        });
    } catch (e) { /* Safari < 14 */ }
  }

  function setTheme(theme) {
    // brief colour-transition animation
    document.documentElement.classList.add('theme-anim');
    apply(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    updateButton(theme);
    window.setTimeout(function () {
      document.documentElement.classList.remove('theme-anim');
    }, 400);
  }

  function current() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  var btn;
  function updateButton(theme) {
    if (!btn) return;
    var next = theme === 'dark' ? 'light' : 'dark';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
    btn.setAttribute('title', 'Switch to ' + next + ' mode');
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function injectToggle() {
    if (document.querySelector('.theme-toggle')) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle no-theme-anim';
    // sun shows in dark mode (tap to go light); moon shows in light mode
    btn.innerHTML =
      '<span class="tt-sun" aria-hidden="true">☀️</span>' +
      '<span class="tt-moon" aria-hidden="true">🌙</span>';
    btn.addEventListener('click', function () {
      setTheme(current() === 'dark' ? 'light' : 'dark');
    });

    // Mount inside navbar beside Logout/Nav-auth instead of floating over cards
    var navLinks = document.querySelector('.nav-links');
    var navAuth = document.querySelector('.nav-auth');
    var logoutBtn = document.getElementById('logoutBtn');

    if (navLinks && logoutBtn) {
      navLinks.insertBefore(btn, logoutBtn);
      btn.classList.add('in-navbar');
    } else if (navLinks) {
      navLinks.appendChild(btn);
      btn.classList.add('in-navbar');
    } else if (navAuth) {
      navAuth.appendChild(btn);
      btn.classList.add('in-navbar');
    } else {
      var nav = document.querySelector('.navbar');
      if (nav) {
        nav.appendChild(btn);
        btn.classList.add('in-navbar');
      } else {
        document.body.appendChild(btn);
      }
    }

    updateButton(current());
  }

  // expose for other scripts (e.g. the assistant can offer "dark mode")
  window.FlavorizTheme = {
    set: setTheme,
    toggle: function () { setTheme(current() === 'dark' ? 'light' : 'dark'); },
    current: current
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();
