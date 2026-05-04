import React, { useState, useEffect } from "react";
import { Investment } from "@/entities/Investment";
import { LockInOverrides } from "@/entities/LockInOverrides";
import { Product } from "@/entities/Product";
import { User } from "@/entities/User";
import { AuditLog } from "@/entities/AuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Edit, Clock, AlertTriangle } from "lucide-react";
import { format, addMonths, differenceInDays, isAfter } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LockInAdjustmentForm = ({ investment, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    adjusted_lock_months: investment?.lock_in_months || 12,
    new_end_date: investment?.lock_in_end_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    penalty_type: 'none',
    penalty_amount: 0,
    penalty_percent: 0,
    reason: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      investment_id: investment.id,
      investor_email: investment.investor_email,
      original_lock_months: investment.lock_in_months
    });
  };

  const lockInPresets = [
    { months: 12, label: '1 Year' },
    { months: 18, label: '18 Months' },
    { months: 24, label: '2 Years' },
    { months: 36, label: '3 Years' },
    { months: 48, label: '4 Years' },
    { months: 60, label: '5 Years' },
    { months: 72, label: '6 Years' },
    { months: 84, label: '7 Years' },
    { months: 96, label: '8 Years' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-semibold text-white mb-2">Current Investment</h4>
        <p className="text-gray-300">Investor: {investment.investor_email}</p>
        <p className="text-gray-300">Product: {products.find(p => p.id === investment.product_id)?.name}</p>
        <p className="text-gray-300">Current Lock-in: {investment.lock_in_months} months</p>
        <p className="text-gray-300">Current End Date: {format(new Date(investment.lock_in_end_date), 'MMM dd, yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lock-in Period (Months)</Label>
          <Select 
            value={formData.adjusted_lock_months.toString()} 
            onValueChange={(val) => setFormData({...formData, adjusted_lock_months: parseInt(val)})}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {lockInPresets.map(preset => (
                <SelectItem key={preset.months} value={preset.months.toString()}>
                  {preset.label} ({preset.months} months)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>New End Date</Label>
          <Input 
            type="date"
            value={formData.new_end_date}
            onChange={(e) => setFormData({...formData, new_end_date: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label>Early Redemption Penalty</Label>
        <Select 
          value={formData.penalty_type} 
          onValueChange={(val) => setFormData({...formData, penalty_type: val})}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Penalty</SelectItem>
            <SelectItem value="fixed">Fixed Amount</SelectItem>
            <SelectItem value="percentage">Percentage of Withdrawal</SelectItem>
            <SelectItem value="both">Both Fixed + Percentage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(formData.penalty_type === 'fixed' || formData.penalty_type === 'both') && (
        <div>
          <Label>Fixed Penalty Amount ($)</Label>
          <Input 
            type="number"
            value={formData.penalty_amount}
            onChange={(e) => setFormData({...formData, penalty_amount: parseFloat(e.target.value)})}
          />
        </div>
      )}

      {(formData.penalty_type === 'percentage' || formData.penalty_type === 'both') && (
        <div>
          <Label>Penalty Percentage (%)</Label>
          <Input 
            type="number"
            step="0.1"
            value={formData.penalty_percent}
            onChange={(e) => setFormData({...formData, penalty_percent: parseFloat(e.target.value)})}
          />
        </div>
      )}

      <div>
        <Label>Reason for Adjustment</Label>
        <Textarea 
          value={formData.reason}
          onChange={(e) => setFormData({...formData, reason: e.target.value})}
          placeholder="Explain why this lock-in adjustment is being made..."
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-yellow-400 text-black hover:bg-yellow-500">
          Apply Lock-in Adjustment
        </Button>
      </div>
    </form>
  );
};

export default function AdminLockIns() {
  const [investments, setInvestments] = useState([]);
  const [lockInOverrides, setLockInOverrides] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [investmentsData, overridesData, productsData, usersData] = await Promise.all([
        Investment.list('-created_date', 200),
        LockInOverrides.list('-created_date', 100),
        Product.list(),
        User.list()
      ]);
      setInvestments(investmentsData);
      setLockInOverrides(overridesData);
      setProducts(productsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading lock-in data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLockInAdjustment = async (adjustmentData) => {
    try {
      const user = await User.me();
      
      // Create lock-in override record
      await LockInOverrides.create({
        ...adjustmentData,
        approved_by: user.email
      });

      // Update the investment record
      await Investment.update(adjustmentData.investment_id, {
        lock_in_end_date: adjustmentData.new_end_date,
        lock_in_months: adjustmentData.adjusted_lock_months
      });

      // Log the action
      await AuditLog.create({
        user_email: user.email,
        action: 'update',
        entity_type: 'Investment',
        entity_id: adjustmentData.investment_id,
        changes: {
          old_lock_months: adjustmentData.original_lock_months,
          new_lock_months: adjustmentData.adjusted_lock_months,
          new_end_date: adjustmentData.new_end_date,
          penalty_type: adjustmentData.penalty_type,
          reason: adjustmentData.reason
        }
      });

      setShowAdjustmentForm(false);
      setSelectedInvestment(null);
      loadData();
      alert('Lock-in period adjusted successfully');
    } catch (error) {
      console.error("Error saving lock-in adjustment:", error);
      alert("Error saving lock-in adjustment");
    }
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  const getUserName = (email) => {
    return users.find(u => u.email === email)?.full_name || email;
  };

  const isLocked = (investment) => {
    if (!investment.lock_in_end_date) return false;
    return !isAfter(new Date(), new Date(investment.lock_in_end_date));
  };

  const getDaysRemaining = (investment) => {
    if (!investment.lock_in_end_date) return null;
    const endDate = new Date(investment.lock_in_end_date);
    const today = new Date();
    return isAfter(endDate, today) ? differenceInDays(endDate, today) : 0;
  };

  const filteredInvestments = investments.filter(investment => {
    if (filterStatus === 'locked') return isLocked(investment);
    if (filterStatus === 'unlocked') return !isLocked(investment);
    if (filterStatus === 'expiring') {
      const days = getDaysRemaining(investment);
      return days !== null && days <= 30 && days > 0;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading lock-in management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Lock-in Management</h1>
            <p className="text-gray-400">Manage investor lock-in periods and early redemption penalties</p>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="text-gray-300">Filter by Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investments</SelectItem>
                  <SelectItem value="locked">Currently Locked</SelectItem>
                  <SelectItem value="unlocked">Unlocked</SelectItem>
                  <SelectItem value="expiring">Expiring Soon (30d)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Investments Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Investment Lock-in Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Investor</TableHead>
                    <TableHead className="text-gray-400">Product</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Lock Period</TableHead>
                    <TableHead className="text-gray-400">End Date</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Days Left</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestments.map((investment) => {
                    const locked = isLocked(investment);
                    const daysLeft = getDaysRemaining(investment);
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
                    
                    return (
                      <TableRow key={investment.id} className="border-gray-800">
                        <TableCell className="text-white font-medium">
                          {getUserName(investment.investor_email)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {getProductName(investment.product_id)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          ${investment.invested_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {investment.lock_in_months} months
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {format(new Date(investment.lock_in_end_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {locked ? (
                              <Badge className="bg-red-900 text-red-400 border-red-700">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge className="bg-green-900 text-green-400 border-green-700">
                                <Unlock className="w-3 h-3 mr-1" />
                                Unlocked
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {daysLeft !== null ? (
                            <div className={`font-medium ${
                              isExpiringSoon ? 'text-yellow-400' : 
                              daysLeft === 0 ? 'text-green-400' : 'text-gray-300'
                            }`}>
                              {isExpiringSoon && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                              {daysLeft} days
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedInvestment(investment)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Adjust
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white">Adjust Lock-in Period</DialogTitle>
                              </DialogHeader>
                              <LockInAdjustmentForm 
                                investment={selectedInvestment}
                                products={products}
                                onSave={handleSaveLockInAdjustment}
                                onCancel={() => {
                                  setShowAdjustmentForm(false);
                                  setSelectedInvestment(null);
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Lock-in Adjustments */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Lock-in Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Investor</TableHead>
                    <TableHead className="text-gray-400">Change</TableHead>
                    <TableHead className="text-gray-400">Penalties</TableHead>
                    <TableHead className="text-gray-400">Approved By</TableHead>
                    <TableHead className="text-gray-400">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockInOverrides.slice(0, 10).map((override) => (
                    <TableRow key={override.id} className="border-gray-800">
                      <TableCell className="text-gray-300">
                        {format(new Date(override.created_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {getUserName(override.investor_email)}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {override.original_lock_months}m → {override.adjusted_lock_months}m
                      </TableCell>
                      <TableCell>
                        {override.penalty_type === 'none' ? (
                          <Badge variant="secondary">No Penalty</Badge>
                        ) : (
                          <Badge className="bg-orange-900 text-orange-400">
                            {override.penalty_type === 'fixed' && `$${override.penalty_amount}`}
                            {override.penalty_type === 'percentage' && `${override.penalty_percent}%`}
                            {override.penalty_type === 'both' && `$${override.penalty_amount} + ${override.penalty_percent}%`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {getUserName(override.approved_by)}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-xs truncate">
                        {override.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}