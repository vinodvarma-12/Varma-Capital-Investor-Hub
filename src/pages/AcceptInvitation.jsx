import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader, Eye, EyeOff } from "lucide-react";

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, setup, success, error
  const [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const processInvitation = async () => {
    try {
      const token = searchParams.get('token');
      
      if (!token) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Invalid invitation link. No token provided.');
        }
        return;
      }

      // Fetch invitation via backend function (no auth required)
      const response = await invokeEdgeFunction('get-invitation', { token });
      if (cancelled) return;
      // const res = await fetch(
      //   `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invitation`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      //     },
      //     body: JSON.stringify({ token }),
      //   }
      // );

      // const response = await res.json();
      
      if (!response.success || !response.invitation) {
        if (!cancelled) {
          setStatus('error');
          setMessage(response.error || 'Invalid or expired invitation link.');
        }
        return;
      }

      const invitationRecord = response.invitation;
      if (!cancelled) setInvitation(invitationRecord);

      if (invitationRecord.status === 'accepted') {
        if (!cancelled) {
          setStatus('error');
          setMessage('This invitation has already been used. Please login with your credentials.');
        }
        return;
      }

      if (invitationRecord.status === 'expired') {
        if (!cancelled) {
          setStatus('error');
          setMessage('This invitation has expired. Please contact support for a new invitation.');
        }
        return;
      }

      // Show password setup form
      if (!cancelled) setStatus('setup');

    } catch (error) {
      console.error('Error processing invitation:', error);
      if (!cancelled) {
        setStatus('error');
        setMessage('An error occurred while processing your invitation. Please try again or contact support.');
      }
    }
    };

    processInvitation();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const validatePassword = () => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validatePassword()) return;

    setIsSubmitting(true);
    try {
      // Call backend function to create user account
      const response = await invokeEdgeFunction('create-invited-user', {
        token: invitation.invitation_token,
        password: password
      });

      if (response.success) {
        setStatus('success');
        setMessage(`Welcome ${invitation.full_name}! Your account has been created. You can now login with your email and password.`);
      } else {
        setPasswordError(response.error || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setPasswordError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate(createPageUrl('InvestorAuth'));
  };


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="bg-card border border-[#ccab6c]/30 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
              alt="Varma Capital" 
              className="w-16 h-16"
            />
          </div>
          <CardTitle className="text-foreground text-2xl">Varma Capital</CardTitle>
          <p className="text-gold/90">Investor Portal</p>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader className="w-12 h-12 mx-auto text-gold-bright animate-spin" />
              <p className="text-foreground/80">Processing your invitation...</p>
            </div>
          )}

          {status === 'setup' && invitation && (
            <div className="space-y-6 text-left">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-foreground">Welcome, {invitation.full_name}!</h3>
                <p className="text-gold/90 text-sm">Create a password to activate your account</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-foreground/80">Email</Label>
                  <Input 
                    type="email" 
                    value={invitation.email} 
                    disabled 
                    className="bg-muted border-[#ccab6c]/20 text-gold/90"
                  />
                </div>

                <div>
                  <Label className="text-foreground/80">Password</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="bg-muted border-[#ccab6c]/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/90 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <Label className="text-foreground/80">Confirm Password</Label>
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="bg-muted border-[#ccab6c]/20"
                  />
                </div>

                {passwordError && (
                  <p className="text-red-400 text-sm">{passwordError}</p>
                )}

                <Button 
                  onClick={handleCreateAccount}
                  disabled={isSubmitting || !password || !confirmPassword}
                  className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Activate My Account'
                  )}
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">Account Created!</h3>
                <p className="text-foreground/80">{message}</p>
              </div>
              <Button 
                onClick={handleGoToLogin}
                className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-400" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">Invitation Error</h3>
                <p className="text-foreground/80">{message}</p>
              </div>
              <Button 
                onClick={handleGoToLogin}
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}