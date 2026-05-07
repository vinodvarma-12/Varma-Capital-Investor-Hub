import React, { useState, useEffect } from "react";
import { OTP } from "@/entities/OTP";
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyRound, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { generateOTP } from "@/functions/generateOTP";

export default function OTPManagement({ investorEmail }) {
  const [otps, setOtps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (investorEmail) {
      loadOTPs();
    }
  }, [investorEmail]);

  const loadOTPs = async () => {
    setLoading(true);
    try {
      const otpList = await OTP.filter({ investor_email: investorEmail }, '-created_date', 5);
      setOtps(otpList);
    } catch (error) {
      console.error("Error loading OTPs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOTP = async () => {
    setGenerating(true);
    try {
      const response = await generateOTP({ investor_email: investorEmail });
      
      if (response.data && response.data.success) {
        alert("OTP generated and sent successfully!");
        loadOTPs(); // Refresh the list
      } else {
        throw new Error(response.data?.error || "Failed to generate OTP");
      }
    } catch (error) {
      console.error("Error generating OTP:", error);
      alert(`Failed to generate OTP: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const getOTPStatus = (otp) => {
    if (otp.used) {
      return <Badge variant="outline" className="bg-green-900 text-green-400 border-green-700">Used</Badge>;
    }
    
    const now = new Date();
    const expiresAt = new Date(otp.expires_at);
    
    if (expiresAt <= now) {
      return <Badge variant="outline" className="bg-red-900 text-red-400 border-red-700">Expired</Badge>;
    }
    
    return <Badge variant="outline" className="bg-blue-900 text-blue-400 border-blue-700">Active</Badge>;
  };

  const maskOTP = (code) => {
    return code ? `${code.substring(0, 2)}****` : '';
  };

  if (!investorEmail) {
    return null;
  }

  return (
    <Card className="bg-zinc-950 border border-[#ccab6c]/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#fedea0]" />
            One-Time Passwords (OTP)
          </CardTitle>
          <Button 
            onClick={handleGenerateOTP} 
            disabled={generating}
            className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                Generate New OTP
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-[#ccab6c]/90">Loading OTPs...</div>
        ) : otps.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#ccab6c]/25">
                  <TableHead className="text-[#ccab6c]/90">Code</TableHead>
                  <TableHead className="text-[#ccab6c]/90">Status</TableHead>
                  <TableHead className="text-[#ccab6c]/90">Created</TableHead>
                  <TableHead className="text-[#ccab6c]/90">Expires</TableHead>
                  <TableHead className="text-[#ccab6c]/90">Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otps.map((otp) => (
                  <TableRow key={otp.id} className="border-[#ccab6c]/25">
                    <TableCell className="text-white font-mono">
                      {maskOTP(otp.otp_code)}
                    </TableCell>
                    <TableCell>{getOTPStatus(otp)}</TableCell>
                    <TableCell className="text-zinc-300">
                      {format(new Date(otp.created_date), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {format(new Date(otp.expires_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      {otp.created_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <KeyRound className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-[#ccab6c]/90">No OTPs generated for this investor</p>
            <p className="text-zinc-500 text-sm mt-2">Click "Generate New OTP" to create one</p>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-zinc-900 rounded-lg">
          <p className="text-[#ccab6c]/90 text-xs">
            <strong>Note:</strong> OTPs expire in 15 minutes and can only be used once. 
            A new OTP invalidates any existing active OTPs for security.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}