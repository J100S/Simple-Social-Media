
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signIn = async () => {
    await supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async () => {
    await supabase.auth.signUp({ email, password })
  }

  return (
    <div>
      <h2>Login / Register</h2>
      <input onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      <input
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
      />
      <button onClick={signIn}>Sign In</button>
      <button onClick={signUp}>Sign Up</button>
    </div>
  )
}
