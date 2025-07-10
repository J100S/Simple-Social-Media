// Supabase social media frontend logic
const SUPABASE_URL = "https://mpillgeflmlzrtjqtzona.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const postBtn = document.getElementById("post-btn");
const postText = document.getElementById("post-text");
const mediaUpload = document.getElementById("media-upload");
const feed = document.getElementById("feed");
const usernameInput = document.getElementById("username");
const postSection = document.getElementById("post-section");

let currentUser = null;

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Enter a username");
  currentUser = username;
  usernameInput.style.display = "none";
  loginBtn.style.display = "none";
  logoutBtn.style.display = "inline";
  postSection.style.display = "block";
};

logoutBtn.onclick = () => {
  currentUser = null;
  usernameInput.style.display = "inline";
  loginBtn.style.display = "inline";
  logoutBtn.style.display = "none";
  postSection.style.display = "none";
};

postBtn.onclick = async () => {
  if (!currentUser) return alert("Login first");
  const content = postText.value.trim();
  let media_url = null;
  let media_type = null;

  const file = mediaUpload.files[0];
  if (file) {
    const filePath = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("media").upload(filePath, file);
    if (error) return alert("Upload failed");
    media_url = `${SUPABASE_URL}/storage/v1/object/public/media/${filePath}`;
    media_type = file.type;
  }

  await supabase.from("posts").insert({
    author: currentUser,
    content,
    media_url,
    media_type
  });

  postText.value = "";
  mediaUpload.value = "";
};

async function loadFeed() {
  const { data: posts } = await supabase.from("posts").select("*", { count: "exact" }).order("created_at", { ascending: false });
  feed.innerHTML = "";
  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <div class="author">${post.author}</div>
      <div class="timestamp">${new Date(post.created_at).toLocaleString()}</div>
      <div>${post.content}</div>
      ${post.media_url ? renderMedia(post.media_url, post.media_type) : ""}
      <div class="comments" id="comments-${post.id}"></div>
      <div class="comment-form">
        <input placeholder="Add comment..." onkeydown="if(event.key==='Enter'){addComment(${post.id}, this.value); this.value='';}" />
      </div>
    `;
    feed.appendChild(div);
    loadComments(post.id);
  });
}

function renderMedia(url, type) {
  if (type.startsWith("image")) return `<img class="media" src="${url}" />`;
  if (type.startsWith("video")) return `<video class="media" controls src="${url}"></video>`;
  return "";
}

async function addComment(postId, text) {
  if (!currentUser || !text.trim()) return;
  await supabase.from("comments").insert({ post_id: postId, author: currentUser, content: text });
}

async function loadComments(postId) {
  const { data: comments } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at");
  const container = document.getElementById(`comments-${postId}`);
  container.innerHTML = comments.map(c => `<div class="comment"><strong>${c.author}</strong>: ${c.content}</div>`).join("");
}

// Realtime updates
supabase.channel("posts-and-comments")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, loadFeed)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, payload => loadComments(payload.new.post_id))
  .subscribe();

loadFeed();
