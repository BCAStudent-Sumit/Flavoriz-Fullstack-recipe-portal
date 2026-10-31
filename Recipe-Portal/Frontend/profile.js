// frontend/js/profile.js

const getImageUrl = (img) => {
  if (!img) return 'https://via.placeholder.com/300x180?text=No+Image';
  return img.startsWith('http') ? img : `http://localhost:5000${img}`;
};

const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

if (!token) window.location.href = 'login.html';

// Which profile are we viewing? "profile.html?id=<userId>" shows anyone;
// with no ?id we show the signed-in user's own profile.
const params = new URLSearchParams(window.location.search);
const viewId = params.get('id') || userId;
const isOwnProfile = viewId === userId;

// Holds the profile currently shown, so the edit modal can prefill it.
let currentUser = null;

// The set of user ids the signed-in user follows — used to show the right
// Follow / Following state on buttons inside the followers/following lists.
// Loaded lazily the first time a list opens or a follow button is used.
let myFollowingIds = null;

function skeletonCards(n) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="skeleton-card"><div class="sk-img"></div>
      <div class="sk-body"><div class="skeleton-line"></div>
      <div class="skeleton-line short"></div></div></div>`;
  }
  return html;
}

async function loadProfile() {
  document.getElementById('profileUsername').innerHTML = '<span class="loading-pulse">Loading…</span>';
  const container = document.getElementById('profileRecipes');
  container.innerHTML = skeletonCards(3);

  try {
    const res = await fetch(`http://localhost:5000/api/users/${viewId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('profile');
    const user = await res.json();
    if (!user || !user.username) throw new Error('profile');
    currentUser = user;

    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileName').textContent = user.name || '';
    document.getElementById('profileBio').textContent = user.bio || 'No bio yet';
    document.getElementById('followerCount').textContent = (user.followers || []).length;
    document.getElementById('followingCount').textContent = (user.following || []).length;

    document.getElementById('profileAvatar').src = user.profilePic
      ? `http://localhost:5000${user.profilePic}`
      : `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;

    // Show the right controls: Edit + photo on your own profile,
    // a Follow / Following button on someone else's.
    setupProfileControls(user);

    const recipesRes = await fetch(`http://localhost:5000/api/recipes/user/${viewId}`);
    const recipes = await recipesRes.json();
    document.getElementById('recipeCount').textContent = recipes.length;

    if (recipes.length === 0) {
      container.innerHTML = isOwnProfile
        ? `<div class="state-box"><span class="state-emoji">🍽️</span>
             <h3>No recipes yet</h3><p>Share your first recipe with the community!</p>
             <a class="btn-retry" href="recipe.html">Add a recipe</a></div>`
        : `<div class="state-box"><span class="state-emoji">🍽️</span>
             <h3>No recipes yet</h3><p>${escapeHtml(user.name || user.username)} hasn't shared any recipes yet.</p></div>`;
      return;
    }

    container.innerHTML = recipes.map((r, i) => `
      <div class="recipe-card" style="animation-delay: ${i * 0.05}s">
        <img src="${getImageUrl(r.image)}" alt="${r.title}" onclick="window.location.href='recipe-detail.html?id=${r._id}'">
        <div class="recipe-card-body">
          <h4 onclick="window.location.href='recipe-detail.html?id=${r._id}'">${r.title}</h4>
          <p>${r.cuisine}</p>
          ${isOwnProfile ? `
          <div class="recipe-card-actions">
            <button class="btn-edit" onclick="window.location.href='edit-recipe.html?id=${r._id}'">✎ Edit</button>
            <button class="btn-delete" onclick="deleteRecipe('${r._id}')">🗑 Delete</button>
          </div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('profileUsername').textContent = 'Profile unavailable';
    container.innerHTML =
      `<div class="state-box"><span class="state-emoji">📡</span>
         <h3>Couldn't load your profile</h3>
         <p>We couldn't reach the server. Make sure the backend is running, then try again.</p>
         <button class="btn-retry" type="button" id="profRetry">Try again</button></div>`;
    const b = document.getElementById('profRetry');
    if (b) b.addEventListener('click', loadProfile);
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
      loadProfile();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete recipe');
    }
  } catch (err) {
    alert('Error deleting recipe');
  }
}

loadProfile();

const avatarInput = document.getElementById('avatarInput');
if (avatarInput) {
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('http://localhost:5000/api/users/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        document.getElementById('profileAvatar').src = `http://localhost:5000${data.profilePic}`;
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Error uploading image');
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

/* ============================================================
   Edit profile modal (Instagram-style)
   ============================================================ */
(function setupEditProfile() {
  const modal      = document.getElementById('editModal');
  const openBtn    = document.getElementById('editProfileBtn');
  const closeBtn   = document.getElementById('editClose');
  const cancelBtn  = document.getElementById('editCancel');
  const form       = document.getElementById('editForm');
  const nameInput  = document.getElementById('editName');
  const userInput  = document.getElementById('editUsername');
  const bioInput   = document.getElementById('editBio');
  const bioCount   = document.getElementById('bioCount');
  const errorBox   = document.getElementById('editError');
  const saveBtn    = document.getElementById('editSave');
  const preview    = document.getElementById('editAvatarPreview');
  const changePhoto = document.getElementById('editChangePhoto');
  const editAvatarInput = document.getElementById('editAvatarInput');

  // If the markup isn't on this page, do nothing.
  if (!modal || !form) return;

  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  };
  const clearError = () => {
    errorBox.textContent = '';
    errorBox.hidden = true;
  };

  const openModal = () => {
    if (!currentUser) return;
    clearError();
    nameInput.value = currentUser.name || '';
    userInput.value = currentUser.username || '';
    bioInput.value  = currentUser.bio || '';
    bioCount.textContent = bioInput.value.length;
    preview.src = currentUser.profilePic
      ? `http://localhost:5000${currentUser.profilePic}`
      : `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username || 'User'}`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';   // lock background scroll
    nameInput.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (openBtn) openBtn.focus();
  };

  if (openBtn)   openBtn.addEventListener('click', openModal);
  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Click on the dim backdrop (but not the card) closes.
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Esc closes while the modal is open.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Live character counter for the bio.
  bioInput.addEventListener('input', () => {
    bioCount.textContent = bioInput.value.length;
  });

  // "Change photo" reuses the existing avatar-upload endpoint.
  if (changePhoto && editAvatarInput) {
    changePhoto.addEventListener('click', () => editAvatarInput.click());
    editAvatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('avatar', file);
      changePhoto.disabled = true;
      changePhoto.textContent = 'Uploading…';
      try {
        const res = await fetch('http://localhost:5000/api/users/upload-avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (res.ok) {
          const url = `http://localhost:5000${data.profilePic}`;
          preview.src = url;
          document.getElementById('profileAvatar').src = url;
          if (currentUser) currentUser.profilePic = data.profilePic;
        } else {
          showError(data.error || 'Photo upload failed.');
        }
      } catch (err) {
        showError('Could not upload the photo. Is the server running?');
      } finally {
        changePhoto.disabled = false;
        changePhoto.textContent = 'Change photo';
      }
    });
  }

  // Save the text fields.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      name: nameInput.value.trim(),
      username: userInput.value.trim(),
      bio: bioInput.value.trim(),
    };

    // Quick client-side check so obvious mistakes don't need a round-trip.
    if (payload.username.length < 3 || payload.username.length > 30) {
      showError('Username must be 3–30 characters.');
      userInput.focus();
      return;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(payload.username)) {
      showError('Username can only use letters, numbers, dots and underscores.');
      userInput.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        currentUser = data;
        document.getElementById('profileUsername').textContent = data.username;
        document.getElementById('profileName').textContent = data.name || '';
        document.getElementById('profileBio').textContent = data.bio || 'No bio yet';
        closeModal();
      } else {
        // 409 = username taken; 400 = validation. Both arrive here with .error.
        showError(data.error || 'Could not save your changes.');
      }
    } catch (err) {
      showError('Could not reach the server. Make sure the backend is running.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });
})();

/* ============================================================
   Follow system (Instagram-style)
   • Follow / Unfollow button on other people's profiles
   • Clickable Followers / Following counts -> popup list
   • Each list row: avatar + name + Follow / Unfollow button
   ============================================================ */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function avatarUrl(u) {
  if (u && u.profilePic) return `http://localhost:5000${u.profilePic}`;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent((u && u.username) || 'User')}`;
}

function setFollowBtnState(btn, following) {
  btn.textContent = following ? 'Following' : 'Follow';
  btn.classList.toggle('is-following', !!following);
}

// Decide which buttons/controls to show for the profile being viewed.
function setupProfileControls(user) {
  const editBtn   = document.getElementById('editProfileBtn');
  const followBtn = document.getElementById('followBtn');
  const pencil    = document.querySelector('.avatar-edit-btn');

  if (isOwnProfile) {
    if (editBtn)   editBtn.hidden = false;
    if (pencil)    pencil.style.display = '';
    if (followBtn) followBtn.style.display = 'none';
  } else {
    if (editBtn)   editBtn.hidden = true;
    if (pencil)    pencil.style.display = 'none';   // can't change someone else's photo
    if (followBtn) {
      const iFollow = (user.followers || []).map(String).includes(String(userId));
      setFollowBtnState(followBtn, iFollow);
      followBtn.style.display = '';
    }
  }
}

// Load (once) the set of ids the signed-in user follows.
async function ensureMyFollowing() {
  if (myFollowingIds) return myFollowingIds;
  if (isOwnProfile && currentUser && Array.isArray(currentUser.following)) {
    myFollowingIds = new Set(currentUser.following.map(String));
    return myFollowingIds;
  }
  try {
    const r = await fetch(`http://localhost:5000/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const me = await r.json();
    myFollowingIds = new Set(((me && me.following) || []).map(String));
  } catch (e) {
    myFollowingIds = new Set();
  }
  return myFollowingIds;
}

// Follow or unfollow a user; returns { following, followersCount, followingCount }
// (the counts belong to the *target* user).
async function toggleFollow(targetId) {
  const res = await fetch(`http://localhost:5000/api/users/${targetId}/follow`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not update follow.');
  if (myFollowingIds) {
    if (data.following) myFollowingIds.add(String(targetId));
    else myFollowingIds.delete(String(targetId));
  }
  return data;
}

// The Follow / Following button on another person's profile header.
(function initFollowButton() {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;
  followBtn.addEventListener('click', async () => {
    if (isOwnProfile) return;
    followBtn.disabled = true;
    try {
      await ensureMyFollowing();
      const data = await toggleFollow(viewId);
      setFollowBtnState(followBtn, data.following);
      document.getElementById('followerCount').textContent = data.followersCount;
      document.getElementById('followingCount').textContent = data.followingCount;
    } catch (err) {
      alert(err.message || 'Could not update follow. Is the server running?');
    } finally {
      followBtn.disabled = false;
    }
  });
})();

// The Followers / Following popup list.
(function initPeopleModal() {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="peopleModal" class="modal-overlay" hidden>
      <div class="modal-card people-card" role="dialog" aria-modal="true" aria-labelledby="peopleTitle">
        <div class="modal-head">
          <h3 id="peopleTitle">Followers</h3>
          <button id="peopleClose" class="modal-close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="modal-body people-body" id="peopleList"></div>
      </div>
    </div>`);

  const modal    = document.getElementById('peopleModal');
  const titleEl  = document.getElementById('peopleTitle');
  const listEl   = document.getElementById('peopleList');
  const closeBtn = document.getElementById('peopleClose');

  const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  function personRow(p) {
    const name = p.name || p.username || 'User';
    const isMe = String(p._id) === String(userId);
    const following = myFollowingIds ? myFollowingIds.has(String(p._id)) : false;
    const btn = isMe ? '' :
      `<button class="btn-outline person-follow ${following ? 'is-following' : ''}" data-id="${p._id}" type="button">${following ? 'Following' : 'Follow'}</button>`;
    return `
      <div class="person-row">
        <a class="person-link" href="profile.html?id=${p._id}">
          <img class="person-avatar" src="${avatarUrl(p)}" alt="">
          <span class="person-names">
            <span class="person-name">${escapeHtml(name)}</span>
            <span class="person-handle">@${escapeHtml(p.username || '')}</span>
          </span>
        </a>
        ${btn}
      </div>`;
  }

  async function open(kind) {
    titleEl.textContent = kind === 'followers' ? 'Followers' : 'Following';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    listEl.innerHTML = `<p class="people-empty">Loading…</p>`;
    try {
      await ensureMyFollowing();
      const res = await fetch(`http://localhost:5000/api/users/${viewId}/${kind}`);
      const people = await res.json();
      if (!res.ok) throw new Error('load');
      if (!Array.isArray(people) || people.length === 0) {
        listEl.innerHTML = `<p class="people-empty">${kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>`;
        return;
      }
      listEl.innerHTML = people.map(personRow).join('');
    } catch (err) {
      listEl.innerHTML = `<p class="people-empty">Couldn't load this list. Make sure the server is running.</p>`;
    }
  }

  // Follow / unfollow straight from a list row.
  listEl.addEventListener('click', async (e) => {
    const b = e.target.closest('.person-follow');
    if (!b) return;
    e.preventDefault();
    b.disabled = true;
    try {
      const data = await toggleFollow(b.getAttribute('data-id'));
      setFollowBtnState(b, data.following);
      // On your own profile, your Following count mirrors what you follow.
      if (isOwnProfile && myFollowingIds) {
        document.getElementById('followingCount').textContent = myFollowingIds.size;
      }
    } catch (err) {
      alert(err.message || 'Could not update follow.');
    } finally {
      b.disabled = false;
    }
  });

  // Make the Followers / Following stats open the list.
  const followersCell = document.getElementById('followerCount')?.closest('div');
  const followingCell = document.getElementById('followingCount')?.closest('div');
  function wireStat(cell, kind) {
    if (!cell) return;
    cell.classList.add('stat-clickable');
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.addEventListener('click', () => open(kind));
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(kind); }
    });
  }
  wireStat(followersCell, 'followers');
  wireStat(followingCell, 'following');
})();