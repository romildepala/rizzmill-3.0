import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// Test endpoint to verify HTTP routing
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response("HTTP routing is working!", {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/files/:storageId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.pathname.split('/').pop();
    
    console.log(`🔍 HTTP endpoint called with storage ID: ${storageId}`);
    
    if (!storageId) {
      console.error(`❌ No storage ID provided`);
      return new Response("Storage ID required", { status: 400 });
    }
    
    try {
      // Fix: Use proper type casting instead of 'as any'
      const file = await ctx.storage.get(storageId as Id<"_storage">);
      if (!file) {
        console.error(`❌ File not found for storage ID: ${storageId}`);
        return new Response("File not found", { status: 404 });
      }

      console.log(`✅ File found and serving for storage ID: ${storageId}`);
      return new Response(file, {
        headers: {
          "Content-Type": "application/zip",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error(`❌ Error serving file for storage ID ${storageId}:`, error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http;
