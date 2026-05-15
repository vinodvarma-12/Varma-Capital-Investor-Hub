import { RefreshCw } from "lucide-react";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#fedea0] animate-spin mx-auto" />
        <div className="text-white">{message}</div>
      </div>
    </div>
  );
}
