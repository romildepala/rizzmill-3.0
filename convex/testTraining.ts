import { action } from "./_generated/server";
import { v } from "convex/values";
import { validateEnvironment, getDeploymentName } from "./utils";

export const testFileUpload = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    console.log(`🧪 Testing file upload with storage ID: ${args.storageId}`);
    
    // Check if file exists in storage
    const file = await ctx.storage.get(args.storageId);
    if (!file) {
      throw new Error(`File not found in storage: ${args.storageId}`);
    }
    
    console.log(`✅ File found in storage: ${args.storageId}`);
    
    // Test signed URL approach
    console.log(`🔗 Testing signed URL approach...`);
    try {
      const signedUrl = await ctx.storage.getUrl(args.storageId);
      if (signedUrl) {
        console.log(`✅ Signed URL generated: ${signedUrl.substring(0, 50)}...`);
        
        // Test the signed URL
        const signedResponse = await fetch(signedUrl, { method: 'HEAD' });
        console.log(`📁 Signed URL response: ${signedResponse.status} ${signedResponse.statusText}`);
        
        if (signedResponse.ok) {
          return {
            success: true,
            message: "Signed URL approach works!",
            fileUrl: signedUrl,
            fileSize: signedResponse.headers.get('content-length'),
          };
        } else {
          console.log(`❌ Signed URL not accessible: ${signedResponse.status}`);
        }
      } else {
        console.log(`❌ Could not generate signed URL`);
      }
    } catch (error) {
      console.error(`❌ Error with signed URL:`, error);
    }
    
    // Test HTTP endpoint
    const deploymentName = getDeploymentName();
    const testUrl = `https://${deploymentName}.convex.site/test`;
    const fileUrl = `https://${deploymentName}.convex.site/files/${args.storageId}`;
    
    console.log(`🔗 Testing HTTP endpoint: ${testUrl}`);
    console.log(`📁 File URL: ${fileUrl}`);
    
    try {
      const testResponse = await fetch(testUrl);
      console.log(`✅ Test endpoint response: ${testResponse.status} ${testResponse.statusText}`);
      
      const fileResponse = await fetch(fileUrl, { method: 'HEAD' });
      console.log(`📁 File endpoint response: ${fileResponse.status} ${fileResponse.statusText}`);
      
      if (fileResponse.ok) {
        console.log(`✅ File is accessible via HTTP endpoint`);
        return {
          success: true,
          message: "File upload and HTTP endpoint are working correctly",
          fileUrl: fileUrl,
          fileSize: fileResponse.headers.get('content-length'),
        };
      } else {
        console.log(`❌ File is not accessible via HTTP endpoint`);
        return {
          success: false,
          message: "File exists in storage but HTTP endpoint is not working",
          fileUrl: fileUrl,
          error: `${fileResponse.status} ${fileResponse.statusText}`,
        };
      }
    } catch (error) {
      console.error(`❌ Error testing endpoints:`, error);
      return {
        success: false,
        message: "Error testing HTTP endpoints",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
}); 