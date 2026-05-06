import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    investor_category: "",
    amount_interested: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submissionData = {
        ...formData,
        amount_interested: formData.amount_interested ? parseFloat(formData.amount_interested) : null
      };

      // await Waitlist.create(submissionData);
      const { error } = await supabase.from("waitlist_entries").insert(submissionData);
      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting waitlist form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="bg-gray-900 border-gray-800 w-full max-w-md">
            <CardContent className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-300 text-lg">
                  Thank you for your interest. Our team will contact you soon.
                </p>
              </div>

              <div className="pt-4">
                <Link to={createPageUrl("InvestorAuth")}>
                  <Button variant="outline" className="w-full border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-800">
          Varma Capital © 2025 | All Rights Reserved
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="flex-1 p-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
              alt="Varma Capital" 
              className="w-16 h-16 mx-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Join the Varma Capital Waitlist</h1>
              <p className="text-gray-400 mt-2">
                Our fund is currently invite-only. Submit your interest below.
              </p>
            </div>
          </div>

          {/* Waitlist Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-gray-300">Full Name *</Label>
                <Input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 mt-1"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 mt-1"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-gray-800 border-gray-700 mt-1"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="country" className="text-gray-300">Country</Label>
                <Input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="bg-gray-800 border-gray-700 mt-1"
                  placeholder="United States"
                />
              </div>

              <div>
                <Label className="text-gray-300">Investor Category</Label>
                <Select 
                  value={formData.investor_category} 
                  onValueChange={(value) => handleInputChange('investor_category', value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 mt-1 text-gray-300">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem className="text-white" value="Accredited">Accredited</SelectItem>
                    <SelectItem className="text-white" value="HNW">HNW</SelectItem>
                    <SelectItem className="text-white" value="Family Office">Family Office</SelectItem>
                    <SelectItem className="text-white" value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount_interested" className="text-gray-300">Estimated Investment Amount (optional)</Label>
                <Input
                  id="amount_interested"
                  type="number"
                  value={formData.amount_interested}
                  onChange={(e) => handleInputChange('amount_interested', e.target.value)}
                  className="bg-gray-800 border-gray-700 mt-1"
                  placeholder="USD"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="bg-gray-800 border-gray-700 h-20 mt-1"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#d4af37] text-black hover:bg-[#c4a030] font-semibold py-3"
                >
                  {loading ? "Submitting..." : "Submit to Waitlist"}
                </Button>
              </div>

              <div className="text-center">
                <Link to={createPageUrl("InvestorAuth")}>
                  <Button variant="link" className="text-[#d4af37] hover:text-[#c4a030]">
                    Already have an account? Sign in
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm border-t border-gray-800">
        Varma Capital © 2025 | All Rights Reserved
      </footer>
    </div>
  );
}