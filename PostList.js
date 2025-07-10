
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function PostList() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    setPosts(data)
  }

  return (
    <div>
      <h2>Feed</h2>
      {posts.map(post => (
        <div key={post.id}>
          <p>{post.content}</p>
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  )
}
