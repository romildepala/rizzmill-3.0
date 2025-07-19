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
  
  const generations = useQuery(api.generations.list) || [];
  const modelWeights = useQuery(api.modelWeights.list) || [];
  const generateImage = useAction(api.generations.generateImage);
  const seedWeights = useMutation(api.modelWeights.seedWeights);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rizzmil AI Image Generator</h1>
        <SignOutButton />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            ✅ Authentication is working properly!
          </p>
        </div>

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
