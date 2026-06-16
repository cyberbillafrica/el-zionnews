import { supabase } from './supabase.js';

/**
 * Uploads a physical file to Supabase Storage and records it in the Media table
 * @param {File} file - File object from a standard HTML input element
 * @param {string} userId - Auth UUID of the uploader
 */
export async function uploadMediaAsset(file, userId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  // 1. Upload raw binary data to Supabase Storage bucket named 'media-library'
  const { error: uploadError } = await supabase.storage
    .from('media-library')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Generate public URL string for asset consumption
  const { data: { publicUrl } } = supabase.storage
    .from('media-library')
    .getPublicUrl(filePath);

  // 3. Document asset in your structured database table
  const { data: mediaRecord, error: dbError } = await supabase
    .from('media')
    .insert([
      {
        filename: file.name,
        file_url: publicUrl,
        uploaded_by: userId
      }
    ])
    .select()
    .single();

  if (dbError) throw dbError;
  return mediaRecord;
}

export async function getAllMedia() {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}