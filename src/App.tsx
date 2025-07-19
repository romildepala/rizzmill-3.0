import { useUser, SignIn } from "@clerk/clerk-react";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";

function AuthenticatedApp() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rizzmil AI Image Generator</h1>
        <SignOutButton />
      </div>
      
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Welcome to Rizzmil AI!
        </h2>
        <p className="text-gray-600 mb-6">
          You are successfully signed in. The AI features will be available soon.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            ✅ Authentication is working properly!
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <SignIn />
      </div>
    </div>
  );
}

export default function App() {
  const { isLoaded, isSignedIn } = useUser();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isSignedIn ? (
        <AuthenticatedApp />
      ) : (
        <SignInPage />
      )}
      <Toaster />
    </>
  );
}
