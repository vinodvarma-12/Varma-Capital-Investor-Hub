import React, { useState, useEffect } from 'react';
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { LockInOverrides } from "@/entities/LockInOverrides";
import { AuditLog } from "@/entities/AuditLog";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DollarSign, 
  TrendingUp, 
  Lock, 
  Edit, 
  Briefcase,
  History,
  Upload,
  FileText,
  Percent,
  Calculator
} from "lucide-react";
import {
  EditAmountModal,
  EditUnitsModal,
  EditLockInModal,
  EditNAVModal,
  EditReturnModal,
  UploadStatementModal,
  AddKYCModal
} from "./InvestorEditModals";
import { format, addMonths, differenceInDays, isAfter } from "date-fns";

const EditInvestmentForm = ({ investment, onSave, onCancel }) => {
    const [amount, setAmount] = useState(investment.invested_amount);
    const [units, setUnits] = useState(investment.current_units);
    const [reason, setReason] = useState("");

    const handleSave = async () => {
        const currentUser = await User.me();
        const changes = {
            old_amount: investment.invested_amount,
            new_amount: parseFloat(amount),
            old_units: investment.current_units,
            new_units: parseFloat(units),
            reason,
        };

        await Investment.update(investment.id, {
            invested_amount: parseFloat(amount),
            current_units: parseFloat(units),
        });

        await AuditLog.create({
            user_email: currentUser.email,
            action: 'update',
            entity_type: 'Investment',
            entity_id: investment.id,
            changes
        });
        
        onSave();
    };

    return (
        <div className="space-y-4">
            <div>
                <Label>Invested Amount</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="bg-zinc-900 border-[#ccab6c]/20" />
            </div>
            <div>
                <Label>Current Units</Label>
                <Input type="number" value={units} onChange={e => setUnits(e.target.value)} className="bg-zinc-900 border-[#ccab6c]/20" />
            </div>
            <div>
                <Label>Reason for Change</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-zinc-900 border-[#ccab6c]/20" />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={!reason} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">Save Changes</Button>
            </DialogFooter>
        </div>
    );
};

const EditLockInForm = ({ investment, onSave, onCancel }) => {
    const [lockInMonths, setLockInMonths] = useState(investment.lock_in_months || 12);
    const [endDate, setEndDate] = useState(investment.lock_in_end_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'));
    const [penaltyType, setPenaltyType] = useState('none');
    const [penaltyAmount, setPenaltyAmount] = useState(0);
    const [penaltyPercent, setPenaltyPercent] = useState(0);
    const [reason, setReason] = useState("");
    
    const lockInPresets = [
        { months: 12, label: '1 Year' }, { months: 18, label: '18 Months' }, { months: 24, label: '2 Years' },
        { months: 36, label: '3 Years' }, { months: 48, label: '4 Years' }, { months: 60, label: '5 Years' },
        { months: 72, label: '6 Years' }, { months: 84, label: '7 Years' }, { months: 96, label: '8 Years' }
    ];

    const handleSave = async () => {
        const currentUser = await User.me();
        const changes = {
            old_lock_months: investment.lock_in_months,
            new_lock_months: lockInMonths,
            old_end_date: investment.lock_in_end_date,
            new_end_date: endDate,
            penalty_type: penaltyType,
            penalty_amount: penaltyAmount,
            penalty_percent: penaltyPercent,
            reason
        };
        
        // Create override record
        await LockInOverrides.create({
            investment_id: investment.id,
            investor_email: investment.investor_email,
            original_lock_months: investment.lock_in_months,
            adjusted_lock_months: parseInt(lockInMonths),
            new_end_date: endDate,
            penalty_type: penaltyType,
            penalty_amount: parseFloat(penaltyAmount),
            penalty_percent: parseFloat(penaltyPercent),
            reason: reason,
            approved_by: currentUser.email
        });

        // Update the investment record itself
        await Investment.update(investment.id, {
            lock_in_months: parseInt(lockInMonths),
            lock_in_end_date: endDate
        });

        // Create audit log
        await AuditLog.create({
            user_email: currentUser.email,
            action: 'update',
            entity_type: 'LockIn',
            entity_id: investment.id,
            changes
        });
        
        onSave();
    };

    return (
        <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lock-in Period</Label>
                  <Select value={lockInMonths.toString()} onValueChange={val => setLockInMonths(val)}>
                    <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lockInPresets.map(p => <SelectItem key={p.months} value={p.months.toString()}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>New End Date</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="bg-zinc-900 border-[#ccab6c]/20" />
                </div>
              </div>

              <div>
                <Label>Early Redemption Penalty</Label>
                <Select value={penaltyType} onValueChange={setPenaltyType}>
                    <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Penalty</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                </Select>
              </div>

            {(penaltyType === 'fixed' || penaltyType === 'both') && (
                <div>
                <Label>Fixed Penalty Amount ($)</Label>
                <Input type="number" value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)} className="bg-zinc-900 border-[#ccab6c]/20" />
                </div>
            )}
            {(penaltyType === 'percentage' || penaltyType === 'both') && (
                 <div>
                <Label>Penalty Percentage (%)</Label>
                <Input type="number" step="0.1" value={penaltyPercent} onChange={e => setPenaltyPercent(e.target.value)} className="bg-zinc-900 border-[#ccab6c]/20" />
                </div>
            )}
            
            <div>
                <Label>Reason for Change</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-zinc-900 border-[#ccab6c]/20" />
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={!reason} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">Save Changes</Button>
            </DialogFooter>
        </div>
    )
}

const HoldingsTab = ({ investments, products, investorEmail, onDataChange }) => {
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [amountModalOpen, setAmountModalOpen] = useState(false);
    const [unitsModalOpen, setUnitsModalOpen] = useState(false);
    const [lockInModalOpen, setLockInModalOpen] = useState(false);
    const [navModalOpen, setNavModalOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [statementModalOpen, setStatementModalOpen] = useState(false);
    const [kycModalOpen, setKycModalOpen] = useState(false);

    const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';

    const openModal = (investment, modalSetter) => {
        setSelectedInvestment(investment);
        modalSetter(true);
    };

    const handleSave = () => {
        setSelectedInvestment(null);
        onDataChange();
    };

    return (
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Briefcase /> Holdings</CardTitle>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStatementModalOpen(true)}>
                        <Upload className="w-3 h-3 mr-1" /> Upload Statement
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setKycModalOpen(true)}>
                        <FileText className="w-3 h-3 mr-1" /> Add KYC
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-zinc-900/20">
                            <TableHead>Product</TableHead>
                            <TableHead>Invested</TableHead>
                            <TableHead>Units</TableHead>
                            <TableHead>Lock-in End</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {investments.map(inv => (
                            <TableRow key={inv.id} className="hover:bg-zinc-900/20">
                                <TableCell className="font-medium">{getProductName(inv.product_id)}</TableCell>
                                <TableCell>${inv.invested_amount?.toLocaleString()}</TableCell>
                                <TableCell>{inv.current_units?.toLocaleString()}</TableCell>
                                <TableCell>{inv.lock_in_end_date ? format(new Date(inv.lock_in_end_date), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        <Button size="sm" variant="outline" onClick={() => openModal(inv, setAmountModalOpen)} title="Edit Amount">
                                            <DollarSign className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openModal(inv, setUnitsModalOpen)} title="Edit Units">
                                            <Calculator className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openModal(inv, setLockInModalOpen)} title="Edit Lock-in">
                                            <Lock className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openModal(inv, setNavModalOpen)} title="Edit NAV">
                                            <TrendingUp className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openModal(inv, setReturnModalOpen)} title="Edit Returns">
                                            <Percent className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* All Modals */}
                <EditAmountModal open={amountModalOpen} onOpenChange={setAmountModalOpen} investment={selectedInvestment} onSave={handleSave} />
                <EditUnitsModal open={unitsModalOpen} onOpenChange={setUnitsModalOpen} investment={selectedInvestment} onSave={handleSave} />
                <EditLockInModal open={lockInModalOpen} onOpenChange={setLockInModalOpen} investment={selectedInvestment} onSave={handleSave} />
                <EditNAVModal open={navModalOpen} onOpenChange={setNavModalOpen} investment={selectedInvestment} products={products} onSave={handleSave} />
                <EditReturnModal open={returnModalOpen} onOpenChange={setReturnModalOpen} investment={selectedInvestment} investorEmail={investorEmail} onSave={handleSave} />
                <UploadStatementModal open={statementModalOpen} onOpenChange={setStatementModalOpen} investorEmail={investorEmail} onSave={handleSave} />
                <AddKYCModal open={kycModalOpen} onOpenChange={setKycModalOpen} investorEmail={investorEmail} onSave={handleSave} />
            </CardContent>
        </Card>
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
        // Calculate current metrics
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
            // Update investments proportionally if there's only one, or create fabricated return for P&L
            if (investments.length === 1) {
                const inv = investments[0];
                await Investment.update(inv.id, {
                    invested_amount: parseFloat(formData.totalInvested),
                    lock_in_end_date: formData.nextLockInDate || inv.lock_in_end_date
                });
            } else if (investments.length > 1) {
                // For multiple investments, update proportionally
                const oldTotal = investments.reduce((sum, i) => sum + (i.invested_amount || 0), 0);
                const ratio = oldTotal > 0 ? parseFloat(formData.totalInvested) / oldTotal : 1;
                
                for (const inv of investments) {
                    await Investment.update(inv.id, {
                        invested_amount: (inv.invested_amount || 0) * ratio
                    });
                }

                // Update lock-in date on earliest expiring investment
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

            // Create/update fabricated return for P&L override
            if (investments.length > 0) {
                const productId = investments[0].product_id;
                await FabricatedReturns.create({
                    investor_email: investor.email,
                    product_id: productId,
                    period: format(new Date(), 'yyyy-MM'),
                    return_percent: parseFloat(formData.pnlPercent),
                    nav_per_unit: formData.currentValue / investments.reduce((sum, i) => sum + (i.current_units || 1), 0),
                    override_calculated: true,
                    admin_notes: reason,
                    effective_date: format(new Date(), 'yyyy-MM-dd')
                });
            }

            // Log the change
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

    return (
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><DollarSign /> Portfolio Overview</CardTitle>
                {isSuperAdmin && !isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="w-3 h-3 mr-1" /> Edit Metrics
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Total Invested ($)</Label>
                                <Input 
                                    type="number" 
                                    value={formData.totalInvested} 
                                    onChange={e => setFormData({...formData, totalInvested: e.target.value})}
                                    className="bg-zinc-900 border-[#ccab6c]/20"
                                />
                            </div>
                            <div>
                                <Label>Current Value ($)</Label>
                                <Input 
                                    type="number" 
                                    value={formData.currentValue} 
                                    onChange={e => setFormData({...formData, currentValue: e.target.value})}
                                    className="bg-zinc-900 border-[#ccab6c]/20"
                                />
                            </div>
                            <div>
                                <Label>P&L (%)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={formData.pnlPercent} 
                                    onChange={e => setFormData({...formData, pnlPercent: e.target.value})}
                                    className="bg-zinc-900 border-[#ccab6c]/20"
                                />
                            </div>
                            <div>
                                <Label>Next Lock-in Expiry</Label>
                                <Input 
                                    type="date" 
                                    value={formData.nextLockInDate} 
                                    onChange={e => setFormData({...formData, nextLockInDate: e.target.value})}
                                    className="bg-zinc-900 border-[#ccab6c]/20"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Reason for Change (required)</Label>
                            <Textarea 
                                value={reason} 
                                onChange={e => setReason(e.target.value)}
                                placeholder="Explain why these values are being changed..."
                                className="bg-zinc-900 border-[#ccab6c]/20"
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <p className="text-sm text-[#ccab6c]/90">Total Invested</p>
                            <p className="text-2xl font-bold text-white">${parseFloat(formData.totalInvested).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-[#ccab6c]/90">Current Value</p>
                            <p className="text-2xl font-bold text-white">${parseFloat(formData.currentValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-[#ccab6c]/90">P&L</p>
                            <p className={`text-2xl font-bold ${parseFloat(formData.pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {parseFloat(formData.pnlPercent) >= 0 ? '+' : ''}{parseFloat(formData.pnlPercent).toFixed(2)}%
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-[#ccab6c]/90">Next Lock-in Expiry</p>
                            <p className="text-2xl font-bold text-white">
                                {formData.nextLockInDate ? format(new Date(formData.nextLockInDate), 'MMM dd, yyyy') : 'None'}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const AuditTab = ({ investor }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const userLogs = await AuditLog.filter({
                $or: [
                    { user_email: investor.email },
                    { changes: { investor_email: investor.email } },
                    { entity_id: investor.id }
                ]
            }, '-created_date', 50);
            
            // This is a simplified filter. A real implementation might need more robust querying if the SDK supports it, or server-side filtering.
            // For now, we'll try to get logs related to the user by email or ID.
            
            // A secondary client-side filter to be more precise for this demo
            const relatedLogs = userLogs.filter(log => {
               if (log.user_email === investor.email) return true;
               if (log.entity_id === investor.id) return true;
               if (typeof log.changes === 'object' && log.changes !== null) {
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
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader><CardTitle className="flex items-center gap-2"><History /> Audit Trail</CardTitle></CardHeader>
            <CardContent>
                {loading ? <p>Loading logs...</p> : (
                <Table>
                    <TableHeader><TableRow className="hover:bg-zinc-900/20"><TableHead>Timestamp</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Changes</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {logs.map(log => (
                            <TableRow key={log.id} className="hover:bg-zinc-900/20">
                                <TableCell>{format(new Date(log.created_date), 'PPpp')}</TableCell>
                                <TableCell>{log.user_email}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{log.action}</Badge></TableCell>
                                <TableCell>{log.entity_type}</TableCell>
                                <TableCell className="font-mono text-xs max-w-sm overflow-x-auto"><pre>{JSON.stringify(log.changes, null, 2)}</pre></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    )
}

export default function InvestorDetailDrawer({ investor, investments, products, navs, onDataChange }) {

    // Dummy data for tabs not yet built
    const PerformanceTab = () => <Card className="bg-zinc-950 border border-[#ccab6c]/30"><CardHeader><CardTitle>Performance</CardTitle></CardHeader><CardContent><p className="text-zinc-500">Performance charts and admin controls for NAV/Return overrides will be available here in the next update.</p></CardContent></Card>
    const TransactionsTab = () => <Card className="bg-zinc-950 border border-[#ccab6c]/30"><CardHeader><CardTitle>Transactions</CardTitle></CardHeader><CardContent><p className="text-zinc-500">Investor transaction history will be displayed here.</p></CardContent></Card>
    const DocumentsTab = () => <Card className="bg-zinc-950 border border-[#ccab6c]/30"><CardHeader><CardTitle>Documents</CardTitle></CardHeader><CardContent><p className="text-zinc-500">Investor-specific and global documents will be listed here.</p></CardContent></Card>
    const TicketsTab = () => <Card className="bg-zinc-950 border border-[#ccab6c]/30"><CardHeader><CardTitle>Support Tickets</CardTitle></CardHeader><CardContent><p className="text-zinc-500">Support ticket history for this investor will be displayed here.</p></CardContent></Card>

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex-shrink-0">
                <h2 className="text-2xl font-bold">{investor.full_name}</h2>
                <p className="text-[#ccab6c]/90">{investor.email}</p>
            </div>

            <Tabs defaultValue="overview" className="mt-6 flex-grow flex flex-col">
                <TabsList className="bg-zinc-900 border-[#ccab6c]/20">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="holdings">Holdings</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="lockins">Lock-ins</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="tickets">Tickets</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                </TabsList>
                <div className="flex-grow mt-4 overflow-y-auto">
                    <TabsContent value="overview"><OverviewTab investor={investor} investments={investments} products={products} navs={navs} onDataChange={onDataChange} /></TabsContent>
                    <TabsContent value="holdings"><HoldingsTab investments={investments} products={products} investorEmail={investor.email} onDataChange={onDataChange} /></TabsContent>
                    <TabsContent value="performance"><PerformanceTab /></TabsContent>
                    <TabsContent value="lockins"><p>The Lock-ins tab is integrated into Holdings for now.</p></TabsContent>
                    <TabsContent value="transactions"><TransactionsTab /></TabsContent>
                    <TabsContent value="documents"><DocumentsTab /></TabsContent>
                    <TabsContent value="tickets"><TicketsTab /></TabsContent>
                    <TabsContent value="audit"><AuditTab investor={investor} /></TabsContent>
                </div>
            </Tabs>
        </div>
    );
}