import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { EmailVerificationPage } from "./EmailVerificationPage";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProgressBar } from "./components/ProgressBar";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { useProgress } from "./hooks/useProgress";
import { validatePrompt, validateModelName, validateTriggerWord } from "./utils/validation";

const MODELS = [
  { id: "fal-ai/flux-lora", name: "Flux LoRA" },
] as const;

type ModelId = typeof MODELS[number]["id"];

function AuthenticatedApp() {
  const [selectedModel, setSelectedModel] = useState<ModelId>(MODELS[0].id);
  const [selectedWeight, setSelectedWeight] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "train">("generate");
  
  // Train model states
  const [modelName, setModelName] = useState("");
  const [triggerWord, setTriggerWord] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>({});
  const [isTraining, setIsTraining] = useState(false);

  // Progress tracking
  const { progress, updateProgress, resetProgress } = useProgress();

  const generations = useQuery(api.generations.list) || [];
  const modelWeights = useQuery(api.modelWeights.list) || [];
  const generateImage = useAction(api.generations.generateImage);
  const trainModel = useAction(api.training.trainModel);
  const generateUploadUrl = useMutation(api.generations.generateUploadUrl);
  const seedWeights = useMutation(api.modelWeights.seedWeights);
  const user = useQuery(api.auth.loggedInUser);
  const testTraining = useAction(api.training.testTraining);

  // Set default weight when weights load
  useEffect(() => {
    if (modelWeights.length > 0 && !selectedWeight) {
      setSelectedWeight(modelWeights[0].modelUrl);
    }
  }, [modelWeights, selectedWeight]);

  // Seed weights on first load if none exist
  useEffect(() => {
    if (modelWeights.length === 0) {
      seedWeights().catch(console.error);
    }
  }, [modelWeights.length, seedWeights]);

  const handleGenerate = async () => {
    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.isValid) {
      toast.error(promptValidation.error!);
      return;
    }

    if (!selectedWeight) {
      toast.error("Please select a model weight");
      return;
    }

    setIsGenerating(true);
    try {
      await generateImage({
        prompt: prompt.trim(),
        model: selectedModel,
        weights: selectedWeight,
      });
      toast.success("Image generated successfully!");
      setPrompt("");
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files using the new validation utility
    const validation = {
      isValid: files.length >= 5 && files.length <= 20,
      errors: [] as string[],
      warnings: [] as string[],
    };

    if (files.length < 5) {
      validation.errors.push("Please upload at least 5 images");
    }
    
    if (files.length > 20) {
      validation.errors.push("Maximum 20 images allowed");
    }

    // Check individual files
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    files.forEach((file) => {
      if (!validTypes.includes(file.type)) {
        validation.errors.push(`File "${file.name}" is not a supported image type`);
      }
      
      if (file.size > maxSize) {
        validation.errors.push(`File "${file.name}" is too large (max 10MB)`);
      }
    });
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => toast.warning(warning));
    }
    
    console.log(`📁 Selected ${files.length} images for training`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.size} bytes, ${file.type})`);
    });
    
    setSelectedImages(files);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleTrainModel = async () => {
    const nameValidation = validateModelName(modelName);
    if (!nameValidation.isValid) {
      toast.error(nameValidation.error!);
      return;
    }

    const triggerValidation = validateTriggerWord(triggerWord);
    if (!triggerValidation.isValid) {
      toast.error(triggerValidation.error!);
      return;
    }

    if (selectedImages.length < 5) {
      toast.error("Please upload at least 5 images");
      return;
    }

    if (selectedImages.length > 20) {
      toast.error("Maximum 20 images allowed");
      return;
    }

    updateProgress({
      isUploading: true,
      uploadProgress: 0,
      currentStep: 'Preparing training data...',
    });

    setIsTraining(true);
    console.log(`🚀 Starting clean model training process...`);
    console.log(`📝 Model Name: ${modelName.trim()}`);
    console.log(`🎯 Trigger Word: ${triggerWord.trim()}`);
    console.log(`🖼️ Number of images: ${selectedImages.length}`);

    try {
      // Step 1: Create ZIP file using JSZip (cleaner approach)
      const JSZip = (await import('jszip')).default;
      console.log(`📦 JSZip library loaded successfully`);
      
      updateProgress({
        uploadProgress: 20,
        currentStep: 'Processing images...',
      });
      
      const zip = new JSZip();
      const timestamp = Date.now();
      
      console.log(`🔄 Adding ${selectedImages.length} images to ZIP...`);
      
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `image_${i + 1}.${extension}`;
        
        zip.file(fileName, file);
        console.log(`  ✅ Added: ${fileName} (${file.size} bytes)`);
      }
      
      updateProgress({
        uploadProgress: 40,
        currentStep: 'Creating ZIP archive...',
      });
      
      // Create ZIP with minimal compression
      console.log(`🗜️ Generating ZIP file...`);
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "STORE", // No compression for reliability
      });
      
      console.log(`✅ ZIP created: ${zipBlob.size} bytes`);
      
      updateProgress({
        uploadProgress: 60,
        currentStep: 'Uploading to storage...',
      });
      
      // Step 2: Upload ZIP to Convex storage
      console.log(`📤 Uploading ZIP to Convex storage...`);
      const uploadUrl = await generateUploadUrl();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: zipBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const { storageId } = await uploadResponse.json();
      console.log(`✅ ZIP uploaded successfully! Storage ID: ${storageId}`);

      updateProgress({
        uploadProgress: 80,
        isUploading: false,
        isTraining: true,
        trainingProgress: 0,
        currentStep: 'Starting model training...',
      });

      // Step 3: Start training
      console.log(`🎓 Starting model training...`);
      const trainingResult = await trainModel({
        modelName: modelName.trim(),
        triggerWord: triggerWord.trim(),
        zipStorageId: storageId,
      });

      updateProgress({
        trainingProgress: 100,
        isTraining: false,
        currentStep: 'Training completed!',
      });

      console.log(`🎉 Training completed successfully!`, trainingResult);
      toast.success(`Model "${modelName.trim()}" trained successfully! Check the weights dropdown.`);
      
      // Reset form
      setModelName("");
      setTriggerWord("");
      setSelectedImages([]);
      setImageCaptions({});
      resetProgress();
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      resetProgress();
      console.error(`❌ Training process failed:`, error);
      toast.error(`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTraining(false);
      console.log(`🏁 Training process completed`);
    }
  };

  const handleTestZip = async (storageId: string) => {
    try {
      console.log(`🧪 Testing ZIP creation for storage ID: ${storageId}`);
      const result = await testZipCreation({ storageId });
      console.log(`📊 Test result:`, result);
      
      if (result.success) {
        toast.success(`ZIP test passed: ${result.message}`);
      } else {
        toast.error(`ZIP test failed: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ ZIP test error:`, error);
      toast.error(`ZIP test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestTraining = async () => {
    try {
      console.log(`🧪 Testing training API...`);
      const result = await testTraining({
        modelName: "test",
        triggerWord: "test"
      });
      console.log(`📊 Training test result:`, result);
      
      if (result.success) {
        toast.success(`Training API test passed: ${result.message}`);
      } else {
        toast.error(`Training API test failed: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ Training test error:`, error);
      toast.error(`Training test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getWeightDisplayName = (weightUrl: string) => {
    const weight = modelWeights.find(w => w.modelUrl === weightUrl);
    return weight ? `${weight.name} (${weight.tok})` : "Unknown";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rizzmil AI Image Generator</h1>
        <SignOutButton />
      </div>

      <EmailVerificationBanner />

      {/* Progress indicators */}
      <ProgressBar
        progress={progress.uploadProgress}
        isVisible={progress.isUploading}
        label={progress.currentStep}
        className="mb-4"
      />
      
      <ProgressBar
        progress={progress.trainingProgress}
        isVisible={progress.isTraining}
        label={progress.currentStep}
        className="mb-4"
      />

      {/* Tab navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("generate")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "generate"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Generate Images
        </button>
        <button
          onClick={() => setActiveTab("train")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "train"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Train Model
        </button>
      </div>

      {activeTab === "generate" && (
        <div className="space-y-6">
          {/* Model selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelId)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Weight selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Weight
            </label>
            <select
              value={selectedWeight}
              onChange={(e) => setSelectedWeight(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a weight...</option>
              {modelWeights.map((weight) => (
                <option key={weight._id} value={weight.modelUrl}>
                  {weight.name} ({weight.tok})
                </option>
              ))}
            </select>
          </div>

          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !selectedWeight}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </button>

          {/* Generated images */}
          {generations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Generations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generations.map((generation) => (
                  <div key={generation._id} className="border rounded-lg p-4">
                    <img src={generation.imageUrl} alt={generation.prompt} className="w-full h-48 object-cover rounded" />
                    <p className="mt-2 text-sm text-gray-600">{generation.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "train" && (
        <div className="space-y-6">
          {/* Model name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Enter model name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Trigger word input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger Word
            </label>
            <input
              type="text"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value)}
              placeholder="Enter trigger word..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Training Images (5-20 images)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Upload 5-20 JPEG, PNG, or WebP images (max 10MB each)
            </p>
          </div>

          {/* Selected images preview */}
          {selectedImages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Images ({selectedImages.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-20 object-cover rounded"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Train button */}
          <button
            onClick={handleTrainModel}
            disabled={isTraining || selectedImages.length < 5 || !modelName.trim() || !triggerWord.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isTraining ? 'Training Model...' : 'Train Model'}
          </button>
                    
          <button
            onClick={handleTestTraining}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200"
          >
            Test Training API
          </button>
        </div>
      )}
    </div>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <SignInPage />
      </Unauthenticated>
      <Toaster />
    </ErrorBoundary>
  );
}
