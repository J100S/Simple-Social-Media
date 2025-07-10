import React from 'https://esm.sh/react'
import ReactDOM from 'https://esm.sh/react-dom/client'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://mpillgefmlzrtjqtzona.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0'  // replace with your anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function Auth({ setSession }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const signIn = async () => {
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMessage(error.message)
    else setSession(data.session)
  }

  const signUp = async () => {
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) setMessage(error.message)
    else setMessage('Signup successful! Check your email for confirmation.')
  }

  return (
    <div className="auth-container">
      <h2>Login / Register</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <button onClick={signIn} disabled={loading}>Sign In</button>
        <button onClick={signUp} disabled={loading}>Sign Up</button>
      </div>
      {message && <p style={{marginTop: '10px', color: 'orange'}}>{message}</p>}
    </div>
  )
}

function NewPost({ session, refreshPosts }) {
  const [content, setContent] = React.useState('')
  const [image, setImage] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const handlePost = async () => {
    if (!content.trim() && !image) return alert("Post something or upload an image!")
    setLoading(true)

    let imageUrl = null
    if (image) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, image)
      if (uploadError) {
        setLoading(false)
        return alert('Error uploading image: ' + uploadError.message)
      }
      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName)
      imageUrl = data.publicUrl
    }

    const { error } = await supabase.from('posts').insert({
      content,
      user_id: session.user.id,
      image_url: imageUrl
    })

    if (error) alert('Error creating post: ' + error.message)

    setContent('')
    setImage(null)
    setLoading(false)
    refreshPosts()
  }

  return (
    <div className="new-post">
      <textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={loading}
      />
      <input
        type="file"
        accept="image/*"
        onChange={e => setImage(e.target.files[0])}
        disabled={loading}
      />
      <button onClick={handlePost} disabled={loading}>
        {loading ? 'Posting...' : 'Post'}
      </button>
    </div>
  )
}

function CommentSection({ postId }) {
  const [comments, setComments] = React.useState([])
  const [text, setText] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const fetchComments = async () => {
    const { data, error } = await supabase.from('comments').select('id, content').eq('post_id', postId).order('created_at')
    if (!error) setComments(data)
  }

  const submitComment = async () => {
    if (!text.trim()) return
    setLoading(true)
    const { error } = await supabase.from('comments').insert({ post_id: postId, content: text })
    if (error) alert('Error posting comment: ' + error.message)
    setText('')
    setLoading(false)
    fetchComments()
  }

  React.useEffect(() => {
    fetchComments()
  }, [])

  return (
    <div className="comment-section">
      {comments.map(c => (
        <div className="comment" key={c.id}>{c.content}</div>
      ))}
      <div className="comment-input">
        <input
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={loading}
        />
        <button onClick={submitComment} disabled={loading}>Comment</button>
      </div>
    </div>
  )
}

function UserProfile({ userId }) {
  const [profile, setProfile] = React.useState(null)

  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase.from('profiles').select('username, avatar_url').eq('id', userId).single()
      if (!error) setProfile(data)
    }
    fetchProfile()
  }, [userId])

  if (!profile) return <p>Loading profile...</p>

  return (
    <div className="profile">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="avatar" className="profile-avatar" />
      ) : (
        <div
          className="profile-avatar"
          style={{backgroundColor: '#4ac1ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'}}
        >
          {profile.username ? profile.username[0].toUpperCase() : '?'}
        </div>
      )}
      <div className="profile-username">{profile.username || 'Unknown User'}</div>
    </div>
  )
}

function PostList({ session }) {
  const [posts, setPosts] = React.useState([])
  const [selectedUserId, setSelectedUserId] = React.useState(null)

  const fetchPosts = async () => {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (!error) setPosts(data)
  }

  React.useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div>
      {selectedUserId ? (
        <>
          <button onClick={() => setSelectedUserId(null)} style={{marginBottom: '20px'}}>← Back to Feed</button>
          <UserProfile userId={selectedUserId} />
        </>
      ) : (
        <>
          <NewPost session={session} refreshPosts={fetchPosts} />
          <h2>Feed</h2>
          {posts.length === 0 && <p>No posts yet.</p>}
          {posts.map(post => (
            <div className="post" key={post.id}>
              <p onClick={() => setSelectedUserId(post.user_id)} style={{cursor: 'pointer', fontWeight: 'bold', color: '#4ac1ff'}}>
                {post.user_id}
              </p>
              <p>{post.content}</p>
              {post.image_url && <img src={post.image_url} alt="post" className="post-image" />}
              <small>{new Date(post.created_at).toLocaleString()}</small>
              <CommentSection postId={post.id} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function App() {
  const [session, setSession] = React.useState(null)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div>
      <h1 style={{ textAlign: 'center', color: '#4ac1ff' }}>SupaSocial</h1>
      {!session ? <Auth setSession={setSession} /> : <PostList session={session} />}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(React.createElement(App))
