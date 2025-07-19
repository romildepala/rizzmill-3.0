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
  const trainModel = useAction(api.generations.trainModel);
  const generateUploadUrl = useMutation(api.generations.generateUploadUrl);
  const seedWeights = useMutation(api.modelWeights.seedWeights);
  const user = useQuery(api.auth.loggedInUser);
  const testZipCreation = useAction(api.generations.testZipContent);

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
      currentStep: 'Preparing files...',
    });

    setIsTraining(true);
    console.log(`🚀 Starting model training process...`);
    console.log(`📝 Model Name: ${modelName.trim()}`);
    console.log(`🎯 Trigger Word: ${triggerWord.trim()}`);
    console.log(`🖼️ Number of images: ${selectedImages.length}`);

    try {
      // Import JSZip for ZIP creation (more standard than fflate)
      const JSZip = (await import('jszip')).default;
      console.log(`📦 JSZip library loaded successfully`);
      
      updateProgress({
        uploadProgress: 25,
        currentStep: 'Processing images...',
      });
      
      // Prepare files for ZIP with timestamp-based renaming
      const zip = new JSZip();
      const timestamp = Date.now();
      
      console.log(`🔄 Processing images for ZIP archive...`);
      
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const originalName = file.name.split('.')[0]; // Remove extension
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        
        // Ensure we have a valid image extension
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const finalExtension = validExtensions.includes(extension) ? extension : 'jpg';
        
        // Rename with timestamp: originalName_timestamp_index.extension
        const newFileName = `${originalName}_${timestamp}_${i + 1}.${finalExtension}`;
        
        console.log(`  📄 Processing: ${file.name} → ${newFileName} (${file.size} bytes, ${file.type})`);
        
        // Add file to JSZip
        zip.file(newFileName, file);
        
        // Add caption file if provided (optional enhancement)
        const captionKey = `${originalName}_${timestamp}_${i + 1}`;
        const caption = imageCaptions[captionKey];
        if (caption && caption.trim()) {
          const captionFileName = `${originalName}_${timestamp}_${i + 1}.txt`;
          const captionText = `${triggerWord.trim()}, ${caption.trim()}`;
          zip.file(captionFileName, captionText);
          console.log(`  📝 Added caption: ${captionFileName} → "${captionText}"`);
        }
      }
      
      updateProgress({
        uploadProgress: 50,
        currentStep: 'Creating ZIP archive...',
      });
      
      console.log(`📋 ZIP will contain ${Object.keys(zip.files).length} files:`);
      Object.keys(zip.files).forEach((fileName, index) => {
        console.log(`  ${index + 1}. ${fileName}`);
      });

      // Create ZIP using JSZip with no compression for maximum compatibility
      console.log(`🗜️ Creating ZIP archive with JSZip...`);
      const zipArrayBuffer = await zip.generateAsync({
        type: "arraybuffer",
        compression: "STORE",  // No compression for maximum compatibility
        compressionOptions: {
          level: 0
        }
      });
      
      const zipData = new Uint8Array(zipArrayBuffer);
      
      console.log(`✅ ZIP created successfully: ${zipData.length} bytes`);
      console.log(`📊 ZIP file details:`);
      console.log(`  - Total size: ${zipData.length} bytes`);
      console.log(`  - Compression: None (STORE)`);
      console.log(`  - File count: ${Object.keys(zip.files).length}`);
      
      // Verify ZIP file signature
      const signature = Array.from(zipData.slice(0, 4)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ');
      console.log(`  - ZIP signature: [${signature}]`);
      console.log(`  - Expected: [0x50, 0x4b, 0x03, 0x04]`);
      
      // Convert to blob with proper MIME type
      const zipBlob = new Blob([zipData], { type: 'application/zip' });
      
      console.log(`📊 Final ZIP details:`);
      console.log(`  Size: ${zipBlob.size} bytes (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  Type: ${zipBlob.type}`);
      console.log(`  Files: ${Object.keys(zip.files).length} files included`);
      
      // Validate ZIP file structure
      console.log(`🔍 Validating ZIP file structure...`);
      if (zipBlob.size < 100) {
        throw new Error(`ZIP file is too small (${zipBlob.size} bytes). This indicates a problem with the archive creation.`);
      }
      
      // Check if we have at least one image file
      const imageFiles = Object.keys(zip.files).filter(name => 
        name.match(/\.(jpg|jpeg|png|webp)$/i)
      );
      if (imageFiles.length === 0) {
        throw new Error(`No image files found in ZIP archive. This indicates a problem with file processing.`);
      }
      
      console.log(`✅ ZIP validation passed:`);
      console.log(`  - Archive size: ${zipBlob.size} bytes`);
      console.log(`  - Image files: ${imageFiles.length}`);
      console.log(`  - Total files: ${Object.keys(zip.files).length}`);
      
      updateProgress({
        uploadProgress: 75,
        currentStep: 'Uploading files...',
      });
      
      // Get upload URL from Convex
      console.log(`🔗 Requesting upload URL from Convex...`);
      const uploadUrl = await generateUploadUrl();
      console.log(`✅ Upload URL obtained: ${uploadUrl.substring(0, 50)}...`);
      
      // Upload ZIP to Convex storage
      console.log(`⬆️ Uploading ZIP to Convex storage...`);
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/zip",
        },
        body: zipBlob,
      });

      console.log(`📡 Upload response status: ${uploadResult.status}`);

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        console.error(`❌ Upload failed: ${uploadResult.statusText} - ${errorText}`);
        throw new Error(`Upload failed: ${uploadResult.statusText}`);
      }

      const uploadResponse = await uploadResult.json();
      const { storageId } = uploadResponse;
      
      console.log(`✅ ZIP uploaded successfully!`);
      console.log(`🆔 Storage ID: ${storageId}`);

      updateProgress({
        uploadProgress: 100,
        isUploading: false,
        isTraining: true,
        trainingProgress: 0,
        currentStep: 'Starting training...',
      });

      // Start training with the storage ID
      console.log(`🎓 Initiating model training...`);
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

      console.log(`🎉 Training completed successfully!`);
      console.log(`📄 Training result:`, trainingResult);

      toast.success(`Model "${modelName.trim()}" training completed! Check the weights dropdown.`);
      
      // Reset form
      setModelName("");
      setTriggerWord("");
      setSelectedImages([]);
      resetProgress();
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      resetProgress();
      console.error(`❌ Training process failed:`, error);
      toast.error(`Failed to train model: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            disabled={isTraining || !modelName.trim() || !triggerWord.trim() || selectedImages.length < 5}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isTraining ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Training...
              </>
            ) : (
              'Train Model'
            )}
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
