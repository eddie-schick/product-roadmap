import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tbklpgmjkcncafpinmum.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRia2xwZ21qa2NuY2FmcGlubXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjMyMjQsImV4cCI6MjA3OTIzOTIyNH0.HpFZ3qM0cBT65mYMuw9QJ4V3oVde3HRgtM8xALRTF5U';

export const supabase = createClient(supabaseUrl, supabaseKey);
