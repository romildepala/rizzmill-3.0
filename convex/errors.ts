// Custom error types for better error handling
export class FalApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "FalApiError";
  }
}

export class FileUploadError extends Error {
  constructor(message: string, public fileSize?: number) {
    super(message);
    this.name = "FileUploadError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TrainingError extends Error {
  constructor(message: string, public modelName?: string) {
    super(message);
    this.name = "TrainingError";
  }
} 