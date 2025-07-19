import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { validateEnvironment, getDeploymentName } from "./utils";
import { FalApiError, FileUploadError, TrainingError } from "./errors";

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

export const testZipContent = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    console.log(`🧪 Testing ZIP file content for storage ID: ${args.storageId}`);
    
    try {
      // Get the file from storage
      const file = await ctx.storage.get(args.storageId);
      if (!file) {
        return {
          success: false,
          message: "File not found in storage",
          error: "File not found",
        };
      }
      
      console.log(`✅ File found in storage: ${args.storageId}`);
      console.log(`📊 File details:`);
      console.log(`  - Size: ${file.size} bytes`);
      console.log(`  - Type: ${file.type}`);
      
      // Use public HTTP endpoint instead of signed URL
      const deploymentName = getDeploymentName();
      const zipUrl = `https://${deploymentName}.convex.site/files/${args.storageId}`;
      
      console.log(`🔗 Using public HTTP endpoint: ${zipUrl}`);
      
      // Download the actual file content via HTTP endpoint
      console.log(`📥 Downloading file content via HTTP endpoint...`);
      const response = await fetch(zipUrl);
      
      if (!response.ok) {
        return {
          success: false,
          message: "Failed to download file via HTTP endpoint",
          error: `${response.status} ${response.statusText}`,
        };
      }
      
      const fileContent = await response.arrayBuffer();
      console.log(`📊 Downloaded file details:`);
      console.log(`  - Size: ${fileContent.byteLength} bytes`);
      console.log(`  - Content-Type: ${response.headers.get('content-type')}`);
      
      // Check if the file has content
      if (fileContent.byteLength === 0) {
        return {
          success: false,
          message: "ZIP file is empty",
          error: "File has 0 bytes",
        };
      }
      
      // Check if it's actually a ZIP file by looking at the first few bytes
      const firstBytes = new Uint8Array(fileContent.slice(0, 4));
      const zipSignature = [0x50, 0x4B, 0x03, 0x04]; // PK\x03\x04
      
      console.log(`🔍 Checking ZIP file signature...`);
      console.log(`  - First bytes: [${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);
      console.log(`  - Expected: [0x50, 0x4B, 0x03, 0x04]`);
      
      const isZipFile = firstBytes.every((byte, index) => byte === zipSignature[index]);
      
      if (!isZipFile) {
        return {
          success: false,
          message: "File is not a valid ZIP archive",
          error: "Invalid ZIP signature",
          details: {
            actualBytes: Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')),
            expectedBytes: zipSignature.map(b => '0x' + b.toString(16).padStart(2, '0')),
          }
        };
      }
      
      console.log(`✅ File is a valid ZIP archive`);
      
      return {
        success: true,
        message: "ZIP file is valid and accessible",
        fileUrl: zipUrl,
        fileSize: fileContent.byteLength,
        fileType: response.headers.get('content-type'),
        isZipFile: true,
      };
      
    } catch (error) {
      console.error(`❌ Error testing ZIP content:`, error);
      return {
        success: false,
        message: "Error testing ZIP file content",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const testSignedUrl = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    console.log(`🧪 Testing signed URL for storage ID: ${args.storageId}`);
    
    try {
      const signedUrl = await ctx.storage.getUrl(args.storageId);
      if (signedUrl) {
        console.log(`✅ Signed URL generated: ${signedUrl.substring(0, 50)}...`);
        
        // Test the signed URL
        const response = await fetch(signedUrl, { method: 'HEAD' });
        console.log(`📁 Signed URL response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          return {
            success: true,
            message: "Signed URL works!",
            fileUrl: signedUrl,
            fileSize: response.headers.get('content-length'),
          };
        } else {
          return {
            success: false,
            message: "Signed URL generated but not accessible",
            error: `${response.status} ${response.statusText}`,
          };
        }
      } else {
        return {
          success: false,
          message: "Could not generate signed URL",
          error: "No signed URL returned",
        };
      }
    } catch (error) {
      console.error(`❌ Error testing signed URL:`, error);
      return {
        success: false,
        message: "Error testing signed URL",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const trainModelSimple = action({
  args: {
    modelName: v.string(),
    triggerWord: v.string(),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    console.log(`🧪 SIMPLE TEST - Starting model training for: ${args.modelName}`);
    console.log(`📝 Trigger word: ${args.triggerWord}`);
    
    // Create a simple test with publicly accessible images
    const testImageUrl = "https://picsum.photos/512/512?random=1"; // Public test image
    
    console.log(`🧪 Using test image URL: ${testImageUrl}`);

    // Prepare training request with a simple image URL
    const requestBody = {
      images_data_url: testImageUrl,         // Test with a simple image URL
      trigger_word: args.triggerWord,
      create_masks: true,
      is_style: false,
      steps: 100, // Shorter for testing
      iter_multiplier: 1.0
    };

    console.log(`🎯 Sending SIMPLE TEST request to Fal AI API...`);
    console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));

    // Call Fal training API
    const response = await fetch("https://fal.run/fal-ai/flux-lora-fast-training", {
      method: "POST",
      headers: {
        "Authorization": `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📡 Fal API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Fal API error: ${response.statusText} - ${errorText}`);
      return {
        success: false,
        error: `Fal API error: ${response.statusText} - ${errorText}`,
        message: "Simple test failed"
      };
    }

    const result = await response.json();
    console.log(`🎉 SIMPLE TEST successful!`);
    console.log(`📄 Training result:`, JSON.stringify(result, null, 2));
    
    return {
      success: true,
      message: "Simple test passed - API is working",
      result: result
    };
  },
});

export const trainModel = action({
  args: {
    modelName: v.string(),
    triggerWord: v.string(),
    zipStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const env = validateEnvironment();
    
    console.log(`🚀 Starting model training for: ${args.modelName}`);
    console.log(`📝 Trigger word: ${args.triggerWord}`);
    console.log(`📦 ZIP Storage ID: ${args.zipStorageId}`);

    // First, verify the file exists in Convex storage
    console.log(`🔍 Checking if file exists in Convex storage...`);
    const fileBlob = await ctx.storage.get(args.zipStorageId);
    if (!fileBlob) {
      throw new FileUploadError(`File with storage ID ${args.zipStorageId} not found in Convex storage`);
    }
    console.log(`✅ File exists in Convex storage: ${fileBlob.size} bytes`);

    // Download the ZIP file from Convex storage
    console.log(`📥 Downloading ZIP file from Convex storage...`);
    const zipArrayBuffer = await fileBlob.arrayBuffer();
    const zipUint8Array = new Uint8Array(zipArrayBuffer);
    
    console.log(`📊 ZIP file details:`);
    console.log(`  - Size: ${zipUint8Array.length} bytes`);
    console.log(`  - Type: ${fileBlob.type}`);
    
    // Validate ZIP file signature
    if (zipUint8Array.length === 0) {
      throw new Error("ZIP file is empty");
    }
    
    const firstBytes = zipUint8Array.slice(0, 4);
    const zipSignature = [0x50, 0x4B, 0x03, 0x04]; // PK\x03\x04
    const isZipFile = firstBytes.every((byte, index) => byte === zipSignature[index]);
    
    if (!isZipFile) {
      console.error(`❌ Invalid ZIP signature: [${Array.from(firstBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);
      throw new Error("File is not a valid ZIP archive");
    }
    
    console.log(`✅ ZIP file validation passed: ${zipUint8Array.length} bytes, valid signature`);

    // Convert ZIP file to base64 data URI for Fal AI
    console.log(`🔄 Converting ZIP file to base64 data URI...`);
    
    let falFileUrl: string;
    
    try {
      // Convert to base64 data URI using btoa (works in Convex runtime)
      // First convert Uint8Array to binary string
      console.log(`📊 Converting ${zipUint8Array.length} bytes to binary string...`);
      
      let binaryString = '';
      for (let i = 0; i < zipUint8Array.length; i++) {
        binaryString += String.fromCharCode(zipUint8Array[i]);
      }
      
      console.log(`📊 Binary string length: ${binaryString.length} characters`);
      
      // Then convert to base64
      console.log(`📊 Converting binary string to base64...`);
      const base64String = btoa(binaryString);
      
      console.log(`📊 Base64 string length: ${base64String.length} characters`);
      
      const dataUri = `data:application/zip;base64,${base64String}`;
      
      // Test: decode base64 back to verify it's working correctly
      console.log(`🧪 Testing base64 conversion by decoding...`);
      try {
        const decodedBinary = atob(base64String);
        const decodedArray = new Uint8Array(decodedBinary.length);
        for (let i = 0; i < decodedBinary.length; i++) {
          decodedArray[i] = decodedBinary.charCodeAt(i);
        }
        
        // Verify the decoded data matches original
        const matches = decodedArray.length === zipUint8Array.length && 
                       decodedArray.every((byte, index) => byte === zipUint8Array[index]);
        
        console.log(`🧪 Base64 round-trip test: ${matches ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`🧪 Original size: ${zipUint8Array.length}, Decoded size: ${decodedArray.length}`);
        
        if (!matches) {
          throw new Error("Base64 round-trip test failed - data corruption detected");
        }
      } catch (testError) {
        console.error(`❌ Base64 test failed:`, testError);
        throw new Error(`Base64 conversion test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      
      falFileUrl = dataUri;
      
      console.log(`✅ Successfully converted to base64 data URI`);
      console.log(`📊 Data URI length: ${dataUri.length} characters`);
      console.log(`📊 Data URI preview: ${dataUri.substring(0, 100)}...`);
      
      // Check if the data URI is reasonable size (base64 is ~33% larger than binary)
      const maxReasonableSize = 10 * 1024 * 1024; // 10MB limit for API requests
      if (dataUri.length > maxReasonableSize) {
        console.warn(`⚠️ Data URI is very large: ${(dataUri.length / 1024 / 1024).toFixed(2)} MB`);
        console.warn(`⚠️ This might cause API request issues`);
      }
      
    } catch (error) {
      console.error(`❌ Error converting to base64:`, error);
      throw new Error(`Failed to convert ZIP file to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(`🎯 Using base64 data URI for Fal AI training`);

    // Prepare training request according to Fal AI API documentation
    const requestBody = {
      images_data_url: falFileUrl,           // Required: URL to ZIP archive (base64 data URI)
      trigger_word: args.triggerWord,        // Optional: Trigger word for captions
      create_masks: true,                    // Optional: Generate masks automatically
      is_style: false,                       // Optional: Style vs subject training
      steps: 1000,                           // Optional: Training steps
      iter_multiplier: 1.0                   // Optional: Iteration multiplier
    };

    console.log(`🎯 Sending training request to Fal AI API...`);
    console.log(`📋 Request body structure:`, {
      images_data_url_length: requestBody.images_data_url.length,
      images_data_url_preview: requestBody.images_data_url.substring(0, 100) + '...',
      trigger_word: requestBody.trigger_word,
      create_masks: requestBody.create_masks,
      is_style: requestBody.is_style,
      steps: requestBody.steps,
      iter_multiplier: requestBody.iter_multiplier
    });

    // Call Fal training API
    const response = await fetch("https://fal.run/fal-ai/flux-lora-fast-training", {
      method: "POST",
      headers: {
        "Authorization": `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📡 Fal API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Fal API error: ${response.statusText} - ${errorText}`);
      throw new FalApiError(`Fal API error: ${response.statusText} - ${errorText}`, response.status);
    }

    const result = await response.json();
    console.log(`🎉 Training initiated successfully!`);
    console.log(`📄 Training result:`, JSON.stringify(result, null, 2));
    
    // Save the trained model to database
    await ctx.runMutation(api.modelWeights.createFromTraining, {
      name: args.modelName,
      tok: args.triggerWord,
      modelUrl: result.diffusers_lora_file.url,
      configUrl: result.config_file?.url,
    });

    console.log(`💾 Model saved to database successfully`);

    return {
      success: true,
      modelUrl: result.diffusers_lora_file.url,
      configUrl: result.config_file?.url,
      message: `Model "${args.modelName}" training completed successfully!`
    };
  },
});
