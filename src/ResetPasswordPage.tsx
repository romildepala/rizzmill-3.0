import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface ResetPasswordPageProps {
  token: string;
  onSuccess: () => void;
}

export function ResetPasswordPage({ token, onSuccess }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const tokenValidation = useQuery(api.passwordReset.validateResetToken, { token });
  const resetPassword = useAction(api.passwordReset.resetPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const result = await resetPassword({ 
        token, 
        newPassword: password 
      });
      
      if (result.success) {
        toast.success("Password reset successful! Please sign in with your new password.");
        onSuccess();
      }
    } catch (error) {
      toast.error("Failed to reset password. Please try again or request a new reset link.");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!tokenValidation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValidation.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">{tokenValidation.message}</p>
            <a 
              href="/" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Return to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rizzmil</h1>
          <p className="text-gray-600 mb-8">Reset your password</p>
          
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Set new password</h2>
              <p className="text-sm text-gray-600">
                Resetting password for: <strong>{tokenValidation.email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                className="auth-input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                disabled={submitting}
                minLength={8}
              />
              
              <input
                className="auth-input-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={submitting}
                minLength={8}
              />
              
              <button 
                className="auth-button" 
                type="submit" 
                disabled={submitting || !password.trim() || !confirmPassword.trim()}
              >
                {submitting ? "Resetting..." : "Reset password"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <a 
                href="/" 
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                ← Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
