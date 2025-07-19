import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
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

  passwordResetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_token", ["token"]),

  emailVerificationTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_token", ["token"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
