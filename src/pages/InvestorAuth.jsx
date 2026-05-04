import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Mail, KeyRound, AlertCircle, Lock } from "lucide-react";

export default function InvestorAuth() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("otp"); // otp | password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      const role = profile?.role ?? "investor";
      if (role === "super_admin") {
        // window.location.href = createPageUrl("SuperAdminDashboard");
        navigate("/SuperAdminDashboard");
      } else if (role === "admin") {
        // window.location.href = createPageUrl("AdminDashboard");
        navigate("/AdminDashboard");
      } else {
        // window.location.href = createPageUrl("Dashboard");
        navigate("/Dashboard");
      }
    } catch {
      /* not signed in */
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "password") {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) {
          setError(signErr.message);
          return;
        }
      } else {
        const out = await invokeEdgeFunction("investor-otp-login", { email, otp_code: otpCode });
        if (!out?.success) {
          setError(out?.error || "Invalid or expired OTP.");
          return;
        }
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: out.email,
          password: out.temp_password,
        });
        if (signErr) {
          setError(signErr.message);
          return;
        }
      }

      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("No session after login");
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.id).single();
      const role = profile?.role ?? "investor";
      if (role === "super_admin") {
        // window.location.href = createPageUrl("SuperAdminDashboard");
        navigate("/SuperAdminDashboard");
      } else if (role === "admin") {
        // window.location.href = createPageUrl("AdminDashboard");
        navigate("/AdminDashboard");
      } else {
        // window.location.href = createPageUrl("Dashboard");
        navigate("/Dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png"
              alt="Varma Capital"
              className="w-20 h-20 mx-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome to Varma Capital</h1>
              <p className="text-gray-400 mt-2">Secure investor portal. Invite-only access.</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white text-center">Sign in</h2>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant={mode === "otp" ? "default" : "outline"} size="sm" onClick={() => setMode("otp")}>
                OTP
              </Button>
              <Button type="button" variant={mode === "password" ? "default" : "outline"} size="sm" onClick={() => setMode("password")}>
                <Lock className="w-3 h-3 mr-1" /> Password
              </Button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700"
                  placeholder="your.email@example.com"
                />
              </div>

              {mode === "otp" ? (
                <div>
                  <Label htmlFor="otpCode" className="text-gray-300 flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4" />
                    OTP
                  </Label>
                  <Input
                    id="otpCode"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required={mode === "otp"}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="password" className="text-gray-300 flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={mode === "password"}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Your account password"
                  />
                </div>
              )}

              {error && (
                <Alert className="bg-red-900/20 border-red-800">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#d4af37] text-black hover:bg-[#c4a030] font-semibold py-3"
              >
                {loading ? "Signing In..." : "Login Securely"}
              </Button>
            </form>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold text-white">New to Varma Capital?</h2>
            <Link to={createPageUrl("Waitlist")}>
              <Button variant="outline" className="w-full border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black font-semibold py-3">
                Join Waitlist
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-800">
        Varma Capital © 2026 | All Rights Reserved
      </footer>
    </div>
  );
}
