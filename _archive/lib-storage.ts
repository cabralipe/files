// lib/storage.ts
// Gerenciamento de uploads para Supabase Storage

import { supabaseAdmin } from './supabase';

interface UploadOptions {
  bucket: string;
  filePath: string;
  file: Buffer | File;
  contentType?: string;
  isPublic?: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: Error;
}

/**
 * Upload de arquivo para Supabase Storage
 */
export async function uploadFile(
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const { bucket, filePath, file, contentType, isPublic } = options;

    // Converter File para Buffer se necessário
    let fileBuffer: Buffer;
    if (file instanceof File) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      fileBuffer = file;
    }

    // Upload do arquivo
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });

    if (error) throw error;

    // Obter URL pública se necessário
    let publicUrl: string | undefined;
    if (isPublic) {
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);
      publicUrl = urlData.publicUrl;
    }

    return {
      success: true,
      url: publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Upload de imagem de avatar
 */
export async function uploadAvatar(
  userId: string,
  file: File | Buffer
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${userId}-${timestamp}-${random}`;
    const filePath = `avatars/${userId}/${fileName}`;

    const result = await uploadFile({
      bucket: 'avatars',
      filePath,
      file,
      contentType: 'image/jpeg',
      isPublic: true,
    });

    return result;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Upload de imagem para experiência
 */
export async function uploadExperienceImage(
  experienceId: string,
  file: File | Buffer
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${experienceId}-${timestamp}-${random}`;
    const filePath = `experiences/${experienceId}/${fileName}`;

    const result = await uploadFile({
      bucket: 'experience-images',
      filePath,
      file,
      contentType: 'image/jpeg',
      isPublic: true,
    });

    return result;
  } catch (error) {
    console.error('Error uploading experience image:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Deletar arquivo do Storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Deletar avatar do usuário
 */
export async function deleteAvatar(
  userId: string,
  avatarPath: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    return await deleteFile('avatars', avatarPath);
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Deletar imagem de experiência
 */
export async function deleteExperienceImage(
  imagePath: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    return await deleteFile('experience-images', imagePath);
  } catch (error) {
    console.error('Error deleting experience image:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Listar arquivos de um bucket
 */
export async function listFiles(
  bucket: string,
  path: string = ''
): Promise<{ success: boolean; files?: any[]; error?: Error }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    return { success: true, files: data };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Obter URL pública de um arquivo
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Download de arquivo
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; data?: Buffer; error?: Error }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;

    return { success: true, data: Buffer.from(await data.arrayBuffer()) };
  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Validar arquivo antes de upload
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number; // em bytes
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const defaultMaxSize = 5 * 1024 * 1024; // 5MB
  const maxSize = options?.maxSize || defaultMaxSize;
  const allowedTypes = options?.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  // Validar tipo
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Permitidos: ${allowedTypes.join(', ')}`,
    };
  }

  // Validar tamanho
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Gerar nome único para arquivo
 */
export function generateUniqueFileName(
  prefix: string,
  originalName: string
): string {
  const ext = originalName.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}.${ext}`;
}

/**
 * Copiar arquivo de um bucket para outro
 */
export async function copyFile(
  fromBucket: string,
  fromPath: string,
  toBucket: string,
  toPath: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Download do arquivo
    const { data, error: downloadError } = await supabaseAdmin.storage
      .from(fromBucket)
      .download(fromPath);

    if (downloadError) throw downloadError;

    // Upload para novo bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from(toBucket)
      .upload(toPath, data);

    if (uploadError) throw uploadError;

    return { success: true };
  } catch (error) {
    console.error('Error copying file:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Criar buckets necessários (admin only)
 */
export async function createRequiredBuckets(): Promise<boolean> {
  const bucketsNeeded = [
    { name: 'avatars', isPublic: true },
    { name: 'experience-images', isPublic: true },
    { name: 'plan-attachments', isPublic: false },
    { name: 'backups', isPublic: false },
  ];

  try {
    for (const bucket of bucketsNeeded) {
      try {
        await supabaseAdmin.storage.createBucket(bucket.name, {
          public: bucket.isPublic,
        });
        console.log(`✅ Bucket "${bucket.name}" criado`);
      } catch (error: any) {
        // Bucket já existe
        if (error.message.includes('already exists')) {
          console.log(`✓ Bucket "${bucket.name}" já existe`);
        } else {
          throw error;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar buckets:', error);
    return false;
  }
}
