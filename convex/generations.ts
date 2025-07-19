import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { validateEnvironment } from "./utils";
import { FalApiError } from "./errors";

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
