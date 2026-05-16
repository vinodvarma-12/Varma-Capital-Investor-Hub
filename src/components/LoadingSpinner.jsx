import { RefreshCw } from "lucide-react";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="flex h-full min-h-64 w-full items-center justify-center py-24">
      <div className="text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-gold-bright animate-spin mx-auto" />
        <div className="text-foreground text-sm">{message}</div>
      </div>
    </div>
  );
}
