import { v } from "convex/values";

// Environment variable validation
export const validateEnvironment = () => {
  const requiredEnvVars = {
    FAL_KEY: process.env.FAL_KEY,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    const missingList = missingVars.join(", ");
    throw new Error(
      `Missing required environment variables: ${missingList}. ` +
      `Please set FAL_KEY in your environment variables or .env.local file. ` +
      `You can get your FAL API key from https://fal.ai/`
    );
  }

  return {
    FAL_KEY: requiredEnvVars.FAL_KEY!,
    CONVEX_DEPLOYMENT: getDeploymentName(),
  };
};

// Helper for getting deployment name with fallback
export const getDeploymentName = (): string => {
  // Try to get from environment variable first
  const envDeployment = process.env.CONVEX_DEPLOYMENT;
  if (envDeployment) {
    // Extract the deployment name from the full deployment string
    // e.g., "dev:colorless-caiman-735" -> "colorless-caiman-735"
    const deploymentName = envDeployment.split(':').pop();
    if (deploymentName) {
      return deploymentName;
    }
  }
  
  // Fallback to the default deployment name
  return "colorless-caiman-735";
}; 