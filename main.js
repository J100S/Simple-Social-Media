// Initialize Supabase
const SUPABASE_URL = 'https://mpillgefmlzrtjqtzona.supabase.co'; // replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0';               // replace with your anon key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const views = {
  login: document.getElementById('loginView'),
  signup: document.getElementById('signupView'),
  feed: document.getElementById('feedView'),
  profile: document.getElementById('profileView')
};

const btnLoginNav = document.getElementById('btnLoginNav');
const btnSignupNav = document.getElementById('btnSignupNav');
const btnLogout = document.getElementById('btnLogout');
const btnProfile = document.getElementById('btnProfile');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');

const signupEmail = document.getElementById('signupEmail');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const signupPasswordConfirm = document.getElementById('signupPasswordConfirm');
const btnSignup = document.getElementById('btnSignup');

const currentUserSpan = document.getElementById('currentUser');

const postContent = document.getElementById('postContent');
const mediaInput = document.getElementById('mediaInput');
const btnPost = document.getElementById('btnPost');

const feedDiv = document.getElementById('feed');

const profileUsernameH2 = document.getElementById('profileUsername');
const profilePostsDiv = document.getElementById('profilePosts');
const btnBackToFeed = document.getElementById('btnBackToFeed');

const errorDiv = document.getElementById('error');

function showView(view) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[view].classList.remove('hidden');
  clearError();
  updateNavButtons(view);
}

function clearError() {
  errorDiv.textContent = '';
}

function setError(msg) {
  errorDiv.textContent = msg;
}

function updateNavButtons(currentView) {
  supabase.auth.getSession().then(({ data }) => {
    const loggedIn = data.session != null;
    btnLogout.classList.toggle('hidden', !loggedIn);
    btnProfile.classList.toggle('hidden', !loggedIn);
    btnLoginNav.disabled = loggedIn;
    btnSignupNav.disabled = loggedIn;
  });
}

function validateLoginForm() {
  btnLogin.disabled = !(loginEmail.value.trim() && loginPassword.value.trim());
}

function validateSignupForm() {
  const email = signupEmail.value.trim();
  const username = signupUsername.value.trim();
  const password = signupPassword.value.trim();
  const confirm = signupPasswordConfirm.value.trim();
  btnSignup.disabled = !(email && username && password && confirm && password === confirm);
}

function validatePostForm() {
  btnPost.disabled = !(postContent.value.trim() || mediaInput.files.length > 0);
}

// Event listeners for form validation
loginEmail.addEventListener('input', validateLoginForm);
loginPassword.addEventListener('input', validateLoginForm);

signupEmail.addEventListener('input', validateSignupForm);
signupUsername.addEventListener('input', validateSignupForm);
signupPassword.addEventListener('input', validateSignupForm);
signupPasswordConfirm.addEventListener('input', validateSignupForm);

postContent.addEventListener('input', validatePostForm);
mediaInput.addEventListener('change', validatePostForm);

// Navigation buttons
btnLoginNav.addEventListener('click', () => showView('login'));
btnSignupNav.addEventListener('click', () => showView('signup'));
btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showView('login');
  clearAllForms();
});
btnProfile.addEventListener('click', () => {
  loadProfile();
  showView('profile');
});
btnBackToFeed.addEventListener('click', () => {
  showView('feed');
  loadFeed();
});

// Login
btnLogin.addEventListener('click', async () => {
  clearError();
  try {
    const { error, data } = await supabase.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value.trim(),
    });
    if (error) throw error;
    currentUserSpan.textContent = data.user.email;
    showView('feed');
    loadFeed();
    clearAllForms();
  } catch (e) {
    setError(e.message);
  }
});

// Signup
btnSignup.addEventListener('click', async () => {
  clearError();
  try {
    const email = signupEmail.value.trim();
    const username = signupUsername.value.trim();
    const password = signupPassword.value.trim();

    // Signup user
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (signUpError) throw signUpError;

    currentUserSpan.textContent = email;
    showView('feed');
    loadFeed();
    clearAllForms();
  } catch (e) {
    setError(e.message);
  }
});

// Clear forms
function clearAllForms() {
  [loginEmail, loginPassword, signupEmail, signupUsername, signupPassword, signupPasswordConfirm, postContent].forEach(el => el.value = '');
  mediaInput.value = '';
  validateLoginForm();
  validateSignupForm();
  validatePostForm();
}

// Read media files as base64
function readMediaFiles(files) {
  return Promise.all(Array.from(files).map(file => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res({ dataUrl: e.target.result, type: file.type, name: file.name });
    reader.onerror = () => rej('Failed to read file');
    reader.readAsDataURL(file);
  })));
}

// Create post
btnPost.addEventListener('click', async () => {
  clearError();
  try {
    const user = supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    if (!session.data.session) throw new Error('Not logged in');

    const content = postContent.value.trim();
    const files = mediaInput.files;
    let mediaUrls = [];

    if (files.length > 0) {
      for (const file of files) {
        const path = `uploads/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('posts').upload(path, file);
        if (uploadError) throw uploadError;
        const url = supabase.storage.from('posts').getPublicUrl(path).data.publicUrl;
        mediaUrls.push({ url, type: file.type });
      }
    }

    // Insert post to DB
    const { error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: session.data.session.user.id,
        content,
        media: mediaUrls,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    postContent.value = '';
    mediaInput.value = '';
    validatePostForm();
    loadFeed();
  } catch (e) {
    setError(e.message);
  }
});

// Load feed with posts, newest first
async function loadFeed() {
  clearError();
  feedDiv.innerHTML = 'Loading posts...';
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`id, content, media, created_at, user:user_id (id, email, user_metadata)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      feedDiv.innerHTML = '<p>No posts yet.</p>';
      return;
    }

    feedDiv.innerHTML = '';
    data.forEach(post => {
      const postEl = document.createElement('article');
      postEl.classList.add('post');

      let mediaHtml = '';
      if (post.media && post.media.length > 0) {
        mediaHtml = post.media.map(m => {
          if (m.type.startsWith('image/')) return `<img src="${m.url}" alt="Post image" style="max-width:100%; border-radius:8px; margin-top:5px;">`;
          if (m.type.startsWith('video/')) return `<video controls src="${m.url}" style="max-width:100%; border-radius:8px; margin-top:5px;"></video>`;
          return '';
        }).join('');
      }

      postEl.innerHTML = `
        <header><strong>${post.user.user_metadata?.username || post.user.email}</strong> <small>${new Date(post.created_at).toLocaleString()}</small></header>
        <p>${escapeHtml(post.content)}</p>
        ${mediaHtml}
      `;
      feedDiv.appendChild(postEl);
    });

  } catch (e) {
    setError(e.message);
    feedDiv.innerHTML = '';
  }
}

// Escape HTML helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load profile (basic example)
async function loadProfile() {
  clearError();
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    setError('Not logged in');
    showView('login');
    return;
  }
  const user = session.data.session.user;
  profileUsernameH2.textContent = user.user_metadata?.username || user.email;

  // Load user's posts
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`id, content, media, created_at`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    profilePostsDiv.innerHTML = '';
    if (data.length === 0) profilePostsDiv.innerHTML = '<p>No posts yet.</p>';

    data.forEach(post => {
      const postEl = document.createElement('article');
      postEl.classList.add('post');
      let mediaHtml = '';
      if (post.media && post.media.length > 0) {
        mediaHtml = post.media.map(m => {
          if (m.type.startsWith('image/')) return `<img src="${m.url}" alt="Post image" style="max-width:100%; border-radius:8px; margin-top:5px;">`;
          if (m.type.startsWith('video/')) return `<video controls src="${m.url}" style="max-width:100%; border-radius:8px; margin-top:5px;"></video>`;
          return '';
        }).join('');
      }
      postEl.innerHTML = `
        <header><small>${new Date(post.created_at).toLocaleString()}</small></header>
        <p>${escapeHtml(post.content)}</p>
        ${mediaHtml}
      `;
      profilePostsDiv.appendChild(postEl);
    });

  } catch (e) {
    setError(e.message);
  }
}

// On page load, check session
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    currentUserSpan.textContent = data.session.user.email;
    showView('feed');
    loadFeed();
  } else {
    showView('login');
  }
});
