import React from 'https://esm.sh/react'
import ReactDOM from 'https://esm.sh/react-dom/client'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://mpillgefmlzrtjqtzona.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function Auth({ setSession }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) setSession(data.session)
  }

  const signUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error) alert("Check your email for confirmation!")
  }

  return (
    <div>
      <h2>Login / Register</h2>
      <input onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="password" />
      <button onClick={signIn}>Sign In</button>
      <button onClick={signUp}>Sign Up</button>
    </div>
  )
}

function NewPost({ session, refreshPosts }) {
  const [content, setContent] = React.useState('')

  const createPost = async () => {
    if (!content.trim()) return
    await supabase.from('posts').insert({ content, user_id: session.user.id })
    setContent('')
    refreshPosts()
  }

  return (
    <div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" />
      <button onClick={createPost}>Post</button>
    </div>
  )
}

function PostList({ session }) {
  const [posts, setPosts] = React.useState([])

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data)
  }

  React.useEffect(() => {
    fetchPosts()
  }, [])

  return (
    <div>
      <h2>Feed</h2>
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.content}</p>
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </div>
      ))}
      <NewPost session={session} refreshPosts={fetchPosts} />
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
      <h1>SupaSocial</h1>
      {!session ? <Auth setSession={setSession} /> : <PostList session={session} />}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(React.createElement(App))
