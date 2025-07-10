import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://mpillgefmlzrtjqtzona.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authActionBtn = document.getElementById('authActionBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authError = document.getElementById('authError');
const authView = document.getElementById('authView');
const postView = document.getElementById('postView');
const postBtn = document.getElementById('postBtn');
const postContent = document.getElementById('postContent');
const feed = document.getElementById('feed');

let mode = 'login';

loginBtn.onclick = () => {
  mode = 'login';
  authActionBtn.textContent = 'Login';
};

signupBtn.onclick = () => {
  mode = 'signup';
  authActionBtn.textContent = 'Sign Up';
};

authActionBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (mode === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return showError(error.message);
  } else {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return showError(error.message);
  }

  checkAuth();
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  checkAuth();
};

postBtn.onclick = async () => {
  const content = postContent.value.trim();
  if (!content) return;
  await supabase.from('posts').insert([{ content }]);
  postContent.value = '';
  loadFeed();
};

async function loadFeed() {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  feed.innerHTML = data.map(post => `<p>${post.content}</p>`).join('');
}

function showError(message) {
  authError.textContent = message;
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session;
  authView.classList.toggle('hidden', isLoggedIn);
  postView.classList.toggle('hidden', !isLoggedIn);
  logoutBtn.classList.toggle('hidden', !isLoggedIn);
  if (isLoggedIn) loadFeed();
}

checkAuth();
