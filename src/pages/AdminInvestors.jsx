import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Invitation } from "@/entities/Invitation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const InviteInvestorForm = ({ onInvite, onDone, products = [] }) => {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [investorType, setInvestorType] = useState('');
    const [productId, setProductId] = useState('');
    const [committedAmount, setCommittedAmount] = useState('');
    const [lockInMonths, setLockInMonths] = useState('');
    const [subscriptionDate, setSubscriptionDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          await onInvite({
            email,
            fullName,
            phone: phone || null,
            country: country || null,
            investorType: investorType || null,
            productId: productId || null,
            committedAmount: committedAmount ? Number(committedAmount) : null,
            lockInMonths: lockInMonths ? Number(lockInMonths) : null,
            subscriptionDate: subscriptionDate || null,
          });
          onDone();
        } catch (error) {
          console.error("Invite form submission failed:", error);
        } finally {
          setIsSubmitting(false);
        }
    };

    const inputCls = "bg-muted border-[#ccab6c]/20";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* ── Basic Info ── */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gold/70 pt-1">Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fullName">Full Name <span className="text-red-400">*</span></Label>
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputCls} placeholder="Jane Doe" />
                </div>
                <div>
                    <Label htmlFor="email">Email <span className="text-red-400">*</span></Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="jane@example.com" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
                </div>
                <div>
                    <Label htmlFor="country">Country of Residence</Label>
                    <Input id="country" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} placeholder="United Arab Emirates" />
                </div>
            </div>

            {/* ── Investor Classification ── */}
            <p className="text-xs font-semibold uppercase tracking-widest text-gold/70 pt-2">Investor Classification</p>
            <div>
                <Label>Investor Type</Label>
                <Select value={investorType} onValueChange={setInvestorType}>
                    <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Select type…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="trust">Trust</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DialogFooter className="pt-2">
                 <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
                 <Button type="submit" disabled={isSubmitting} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                    {isSubmitting ? 'Sending…' : 'Send Invitation'}
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
  const [fabricatedReturns, setFabricatedReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadCrmData();
  }, []);

  const loadCrmData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [allUsers, allInvestments, productsData, navData, fabricatedData] = await Promise.all([
        User.list(),
        Investment.list(null, 1000),
        Product.list(),
        NAV.list('-date', 1000),
        FabricatedReturns.list(),
      ]);
      const investorUsers = allUsers.filter(u => u.role === 'investor');
      setInvestors(investorUsers);
      setInvestments(allInvestments);
      setProducts(productsData);
      setNavs(navData);
      setFabricatedReturns(fabricatedData);
    } catch (error) {
      console.error("Error loading CRM data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleInvite = async (payload) => {
    try {
        const response = await sendInvitationEmail(payload);

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

  // Parse date string as local date to avoid UTC timezone shifts
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const s = typeof dateStr === 'string' ? dateStr.slice(0, 10) : String(dateStr);
    const [year, month, day] = s.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Calculate prorated current value for a single investment
  const getAdjustedCurrentValue = (investment) => {
    if (!investment.invested_amount) return 0;

    const productNavs = navs
      .filter(n => n.product_id === investment.product_id)
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    if (productNavs.length < 2) return investment.invested_amount;

    const overrides = fabricatedReturns.filter(
      fr => fr.investor_email === investment.investor_email && fr.product_id === investment.product_id
    );

    const purchaseDate = investment.purchase_date
      ? parseLocalDate(investment.purchase_date)
      : parseLocalDate(productNavs[0].date);

    let value = investment.invested_amount;

    for (let i = 1; i < productNavs.length; i++) {
      const prevNav = productNavs[i - 1];
      const currNav = productNavs[i];
      const prevDate = parseLocalDate(prevNav.date);
      const currDate = parseLocalDate(currNav.date);

      if (currDate <= purchaseDate) continue;

      const prevNavUnit = parseFloat(prevNav.nav_per_unit) || 0;
      const currNavUnit = parseFloat(currNav.nav_per_unit) || 0;
      const officialReturn = prevNavUnit > 0
        ? ((currNavUnit - prevNavUnit) / prevNavUnit) * 100
        : parseFloat(currNav.return_percent) || 0;

      const periodKey = format(prevDate, 'yyyy-MM');
      const override = overrides.find(fr =>
        fr.period === periodKey ||
        (fr.effective_date && fr.effective_date.slice(0, 7) === periodKey)
      );

      let returnPct;
      if (override) {
        returnPct = (override.return_percent || 0) / 100;
      } else if (purchaseDate > prevDate && purchaseDate < currDate) {
        const totalPeriodDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
        const daysInFund = Math.round((currDate - purchaseDate) / (1000 * 60 * 60 * 24));
        returnPct = totalPeriodDays > 0
          ? (officialReturn * (daysInFund / totalPeriodDays)) / 100
          : 0;
      } else {
        returnPct = officialReturn / 100;
      }

      value = value * (1 + returnPct);
    }

    return Math.round(value * 100) / 100;
  };

  const getInvestorMetrics = (investorEmail) => {
    const investorInvestments = investments.filter(i => i.investor_email === investorEmail && i.status === 'active');
    const totalInvested = investorInvestments.reduce((sum, i) => sum + (parseFloat(i.invested_amount) || 0), 0);
    const currentValue = investorInvestments.reduce((sum, i) => sum + getAdjustedCurrentValue(i), 0);
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
          pending: 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45',
          rejected: 'bg-red-900 text-red-400 border-red-700',
      }
      return <Badge variant="outline" className={`capitalize ${styles[status] || 'bg-secondary'}`}>{status}</Badge>
  }

  const handleViewInvestor = (investor) => {
    setSelectedInvestor(investor);
    setIsDetailDialogOpen(true);
  };

  if (loading) {
    return <LoadingSpinner message="Loading Investor CRM..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Users /> Investor Management</h1>
            <p className="text-gold/90">View, edit, and manage investor accounts.</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Invite Investor
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border border-[#ccab6c]/30 sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Invite New Investor</DialogTitle>
                    <DialogDescription className="text-gold/70">Fill in the investor's details. Only Full Name and Email are required.</DialogDescription>
                </DialogHeader>
                <InviteInvestorForm onInvite={handleInvite} onDone={() => setIsInviteDialogOpen(false)} products={products} />
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-foreground">All Investors ({filteredInvestors.length})</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/90"/>
                  <Input
                    placeholder="Search by name, email, ID..."
                    className="pl-8 bg-muted border-[#ccab6c]/20"
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
                  <TableRow className="border-[#ccab6c]/25 hover:bg-muted/20">
                    <TableHead className="text-gold/90">Name</TableHead>
                    <TableHead className="text-gold/90">Investor ID</TableHead>
                    <TableHead className="text-gold/90">KYC Status</TableHead>
                    <TableHead className="text-gold/90 text-right">Total Invested</TableHead>
                    <TableHead className="text-gold/90 text-right">Current Value</TableHead>
                    <TableHead className="text-gold/90 text-right">P&L</TableHead>
                    <TableHead className="text-gold/90">Next Lock-in Expiry</TableHead>
                    <TableHead className="text-gold/90">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map(investor => {
                    const metrics = getInvestorMetrics(investor.email);
                    return (
                      <TableRow key={investor.id} className="border-[#ccab6c]/25 hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {investor.avatar_url ? (
                              <img
                                src={investor.avatar_url}
                                alt={investor.full_name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[#ccab6c]/20 border border-[#ccab6c]/30 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-gold-bright">
                                  {investor.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-foreground">{investor.full_name}</div>
                              <div className="text-sm text-gold/90">{investor.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground/80 font-mono text-xs">{investor.investor_id}</TableCell>
                        <TableCell>{getKycBadge(investor.kyc_status)}</TableCell>
                        <TableCell className="text-foreground/80 text-right font-medium">${metrics.totalInvested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-foreground text-right font-bold">${metrics.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className={`text-right font-medium ${metrics.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{metrics.pnl.toFixed(2)}%</TableCell>
                        <TableCell className="text-foreground/80">
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
          <DialogContent className="bg-background border-[#ccab6c]/25 text-foreground w-[min(98vw,90rem)] max-w-none sm:max-w-none h-[92vh] flex flex-col min-h-0 p-0 gap-0 overflow-hidden">
            {selectedInvestor && (
              <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <InvestorDetailDrawer
                  investor={selectedInvestor}
                  investments={investments.filter(i => i.investor_email === selectedInvestor.email)}
                  products={products}
                  navs={navs}
                  fabricatedReturns={fabricatedReturns.filter(fr => fr.investor_email === selectedInvestor.email)}
                  onDataChange={() => loadCrmData(true)}
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