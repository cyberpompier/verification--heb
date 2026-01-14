import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cjmppdgvsrvoxdtwggcq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbXBwZGd2c3J2b3hkdHdnZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MjA2NTMsImV4cCI6MjA2NTE5NjY1M30.ckavE94EhlDHfjZH_p1AasSTbczQTB6o1sqovqSw5e4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper pour les noms de tables avec préfixe
export const TABLES = {
  PROFILES: 'firetrack_profiles',
  VEHICLES: 'firetrack_vehicles',
  EQUIPMENT: 'firetrack_equipment',
  HISTORY: 'firetrack_history'
};