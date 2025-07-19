import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { validateEnvironment } from "./utils";
import { FalApiError, FileUploadError } from "./errors";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("generations")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    prompt: v.string(),
    model: v.string(),
    weights: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("generations", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateImage = action({
  args: {
    prompt: v.string(),
    model: v.string(),
    weights: v.string(),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    try {
      const response = await fetch("https://fal.run/fal-ai/flux-lora", {
        method: "POST",
        headers: {
          "Authorization": `Key ${env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: args.prompt,
          loras: [
            {
              path: args.weights,
              scale: 1
            }
          ],
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true
        }),
      });

      if (!response.ok) {
        throw new FalApiError(`Fal API error: ${response.statusText}`, response.status);
      }

      const result = await response.json();
      const imageUrl = result.images[0].url;

      // Save to database
      await ctx.runMutation(api.generations.create, {
        prompt: args.prompt,
        model: args.model,
        weights: args.weights,
        imageUrl: imageUrl,
      });

      return { imageUrl };
    } catch (error) {
      if (error instanceof FalApiError) {
        throw error;
      }
      throw new FalApiError(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// ============================================================================
// TRAINING FUNCTIONALITY - REBUILT FROM SCRATCH WITH FAL AI CLIENT
// ============================================================================

export const trainModel = action({
  args: {
    modelName: v.string(),
    triggerWord: v.string(),
    zipStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    console.log(`🚀 Starting optimized model training for: ${args.modelName}`);
    console.log(`📝 Trigger word: ${args.triggerWord}`);
    console.log(`📦 ZIP Storage ID: ${args.zipStorageId}`);

    try {
      // Step 1: Get ZIP file from Convex storage
      console.log(`📥 Retrieving ZIP file from Convex storage...`);
      const zipBlob = await ctx.storage.get(args.zipStorageId);
      if (!zipBlob) {
        throw new FileUploadError(`ZIP file not found in storage: ${args.zipStorageId}`);
      }
      
      console.log(`✅ ZIP file retrieved: ${zipBlob.size} bytes`);

      // Step 2: Convert to format suitable for Fal AI
      console.log(`🔄 Preparing ZIP file for Fal AI...`);
      const zipArrayBuffer = await zipBlob.arrayBuffer();
      
      // Create a File object that Fal AI client can handle
      const zipFile = new File([zipArrayBuffer], `training_${args.modelName}_${Date.now()}.zip`, {
        type: 'application/zip'
      });
      
      console.log(`📊 ZIP file prepared: ${zipFile.name} (${zipFile.size} bytes)`);

      // Step 3: Use Fal AI's official approach - direct API call with FormData
      console.log(`☁️ Uploading ZIP to Fal AI and starting training...`);
      
      // Create FormData for multipart upload (if Fal AI supports it)
      // Otherwise, we'll use the direct API approach
      const trainingResponse = await fetch("https://fal.run/fal-ai/flux-lora-fast-training", {
        method: "POST",
        headers: {
          "Authorization": `Key ${env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images_data_url: `data:application/zip;base64,${await convertToBase64(zipArrayBuffer)}`,
          trigger_word: args.triggerWord,
          create_masks: true,
          is_style: false,
          steps: 1000,
          iter_multiplier: 1.0
        }),
      });

      console.log(`📡 Fal AI training response status: ${trainingResponse.status}`);

      if (!trainingResponse.ok) {
        const errorText = await trainingResponse.text();
        console.error(`❌ Fal AI training failed: ${trainingResponse.statusText} - ${errorText}`);
        throw new FalApiError(`Training failed: ${trainingResponse.statusText} - ${errorText}`, trainingResponse.status);
      }

      const trainingResult = await trainingResponse.json();
      console.log(`🎉 Training completed successfully!`);
      console.log(`📄 Result:`, trainingResult);

      // Step 4: Save trained model to database
      await ctx.runMutation(api.modelWeights.createFromTraining, {
        name: args.modelName,
        tok: args.triggerWord,
        modelUrl: trainingResult.diffusers_lora_file.url,
        configUrl: trainingResult.config_file?.url,
      });

      console.log(`💾 Model saved to database successfully`);

      return {
        success: true,
        modelUrl: trainingResult.diffusers_lora_file.url,
        configUrl: trainingResult.config_file?.url,
        message: `Model "${args.modelName}" trained successfully!`
      };

    } catch (error) {
      console.error(`❌ Training failed:`, error);
      
      if (error instanceof FalApiError || error instanceof FileUploadError) {
        throw error;
      }
      
      throw new Error(`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function for base64 conversion (optimized)
async function convertToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer);
  let binaryString = '';
  
  // Process in chunks to avoid stack overflow on large files
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binaryString);
}

// Test function to verify training setup
export const testTraining = action({
  args: {
    modelName: v.string(),
    triggerWord: v.string(),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    console.log(`🧪 Testing training setup...`);
    
    try {
      // Test with a simple public image URL
      const testResponse = await fetch("https://fal.run/fal-ai/flux-lora-fast-training", {
        method: "POST",
        headers: {
          "Authorization": `Key ${env.FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images_data_url: "https://picsum.photos/512/512?random=1",
          trigger_word: args.triggerWord,
          create_masks: true,
          is_style: false,
          steps: 10, // Minimal steps for testing
          iter_multiplier: 1.0
        }),
      });

      if (testResponse.ok) {
        console.log(`✅ Training API is accessible and working`);
        return { success: true, message: "Training API test passed" };
      } else {
        const errorText = await testResponse.text();
        console.error(`❌ Training API test failed: ${testResponse.status} - ${errorText}`);
        return { success: false, message: `API test failed: ${testResponse.statusText}` };
      }
    } catch (error) {
      console.error(`❌ Training test error:`, error);
      return { success: false, message: `Test error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  },
});
