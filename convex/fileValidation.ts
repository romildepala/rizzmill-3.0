import { v } from "convex/values";

// File validation constants
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 20,
  MIN_FILES: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
} as const;

// File validation functions
export const validateFileType = (file: File): boolean => {
  // Convert the readonly array to a regular array for includes check
  const allowedTypes = [...FILE_LIMITS.ALLOWED_TYPES];
  return allowedTypes.includes(file.type as any);
};

export const validateFileSize = (file: File): boolean => {
  return file.size <= FILE_LIMITS.MAX_FILE_SIZE;
};

export const validateFileCount = (files: File[]): boolean => {
  return files.length >= FILE_LIMITS.MIN_FILES && files.length <= FILE_LIMITS.MAX_FILES;
};

// Validation result type
export const FileValidationResult = v.object({
  isValid: v.boolean(),
  errors: v.array(v.string()),
  warnings: v.array(v.string()),
});

export const validateFiles = (files: File[]) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file count
  if (files.length < FILE_LIMITS.MIN_FILES) {
    errors.push(`Please upload at least ${FILE_LIMITS.MIN_FILES} images`);
  }
  
  if (files.length > FILE_LIMITS.MAX_FILES) {
    errors.push(`Maximum ${FILE_LIMITS.MAX_FILES} images allowed`);
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!validateFileType(file)) {
      errors.push(`File "${file.name}" is not a supported image type`);
    }
    
    if (!validateFileSize(file)) {
      errors.push(`File "${file.name}" is too large (max ${FILE_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}; 