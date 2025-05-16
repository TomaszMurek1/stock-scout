import { FC } from "react";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  error: Error;
}

const ErrorScreen: FC<ErrorScreenProps> = ({ error }) => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl border border-red-200 max-w-md">
      <ShieldExclamationIcon className="h-16 w-16 mx-auto text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
      <p className="text-red-700">{error.message}</p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Try Again
      </Button>
    </div>
  </div>
);

export default ErrorScreen;