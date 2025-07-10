
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function NewPost({ session }) {
  const [content, setContent] = useState('')

  const createPost = async () => {
    await supabase.from('posts').insert({ content, user_id: session.user.id })
    setContent('')
  }

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
      />
      <button onClick={createPost}>Post</button>
    </div>
  )
}
