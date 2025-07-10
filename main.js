// main.js

// Initialize Supabase
const SUPABASE_URL = 'https://mpillgefmlzrtjqzona.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cached DOM Elements
const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');
const feedView = document.getElementById('feedView');
const profileView = document.getElementById('profileView');

const btnLoginNav = document.getElementById('btnLoginNav');
const btnSignupNav = document.getElementById('btnSignupNav');
const btnLogout = document.getElementById('btnLogout');
const btnProfile = document.getElementById('btnProfile');
const btnBackToFeed = document.getElementById('btnBackToFeed');

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const postForm = document.getElementById('postForm');
const profileForm = document.getElementById('profileForm');

const btnLogin = document.getElementById('btnLogin');
const btnSignup = document.getElementById('btnSignup');
const btnPost = document.getElementById('btnPost');
const btnUpdateProfile = document.getElementById('btnUpdateProfile');

const postText = document.getElementById('postText');
const postMedia = document.getElementById('postMedia');

const feed = document.getElementById('feed');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const btnClearSearch = document.getElementById('btnClearSearch');

const errorMessage = document.getElementById('errorMessage');
const loadingModal = document.getElementById('loadingModal');

const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const profileBio = document.getElementById('profileBio');
const profileBioInput = document.getElementById('profileBioInput');

// Globals
let currentUser = null;
let currentProfile = null;
let realtimeSubscription = null;
let currentFilter = '';

// UTILITIES
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    errorMessage.setAttribute('aria-hidden', 'true');
    errorMessage.textContent = '';
  }, 5000);
}

function showLoading(show = true) {
  if (show) loadingModal.classList.remove('hidden');
  else loadingModal.classList.add('hidden');
}

// View Helpers
function showView(view) {
  [loginView, signupView, feedView, profileView].forEach(v => {
    v.classList.add('hidden');
  });
  view.classList.remove('hidden');

  // Update ARIA and focus for accessibility
  view.focus?.();

  // Toggle nav buttons
  const loggedIn = !!currentUser;
  btnLoginNav.style.display = loggedIn ? 'none' : 'inline-block';
  btnSignupNav.style.display = loggedIn ? 'none' : 'inline-block';
  btnLogout.style.display = loggedIn ? 'inline-block' : 'none';
  btnProfile.style.display = loggedIn ? 'inline-block' : 'none';
}

// Enable/disable buttons based on form validity
function validateLoginForm() {
  btnLogin.disabled = !(loginForm.loginEmail.value.trim() && loginForm.loginPassword.value.trim());
}
function validateSignupForm() {
  const email = signupForm.signupEmail.value.trim();
  const username = signupForm.signupUsername.value.trim();
  const pass = signupForm.signupPassword.value;
  const passConfirm = signupForm.signupPasswordConfirm.value;
  btnSignup.disabled = !(email && username && pass.length >= 8 && pass === passConfirm);
}
function validatePostForm() {
  btnPost.disabled = !postText.value.trim() && !postMedia.files.length;
}

// Initialize app
async function init() {
  showLoading(true);

  // Check for logged in user session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) showError(error.message);

  if (session?.user) {
    currentUser = session.user;
    await loadUserProfile(currentUser.id);
    showView(feedView);
    setupRealtimeFeed();
    listenToFeedChanges();
  } else {
    showView(loginView);
  }

  showLoading(false);
}

// Load user profile info from 'profiles' table
async function loadUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, bio')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    showError('Error loading profile: ' + error.message);
  }

  currentProfile = data || { username: '', bio: '' };
  updateProfileUI();
}

// Update profile UI
function updateProfileUI() {
  profileUsername.textContent = currentProfile.username || 'Anonymous';
  profileEmail.textContent = currentUser.email || '';
  profileBio.textContent = currentProfile.bio || '';
  profileBioInput.value = currentProfile.bio || '';
}

// Event handlers

// Login form submit
loginForm.addEventListener('input', validateLoginForm);
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading(true);
  const email = loginForm.loginEmail.value.trim();
  const password = loginForm.loginPassword.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showError(error.message);
    showLoading(false);
    return;
  }
  currentUser = data.user;
  await loadUserProfile(currentUser.id);
  showView(feedView);
  setupRealtimeFeed();
  listenToFeedChanges();
  loginForm.reset();
  btnLogin.disabled = true;
  showLoading(false);
});

// Signup form submit
signupForm.addEventListener('input', validateSignupForm);
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading(true);
  const email = signupForm.signupEmail.value.trim();
  const username = signupForm.signupUsername.value.trim();
  const password = signupForm.signupPassword.value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showError(error.message);
    showLoading(false);
    return;
  }
  currentUser = data.user;

  // Insert new profile
  const { error: profileError } = await supabase.from('profiles').insert([{ id: currentUser.id, username, bio: '' }]);
  if (profileError) showError('Profile error: ' + profileError.message);

  await loadUserProfile(currentUser.id);
  showView(feedView);
  setupRealtimeFeed();
  listenToFeedChanges();
  signupForm.reset();
  btnSignup.disabled = true;
  showLoading(false);
});

// Logout button
btnLogout.addEventListener('click', async () => {
  showLoading(true);
  const { error } = await supabase.auth.signOut();
  if (error) showError(error.message);
  currentUser = null;
  currentProfile = null;
  if (realtimeSubscription) {
    realtimeSubscription.unsubscribe();
    realtimeSubscription = null;
  }
  showView(loginView);
  feed.innerHTML = '';
  showLoading(false);
});

// Profile button
btnProfile.addEventListener('click', () => {
  showView(profileView);
});

// Back to feed from profile
btnBackToFeed.addEventListener('click', () => {
  showView(feedView);
});

// Profile form submit (update bio)
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newBio = profileBioInput.value.trim();

  if (newBio === currentProfile.bio) {
    showError('No changes to bio');
    return;
  }
  showLoading(true);
  const { error } = await supabase
    .from('profiles')
    .update({ bio: newBio })
    .eq('id', currentUser.id);
  if (error) {
    showError(error.message);
  } else {
    currentProfile.bio = newBio;
    updateProfileUI();
  }
  showLoading(false);
});

// Post form events
postText.addEventListener('input', validatePostForm);
postMedia.addEventListener('change', validatePostForm);

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading(true);

  const text = postText.value.trim();
  const mediaFile = postMedia.files[0];
  let media_url = null;
  let media_type = null;

  if (mediaFile) {
    // Upload media file
    const fileExt = mediaFile.name.split('.').pop();
    const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
    media_type = mediaFile.type.startsWith('video') ? 'video' : 'image';

    const { data, error } = await supabase.storage
      .from('posts')
      .upload(fileName, mediaFile, { cacheControl: '3600', upsert: false });

    if (error) {
      showError('Media upload failed: ' + error.message);
      showLoading(false);
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName);
    media_url = publicUrlData.publicUrl;
  }

  // Insert post record
  const { error: postError } = await supabase
    .from('posts')
    .insert([{
      user_id: currentUser.id,
      content: text,
      media_url,
      media_type,
      inserted_at: new Date().toISOString()
    }]);

  if (postError) {
    showError('Post failed: ' + postError.message);
  } else {
    postForm.reset();
    btnPost.disabled = true;
  }

  showLoading(false);
});

// Feed rendering
function formatDateTime(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

async function fetchUsername(userId) {
  const { data, error } = await supabase.from('profiles').select('username').eq('id', userId).single();
  if (error || !data) return 'Unknown';
  return data.username;
}

function createPostElement(post, authorName, comments) {
  const postEl = document.createElement('article');
  postEl.className = 'post';
  postEl.setAttribute('tabindex', '0');
  postEl.dataset.postId = post.id;

  // Header
  const header = document.createElement('header');
  header.className = 'post-header';

  const author = document.createElement('button');
  author.className = 'post-author';
  author.type = 'button';
  author.textContent = authorName;
  author.title = `View ${authorName}'s profile`;
  author.addEventListener('click', () => showUserProfile(post.user_id));

  const date = document.createElement('time');
  date.className = 'post-date';
  date.dateTime = post.inserted_at;
  date.textContent = formatDateTime(post.inserted_at);

  header.append(author, date);
  postEl.appendChild(header);

  // Content
  const content = document.createElement('p');
  content.className = 'post-content';
  content.textContent = post.content;
  postEl.appendChild(content);

  // Media
  if (post.media_url) {
    if (post.media_type === 'video') {
      const video = document.createElement('video');
      video.className = 'post-media';
      video.controls = true;
      video.src = post.media_url;
      postEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'post-media';
      img.alt = `Media posted by ${authorName}`;
      img.src = post.media_url;
      postEl.appendChild(img);
    }
  }

  // Comments Section
  const commentsSection = document.createElement('section');
  commentsSection.className = 'comments-section';
  commentsSection.setAttribute('aria-label', 'Comments');

  // Existing comments
  if (comments && comments.length > 0) {
    comments.forEach(c => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';

      const commenterName = document.createElement('strong');
      commenterName.textContent = c.username || 'Unknown';

      const commentText = document.createElement('span');
      commentText.textContent = `: ${c.content}`;

      const commentDate = document.createElement('div');
      commentDate.className = 'comment-date';
      commentDate.textContent = formatDateTime(c.inserted_at);

      commentEl.append(commenterName, commentText, commentDate);
      commentsSection.appendChild(commentEl);
    });
  } else {
    const noComments = document.createElement('p');
    noComments.textContent = 'No comments yet. Be the first!';
    noComments.style.fontStyle = 'italic';
    noComments.style.color = '#6b7280';
    commentsSection.appendChild(noComments);
  }

  // Add comment form
  const commentForm = document.createElement('form');
  commentForm.className = 'comment-input';
  commentForm.setAttribute('aria-label', 'Add a comment');
  commentForm.dataset.postId = post.id;

  const commentTextarea = document.createElement('textarea');
  commentTextarea.rows = 2;
  commentTextarea.placeholder = 'Add a comment...';
  commentTextarea.maxLength = 300;
  commentTextarea.required = true;
  commentTextarea.setAttribute('aria-label', 'Comment text');

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Post';
  submitBtn.disabled = true;

  commentTextarea.addEventListener('input', () => {
    submitBtn.disabled = !commentTextarea.value.trim();
  });

  commentForm.append(commentTextarea, submitBtn);
  commentsSection.appendChild(commentForm);

  // Submit comment event
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const commentContent = commentTextarea.value.trim();
    if (!commentContent) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const postId = commentForm.dataset.postId;

    const { error } = await supabase.from('comments').insert([{
      post_id: postId,
      user_id: currentUser.id,
      content: commentContent,
      inserted_at: new Date().toISOString()
    }]);
    if (error) {
      showError('Failed to post comment: ' + error.message);
    } else {
      commentTextarea.value = '';
      submitBtn.disabled = true;
    }

    submitBtn.textContent = 'Post';
  });

  postEl.appendChild(commentsSection);

  return postEl;
}

async function loadFeed(filter = '') {
  feed.innerHTML = '';
  showLoading(true);

  let query = supabase
    .from('posts')
    .select('*, profiles(username), comments(id, user_id, content, inserted_at, profiles(username))')
    .order('inserted_at', { ascending: false });

  if (filter) {
    // For demo, simple filter on content or username with ilike (case-insensitive contains)
    query = query.or(`content.ilike.%${filter}%,profiles.username.ilike.%${filter}%`);
  }

  const { data, error } = await query;

  if (error) {
    showError('Error loading feed: ' + error.message);
    showLoading(false);
    return;
  }

  for (const post of data) {
    const authorName = post.profiles?.username || 'Unknown';
    const commentsWithUsernames = (post.comments || []).map(c => ({
      ...c,
      username: c.profiles?.username || 'Unknown'
    }));
    const postEl = createPostElement(post, authorName, commentsWithUsernames);
    feed.appendChild(postEl);
  }

  showLoading(false);
}

// Real-time feed updates
function setupRealtimeFeed() {
  if (realtimeSubscription) {
    realtimeSubscription.unsubscribe();
  }

  realtimeSubscription = supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        loadFeed(currentFilter);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments' },
      (payload) => {
        loadFeed(currentFilter);
      }
    )
    .subscribe();
}

// Listen to feed changes on search and load
function listenToFeedChanges() {
  btnSearch.addEventListener('click', () => {
    currentFilter = searchInput.value.trim();
    loadFeed(currentFilter);
    btnClearSearch.classList.toggle('hidden', !currentFilter);
  });

  btnClearSearch.addEventListener('click', () => {
    currentFilter = '';
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    loadFeed();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnSearch.click();
    }
  });
}

// Show other user's profile on clicking author name
async function showUserProfile(userId) {
  showLoading(true);

  if (userId === currentUser.id) {
    showView(profileView);
    showLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('username, bio')
    .eq('id', userId)
    .single();

  if (error) {
    showError('Profile not found');
    showLoading(false);
    return;
  }

  profileUsername.textContent = data.username || 'Unknown';
  profileEmail.textContent = 'N/A';
  profileBio.textContent = data.bio || '';
  profileBioInput.value = '';
  // Hide profile editing for others
  profileBioInput.disabled = true;
  btnUpdateProfile.disabled = true;

  showView(profileView);
  showLoading(false);
}

// Initialize event listeners on nav buttons
btnLoginNav.addEventListener('click', () => showView(loginView));
btnSignupNav.addEventListener('click', () => showView(signupView));

// Start app
init();

