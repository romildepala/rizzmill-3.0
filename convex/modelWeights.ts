import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("modelWeights")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();
  },
});

export const createFromTraining = mutation({
  args: {
    name: v.string(),
    tok: v.string(),
    modelUrl: v.string(),
    configUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    
    return await ctx.db.insert("modelWeights", {
      name: args.name,
      tok: args.tok,
      modelUrl: args.modelUrl,
      configUrl: args.configUrl,
      isPublic: true,
      userEmail: user?.email,
      createdTimestamp: Date.now(),
    });
  },
});

export const seedWeights = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if weights already exist
    const existing = await ctx.db.query("modelWeights").first();
    if (existing) {
      return "Weights already seeded";
    }

    // Seed the weights from the provided data
    await ctx.db.insert("modelWeights", {
      name: "SRK",
      tok: "SRK",
      modelUrl: "https://v3.fal.media/files/panda/lMmX_k3oIxXJMdlpIeC9O_pytorch_lora_weights.safetensors",
      isPublic: true,
      userEmail: "romilpd@hotmail.com",
      createdTimestamp: new Date("2025-06-15 20:19:33.93+00").getTime(),
    });

    await ctx.db.insert("modelWeights", {
      name: "Romil",
      tok: "RIZZMIL",
      modelUrl: "https://storage.googleapis.com/fal-flux-lora/825eff51241f4086bbf98e32e564c51d_pytorch_lora_weights.safetensors",
      isPublic: true,
      userEmail: "laliganewsletter@gmail.com",
      createdTimestamp: new Date("2025-06-15 20:26:44.186+00").getTime(),
    });

    await ctx.db.insert("modelWeights", {
      name: "Ayyy",
      tok: "AYAZ",
      modelUrl: "https://v3.fal.media/files/panda/Bubc5dP6g4NZIzcOPyaZQ_pytorch_lora_weights.safetensors",
      isPublic: true,
      userEmail: "romilpd@hotmail.com",
      createdTimestamp: new Date("2025-06-18 17:02:58.961+00").getTime(),
    });

    await ctx.db.insert("modelWeights", {
      name: "Leonardo Di Caprio",
      tok: "LEOD",
      modelUrl: "https://v3.fal.media/files/panda/lMmX_k3oIxXJMdlpIeC9O_pytorch_lora_weights.safetensors",
      isPublic: true,
      createdTimestamp: new Date("2025-06-15 20:07:50.573124+00").getTime(),
    });

    return "Weights seeded successfully";
  },
});
