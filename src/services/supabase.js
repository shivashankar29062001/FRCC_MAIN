import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dkvirykibcsnfmgzsfes.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrdmlyeWtpYmNzbmZtZ3pzZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjAxMjEsImV4cCI6MjEwNzY5NjEyMX0.gfWG4HMnQ-X5Mls-VatZ2T7xMSNF4pGNjUkB1Ve2uMI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
