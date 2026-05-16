import React, { useState } from "react";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle, Key } from "lucide-react";

export default function TwoFactorVerify({ email, onVerified, onCancel }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleVerify = async () => {
    if (!code) {
      setError("Please enter a code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await invokeEdgeFunction('verify-2fa-login', { email, code });

      if (response.success && response.verified) {
        if (response.usedRecoveryCode) {
          alert(`Recovery code used. You have ${response.remainingRecoveryCodes} codes remaining.`);
        }
        onVerified();
      } else {
        setError(response.error || "Invalid verification code");
      }
    } catch (e) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-950 border border-[#ccab6c]/30 w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-[#b38922]/15 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-[#b38922]" />
          </div>
        </div>
        <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
        <CardDescription className="text-gold/90">
          {useRecoveryCode 
            ? "Enter one of your recovery codes" 
            : "Enter the 6-digit code from your authenticator app"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label className="text-zinc-300">
            {useRecoveryCode ? "Recovery Code" : "Verification Code"}
          </Label>
          <Input
            value={code}
            onChange={(e) => {
              if (useRecoveryCode) {
                setCode(e.target.value.toUpperCase());
              } else {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              }
            }}
            placeholder={useRecoveryCode ? "XXXX-XXXX" : "000000"}
            className="bg-zinc-900 border-[#ccab6c]/20 text-center text-xl tracking-widest"
            maxLength={useRecoveryCode ? 9 : 6}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
        </div>

        <Button 
          onClick={handleVerify}
          disabled={loading || (!useRecoveryCode && code.length !== 6)}
          className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Verify
        </Button>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setCode("");
              setError("");
            }}
            className="text-sm text-[#b38922] hover:text-[#fedea0]"
          >
            {useRecoveryCode ? (
              <>Use authenticator app instead</>
            ) : (
              <><Key className="w-3 h-3 inline mr-1" />Use a recovery code</>
            )}
          </button>

          {onCancel && (
            <div>
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-gold/90 hover:text-zinc-300"
              >
                Cancel and go back
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}