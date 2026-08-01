import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Clock, RefreshCw, Sparkles } from "lucide-react";
import {
  getYouTubeEmbedUrl,
  INVESTOR_ONBOARDING_YOUTUBE_ID,
} from "@/lib/investorPortal";

export default function PortalOnboarding({ user, onRefresh, refreshing = false }) {
  const firstName = user?.full_name?.split(" ")[0] || "Investor";
  const embedUrl = getYouTubeEmbedUrl(INVESTOR_ONBOARDING_YOUTUBE_ID);

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-3xl mx-auto space-y-8">
        <div
          className="text-center space-y-4 rounded-2xl px-4 py-8"
          style={{
            background:
              "radial-gradient(ellipse 120% 200% at 50% 0%, rgba(254, 222, 160, 0.1), transparent 55%)",
          }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#fedea0]/20 border border-[#ccab6c]/40">
            <Building2 className="w-8 h-8 text-[#b38922]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {firstName}
            </h1>
            <p className="text-lg text-gold/90 max-w-xl mx-auto">
              Your investor portal is being built
            </p>
          </div>
          <p className="text-foreground/75 max-w-lg mx-auto text-sm leading-relaxed">
            Our team is setting up your portfolio, holdings, and documents.
            You&apos;ll see your live dashboard here as soon as everything is ready —
            no action needed on your side.
          </p>
        </div>

        <Card className="bg-card border border-[#ccab6c]/30 overflow-hidden">
          <CardContent className="p-0">
            {embedUrl ? (
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  src={embedUrl}
                  title="Welcome to Varma Capital"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
                <Building2 className="w-12 h-12 text-[#b38922]/50" />
                <p className="text-foreground/80 text-sm font-medium">Welcome video</p>
                <p className="text-muted-foreground text-xs max-w-sm">
                  Your Varma Capital welcome video will appear here once configured.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border border-[#ccab6c]/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#b38922]/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#b38922]" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">What happens next?</h2>
                <p className="text-sm text-foreground/75 leading-relaxed">
                  A Varma Capital administrator will configure your account with
                  investment details, performance data, and documents. This page
                  will automatically switch to your full dashboard once that&apos;s complete.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#b38922]/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#b38922]" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground">While you wait</h2>
                <p className="text-sm text-foreground/75 leading-relaxed">
                  Explore the welcome video above, update your profile under Settings,
                  or reach out via Support if you have questions.
                </p>
              </div>
            </div>

            {onRefresh && (
              <Button
                type="button"
                variant="outline"
                className="border-[#b38922] text-gold-bright hover:bg-[#fedea0]/30"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Checking for updates…" : "Check if my portal is ready"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
