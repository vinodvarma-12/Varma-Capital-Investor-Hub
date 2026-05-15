import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Invitation } from "@/entities/Invitation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Search,
  Users,
  Filter,
  Download,
  Eye,
  Copy,
  KeyRound // Added KeyRound for OTPManagement tab icon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import InvestorDetailDrawer from "@/components/admin/InvestorDetailDrawer";
import OTPManagement from "@/components/admin/OTPManagement"; // Added OTPManagement import
import { sendInvitationEmail } from "@/functions/sendInvitationEmail";
import LoadingSpinner from "@/components/LoadingSpinner";

const InviteInvestorForm = ({ onInvite, onDone }) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          await onInvite(email, fullName);
          setEmail('');
          setFullName('');
          onDone(); // Close dialog on success
        } catch (error) {
          console.error("Invite form submission failed:", error);
          // Don't close the form on error, the parent `handleInvite` will show an alert
        } finally {
          setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required className="bg-zinc-900 border-[#ccab6c]/20" />
            </div>
            <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-zinc-900 border-[#ccab6c]/20"/>
            </div>
            <DialogFooter>
                 <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
                 <Button type="submit" disabled={isSubmitting} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function AdminInvestors() {
  const [investors, setInvestors] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [navs, setNavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadCrmData();
  }, []);

  const loadCrmData = async () => {
    setLoading(true);
    try {
      const [allUsers, allInvestments, productsData, navData] = await Promise.all([
        User.list(),
        Investment.list(null, 1000),
        Product.list(),
        NAV.list('-date', 1000)
      ]);
      const investorUsers = allUsers.filter(u => u.role === 'investor');
      setInvestors(investorUsers);
      setInvestments(allInvestments);
      setProducts(productsData);
      setNavs(navData);
    } catch (error) {
      console.error("Error loading CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email, fullName) => {
    try {
        const response = await sendInvitationEmail({ email, fullName });

        if (response.success === false) {
             const errorMessage = response.error || 'An unknown application error occurred.';
             const errorDetails = response.details || '';
             throw new Error(`${errorMessage} ${errorDetails}`);
        }

        alert('Invitation sent successfully!');
        setIsInviteDialogOpen(false);
        
    } catch (error) {
        console.error("Error sending invitation:", error);
        alert(`Failed to send invitation: ${error.message}`);
        throw error;
    }
  };

  const getInvestorMetrics = (investorEmail) => {
    const investorInvestments = investments.filter(i => i.investor_email === investorEmail);
    const totalInvested = investorInvestments.reduce((sum, i) => sum + (i.invested_amount || 0), 0);

    const currentValue = investorInvestments.reduce((sum, i) => {
        const latestNav = navs.find(n => n.product_id === i.product_id);
        const navValue = (i.current_units || 0) * (latestNav?.nav_per_unit || 1);
        return sum + navValue;
    }, 0);

    const pnl = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

    const lockInDates = investorInvestments
        .map(i => i.lock_in_end_date)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => d > new Date());

    const nextLockIn = lockInDates.length > 0 ? Math.min(...lockInDates) : null;

    return { totalInvested, currentValue, pnl, nextLockIn: nextLockIn ? new Date(nextLockIn) : null };
  };

  const filteredInvestors = investors.filter(investor =>
    investor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.investor_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getKycBadge = (status) => {
      const styles = {
          verified: 'bg-green-900 text-green-400 border-green-700',
          pending: 'bg-[#b38922]/25 text-[#fedea0] border-[#8a6a1a]/45',
          rejected: 'bg-red-900 text-red-400 border-red-700',
      }
      return <Badge variant="outline" className={`capitalize ${styles[status] || 'bg-zinc-800'}`}>{status}</Badge>
  }

  const handleViewInvestor = (investor) => {
    setSelectedInvestor(investor);
    setIsDetailDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner message="Loading Investor CRM..." />;
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Users /> Investor Management</h1>
            <p className="text-[#ccab6c]/90">View, edit, and manage investor accounts.</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Invite Investor
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30">
                <DialogHeader>
                    <DialogTitle className="text-white">Invite New Investor</DialogTitle>
                </DialogHeader>
                <InviteInvestorForm onInvite={handleInvite} onDone={() => setIsInviteDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">All Investors ({filteredInvestors.length})</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ccab6c]/90"/>
                  <Input
                    placeholder="Search by name, email, ID..."
                    className="pl-8 bg-zinc-900 border-[#ccab6c]/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
                <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25 hover:bg-zinc-900/20">
                    <TableHead className="text-[#ccab6c]/90">Name</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Investor ID</TableHead>
                    <TableHead className="text-[#ccab6c]/90">KYC Status</TableHead>
                    <TableHead className="text-[#ccab6c]/90 text-right">Total Invested</TableHead>
                    <TableHead className="text-[#ccab6c]/90 text-right">Current Value</TableHead>
                    <TableHead className="text-[#ccab6c]/90 text-right">P&L</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Next Lock-in Expiry</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map(investor => {
                    const metrics = getInvestorMetrics(investor.email);
                    return (
                      <TableRow key={investor.id} className="border-[#ccab6c]/25 hover:bg-zinc-900/20">
                        <TableCell>
                          <div className="font-medium text-white">{investor.full_name}</div>
                          <div className="text-sm text-[#ccab6c]/90">{investor.email}</div>
                        </TableCell>
                        <TableCell className="text-zinc-300 font-mono text-xs">{investor.investor_id}</TableCell>
                        <TableCell>{getKycBadge(investor.kyc_status)}</TableCell>
                        <TableCell className="text-zinc-300 text-right font-medium">${metrics.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-white text-right font-bold">${metrics.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className={`text-right font-medium ${metrics.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{metrics.pnl.toFixed(2)}%</TableCell>
                        <TableCell className="text-zinc-300">
                          {metrics.nextLockIn ? new Date(metrics.nextLockIn).toLocaleDateString() : <Badge variant="secondary">None</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvestor(investor)}
                          >
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Investor Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-black border-[#ccab6c]/25 text-white w-[min(98vw,90rem)] max-w-none sm:max-w-none h-[92vh] flex flex-col min-h-0 p-0 gap-0 overflow-hidden">
            {selectedInvestor && (
              <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <InvestorDetailDrawer
                  investor={selectedInvestor}
                  investments={investments.filter(i => i.investor_email === selectedInvestor.email)}
                  products={products}
                  navs={navs}
                  onDataChange={loadCrmData}
                  additionalTabs={[
                    {
                      id: "otp",
                      label: "OTP Management",
                      icon: KeyRound,
                      content: <OTPManagement investorEmail={selectedInvestor.email} />
                    }
                  ]}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}