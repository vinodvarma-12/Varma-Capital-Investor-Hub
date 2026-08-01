import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export function FeatureComingSoonDialog({
  open,
  onOpenChange,
  title = "Coming Soon",
  message = "This feature is coming soon. Please check back later.",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#b38922] shrink-0" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-gold/90 pt-2 text-left">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useFeatureComingSoon(defaultMessage) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const showComingSoon = useCallback((customMessage) => {
    setMessage(customMessage || defaultMessage);
    setOpen(true);
  }, [defaultMessage]);

  return {
    open,
    setOpen,
    message,
    showComingSoon,
  };
}
