import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface EmailVerificationBannerProps {
  userEmail: string;
}

export function EmailVerificationBanner({ userEmail }: EmailVerificationBannerProps) {
  const resendVerificationEmail = useAction(api.emailVerification.resendVerificationEmail);

  const handleResend = async () => {
    try {
      const result = await resendVerificationEmail({ email: userEmail });
      toast.success("Verification email sent!");
      if (result.verificationUrl) {
        console.log("🔗 Verification URL:", result.verificationUrl);
        toast.info("Check the browser console for the verification link!", { duration: 5000 });
      }
    } catch (error) {
      toast.error("Failed to send verification email");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-amber-800 text-sm">
              Please verify your email address to ensure account security.
            </span>
          </div>
          <button
            onClick={handleResend}
            className="text-amber-700 hover:text-amber-800 text-sm font-medium underline"
          >
            Resend verification email
          </button>
        </div>
      </div>
    </div>
  );
}
