import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { useUser, SignIn } from "@clerk/clerk-react";
import { SignOutButton } from "./SignOutButton";

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
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const generations = useQuery(api.generations.list) || [];
  const modelWeights = useQuery(api.modelWeights.list) || [];
  const generateImage = useAction(api.generations.generateImage);
  const trainModel = useAction(api.training.trainModel);
  const generateUploadUrl = useMutation(api.generations.generateUploadUrl);
  const seedWeights = useMutation(api.modelWeights.seedWeights);

  console.log("🔍 Debug - AuthenticatedApp rendered");
  console.log("🔍 Debug - generations:", generations);
  console.log("🔍 Debug - modelWeights:", modelWeights);

  // Set default weight when weights load
  useEffect(() => {
    if (modelWeights.length > 0 && !selectedWeight) {
      setSelectedWeight(modelWeights[0].modelUrl);
    }
  }, [modelWeights, selectedWeight]);

  // Seed weights on first load if none exist
  useEffect(() => {
    if (modelWeights.length === 0) {
      console.log("🔍 Debug - Seeding weights...");
      seedWeights().catch(console.error);
    }
  }, [modelWeights.length, seedWeights]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
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
    
    if (files.length < 5) {
      toast.error("Please upload at least 5 images");
      return;
    }
    
    if (files.length > 20) {
      toast.error("Maximum 20 images allowed");
      return;
    }

    // Check individual files
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error(`File "${file.name}" is not a supported image type`);
        return;
      }
      
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large (max 10MB)`);
        return;
      }
    }
    
    console.log(`📁 Selected ${files.length} images for training`);
    setSelectedImages(files);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleTrainModel = async () => {
    if (!modelName.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    if (!triggerWord.trim()) {
      toast.error("Please enter a trigger word");
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

    setIsTraining(true);
    setTrainingProgress(0);
    console.log(`🚀 Starting model training process...`);
    console.log(`📝 Model Name: ${modelName.trim()}`);
    console.log(`🎯 Trigger Word: ${triggerWord.trim()}`);
    console.log(`🖼️ Number of images: ${selectedImages.length}`);

    try {
      // Step 1: Create ZIP file using JSZip
      const JSZip = (await import('jszip')).default;
      console.log(`📦 JSZip library loaded successfully`);
      
      setTrainingProgress(20);
      
      const zip = new JSZip();
      
      console.log(`🔄 Adding ${selectedImages.length} images to ZIP...`);
      
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `image_${i + 1}.${extension}`;
        
        zip.file(fileName, file);
        console.log(`  ✅ Added: ${fileName} (${file.size} bytes)`);
      }
      
      setTrainingProgress(40);
      
      // Create ZIP with minimal compression
      console.log(`🗜️ Generating ZIP file...`);
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "STORE", // No compression for reliability
      });
      
      console.log(`✅ ZIP created: ${zipBlob.size} bytes`);
      
      setTrainingProgress(60);
      
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

      setTrainingProgress(80);

      // Step 3: Start training
      console.log(`🎓 Starting model training...`);
      const trainingResult = await trainModel({
        modelName: modelName.trim(),
        triggerWord: triggerWord.trim(),
        zipStorageId: storageId,
      });

      setTrainingProgress(100);

      console.log(`🎉 Training completed successfully!`, trainingResult);
      toast.success(`Model "${modelName.trim()}" trained successfully! Check the weights dropdown.`);
      
      // Reset form
      setModelName("");
      setTriggerWord("");
      setSelectedImages([]);
      setTrainingProgress(0);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      setTrainingProgress(0);
      console.error(`❌ Training process failed:`, error);
      toast.error(`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTraining(false);
      console.log(`🏁 Training process completed`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rizzmil AI Image Generator</h1>
        <SignOutButton />
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            ✅ Authentication is working properly!
          </p>
          <p className="text-sm text-green-700 mt-2">
            Debug: {generations.length} generations, {modelWeights.length} weights loaded
          </p>
        </div>

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

        {/* Training progress bar */}
        {isTraining && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Training Progress</span>
              <span>{trainingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
      </div>
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
        <SignIn />
      </div>
    </div>
  );
}

export default function App() {
  const { isLoaded, isSignedIn } = useUser();
  
  console.log("🔍 Debug - App rendered, isLoaded:", isLoaded, "isSignedIn:", isSignedIn);
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isSignedIn ? (
        <AuthenticatedApp />
      ) : (
        <SignInPage />
      )}
      <Toaster />
    </>
  );
}
