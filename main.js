// script.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL   = 'https://mpillgefmlzrtjqtzona.supabase.co';
const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0';
const supabase       = createClient(SUPABASE_URL, SUPABASE_ANON);

const authContainer = document.getElementById('auth-container');
const emailInput     = document.getElementById('email-input');
const authBtn        = document.getElementById('auth-btn');
const app            = document.getElementById('app');
const signoutBtn     = document.getElementById('signout-btn');
const postForm       = document.getElementById('post-form');
const postContent    = document.getElementById('post-content');
const postFile       = document.getElementById('post-file');
const feedContainer  = document.getElementById('feed');

// ——— AUTH —————————————————————————————————————————————
authBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert(error.message);
  else alert('Magic link sent! Check your email.');
});

signoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

// check session on load
supabase.auth.getSession().then(({ data }) => {
  if (data.session) initApp(data.session.user);
});

supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) initApp(session.user);
  else {
    app.classList.add('hidden');
    authContainer.classList.remove('hidden');
  }
});

// ——— APP INITIALIZATION —————————————————————————————————
function initApp(user) {
  authContainer.classList.add('hidden');
  app.classList.remove('hidden');
  loadFeed();
  subscribeToPosts();
}

// ——— POSTS ————————————————————————————————————————
async function loadFeed() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, image_url, inserted_at')
    .order('inserted_at', { ascending: false });

  feedContainer.innerHTML = '';
  posts.forEach(renderPost);
}

postForm.addEventListener('submit', async e => {
  e.preventDefault();
  const session = await supabase.auth.getSession();
  const user    = session.data.session.user;
  const content = postContent.value;
  let image_url = null;

  if (postFile.files.length) {
    const file = postFile.files[0];
    const path = `posts/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadErr } = await supabase
      .storage.from('user-content').upload(path, file);
    if (uploadErr) return alert(uploadErr.message);
    image_url = supabase.storage.from('user-content').getPublicUrl(path).publicURL;
  }

  await supabase.from('posts').insert([{ content, image_url, author_id: user.id }]);
  postContent.value = '';
  postFile.value = '';
});

// realtime subscription
function subscribeToPosts() {
  supabase
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
      ({ new: post }) => renderPost(post, true)
    )
    .subscribe();
}

function renderPost(post, atTop = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-white p-4 rounded shadow';

  let html = `<p class="text-gray-800">${post.content}</p>`;
  if (post.image_url) {
    html += `<img src="${post.image_url}" class="mt-2 rounded max-w-full"/>`;
  }
  html += `<div class="text-xs text-gray-500 mt-2">${new Date(post.inserted_at).toLocaleString()}</div>`;

  wrapper.innerHTML = html;
  if (atTop) feedContainer.prepend(wrapper);
  else      feedContainer.append(wrapper);
}
