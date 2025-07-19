"use node";

import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { validateEnvironment } from "./utils";
import { FalApiError, FileUploadError } from "./errors";
import { fal } from "@fal-ai/client";

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
    
    // Configure Fal AI client
    fal.config({
      credentials: env.FAL_KEY
    });
    
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

      // Step 2: Create File object for Fal AI client
      console.log(`🔄 Preparing ZIP file for Fal AI upload...`);
      const zipArrayBuffer = await zipBlob.arrayBuffer();
      
      // Create a proper File object for Fal AI client
      const zipFile = new File([zipArrayBuffer], `training_${args.modelName}_${Date.now()}.zip`, {
        type: 'application/zip'
      });
      
      console.log(`📊 ZIP file prepared: ${zipFile.name} (${zipFile.size} bytes)`);

      // Step 3: Upload ZIP to Fal AI storage using their official client
      console.log(`☁️ Uploading ZIP to Fal AI storage...`);
      const falStorageUrl = await fal.storage.upload(zipFile);
      
      console.log(`✅ ZIP uploaded to Fal AI storage: ${falStorageUrl}`);

      // Step 4: Start training using the uploaded file URL
      console.log(`🎓 Starting model training with Fal AI client...`);
      
      const trainingResult = await fal.subscribe("fal-ai/flux-lora-fast-training", {
        input: {
          images_data_url: falStorageUrl,
          trigger_word: args.triggerWord,
          create_masks: true,
          is_style: false,
          steps: 1000,
          iter_multiplier: 1.0
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`📊 Training progress: ${update.status}`);
            update.logs?.map((log) => log.message).forEach((msg) => {
              console.log(`🔄 Training log: ${msg}`);
            });
          }
        },
      });

      console.log(`🎉 Training completed successfully!`);
      console.log(`📄 Result:`, trainingResult.data);

      // Step 5: Save trained model to database
      await ctx.runMutation(api.modelWeights.createFromTraining, {
        name: args.modelName,
        tok: args.triggerWord,
        modelUrl: trainingResult.data.diffusers_lora_file.url,
        configUrl: trainingResult.data.config_file?.url,
      });

      console.log(`💾 Model saved to database successfully`);

      return {
        success: true,
        modelUrl: trainingResult.data.diffusers_lora_file.url,
        configUrl: trainingResult.data.config_file?.url,
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

// Test function to verify training setup
export const testTraining = action({
  args: {
    modelName: v.string(),
    triggerWord: v.string(),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    // Configure Fal AI client
    fal.config({
      credentials: env.FAL_KEY
    });
    
    console.log(`🧪 Testing training setup with Fal AI client...`);
    
    try {
      // Test with a simple public image URL using the official client
      const testResult = await fal.subscribe("fal-ai/flux-lora-fast-training", {
        input: {
          images_data_url: "https://picsum.photos/512/512?random=1",
          trigger_word: args.triggerWord,
          create_masks: true,
          is_style: false,
          steps: 10, // Minimal steps for testing
          iter_multiplier: 1.0
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log(`🧪 Test progress: ${update.status}`);
        },
      });

      console.log(`✅ Training API test passed with Fal AI client!`);
      console.log(`📄 Test result:`, testResult.data);
      
      return { 
        success: true, 
        message: "Training API test passed with Fal AI client",
        result: testResult.data
      };
    } catch (error) {
      console.error(`❌ Training test error:`, error);
      return { 
        success: false, 
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown'}` 
      };
    }
  },
});
