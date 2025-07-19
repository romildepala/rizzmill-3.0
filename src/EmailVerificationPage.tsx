import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface EmailVerificationPageProps {
  token: string;
  onSuccess: () => void;
}

export function EmailVerificationPage({ token, onSuccess }: EmailVerificationPageProps) {
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  
  const verifyEmail = useAction(api.emailVerification.verifyEmail);

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const result = await verifyEmail({ token });
        if (result.success) {
          setVerified(true);
          setEmail(result.email || "");
          toast.success(result.message);
          
          // Redirect after 3 seconds
          setTimeout(() => {
            onSuccess();
          }, 3000);
        }
      } catch (error) {
        console.error("Email verification failed:", error);
        setError(error instanceof Error ? error.message : "Verification failed");
        toast.error("Email verification failed");
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      handleVerification();
    }
  }, [token, verifyEmail, onSuccess]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rizzmil</h1>
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rizzmil</h1>
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-gray-600 mb-4">
                Your email address <strong>{email}</strong> has been successfully verified.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting you to the sign-in page in a few seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rizzmil</h1>
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={onSuccess}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
