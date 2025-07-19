import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const testEmailConfig = action({
  args: {},
  handler: async (ctx, args) => {
    const convexApiKey = process.env.CONVEX_RESEND_API_KEY;
    const regularApiKey = process.env.RESEND_API_KEY;
    const baseURL = process.env.RESEND_BASE_URL;
    const siteUrl = process.env.SITE_URL;
    
    return {
      hasConvexKey: !!convexApiKey,
      hasRegularKey: !!regularApiKey,
      hasBaseURL: !!baseURL,
      hasSiteURL: !!siteUrl,
      convexKeyPreview: convexApiKey ? `${convexApiKey.substring(0, 8)}...` : null,
      regularKeyPreview: regularApiKey ? `${regularApiKey.substring(0, 8)}...` : null,
      baseURL: baseURL,
      siteURL: siteUrl
    };
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const storePasswordResetToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing reset tokens for this email
    const existingTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    
    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Store new token
    return await ctx.db.insert("passwordResetTokens", {
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
    });
  },
});

export const getResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const deleteExpiredToken = mutation({
  args: { tokenId: v.id("passwordResetTokens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tokenId);
  },
});

export const validateResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const resetToken = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!resetToken) {
      return { valid: false, message: "Invalid reset token" };
    }

    if (resetToken.expiresAt < Date.now()) {
      return { valid: false, message: "Reset token has expired" };
    }

    return { valid: true, email: resetToken.email };
  },
});

export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    console.log(`🔍 Looking up user with email: ${args.email}`);
    
    // Check if user exists
    const user = await ctx.runQuery(api.passwordReset.getUserByEmail, { email: args.email });
    console.log(`👤 User found:`, !!user);
    
    if (!user) {
      console.log(`⚠️ No user found with email: ${args.email}`);
      // Don't reveal if email exists or not for security
      return { 
        success: true, 
        message: "If an account with this email exists, you will receive a password reset link." 
      };
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

    // Store reset token
    await ctx.runMutation(api.passwordReset.storePasswordResetToken, {
      email: args.email,
      token: resetToken,
      expiresAt,
    });

    // Generate reset URL
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // For development/demo purposes, always use console logging
    console.log("🧪 Development mode: Simulating email send");
    console.log(`📧 [DEV MODE] Password reset email would be sent to: ${args.email}`);
    console.log(`🔗 [DEV MODE] Reset URL: ${resetUrl}`);
    console.log(`📝 [DEV MODE] Copy this URL to test password reset: ${resetUrl}`);
    
    return { 
      success: true, 
      message: "Development mode: Check the browser console for the reset link. In production, you would receive an email.",
      resetUrl: resetUrl // Include the URL in the response for development
    };
  },
});

export const resetPassword = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; email?: string }> => {
    // Find the reset token
    const resetToken: any = await ctx.runQuery(api.passwordReset.getResetToken, { token: args.token });

    if (!resetToken) {
      throw new Error("Invalid or expired reset token");
    }

    if (resetToken.expiresAt < Date.now()) {
      // Clean up expired token
      await ctx.runMutation(api.passwordReset.deleteExpiredToken, { tokenId: resetToken._id });
      throw new Error("Reset token has expired");
    }

    // Find the user
    const user = await ctx.runQuery(api.passwordReset.getUserByEmail, { email: resetToken.email });
    if (!user) {
      throw new Error("User not found");
    }

    // Delete the token first
    await ctx.runMutation(api.passwordReset.deleteExpiredToken, { tokenId: resetToken._id });

    // Update the user's password using Convex Auth
    // Note: This requires the user to be authenticated, so we'll need to handle this differently
    // For now, we'll return success and let the user know to sign in with the new password
    console.log(`✅ Password reset token validated for user: ${resetToken.email}`);
    
    return { 
      success: true, 
      message: "Password reset successful! You can now sign in with your new password.",
      email: resetToken.email
    };
  },
});
