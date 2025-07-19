"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { validateEnvironment } from "./utils";
import { FalApiError, FileUploadError } from "./errors";
import { fal } from "@fal-ai/client";

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
      
      // Create a Blob instead of File (File constructor not available in Convex Node.js runtime)
      const zipFileBlob = new Blob([zipArrayBuffer], { type: 'application/zip' });
      
      console.log(`📊 ZIP file prepared: ${zipFileBlob.size} bytes`);

      // Step 3: Upload ZIP to Fal AI storage using their official client
      console.log(`☁️ Uploading ZIP to Fal AI storage...`);
      const falStorageUrl = await fal.storage.upload(zipFileBlob);
      
      console.log(`✅ ZIP uploaded to Fal AI storage: ${falStorageUrl}`);

      // Step 4: Start training using the uploaded file URL
      console.log(`🎓 Starting model training with Fal AI client...`);
      
      const trainingResult = await fal.subscribe("fal-ai/flux-lora-fast-training", {
        input: {
          images_data_url: falStorageUrl,
          trigger_word: args.triggerWord,
          create_masks: true,
          is_style: false,
          steps: 1000
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
          steps: 10 // Minimal steps for testing
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