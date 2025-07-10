import React from 'https://esm.sh/react'
import ReactDOM from 'https://esm.sh/react-dom/client'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabaseUrl = 'https://mpillgefmlzrtjqtzona.supabase.co'
const supabaseAnonKey = 'YOUR-ANON-KEY'
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
  const [image, setImage] = React.useState(null)

  const handlePost = async () => {
    let imageUrl = null

    if (image) {
      const fileName = `${Date.now()}-${image.name}`
      const { data, error } = await supabase.storage.from('post-images').upload(fileName, image)
      if (!error) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    await supabase.from('posts').insert({
      content,
      user_id: session.user.id,
      image_url: imageUrl
    })

    setContent('')
    setImage(null)
    refreshPosts()
  }

  return (
    <div>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind?" />
      <input type="file" onChange={e => setImage(e.target.files[0])} />
      <button onClick={handlePost}>Post</button>
    </div>
  )
}

function CommentSection({ postId }) {
  const [comments, setComments] = React.useState([])
  const [text, setText] = React.useState('')

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at')
    setComments(data)
  }

  const submitComment = async () => {
    if (!text.trim()) return
    await supabase.from('comments').insert({ post_id: postId, content: text })
    setText('')
    fetchComments()
  }

  React.useEffect(() => {
    fetchComments()
  }, [])

  return (
    <div>
      {comments.map(c => (
        <div className="comment" key={c.id}>
          {c.content}
        </div>
      ))}
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a comment..." />
      <button onClick={submitComment}>Comment</button>
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
      <NewPost session={session} refreshPosts={fetchPosts} />
      <h2>Feed</h2>
      {posts.map(post => (
        <div className="post" key={post.id}>
          <p>{post.content}</p>
          {post.image_url && <img src={post.image_url} className="post-image" />}
          <small>{new Date(post.created_at).toLocaleString()}</small>
          <CommentSection postId={post.id} />
        </div>
      ))}
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
