import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, FileText, AlertTriangle } from "lucide-react";

export default function Legal() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'privacy';

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("InvestorAuth")}>
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/be939b4a0_36.png" 
            alt="Varma Capital" 
            className="w-16 h-16 mx-auto"
          />
          <h1 className="text-3xl font-bold text-white">Legal Documents</h1>
          <p className="text-gray-400">Varma Capital Investor Portal</p>
        </div>

        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Terms of Service
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Disclosure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 prose prose-invert max-w-none">
                <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-gray-400 text-sm mb-6">
                  <strong>Effective Date:</strong> January 2025 | <strong>Last Updated:</strong> January 2025
                </p>

                <p className="text-gray-300">
                  Varma Capital ("we", "us", "our") operates a private, invite-only investor platform available at <strong className="text-yellow-400">app.varmacapital.io</strong> (the "Portal"). This Privacy Policy outlines how we collect, use, store, and protect your information when you access or use the Portal.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
                <ul className="text-gray-300 space-y-2">
                  <li><strong className="text-white">Personal Information:</strong> Name, email, phone, address, identification documents.</li>
                  <li><strong className="text-white">Investment Information:</strong> Investment amounts, transactions, NAV history, portfolio data.</li>
                  <li><strong className="text-white">KYC Documents:</strong> Identity verification documents, proof of address.</li>
                  <li><strong className="text-white">Technical Data:</strong> Device details, IP address, login behavior, and usage analytics.</li>
                  <li><strong className="text-white">Waitlist Data:</strong> Information submitted through public waitlist forms.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. How We Use This Information</h2>
                <ul className="text-gray-300 space-y-2">
                  <li>To provide access to the Portal.</li>
                  <li>To display investor portfolio and performance information.</li>
                  <li>To process identity verification and compliance checks.</li>
                  <li>To send statements, notifications, and updates.</li>
                  <li>To enhance Portal functionality and security.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Sharing of Information</h2>
                <p className="text-gray-300">We do not sell your information. We only share it with:</p>
                <ul className="text-gray-300 space-y-2">
                  <li>Cloud hosting, storage, and processing providers.</li>
                  <li>Email delivery and authentication services.</li>
                  <li>Regulators or authorities when legally required.</li>
                  <li>Internal authorized personnel.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Security</h2>
                <p className="text-gray-300">
                  We use encryption, access controls, OTP login, and audits to protect your information. Despite safeguards, no system is fully secure.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Retention</h2>
                <p className="text-gray-300">
                  Data is retained for regulatory, operational, and audit requirements. Waitlist data is kept for marketing purposes until deletion is requested.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Your Rights</h2>
                <ul className="text-gray-300 space-y-2">
                  <li>Request access or correction of your personal data.</li>
                  <li>Request deletion of non-investor data (e.g., waitlist).</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. International Transfers</h2>
                <p className="text-gray-300">
                  Your data may be stored or processed in multiple jurisdictions with adequate safeguards.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Children's Privacy</h2>
                <p className="text-gray-300">
                  The Portal is not intended for individuals under 18.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-300">
                  Updates may be made at any time. Continued use of the Portal indicates acceptance.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Contact Us</h2>
                <p className="text-gray-300">
                  Email: <a href="mailto:support@varmacapital.com" className="text-yellow-400 hover:underline">support@varmacapital.com</a>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 prose prose-invert max-w-none">
                <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-gray-400 text-sm mb-6">
                  <strong>Effective Date:</strong> January 2025 | <strong>Last Updated:</strong> January 2025
                </p>

                <p className="text-gray-300">
                  These Terms of Service ("Terms") govern your use of the Varma Capital Investor Portal at <strong className="text-yellow-400">app.varmacapital.io</strong>. By accessing or using the Portal, you agree to these Terms.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Eligibility</h2>
                <p className="text-gray-300">
                  The Portal is strictly invite-only. Only approved users invited by Varma Capital may access the system. Unauthorized access is prohibited.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Portal Purpose</h2>
                <p className="text-gray-300">
                  The Portal provides investment information, performance updates, document access, and communication tools. It is for information only and does not constitute financial advice.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Account Security</h2>
                <p className="text-gray-300">
                  You are responsible for keeping your account secure. Notify us immediately if you suspect unauthorized access.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Accuracy of Information</h2>
                <p className="text-gray-300">
                  Portfolio data and performance displayed may be estimates, manually updated figures, or non-audited values.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. User Obligations</h2>
                <ul className="text-gray-300 space-y-2">
                  <li>Use the Portal for lawful purposes only.</li>
                  <li>Do not distribute confidential documents or information.</li>
                  <li>Do not attempt to bypass security systems.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Intellectual Property</h2>
                <p className="text-gray-300">
                  All Portal content, design, and software are property of Varma Capital.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Modifications</h2>
                <p className="text-gray-300">
                  We may update the Portal and these Terms at any time.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. No Financial Advice</h2>
                <p className="text-gray-300">
                  Nothing on the Portal constitutes investment, legal, or tax advice.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Limitation of Liability</h2>
                <p className="text-gray-300">
                  Varma Capital is not liable for losses arising from use of the Portal, including errors, delays, outages, or market fluctuations.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">10. Governing Law</h2>
                <p className="text-gray-300">
                  These Terms are governed by the laws of Malaysia, or other applicable jurisdictions for investors.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">11. Contact</h2>
                <p className="text-gray-300">
                  Email: <a href="mailto:support@varmacapital.com" className="text-yellow-400 hover:underline">support@varmacapital.com</a>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 prose prose-invert max-w-none">
                <h1 className="text-2xl font-bold text-white mb-2">Risk Disclosure & Performance Disclaimer</h1>
                <p className="text-gray-400 text-sm mb-6">
                  <strong>Effective Date:</strong> January 2025 | <strong>Last Updated:</strong> January 2025
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Investment Risk</h2>
                <p className="text-gray-300">
                  All investments carry risk, including loss of principal. Past performance does not guarantee future results.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. No Guaranteed Returns</h2>
                <p className="text-gray-300">
                  Returns displayed on the Portal are not guaranteed. Actual results may differ based on market conditions, liquidity, fees, or operational factors.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Performance Data</h2>
                <p className="text-gray-300">Performance shown on the Portal may include:</p>
                <ul className="text-gray-300 space-y-2">
                  <li>Unaudited figures</li>
                  <li>Estimated NAV values</li>
                  <li>Manually updated data</li>
                  <li>Currency fluctuations</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Lock-in Periods</h2>
                <p className="text-gray-300">
                  Investments may include lock-in periods. Early withdrawals, if allowed, may involve penalties or restrictions.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Not an Offer</h2>
                <p className="text-gray-300">
                  The Portal does not constitute an offer to buy or sell financial products or solicit investments.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Confidentiality</h2>
                <p className="text-gray-300">
                  Information available through the Portal is confidential and may not be shared or distributed without written consent.
                </p>

                <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Contact</h2>
                <p className="text-gray-300">
                  Email: <a href="mailto:support@varmacapital.com" className="text-yellow-400 hover:underline">support@varmacapital.com</a>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-gray-500 text-sm py-4">
          Varma Capital © 2025 — All Rights Reserved
        </div>
      </div>
    </div>
  );
}