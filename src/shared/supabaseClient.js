import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL ||
  'https://lhrrnpyjkzcucifxesxt.supabase.co';

const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocnJucHlqa3pjdWNpZnhlc3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTE0NTQsImV4cCI6MjEwMzI2NzQ1NH0.CgKlVutCoe2fdnIL0zVXpWAD5dOSAD0iZ8bEVYVfnSY';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
