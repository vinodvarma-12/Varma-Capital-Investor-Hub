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
    heard_from: "",
    heard_from_other: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Manual validation for Select fields (not covered by native required)
    if (!formData.investor_category) {
      alert("Please select an investor category.");
      return;
    }
    if (!formData.heard_from) {
      alert("Please tell us where you heard about us.");
      return;
    }
    if (formData.heard_from === 'Other' && !formData.heard_from_other.trim()) {
      alert("Please specify where you heard about us.");
      return;
    }

    setLoading(true);

    try {
      const submissionData = {
        ...formData,
        amount_interested: formData.amount_interested || null
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
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="bg-card border border-[#ccab6c]/30 w-full max-w-md">
            <CardContent className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              
              <div className="space-y-2">
                <p className="text-foreground/80 text-lg">
                  Thank you for your interest. Our team will contact you soon.
                </p>
              </div>

              <div className="pt-4">
                <Link to={createPageUrl("InvestorAuth")}>
                  <Button variant="outline" className="w-full border-[#b38922] text-gold-bright hover:bg-[#fedea0] hover:text-black">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <footer className="text-center py-6 text-muted-foreground text-sm border-t border-[#ccab6c]/25">
          Varma Capital © 2025 | All Rights Reserved
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
              <h1 className="text-2xl font-bold text-foreground">Join the Varma Capital Waitlist</h1>
              <p className="text-gold/90 mt-2">
                Our fund is currently invite-only. Submit your interest below.
              </p>
            </div>
          </div>

          {/* Waitlist Form */}
          <div className="bg-card border border-[#ccab6c]/30 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-foreground/80">Full Name *</Label>
                <Input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  required
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-foreground/80">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground/80">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="country" className="text-foreground/80">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  required
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                  placeholder="United States"
                />
              </div>

              <div>
                <Label className="text-foreground/80">Investor Category *</Label>
                <Select
                  value={formData.investor_category}
                  onValueChange={(value) => handleInputChange('investor_category', value)}
                >
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1 text-foreground/80">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-[#ccab6c]/20 text-foreground">
                    <SelectItem className="text-foreground" value="Accredited">Accredited</SelectItem>
                    <SelectItem className="text-foreground" value="HNW">HNW</SelectItem>
                    <SelectItem className="text-foreground" value="Family Office">Family Office</SelectItem>
                    <SelectItem className="text-foreground" value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground/80">Estimated Investment Amount *</Label>
                <Select
                  value={formData.amount_interested}
                  onValueChange={(value) => handleInputChange('amount_interested', value)}
                  required
                >
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                    <SelectValue placeholder="Select a range…" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-[#ccab6c]/20 text-foreground">
                    <SelectItem className="text-foreground" value="$10,000 – $49,999">$10,000 – $49,999</SelectItem>
                    <SelectItem className="text-foreground" value="$50,000 – $249,999">$50,000 – $249,999</SelectItem>
                    <SelectItem className="text-foreground" value="$250,000 – $999,999">$250,000 – $999,999</SelectItem>
                    <SelectItem className="text-foreground" value="$1,000,000+">$1,000,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground/80">Where did you hear about us? *</Label>
                <Select
                  value={formData.heard_from}
                  onValueChange={(value) => {
                    handleInputChange('heard_from', value);
                    if (value !== 'Other') handleInputChange('heard_from_other', '');
                  }}
                >
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1 text-foreground/80">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-[#ccab6c]/20 text-foreground">
                    <SelectItem className="text-foreground" value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem className="text-foreground" value="Twitter / X">Twitter / X</SelectItem>
                    <SelectItem className="text-foreground" value="Google Search">Google Search</SelectItem>
                    <SelectItem className="text-foreground" value="Friend / Referral">Friend / Referral</SelectItem>
                    <SelectItem className="text-foreground" value="Event / Conference">Event / Conference</SelectItem>
                    <SelectItem className="text-foreground" value="News / Media">News / Media</SelectItem>
                    <SelectItem className="text-foreground" value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.heard_from === 'Other' && (
                  <Input
                    value={formData.heard_from_other}
                    onChange={(e) => handleInputChange('heard_from_other', e.target.value)}
                    placeholder="Please specify..."
                    className="bg-muted border-[#ccab6c]/20 mt-2"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="text-foreground/80">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 h-20 mt-1"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold py-3"
                >
                  {loading ? "Submitting..." : "Submit to Waitlist"}
                </Button>
              </div>

              <div className="text-center">
                <Link to={createPageUrl("InvestorAuth")}>
                  <Button variant="link" className="text-gold-bright hover:text-[#c4a030]">
                    Already have an account? Sign in
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-muted-foreground text-sm border-t border-[#ccab6c]/25">
        Varma Capital © 2025 | All Rights Reserved
      </footer>
    </div>
  );
}