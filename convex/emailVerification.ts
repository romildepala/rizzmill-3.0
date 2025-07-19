import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const storeEmailVerificationToken = mutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing verification tokens for this email
    const existingTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    
    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Store new token
    return await ctx.db.insert("emailVerificationTokens", {
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
    });
  },
});

export const getVerificationToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const deleteVerificationToken = mutation({
  args: { tokenId: v.id("emailVerificationTokens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tokenId);
  },
});

export const markEmailAsVerified = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      emailVerificationTime: Date.now(),
    });
  },
});

export const sendVerificationEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    console.log(`🔍 Sending verification email to: ${args.email}`);
    
    // Check if user exists
    const user = await ctx.runQuery(api.emailVerification.getUserByEmail, { email: args.email });
    
    if (!user) {
      console.log(`⚠️ No user found with email: ${args.email}`);
      throw new Error("User not found");
    }

    // Check if already verified
    if (user.emailVerificationTime) {
      console.log(`✅ Email already verified for: ${args.email}`);
      return { 
        success: true, 
        message: "Email is already verified." 
      };
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    // Store verification token
    await ctx.runMutation(api.emailVerification.storeEmailVerificationToken, {
      email: args.email,
      token: verificationToken,
      expiresAt,
    });

    // Generate verification URL
    const verificationUrl = `${process.env.SITE_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    // For development/demo purposes, always use console logging
    console.log("🧪 Development mode: Simulating email send");
    console.log(`📧 [DEV MODE] Email verification would be sent to: ${args.email}`);
    console.log(`🔗 [DEV MODE] Verification URL: ${verificationUrl}`);
    console.log(`📝 [DEV MODE] Copy this URL to verify email: ${verificationUrl}`);
    
    return { 
      success: true, 
      message: "Development mode: Check the browser console for the verification link. In production, you would receive an email.",
      verificationUrl: verificationUrl // Include the URL in the response for development
    };
  },
});

export const verifyEmail = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; email?: string }> => {
    console.log(`🔍 Verifying email with token: ${args.token}`);
    
    // Find the verification token
    const verificationToken: any = await ctx.runQuery(api.emailVerification.getVerificationToken, { token: args.token });

    if (!verificationToken) {
      console.log(`❌ Invalid verification token: ${args.token}`);
      throw new Error("Invalid or expired verification token");
    }

    if (verificationToken.expiresAt < Date.now()) {
      console.log(`❌ Expired verification token: ${args.token}`);
      // Clean up expired token
      await ctx.runMutation(api.emailVerification.deleteVerificationToken, { tokenId: verificationToken._id });
      throw new Error("Verification token has expired");
    }

    // Find the user
    const user = await ctx.runQuery(api.emailVerification.getUserByEmail, { email: verificationToken.email });
    if (!user) {
      console.log(`❌ User not found for email: ${verificationToken.email}`);
      throw new Error("User not found");
    }

    // Mark email as verified
    await ctx.runMutation(api.emailVerification.markEmailAsVerified, { userId: user._id });

    // Delete the verification token
    await ctx.runMutation(api.emailVerification.deleteVerificationToken, { tokenId: verificationToken._id });

    console.log(`✅ Email verified successfully for: ${verificationToken.email}`);
    
    return { 
      success: true, 
      message: "Email verified successfully! You can now sign in.",
      email: verificationToken.email
    };
  },
});

export const resendVerificationEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.emailVerification.sendVerificationEmail, { email: args.email });
  },
});
