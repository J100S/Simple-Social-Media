// Replace with your Supabase info:
const SUPABASE_URL = 'https://mpillgefmlzrtjqtzona.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const errorMsg = document.getElementById('errorMsg');
const navLoginBtn = document.getElementById('btnLoginNav');
const navSignupBtn = document.getElementById('btnSignupNav');
const navLogoutBtn = document.getElementById('btnLogout');
const navProfileBtn = document.getElementById('btnProfile');

const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');
const feedView = document.getElementById('feedView');
const profileView = document.getElementById('profileView');
const searchView = document.getElementById('searchView');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const btnLogin = document.getElementById('btnLogin');

const signupEmail = document.getElementById('signupEmail');
const signupUsername = document.getElementById('signupUsername');
const signupPassword = document.getElementById('signupPassword');
const btnSignup = document.getElementById('btnSignup');

const currentUserNameSpan = document.getElementById('currentUserName');

const postContent = document.getElementById('postContent');
const mediaInput = document.getElementById('mediaInput');
const btnPost = document.getElementById('btnPost');

const feedDiv = document.getElementById('feed');

const profileUsernameSpan = document.getElementById('profileUsername');
const profilePostsDiv = document.getElementById('profilePosts');
const btnBackToFeed = document.getElementById('btnBackToFeed');

const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const searchResults = document.getElementById('searchResults');

let currentUser = null;

// Utility
function showError(msg) {
  errorMsg.textContent = msg;
  setTimeout(() => {
    errorMsg.textContent = '';
  }, 5000);
}
function clearError() {
  errorMsg.textContent = '';
}

function showView(view) {
  [loginView, signupView, feedView, profileView, searchView].forEach(v => v.classList.add('hidden'));
  view.classList.remove('hidden');
  clearError();
  updateNav();
}

function updateNav() {
  const loggedIn = !!currentUser;
  navLoginBtn.style.display = loggedIn ? 'none' : 'inline-block';
  navSignupBtn.style.display = loggedIn ? 'none' : 'inline-block';
  navLogoutBtn.style.display = loggedIn ? 'inline-block' : 'none';
  navProfileBtn.style.display = loggedIn ? 'inline-block' : 'none';
}

// Auth Functions
async function signUp() {
  clearError();
  const email = signupEmail.value.trim();
  const username = signupUsername.value.trim();
  const password = signupPassword.value.trim();

  if (!email || !username || !password) return showError('Please fill all fields.');

  // Check if username exists
  let { data: users, error } = await supabase.from('profiles').select('username').eq('username', username).single();
  if (users) return showError('Username already taken.');

  // Signup user
  const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) return showError(signUpError.message);

  // Insert profile username (after signup)
  const userId = data.user.id;
  const { error: profileError } = await supabase.from('profiles').insert({ id: userId, username });
  if(profileError) return showError(profileError.message);

  currentUser = { id: userId, email, username };
  currentUserNameSpan.textContent = username;
  showView(feedView);
  listenForPosts();
}

async function login() {
  clearError();
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) return showError('Please fill all fields.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);

  currentUser = { id: data.user.id, email: data.user.email };
  // Load profile username
  const { data: profile, error: profileError } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single();
  if(profileError) return showError(profileError.message);

  currentUser.username = profile.username;
  currentUserNameSpan.textContent = currentUser.username;

  showView(feedView);
  listenForPosts();
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  showView(loginView);
}

navLoginBtn.addEventListener('click', () => showView(loginView));
navSignupBtn.addEventListener('click', () => showView(signupView));
navLogoutBtn.addEventListener('click', logout);
navProfileBtn.addEventListener('click', () => showProfile(currentUser.username));

// Enable login/signup buttons when inputs filled
[loginEmail, loginPassword].forEach(el => el.addEventListener('input', () => {
  btnLogin.disabled = !(loginEmail.value && loginPassword.value);
}));
[signupEmail, signupUsername, signupPassword].forEach(el => el.addEventListener('input', () => {
  btnSignup.disabled = !(signupEmail.value && signupUsername.value && signupPassword.value);
}));

btnLogin.addEventListener('click', login);
btnSignup.addEventListener('click', signUp);

// Posting a new post
btnPost.addEventListener('click', async () => {
  clearError();
  const content = postContent.value.trim();
  if (!content && mediaInput.files.length === 0) {
    return showError('Please add some text or upload media.');
  }

  btnPost.disabled = true;

  let mediaUrls = [];
  for (const file of mediaInput.files) {
    const ext = file.name.split('.').pop();
    const fileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage.from('posts').upload(fileName, file);
    if (error) {
      showError('Media upload failed.');
      btnPost.disabled = false;
      return;
    }
    const url = supabase.storage.from('posts').getPublicUrl(fileName).publicUrl;
    mediaUrls.push(url);
  }

  // Insert post
  const { error: insertError } = await supabase.from('posts').insert({
    user_id: currentUser.id,
    content,
    media_urls: mediaUrls,
    created_at: new Date()
  });
  if (insertError) {
    showError(insertError.message);
    btnPost.disabled = false;
    return;
  }

  postContent.value = '';
  mediaInput.value = '';
  btnPost.disabled = false;
});

// Listen for posts and update feed in real-time
function listenForPosts() {
  feedDiv.innerHTML = '';
  supabase
    .channel('public:posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
      loadFeed();
    })
    .subscribe();

  loadFeed();
}

async function loadFeed() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, media_urls, created_at, user_id, profiles(username)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    showError(error.message);
    return;
  }

  feedDiv.innerHTML = '';
  data.forEach(post => {
    feedDiv.appendChild(createPostElement(post));
  });
}

function createPostElement(post) {
  const postEl = document.createElement('article');
  postEl.className = 'post';

  const header = document.createElement('div');
  header.className = 'post-header';
  header.textContent = post.profiles.username + ' · ' + new Date(post.created_at).toLocaleString();

  const content = document.createElement('div');
  content.className = 'post-content';
  content.textContent = post.content;

  postEl.appendChild(header);
  postEl.appendChild(content);

  if (post.media_urls && post.media_urls.length) {
    post.media_urls.forEach(url => {
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.className = 'post-media';
        postEl.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Post media';
        img.className = 'post-media';
        postEl.appendChild(img);
      }
    });
  }

  // TODO: add likes and comments later here

  return postEl;
}

// Profile view
function showProfile(username) {
  clearError();
  profileUsernameSpan.textContent = username;
  showView(profileView);

  loadProfilePosts(username);
}

async function loadProfilePosts(username) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, content, media_urls, created_at')
    .eq('profiles.username', username)
    .order('created_at', { ascending: false });

  if (error) {
    showError(error.message);
    return;
  }

  profilePostsDiv.innerHTML = '';
  data.forEach(post => {
    profilePostsDiv.appendChild(createPostElement(post));
  });
}

btnBackToFeed.addEventListener('click', () => {
  showView(feedView);
  loadFeed();
});

btnSearch.addEventListener('click', async () => {
  clearError();
  const term = searchInput.value.trim();
  if (!term) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .ilike('username', `%${term}%`)
    .limit(20);

  if (error) return showError(error.message);

  searchResults.innerHTML = '';
  if (data.length === 0) {
    searchResults.textContent = 'No users found';
    return;
  }

  data.forEach(user => {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.textContent = user.username;
    div.onclick = () => showProfile(user.username);
    searchResults.appendChild(div);
  });
});

// Auto login on page load
window.addEventListener('load', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUser = { id: user.id, email: user.email };
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    currentUser.username = profile.username;
    currentUserNameSpan.textContent = currentUser.username;
    showView(feedView);
    listenForPosts();
  } else {
    showView(loginView);
  }
});
