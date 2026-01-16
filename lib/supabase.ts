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

export const BUCKET_NAME = 'firetrack-assets';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The file object to upload
 * @param folder The folder path (e.g., 'vehicles' or 'equipment')
 * @returns The public URL of the uploaded file or null if error
 */
export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    // Sanitize filename and make it unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error('Unexpected error during upload:', err);
    return null;
  }
};