import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = 'https://fbczoogchwqkitagozjj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3pvb2djaHdxa2l0YWdvempqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDMzMjQsImV4cCI6MjA3Nzg3OTMyNH0.vEjdkpkui5OH5ibClvwHHd1OweO0VQzswYOK1j9x928'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})
