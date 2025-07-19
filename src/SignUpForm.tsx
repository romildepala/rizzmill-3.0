import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface SignUpFormProps {
  onBack: () => void;
}

export function SignUpForm({ onBack }: SignUpFormProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  
  const sendVerificationEmail = useAction(api.emailVerification.sendVerificationEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setSubmitting(true);
    try {
      // First, create the account
      await signIn("password", { email: email.trim(), password, flow: "signUp" });
      
      // Then send verification email
      try {
        const result = await sendVerificationEmail({ email: email.trim() });
        if (result.success) {
          setRegistered(true);
          toast.success("Account created! Check your email for verification link.");
          
          // If we're in development mode and have a verification URL, show it
          if (result.verificationUrl) {
            console.log("🔗 Email Verification URL:", result.verificationUrl);
            toast.info("Check the browser console for the verification link!", { duration: 5000 });
          }
        }
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        toast.warning("Account created but failed to send verification email. You can request a new one.");
        setRegistered(true);
      }
    } catch (error) {
      console.error("Sign up failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          toast.error("An account with this email already exists");
        } else {
          toast.error("Failed to create account. Please try again.");
        }
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Account created!</h3>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check your email and click the verification link to activate your account.
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Create your account</h3>
        <p className="text-gray-600">
          Join Rizzmil to start generating AI images with custom models.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="auth-input-field"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={submitting}
        />
        
        <input
          className="auth-input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password (min. 8 characters)"
          required
          disabled={submitting}
          minLength={8}
        />
        
        <input
          className="auth-input-field"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={submitting}
          minLength={8}
        />
        
        <button 
          className="auth-button" 
          type="submit" 
          disabled={submitting || !email.trim() || !password.trim() || !confirmPassword.trim()}
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
