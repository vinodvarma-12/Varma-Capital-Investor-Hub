import React, { useState } from "react";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Smartphone, 
  Key, 
  CheckCircle, 
  Copy, 
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function TwoFactorSetup({ user, onUpdate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupData, setSetupData] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const is2FAEnabled = user?.two_factor_enabled && user?.two_factor_verified;

  const handleStartSetup = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await invokeEdgeFunction('setup-2fa', { action: 'generate' });
      
      if (response.success) {
        setSetupData(response);
        setStep(2);
      } else {
        setError(response.error || "Failed to start 2FA setup");
      }
    } catch (e) {
      setError("Failed to start 2FA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await invokeEdgeFunction('setup-2fa', { 
        action: 'verify', 
        code: verificationCode 
      });

      if (response.success) {
        setStep(3);
        onUpdate?.();
      } else {
        setError(response.error || "Invalid verification code");
      }
    } catch (e) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode) {
      setError("Please enter your 2FA code or recovery code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await invokeEdgeFunction('setup-2fa', { 
        action: 'disable', 
        code: disableCode 
      });

      if (response.success) {
        setShowDisableDialog(false);
        setDisableCode("");
        setStep(1);
        setSetupData(null);
        onUpdate?.();
      } else {
        setError(response.error || "Failed to disable 2FA");
      }
    } catch (e) {
      setError("Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (setupData?.recoveryCodes) {
      navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
      setRecoveryCodesCopied(true);
      setTimeout(() => setRecoveryCodesCopied(false), 2000);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
    }
  };

  // Already enabled state
  if (is2FAEnabled && step === 1) {
    return (
      <Card className="bg-card border border-[#ccab6c]/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-gold/90">
                  Your account is protected with 2FA
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-900 text-green-400 border-green-700">
              <CheckCircle className="w-3 h-3 mr-1" /> Enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-900/20 border-green-800">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <AlertDescription className="text-green-300">
              Two-factor authentication is active. You'll need your authenticator app to sign in.
            </AlertDescription>
          </Alert>

          <Button 
            variant="outline" 
            className="text-red-400 border-red-800 hover:bg-red-900/20"
            onClick={() => setShowDisableDialog(true)}
          >
            Disable 2FA
          </Button>
        </CardContent>

        {/* Disable 2FA Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent className="bg-card border border-[#ccab6c]/30">
            <DialogHeader>
              <DialogTitle className="text-foreground">Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription className="text-gold/90">
                Enter your current 2FA code or a recovery code to disable 2FA.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {error && (
                <Alert className="bg-red-900/20 border-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-foreground/80">Verification Code</Label>
                <Input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="Enter 6-digit code or recovery code"
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDisable}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-[#ccab6c]/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[#b38922]" />
          <div>
            <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-gold/90">
              Add an extra layer of security to your account
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Introduction */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Smartphone className="w-5 h-5 text-[#b38922] mt-0.5" />
                <div>
                  <h4 className="text-foreground font-medium">Authenticator App Required</h4>
                  <p className="text-gold/90 text-sm">
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Key className="w-5 h-5 text-[#b38922] mt-0.5" />
                <div>
                  <h4 className="text-foreground font-medium">Recovery Codes</h4>
                  <p className="text-gold/90 text-sm">
                    You'll receive backup codes in case you lose access to your authenticator.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartSetup}
              disabled={loading}
              className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 2 && setupData && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium text-foreground">Scan QR Code</h3>
              <p className="text-gold/90 text-sm">
                Open your authenticator app and scan this QR code
              </p>
              
              {/* QR Code Display */}
              <div className="flex justify-center p-4 bg-white rounded-lg mx-auto w-fit">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrCodeUri)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="text-left space-y-2">
                <p className="text-gold/90 text-sm">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded text-sm text-gold-bright font-mono overflow-x-auto">
                    {showSecret ? setupData.secret : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copySecret}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Verification Input */}
            <div className="space-y-3">
              <Label className="text-foreground/80">Enter the 6-digit code from your app</Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="bg-muted border-[#ccab6c]/20 text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>

            <Button 
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify and Enable
            </Button>
          </div>
        )}

        {/* Step 3: Recovery Codes */}
        {step === 3 && setupData && (
          <div className="space-y-6">
            <Alert className="bg-green-900/20 border-green-800">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <AlertDescription className="text-green-300">
                Two-factor authentication has been enabled successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Recovery Codes</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyRecoveryCodes}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {recoveryCodesCopied ? "Copied!" : "Copy All"}
                </Button>
              </div>
              
              <Alert className="bg-[#b38922]/15 border-[#8a6a1a]/55">
                <AlertTriangle className="w-4 h-4 text-gold-bright" />
                <AlertDescription className="text-gold-bright">
                  Save these codes in a secure location. Each code can only be used once.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {setupData.recoveryCodes.map((code, index) => (
                  <code key={index} className="text-sm font-mono text-foreground/80 p-2 bg-card rounded text-center">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => {
                setStep(1);
                setSetupData(null);
                setVerificationCode("");
              }}
              className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}