
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mpillgefmlzrtjqtzona.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWxsZ2VmbWx6cnRqcXR6b25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTIzMDcsImV4cCI6MjA2NzY4ODMwN30.-7hy7cdvZiLLP-dogk-goBcu3SnRWHoCg1g6DcBBoS0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
