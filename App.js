
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import PostList from './components/PostList'
import NewPost from './components/NewPost'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="App">
      <h1>SupaSocial</h1>
      {!session ? (
        <Auth />
      ) : (
        <>
          <NewPost session={session} />
          <PostList session={session} />
        </>
      )}
    </div>
  )
}

export default App
