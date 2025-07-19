import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  generations: defineTable({
    prompt: v.string(),
    model: v.string(),
    weights: v.string(),
    imageUrl: v.string(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
  
  modelWeights: defineTable({
    name: v.string(),
    tok: v.string(),
    modelUrl: v.string(),
    configUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    userEmail: v.optional(v.string()),
    createdTimestamp: v.number(),
  }).index("by_public", ["isPublic"])
    .index("by_created", ["createdTimestamp"]),
});
