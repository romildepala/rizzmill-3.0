// Frontend validation utilities
export const validatePrompt = (prompt: string): { isValid: boolean; error?: string } => {
  if (!prompt.trim()) {
    return { isValid: false, error: "Please enter a prompt" };
  }
  
  if (prompt.length < 3) {
    return { isValid: false, error: "Prompt must be at least 3 characters long" };
  }
  
  if (prompt.length > 500) {
    return { isValid: false, error: "Prompt must be less than 500 characters" };
  }
  
  return { isValid: true };
};

export const validateModelName = (name: string): { isValid: boolean; error?: string } => {
  if (!name.trim()) {
    return { isValid: false, error: "Please enter a model name" };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: "Model name must be at least 2 characters long" };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: "Model name must be less than 50 characters" };
  }
  
  // Check for valid characters
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    return { isValid: false, error: "Model name can only contain letters, numbers, spaces, hyphens, and underscores" };
  }
  
  return { isValid: true };
};

export const validateTriggerWord = (word: string): { isValid: boolean; error?: string } => {
  if (!word.trim()) {
    return { isValid: false, error: "Please enter a trigger word" };
  }
  
  if (word.length < 2) {
    return { isValid: false, error: "Trigger word must be at least 2 characters long" };
  }
  
  if (word.length > 20) {
    return { isValid: false, error: "Trigger word must be less than 20 characters" };
  }
  
  // Check for valid characters
  if (!/^[a-zA-Z0-9]+$/.test(word)) {
    return { isValid: false, error: "Trigger word can only contain letters and numbers" };
  }
  
  return { isValid: true };
}; 