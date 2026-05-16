import React, { useState, useEffect } from 'react';
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { LockInOverrides } from "@/entities/LockInOverrides";
import { AuditLog } from "@/entities/AuditLog";
import { Transaction } from "@/entities/Transaction";
import { Document } from "@/entities/Document";
import { SupportTicket } from "@/entities/SupportTicket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Edit,
  Briefcase,
  History,
  Upload,
  FileText,
  Percent,
  Calculator,
  MoreHorizontal,
  User as UserIcon,
  BarChart3,
  ArrowLeftRight,
  FolderOpen,
  LifeBuoy,
  Download,
  PlusCircle,
} from "lucide-react";
import {
  EditAmountModal,
  EditUnitsModal,
  EditLockInModal,
  EditNAVModal,
  UploadStatementModal,
  AddKYCModal
} from "./InvestorEditModals";
import { format, addMonths, differenceInDays, isAfter } from "date-fns";
import { darkCardClass, mutedGoldText } from "@/lib/varmaTheme";

const TAB_TRIGGER_CLASS = "data-[state=active]:bg-[#fedea0] data-[state=active]:text-black shrink-0";
const TABLE_HEAD_CLASS = "text-gold/90";
const TABLE_ROW_CLASS = "border-[#ccab6c]/25 hover:bg-muted/50";

const formatCurrency = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercent = (value) => {
  const n = parseFloat(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

const getKycBadge = (status) => {
  const styles = {
    verified: 'bg-green-900 text-green-400 border-green-700',
    pending: 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45',
    rejected: 'bg-red-900 text-red-400 border-red-700',
  };
  return <Badge variant="outline" className={`capitalize ${styles[status] || 'bg-secondary'}`}>{status || 'unknown'}</Badge>;
};

const TabCard = ({ title, icon: Icon, children, actions }) => (
  <Card className={darkCardClass}>
    <CardHeader className="flex flex-row items-center justify-between gap-4">
      <CardTitle className="flex items-center gap-2 text-foreground">
        {Icon && <Icon className="w-5 h-5 text-gold" />}
        {title}
      </CardTitle>
      {actions}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const EmptyState = ({ title, description }) => (
  <div className="text-center py-12">
    <p className={`${mutedGoldText} text-lg`}>{title}</p>
    {description && <p className="text-muted-foreground text-sm mt-2">{description}</p>}
  </div>
);

const TableShell = ({ children }) => (
  <div className="overflow-x-auto">{children}</div>
);

const getProductName = (products, id) => products.find(p => p.id === id)?.name || 'Unknown';

const computeHoldingValue = (investment, navs) => {
  const invested = investment.invested_amount || 0;
  const latestNav = navs?.find(n => n.product_id === investment.product_id);
  const currentValue = (investment.current_units || 0) * (latestNav?.nav_per_unit || 1);
  const pnlAmount = currentValue - invested;
  const pnlPercent = invested > 0 ? (pnlAmount / invested) * 100 : 0;
  return { currentValue, pnlAmount, pnlPercent };
};

const isLocked = (investment) => {
  if (!investment.lock_in_end_date) return false;
  return !isAfter(new Date(), new Date(investment.lock_in_end_date));
};

const AuditChanges = ({ changes }) => {
  if (!changes || typeof changes !== 'object') {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="space-y-1 text-xs text-foreground/80">
      {Object.entries(changes).map(([key, value]) => (
        <li key={key} className="whitespace-pre-wrap break-words">
          <span className="text-gold/90">{key}:</span>{' '}
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </li>
      ))}
    </ul>
  );
};

const OverviewTab = ({ investor, investments, products, navs, onDataChange }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    totalInvested: 0,
    currentValue: 0,
    pnlPercent: 0,
    nextLockInDate: ''
  });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await User.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const totalInvested = investments.reduce((sum, i) => sum + (i.invested_amount || 0), 0);
    const currentValue = investments.reduce((sum, i) => {
      const latestNav = navs?.find(n => n.product_id === i.product_id);
      return sum + ((i.current_units || 0) * (latestNav?.nav_per_unit || 1));
    }, 0);
    const pnlPercent = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

    const lockInDates = investments
      .map(i => i.lock_in_end_date)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => d > new Date());
    const nextLockIn = lockInDates.length > 0 ? new Date(Math.min(...lockInDates)) : null;

    setFormData({
      totalInvested,
      currentValue,
      pnlPercent,
      nextLockInDate: nextLockIn ? format(nextLockIn, 'yyyy-MM-dd') : ''
    });
  }, [investments, navs]);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleSave = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the change');
      return;
    }

    setSaving(true);
    try {
      if (investments.length === 1) {
        const inv = investments[0];
        await Investment.update(inv.id, {
          invested_amount: parseFloat(formData.totalInvested),
          lock_in_end_date: formData.nextLockInDate || inv.lock_in_end_date
        });
      } else if (investments.length > 1) {
        const oldTotal = investments.reduce((sum, i) => sum + (i.invested_amount || 0), 0);
        const ratio = oldTotal > 0 ? parseFloat(formData.totalInvested) / oldTotal : 1;

        for (const inv of investments) {
          await Investment.update(inv.id, {
            invested_amount: (inv.invested_amount || 0) * ratio
          });
        }

        if (formData.nextLockInDate) {
          const sortedInv = [...investments]
            .filter(i => i.lock_in_end_date)
            .sort((a, b) => new Date(a.lock_in_end_date) - new Date(b.lock_in_end_date));
          if (sortedInv.length > 0) {
            await Investment.update(sortedInv[0].id, {
              lock_in_end_date: formData.nextLockInDate
            });
          }
        }
      }

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'update',
        entity_type: 'InvestorMetrics',
        entity_id: investor.id,
        changes: {
          investor_email: investor.email,
          totalInvested: formData.totalInvested,
          currentValue: formData.currentValue,
          pnlPercent: formData.pnlPercent,
          nextLockInDate: formData.nextLockInDate,
          reason
        }
      });

      setIsEditing(false);
      setReason('');
      onDataChange();
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Total Invested', value: formatCurrency(formData.totalInvested), icon: DollarSign },
    { label: 'Current Value', value: formatCurrency(formData.currentValue), icon: TrendingUp },
    {
      label: 'P&L',
      value: formatPercent(formData.pnlPercent),
      icon: parseFloat(formData.pnlPercent) >= 0 ? TrendingUp : TrendingDown,
      valueClass: parseFloat(formData.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Next Lock-in Expiry',
      value: formData.nextLockInDate ? format(new Date(formData.nextLockInDate), 'MMM dd, yyyy') : 'None',
      icon: Lock,
    },
  ];

  return (
    <TabCard
      title="Portfolio Overview"
      icon={DollarSign}
      actions={isSuperAdmin && !isEditing && (
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="w-3 h-3 mr-1" /> Edit Metrics
        </Button>
      )}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Total Invested ($)</Label>
              <Input
                type="number"
                value={formData.totalInvested}
                onChange={e => setFormData({ ...formData, totalInvested: e.target.value })}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div>
              <Label>Current Value ($)</Label>
              <Input
                type="number"
                value={formData.currentValue}
                onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div>
              <Label>P&L (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.pnlPercent}
                onChange={e => setFormData({ ...formData, pnlPercent: e.target.value })}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div>
              <Label>Next Lock-in Expiry</Label>
              <Input
                type="date"
                value={formData.nextLockInDate}
                onChange={e => setFormData({ ...formData, nextLockInDate: e.target.value })}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
          </div>
          <div>
            <Label>Reason for Change (required)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why these values are being changed..."
              className="bg-muted border-[#ccab6c]/20"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !reason.trim()}
              className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, valueClass }) => (
              <div
                key={label}
                className="rounded-lg border border-[#ccab6c]/25 bg-muted/50 p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gold" />
                  <p className={`text-sm ${mutedGoldText}`}>{label}</p>
                </div>
                <p className={`text-2xl font-bold ${valueClass || 'text-foreground'}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#ccab6c]/25 bg-muted/30 p-4">
            <h3 className="text-foreground font-semibold flex items-center gap-2 mb-4">
              <UserIcon className="w-4 h-4 text-gold" /> Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className={mutedGoldText}>Investor ID</p>
                <p className="text-foreground font-mono mt-1">{investor.investor_id || '—'}</p>
              </div>
              <div>
                <p className={mutedGoldText}>Email</p>
                <p className="text-foreground mt-1 break-all">{investor.email}</p>
              </div>
              <div>
                <p className={mutedGoldText}>KYC Status</p>
                <div className="mt-1">{getKycBadge(investor.kyc_status)}</div>
              </div>
              <div>
                <p className={mutedGoldText}>Role</p>
                <p className="text-foreground capitalize mt-1">{investor.role || 'investor'}</p>
              </div>
              <div>
                <p className={mutedGoldText}>Holdings</p>
                <p className="text-foreground mt-1">{investments.length} product{investments.length !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className={mutedGoldText}>Full Name</p>
                <p className="text-foreground mt-1">{investor.full_name || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </TabCard>
  );
};

const EMPTY_HOLDING_FORM = {
  product_id: '',
  invested_amount: '',
  current_units: '',
  cost_basis: '',
  purchase_date: new Date().toISOString().split('T')[0],
  lock_in_months: '',
  lock_in_end_date: '',
  status: 'active',
};

const HoldingsTab = ({ investments, products, navs, investorEmail, onDataChange }) => {
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const [lockInModalOpen, setLockInModalOpen] = useState(false);
  const [navModalOpen, setNavModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [holdingForm, setHoldingForm] = useState(EMPTY_HOLDING_FORM);
  const [holdingSaving, setHoldingSaving] = useState(false);

  const openModal = (investment, modalSetter) => {
    setSelectedInvestment(investment);
    modalSetter(true);
  };

  const handleSave = () => {
    setSelectedInvestment(null);
    onDataChange();
  };

  const handleHoldingFormChange = (field, value) => {
    setHoldingForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddHolding = async () => {
    if (!holdingForm.product_id) return alert('Please select a product.');
    if (!holdingForm.invested_amount || isNaN(parseFloat(holdingForm.invested_amount))) return alert('Please enter a valid invested amount.');

    setHoldingSaving(true);
    try {
      const currentUser = await User.me();

      await Investment.create({
        investor_email: investorEmail,
        product_id: holdingForm.product_id,
        invested_amount: parseFloat(holdingForm.invested_amount),
        current_units: holdingForm.current_units ? parseFloat(holdingForm.current_units) : null,
        cost_basis: holdingForm.cost_basis ? parseFloat(holdingForm.cost_basis) : parseFloat(holdingForm.invested_amount),
        purchase_date: holdingForm.purchase_date || null,
        lock_in_months: holdingForm.lock_in_months ? parseInt(holdingForm.lock_in_months) : null,
        lock_in_end_date: holdingForm.lock_in_end_date || null,
        status: holdingForm.status,
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'create',
        entity_type: 'Investment',
        entity_id: investorEmail,
        changes: {
          investor_email: investorEmail,
          product: getProductName(products, holdingForm.product_id),
          invested_amount: holdingForm.invested_amount,
          status: holdingForm.status,
          purchase_date: holdingForm.purchase_date,
        },
      });

      setAddHoldingOpen(false);
      setHoldingForm(EMPTY_HOLDING_FORM);
      onDataChange();
    } catch (e) {
      console.error(e);
      alert('Failed to add holding: ' + e.message);
    } finally {
      setHoldingSaving(false);
    }
  };

  return (
    <>
    <TabCard
      title="Holdings"
      icon={Briefcase}
      actions={
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-[#fedea0] text-black hover:bg-[#ccab6c]" onClick={() => { setHoldingForm(EMPTY_HOLDING_FORM); setAddHoldingOpen(true); }}>
            <PlusCircle className="w-3 h-3 mr-1" /> Add Holding
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatementModalOpen(true)}>
            <Upload className="w-3 h-3 mr-1" /> Upload Statement
          </Button>
          <Button size="sm" variant="outline" onClick={() => setKycModalOpen(true)}>
            <FileText className="w-3 h-3 mr-1" /> Add KYC
          </Button>
        </div>
      }
    >
      {investments.length === 0 ? (
        <EmptyState title="No holdings found" description="This investor has no active investments." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableHead className={TABLE_HEAD_CLASS}>Product</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Units</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Cost Basis</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Current Value</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>P&L</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Lock-in</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map(inv => {
                const { currentValue, pnlAmount, pnlPercent } = computeHoldingValue(inv, navs);
                const locked = isLocked(inv);
                return (
                  <TableRow key={inv.id} className={TABLE_ROW_CLASS}>
                    <TableCell>
                      <p className="font-medium text-foreground">{getProductName(products, inv.product_id)}</p>
                      {inv.purchase_date && (
                        <p className="text-sm text-gold/90">
                          Purchased: {format(new Date(inv.purchase_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {inv.current_units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'}
                    </TableCell>
                    <TableCell className="text-foreground/80">{formatCurrency(inv.invested_amount)}</TableCell>
                    <TableCell className="text-foreground/80">{formatCurrency(currentValue)}</TableCell>
                    <TableCell>
                      <p className={`font-medium ${pnlAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnlAmount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(pnlAmount))}
                      </p>
                      <p className={`text-sm ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercent(pnlPercent)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {locked ? (
                          <>
                            <Lock className="w-4 h-4 text-red-400 shrink-0" />
                            <div className="text-sm">
                              <p className="text-red-400">Locked</p>
                              {inv.lock_in_end_date && (
                                <p className="text-gold/90">
                                  Until {format(new Date(inv.lock_in_end_date), 'MMM dd, yyyy')}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 text-green-400 shrink-0" />
                            <span className="text-green-400 text-sm">Unlocked</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border-[#ccab6c]/30">
                          <DropdownMenuItem onClick={() => openModal(inv, setAmountModalOpen)}>
                            <DollarSign className="w-4 h-4 mr-2" /> Edit Amount
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal(inv, setUnitsModalOpen)}>
                            <Calculator className="w-4 h-4 mr-2" /> Edit Units
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal(inv, setLockInModalOpen)}>
                            <Lock className="w-4 h-4 mr-2" /> Edit Lock-in
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal(inv, setNavModalOpen)}>
                            <TrendingUp className="w-4 h-4 mr-2" /> Edit NAV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal(inv, setReturnModalOpen)}>
                            <Percent className="w-4 h-4 mr-2" /> Edit Returns
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <EditAmountModal open={amountModalOpen} onOpenChange={setAmountModalOpen} investment={selectedInvestment} onSave={handleSave} />
      <EditUnitsModal open={unitsModalOpen} onOpenChange={setUnitsModalOpen} investment={selectedInvestment} onSave={handleSave} />
      <EditLockInModal open={lockInModalOpen} onOpenChange={setLockInModalOpen} investment={selectedInvestment} onSave={handleSave} />
      <EditNAVModal open={navModalOpen} onOpenChange={setNavModalOpen} investment={selectedInvestment} products={products} onSave={handleSave} />
      <UploadStatementModal open={statementModalOpen} onOpenChange={setStatementModalOpen} investorEmail={investorEmail} onSave={handleSave} />
      <AddKYCModal open={kycModalOpen} onOpenChange={setKycModalOpen} investorEmail={investorEmail} onSave={handleSave} />
    </TabCard>

    {/* Add Holding Dialog */}
    <Dialog open={addHoldingOpen} onOpenChange={setAddHoldingOpen}>
      <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Holding</DialogTitle>
          <p className="text-sm text-[#ccab6c]/80 mt-1">{investorEmail}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product */}
          <div>
            <Label className="text-gold/90">Product <span className="text-red-400">*</span></Label>
            <Select value={holdingForm.product_id} onValueChange={v => handleHoldingFormChange('product_id', v)}>
              <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="bg-muted border-[#ccab6c]/20">
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invested Amount & Cost Basis */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gold/90">Invested Amount ($) <span className="text-red-400">*</span></Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={holdingForm.invested_amount}
                onChange={e => handleHoldingFormChange('invested_amount', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
            <div>
              <Label className="text-gold/90">Cost Basis ($) <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="number" min="0" step="0.01" placeholder="Defaults to invested amount"
                value={holdingForm.cost_basis}
                onChange={e => handleHoldingFormChange('cost_basis', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
          </div>

          {/* Units & Purchase Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gold/90">Current Units <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="number" min="0" step="0.0001" placeholder="e.g. 100.5"
                value={holdingForm.current_units}
                onChange={e => handleHoldingFormChange('current_units', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
            <div>
              <Label className="text-gold/90">Purchase Date</Label>
              <Input
                type="date"
                value={holdingForm.purchase_date}
                onChange={e => handleHoldingFormChange('purchase_date', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
          </div>

          {/* Lock-in Months & Lock-in End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gold/90">Lock-in Months <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="number" min="0" step="1" placeholder="e.g. 12"
                value={holdingForm.lock_in_months}
                onChange={e => handleHoldingFormChange('lock_in_months', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
            <div>
              <Label className="text-gold/90">Lock-in End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="date"
                value={holdingForm.lock_in_end_date}
                onChange={e => handleHoldingFormChange('lock_in_end_date', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-gold/90">Status</Label>
            <Select value={holdingForm.status} onValueChange={v => handleHoldingFormChange('status', v)}>
              <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-muted border-[#ccab6c]/20">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAddHoldingOpen(false)} disabled={holdingSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleAddHolding}
            disabled={holdingSaving || !holdingForm.product_id || !holdingForm.invested_amount}
            className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
          >
            {holdingSaving ? 'Saving...' : 'Add Holding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

const PerformanceTab = ({ investor, investments, products, navs }) => {
  const totalInvested = investments.reduce((sum, i) => sum + (i.invested_amount || 0), 0);
  const currentValue = investments.reduce((sum, i) => {
    const latestNav = navs?.find(n => n.product_id === i.product_id);
    return sum + ((i.current_units || 0) * (latestNav?.nav_per_unit || 1));
  }, 0);
  const pnlPercent = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return (
    <TabCard title="Performance" icon={BarChart3}>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#ccab6c]/25 bg-muted/50 p-3">
          <p className={`text-sm ${mutedGoldText}`}>Portfolio P&L</p>
          <p className={`text-xl font-bold ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(pnlPercent)}
          </p>
        </div>
        <div className="rounded-lg border border-[#ccab6c]/25 bg-muted/50 p-3">
          <p className={`text-sm ${mutedGoldText}`}>Total Invested</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="rounded-lg border border-[#ccab6c]/25 bg-muted/50 p-3">
          <p className={`text-sm ${mutedGoldText}`}>Current Value</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(currentValue)}</p>
        </div>
      </div>
      {investments.length === 0 ? (
        <EmptyState title="No holdings" description="This investor has no active investments to show performance for." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableHead className={TABLE_HEAD_CLASS}>Product</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Invested</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Current Value</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>P&L</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Return %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map(inv => {
                const latestNav = navs?.find(n => n.product_id === inv.product_id);
                const val = latestNav && inv.current_units
                  ? inv.current_units * latestNav.nav_per_unit
                  : inv.invested_amount || 0;
                const pnl = val - (inv.invested_amount || 0);
                const pct = inv.invested_amount > 0 ? (pnl / inv.invested_amount) * 100 : 0;
                return (
                  <TableRow key={inv.id} className={TABLE_ROW_CLASS}>
                    <TableCell className="text-foreground">{getProductName(products, inv.product_id)}</TableCell>
                    <TableCell className="text-foreground/80">{formatCurrency(inv.invested_amount)}</TableCell>
                    <TableCell className="text-foreground/80">{formatCurrency(val)}</TableCell>
                    <TableCell className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(pnl)}</TableCell>
                    <TableCell className={pct >= 0 ? 'text-green-400' : 'text-red-400'}>{formatPercent(pct)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </TabCard>
  );
};

const LockInsTab = ({ investor, investments, products }) => {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await LockInOverrides.filter({ investor_email: investor.email }, '-created_date', 50);
        setOverrides(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [investor.email]);

  return (
    <div className="space-y-6">
      <TabCard title="Active Lock-ins" icon={Lock}>
        {investments.length === 0 ? (
          <EmptyState title="No lock-in records" description="No investments to show lock-in status for." />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow className={TABLE_ROW_CLASS}>
                  <TableHead className={TABLE_HEAD_CLASS}>Product</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Lock-in Period</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>End Date</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Days Remaining</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map(inv => {
                  const locked = isLocked(inv);
                  const daysLeft = inv.lock_in_end_date
                    ? differenceInDays(new Date(inv.lock_in_end_date), new Date())
                    : null;
                  return (
                    <TableRow key={inv.id} className={TABLE_ROW_CLASS}>
                      <TableCell className="text-foreground">{getProductName(products, inv.product_id)}</TableCell>
                      <TableCell className="text-foreground/80">
                        {inv.lock_in_months ? `${inv.lock_in_months} months` : '—'}
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        {inv.lock_in_end_date ? format(new Date(inv.lock_in_end_date), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        {daysLeft != null ? (daysLeft > 0 ? `${daysLeft} days` : 'Expired') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={locked ? 'border-red-700 text-red-400' : 'border-green-700 text-green-400'}>
                          {locked ? 'Locked' : 'Unlocked'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </TabCard>

      <TabCard title="Lock-in Override History" icon={History}>
        {loading ? (
          <p className="text-muted-foreground">Loading override history...</p>
        ) : overrides.length === 0 ? (
          <EmptyState title="No overrides" description="Lock-in adjustments made by admins will appear here." />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow className={TABLE_ROW_CLASS}>
                  <TableHead className={TABLE_HEAD_CLASS}>Adjusted Period</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>New End Date</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Penalty</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Approved By</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id} className={TABLE_ROW_CLASS}>
                    <TableCell className="text-foreground/80">{o.adjusted_lock_months} months</TableCell>
                    <TableCell className="text-foreground/80">
                      {o.new_end_date ? format(new Date(o.new_end_date), 'MMM dd, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-foreground/80 capitalize">
                      {o.penalty_type === 'none' ? 'None' :
                        o.penalty_type === 'fixed' ? `$${o.penalty_amount}` :
                        o.penalty_type === 'percentage' ? `${o.penalty_percent}%` :
                        o.penalty_type || '—'}
                    </TableCell>
                    <TableCell className="text-foreground/80 text-sm">{o.approved_by || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs whitespace-pre-wrap break-words">
                      {o.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </TabCard>
    </div>
  );
};

const EMPTY_TX_FORM = {
  product_id: '',
  type: 'subscription',
  amount: '',
  units: '',
  nav_per_unit: '',
  transaction_date: new Date().toISOString().split('T')[0],
  status: 'completed',
  notes: '',
};

const TransactionsTab = ({ investor, products, investments, onDataChange }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TX_FORM);
  const [saving, setSaving] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await Transaction.filter({ investor_email: investor.email }, '-transaction_date', 200);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [investor.email]);

  const handleOpenAdd = () => {
    // Pre-select the investor's first product if available
    const firstProductId = investments?.[0]?.product_id ?? '';
    setForm({ ...EMPTY_TX_FORM, product_id: firstProductId });
    setAddOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.product_id) return alert('Please select a product.');
    if (!form.amount || isNaN(parseFloat(form.amount))) return alert('Please enter a valid amount.');
    if (!form.transaction_date) return alert('Please enter a transaction date.');

    setSaving(true);
    try {
      const currentUser = await User.me();

      await Transaction.create({
        investor_email: investor.email,
        product_id: form.product_id,
        type: form.type,
        amount: parseFloat(form.amount),
        units: form.units ? parseFloat(form.units) : null,
        nav_per_unit: form.nav_per_unit ? parseFloat(form.nav_per_unit) : null,
        transaction_date: form.transaction_date,
        status: form.status,
        notes: form.notes || null,
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'create',
        entity_type: 'Transaction',
        entity_id: investor.id,
        changes: {
          investor_email: investor.email,
          product: getProductName(products, form.product_id),
          type: form.type,
          amount: form.amount,
          status: form.status,
          transaction_date: form.transaction_date,
        },
      });

      setAddOpen(false);
      setForm(EMPTY_TX_FORM);
      await loadTransactions();
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error(e);
      alert('Failed to save transaction: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Products available to this investor (their holdings), falling back to all products
  const availableProducts = investments && investments.length > 0
    ? products.filter(p => investments.some(i => i.product_id === p.id))
    : products;

  return (
    <>
      <TabCard
        title="Transactions"
        icon={ArrowLeftRight}
        actions={
          <Button size="sm" className="bg-[#fedea0] text-black hover:bg-[#ccab6c]" onClick={handleOpenAdd}>
            <PlusCircle className="w-3 h-3 mr-1" /> Add Transaction
          </Button>
        }
      >
        {loading ? (
          <p className="text-muted-foreground">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <EmptyState title="No transactions found" description="Transaction history will appear here." />
        ) : (
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow className={TABLE_ROW_CLASS}>
                  <TableHead className={TABLE_HEAD_CLASS}>Date</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Product</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Type</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Units</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>NAV / Unit</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Amount</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                  <TableHead className={TABLE_HEAD_CLASS}>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id} className={TABLE_ROW_CLASS}>
                    <TableCell className="text-foreground/80 whitespace-nowrap">
                      {tx.transaction_date ? format(new Date(tx.transaction_date), 'MMM dd, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-foreground/80">{getProductName(products, tx.product_id)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${
                          tx.type === 'subscription' ? 'border-green-400 text-green-400' :
                          tx.type === 'redemption' ? 'border-red-400 text-red-400' :
                          tx.type === 'dividend' ? 'border-blue-400 text-blue-400' :
                          tx.type === 'fee' ? 'border-orange-400 text-orange-400' :
                          'border-[#ccab6c]/45 text-gold/90'
                        }`}
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {tx.units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '—'}
                    </TableCell>
                    <TableCell className="text-foreground/80">
                      {tx.nav_per_unit ? formatCurrency(tx.nav_per_unit) : '—'}
                    </TableCell>
                    <TableCell className={`font-medium ${
                      tx.type === 'subscription' || tx.type === 'dividend' ? 'text-green-400' :
                      tx.type === 'redemption' || tx.type === 'fee' || tx.type === 'penalty' ? 'text-red-400' :
                      'text-foreground/80'
                    }`}>
                      {(tx.type === 'subscription' || tx.type === 'dividend') ? '+' :
                       (tx.type === 'redemption' || tx.type === 'fee' || tx.type === 'penalty') ? '-' : ''}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          tx.status === 'completed' ? 'bg-green-900 text-green-400 border-green-700' :
                          tx.status === 'pending' ? 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45' :
                          tx.status === 'failed' ? 'bg-red-900 text-red-400 border-red-700' :
                          'bg-muted text-gold/90'
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[160px] truncate">
                      {tx.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
      </TabCard>

      {/* Add Transaction Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Transaction</DialogTitle>
            <p className="text-sm text-[#ccab6c]/80 mt-1">{investor.full_name} — {investor.email}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Product */}
            <div>
              <Label className="text-gold/90">Product <span className="text-red-400">*</span></Label>
              <Select value={form.product_id} onValueChange={v => handleFormChange('product_id', v)}>
                <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-[#ccab6c]/20">
                  {availableProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {/* Show remaining products not in holdings */}
                  {investments && investments.length > 0 &&
                    products
                      .filter(p => !investments.some(i => i.product_id === p.id))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-muted-foreground">{p.name} (not held)</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Type & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gold/90">Type <span className="text-red-400">*</span></Label>
                <Select value={form.type} onValueChange={v => handleFormChange('type', v)}>
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-[#ccab6c]/20">
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="redemption">Redemption</SelectItem>
                    <SelectItem value="dividend">Dividend</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="penalty">Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gold/90">Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={form.transaction_date}
                  onChange={e => handleFormChange('transaction_date', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                />
              </div>
            </div>

            {/* Amount & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gold/90">Amount ($) <span className="text-red-400">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => handleFormChange('amount', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                />
              </div>
              <div>
                <Label className="text-gold/90">Status</Label>
                <Select value={form.status} onValueChange={v => handleFormChange('status', v)}>
                  <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-[#ccab6c]/20">
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Units & NAV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gold/90">Units <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="e.g. 100.5"
                  value={form.units}
                  onChange={e => handleFormChange('units', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                />
              </div>
              <div>
                <Label className="text-gold/90">NAV / Unit <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="e.g. 105.25"
                  value={form.nav_per_unit}
                  onChange={e => handleFormChange('nav_per_unit', e.target.value)}
                  className="bg-muted border-[#ccab6c]/20 mt-1"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-gold/90">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={e => handleFormChange('notes', e.target.value)}
                className="bg-muted border-[#ccab6c]/20 mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.product_id || !form.amount || !form.transaction_date}
              className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
            >
              {saving ? 'Saving...' : 'Save Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DocumentsTab = ({ investor }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [investorDocs, globalDocs] = await Promise.all([
          Document.filter({ investor_email: investor.email }, '-created_date', 50),
          Document.filter({ investor_email: '' }, '-created_date', 50),
        ]);
        setDocuments([
          ...investorDocs.map(d => ({ ...d, scope: 'Investor' })),
          ...globalDocs.map(d => ({ ...d, scope: 'Global' })),
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [investor.email]);

  return (
    <TabCard title="Documents" icon={FolderOpen}>
      {loading ? (
        <p className="text-muted-foreground">Loading documents...</p>
      ) : documents.length === 0 ? (
        <EmptyState title="No documents found" description="Investor and global documents will appear here." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableHead className={TABLE_HEAD_CLASS}>Title</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Type</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Period</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Scope</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Uploaded</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map(doc => (
                <TableRow key={doc.id} className={TABLE_ROW_CLASS}>
                  <TableCell className="text-foreground font-medium">{doc.title || '—'}</TableCell>
                  <TableCell className="text-foreground/80 capitalize">{doc.type || '—'}</TableCell>
                  <TableCell className="text-foreground/80">{doc.period || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={doc.scope === 'Investor' ? 'border-[#ccab6c]/45 text-gold-bright' : 'border-border text-muted-foreground'}>
                      {doc.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/80">
                    {doc.created_date ? format(new Date(doc.created_date), 'MMM dd, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    {doc.file_url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </TabCard>
  );
};

const TicketsTab = ({ investor }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-900 text-red-400 border-red-700';
      case 'high': return 'bg-orange-900 text-orange-400 border-orange-700';
      case 'medium': return 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45';
      default: return 'bg-secondary text-foreground/80 border-border';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-900 text-blue-400 border-blue-700';
      case 'in_progress': return 'bg-purple-900 text-purple-400 border-purple-700';
      case 'resolved': return 'bg-green-900 text-green-400 border-green-700';
      default: return 'bg-muted text-gold/90 border-[#ccab6c]/20';
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await SupportTicket.filter({ investor_email: investor.email }, '-updated_date', 50);
        setTickets(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [investor.email]);

  return (
    <TabCard title="Support Tickets" icon={LifeBuoy}>
      {loading ? (
        <p className="text-muted-foreground">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <EmptyState title="No support tickets" description="Support requests from this investor will appear here." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableHead className={TABLE_HEAD_CLASS}>Subject</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Priority</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Created</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id} className={TABLE_ROW_CLASS}>
                  <TableCell className="text-foreground font-medium max-w-xs whitespace-pre-wrap break-words">
                    {ticket.subject || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getStatusBadge(ticket.status)}`}>
                      {ticket.status?.replace("_", " ") || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getPriorityBadge(ticket.priority)}`}>
                      {ticket.priority || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground/80">
                    {ticket.created_date ? format(new Date(ticket.created_date), "MMM dd, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-foreground/80">
                    {ticket.updated_date ? format(new Date(ticket.updated_date), "MMM dd, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </TabCard>
  );
};

const AuditTab = ({ investor }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const userLogs = await AuditLog.filter({ user_email: investor.email }, "-created_date", 50);
      const relatedLogs = userLogs.filter(log => {
        if (log.user_email === investor.email) return true;
        if (log.entity_id === investor.id) return true;
        if (typeof log.changes === "object" && log.changes !== null) {
          const changesStr = JSON.stringify(log.changes);
          return changesStr.includes(investor.email) || changesStr.includes(investor.id);
        }
        return false;
      });
      setLogs(relatedLogs);
      setLoading(false);
    };
    fetchLogs();
  }, [investor]);

  return (
    <TabCard title="Audit Trail" icon={History}>
      {loading ? (
        <p className="text-muted-foreground">Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries" description="Admin actions related to this investor will appear here." />
      ) : (
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow className={TABLE_ROW_CLASS}>
                <TableHead className={TABLE_HEAD_CLASS}>Timestamp</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Admin</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Action</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Entity</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id} className={TABLE_ROW_CLASS}>
                  <TableCell className="text-foreground/80 whitespace-nowrap">
                    {format(new Date(log.created_date), "PPpp")}
                  </TableCell>
                  <TableCell className="text-foreground/80 text-sm">{log.user_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-foreground/80">{log.entity_type}</TableCell>
                  <TableCell className="max-w-md">
                    <AuditChanges changes={log.changes} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </TabCard>
  );
};

const CORE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "holdings", label: "Holdings" },
  { id: "performance", label: "Performance" },
  { id: "lockins", label: "Lock-ins" },
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
  { id: "tickets", label: "Tickets" },
  { id: "audit", label: "Audit" },
];

export default function InvestorDetailDrawer({
  investor,
  investments,
  products,
  navs,
  onDataChange,
  additionalTabs = [],
}) {
  const allTabs = [...CORE_TABS, ...additionalTabs.map(t => ({ id: t.id, label: t.label, icon: t.icon }))];

  return (
    <div className="p-4 h-full flex flex-col min-h-0 flex-1">
      <div className="flex-shrink-0 border-b border-[#ccab6c]/20 pb-4 pr-8">
        <h2 className="text-2xl font-bold text-foreground">{investor.full_name}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className={`text-sm ${mutedGoldText}`}>{investor.email}</p>
          {investor.investor_id && (
            <Badge variant="outline" className="font-mono text-xs border-[#ccab6c]/30 text-foreground/80">
              {investor.investor_id}
            </Badge>
          )}
          {getKycBadge(investor.kyc_status)}
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-4 flex flex-col min-h-0 flex-1">
        <div className="flex-shrink-0 overflow-x-auto pb-1">
          <TabsList className="bg-muted border border-[#ccab6c]/20 w-max min-w-full flex-nowrap h-auto p-1">
            {allTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className={TAB_TRIGGER_CLASS}>
                {tab.icon && <tab.icon className="w-3.5 h-3.5 mr-1" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 mt-4 overflow-y-auto pr-1">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab investor={investor} investments={investments} products={products} navs={navs} onDataChange={onDataChange} />
          </TabsContent>
          <TabsContent value="holdings" className="mt-0">
            <HoldingsTab investments={investments} products={products} navs={navs} investorEmail={investor.email} onDataChange={onDataChange} />
          </TabsContent>
          <TabsContent value="performance" className="mt-0">
            <PerformanceTab investor={investor} investments={investments} products={products} navs={navs} />
          </TabsContent>
          <TabsContent value="lockins" className="mt-0">
            <LockInsTab investor={investor} investments={investments} products={products} />
          </TabsContent>
          <TabsContent value="transactions" className="mt-0">
            <TransactionsTab investor={investor} products={products} investments={investments} onDataChange={onDataChange} />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <DocumentsTab investor={investor} />
          </TabsContent>
          <TabsContent value="tickets" className="mt-0">
            <TicketsTab investor={investor} />
          </TabsContent>
          <TabsContent value="audit" className="mt-0">
            <AuditTab investor={investor} />
          </TabsContent>
          {additionalTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
