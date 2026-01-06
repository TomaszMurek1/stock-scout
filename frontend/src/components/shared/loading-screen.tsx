import { FC } from "react";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: FC<LoadingScreenProps> = ({ message = "Loading stock details..." }) => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
      <p className="mt-6 text-gray-600 font-medium text-lg">
        {message}
      </p>
    </div>
  </div>
);

export default LoadingScreen;