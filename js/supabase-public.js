// supabase-public.js
// Initialize the public Supabase client

const SUPABASE_URL = 'https://afhqcocriroqigcyuqvm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaHFjb2NyaXJvcWlnY3l1cXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTQ2MTIsImV4cCI6MjA5NzA5MDYxMn0.3Zd0F2THEDQX0hVX9sA2EoDvoJGv0-B5bkoBfkaXVU0';

// Fix: Use window.supabase to avoid redeclaration conflict
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
