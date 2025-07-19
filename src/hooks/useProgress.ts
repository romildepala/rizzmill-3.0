import { useState } from 'react';

export interface ProgressState {
  isUploading: boolean;
  uploadProgress: number;
  isTraining: boolean;
  trainingProgress: number;
  currentStep: string;
}

export const useProgress = () => {
  const [progress, setProgress] = useState<ProgressState>({
    isUploading: false,
    uploadProgress: 0,
    isTraining: false,
    trainingProgress: 0,
    currentStep: '',
  });

  const updateProgress = (updates: Partial<ProgressState>) => {
    setProgress(prev => ({ ...prev, ...updates }));
  };

  const resetProgress = () => {
    setProgress({
      isUploading: false,
      uploadProgress: 0,
      isTraining: false,
      trainingProgress: 0,
      currentStep: '',
    });
  };

  return { progress, updateProgress, resetProgress };
}; 