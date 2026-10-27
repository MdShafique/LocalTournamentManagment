/**
 * Cloudinary image upload service
 * Supports unsigned upload preset
 */

// Default credentials (can be overridden via .env VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET)
const DEFAULT_CLOUD_NAME = 'kkquh0dt';
const DEFAULT_UPLOAD_PRESET = 'dalrhhip';

export const getCloudinaryConfig = () => {
  const env = (import.meta as any).env || {};
  return {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || DEFAULT_UPLOAD_PRESET,
  };
};

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

/**
 * Upload an image file directly to Cloudinary using unsigned upload preset
 */
export const uploadImageToCloudinary = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  // If using default placeholder credentials, convert file to data URL as fallback so user can still test offline/demo
  const isDefaultConfig = !cloudName || cloudName === 'demo' || !uploadPreset;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    xhr.open('POST', url, true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url) {
            resolve(res.secure_url);
            return;
          }
        } catch (err) {
          // parse error
        }
      }

      // If Cloudinary demo/default preset fails, fall back to Base64 data URL so app never crashes
      if (isDefaultConfig || xhr.status === 400 || xhr.status === 401) {
        console.warn('Cloudinary upload returned status', xhr.status, '. Falling back to Data URL preview.');
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file as data URL'));
        reader.readAsDataURL(file);
        return;
      }

      reject(new Error(`Cloudinary upload failed: ${xhr.statusText || xhr.responseText}`));
    };

    xhr.onerror = () => {
      // In case of network error or CORS error on unconfigured Cloudinary, fallback to Base64
      console.warn('Cloudinary network error. Using data URL fallback.');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Network error uploading image'));
      reader.readAsDataURL(file);
    };

    xhr.send(formData);
  });
};
