import React, { useState, useEffect } from 'react';
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { NAV } from "@/entities/NAV";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { LockInOverrides } from "@/entities/LockInOverrides";
import { Document } from "@/entities/Document";
import { AuditLog } from "@/entities/AuditLog";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileText } from "lucide-react";
import { format, addMonths } from "date-fns";

// Edit Investment Amount Modal
export const EditAmountModal = ({ open, onOpenChange, investment, onSave }) => {
  const [amount, setAmount] = useState(investment?.invested_amount || 0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) setAmount(investment.invested_amount || 0);
  }, [investment]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = await User.me();
      const oldAmount = investment.invested_amount;
      
      await Investment.update(investment.id, { invested_amount: parseFloat(amount) });
      
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'update',
        entity_type: 'Investment',
        entity_id: investment.id,
        changes: { field: 'invested_amount', old_value: oldAmount, new_value: parseFloat(amount), reason }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Edit Investment Amount</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Amount: ${investment?.invested_amount?.toLocaleString()}</Label>
          </div>
          <div>
            <Label>New Amount ($)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="bg-gray-800 border-gray-700" />
          </div>
          <div>
            <Label>Reason for Change</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-gray-800 border-gray-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit Units Modal
export const EditUnitsModal = ({ open, onOpenChange, investment, onSave }) => {
  const [units, setUnits] = useState(investment?.current_units || 0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) setUnits(investment.current_units || 0);
  }, [investment]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = await User.me();
      const oldUnits = investment.current_units;
      
      await Investment.update(investment.id, { current_units: parseFloat(units) });
      
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'update',
        entity_type: 'Investment',
        entity_id: investment.id,
        changes: { field: 'current_units', old_value: oldUnits, new_value: parseFloat(units), reason }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Edit Units</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Units: {investment?.current_units?.toLocaleString()}</Label>
          </div>
          <div>
            <Label>New Units</Label>
            <Input type="number" step="0.0001" value={units} onChange={e => setUnits(e.target.value)} className="bg-gray-800 border-gray-700" />
          </div>
          <div>
            <Label>Reason for Change</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-gray-800 border-gray-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit Lock-in Period Modal
export const EditLockInModal = ({ open, onOpenChange, investment, onSave }) => {
  const [lockInMonths, setLockInMonths] = useState(investment?.lock_in_months || 12);
  const [endDate, setEndDate] = useState(investment?.lock_in_end_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [penaltyType, setPenaltyType] = useState('none');
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [penaltyPercent, setPenaltyPercent] = useState(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) {
      setLockInMonths(investment.lock_in_months || 12);
      setEndDate(investment.lock_in_end_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'));
    }
  }, [investment]);

  const lockInPresets = [12, 18, 24, 36, 48, 60, 72, 84, 96];

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = await User.me();
      
      await LockInOverrides.create({
        investment_id: investment.id,
        investor_email: investment.investor_email,
        original_lock_months: investment.lock_in_months,
        adjusted_lock_months: parseInt(lockInMonths),
        new_end_date: endDate,
        penalty_type: penaltyType,
        penalty_amount: parseFloat(penaltyAmount),
        penalty_percent: parseFloat(penaltyPercent),
        reason,
        approved_by: currentUser.email
      });

      await Investment.update(investment.id, {
        lock_in_months: parseInt(lockInMonths),
        lock_in_end_date: endDate
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'update',
        entity_type: 'LockIn',
        entity_id: investment.id,
        changes: { 
          old_months: investment.lock_in_months, 
          new_months: lockInMonths,
          old_end_date: investment.lock_in_end_date,
          new_end_date: endDate,
          penalty_type: penaltyType,
          reason 
        }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Edit Lock-in Period</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lock-in Period (Months)</Label>
              <Select value={lockInMonths.toString()} onValueChange={val => setLockInMonths(parseInt(val))}>
                <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lockInPresets.map(m => <SelectItem key={m} value={m.toString()}>{m} months</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
          </div>
          <div>
            <Label>Early Redemption Penalty</Label>
            <Select value={penaltyType} onValueChange={setPenaltyType}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
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
              <Label>Fixed Penalty ($)</Label>
              <Input type="number" value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
          )}
          {(penaltyType === 'percentage' || penaltyType === 'both') && (
            <div>
              <Label>Penalty (%)</Label>
              <Input type="number" step="0.1" value={penaltyPercent} onChange={e => setPenaltyPercent(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
          )}
          <div>
            <Label>Reason for Change</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-gray-800 border-gray-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit NAV Modal (Monthly)
export const EditNAVModal = ({ open, onOpenChange, investment, products, onSave }) => {
  const [navPerUnit, setNavPerUnit] = useState(1);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [totalAUM, setTotalAUM] = useState(0);
  const [isOfficial, setIsOfficial] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = await User.me();
      
      await NAV.create({
        product_id: investment.product_id,
        date: `${period}-01`,
        nav_per_unit: parseFloat(navPerUnit),
        total_aum: parseFloat(totalAUM) || 0,
        is_official: isOfficial
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'create',
        entity_type: 'NAV',
        entity_id: investment.product_id,
        changes: { 
          product_id: investment.product_id,
          period,
          nav_per_unit: navPerUnit,
          investor_email: investment.investor_email,
          reason 
        }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
      setReason("");
      setNavPerUnit(1);
    }
  };

  const productName = products?.find(p => p.id === investment?.product_id)?.name || 'Unknown Product';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Edit NAV - {productName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period (Month)</Label>
              <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
            <div>
              <Label>NAV per Unit</Label>
              <Input type="number" step="0.0001" value={navPerUnit} onChange={e => setNavPerUnit(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
          </div>
          <div>
            <Label>Total AUM (Optional)</Label>
            <Input type="number" value={totalAUM} onChange={e => setTotalAUM(e.target.value)} className="bg-gray-800 border-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isOfficial} onCheckedChange={setIsOfficial} />
            <Label>Official NAV (vs Indicative)</Label>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-gray-800 border-gray-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving...' : 'Save NAV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit Return Override Modal
export const EditReturnModal = ({ open, onOpenChange, investment, investorEmail, onSave }) => {
  const [returnPercent, setReturnPercent] = useState(0);
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [periodType, setPeriodType] = useState('monthly');
  const [overrideCalculated, setOverrideCalculated] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = await User.me();
      const effectivePeriod = periodType === 'annual' ? period.split('-')[0] : period;
      
      await FabricatedReturns.create({
        investor_email: investorEmail,
        product_id: investment.product_id,
        period: effectivePeriod,
        return_percent: parseFloat(returnPercent),
        override_calculated: overrideCalculated,
        admin_notes: reason,
        effective_date: format(new Date(), 'yyyy-MM-dd')
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'create',
        entity_type: 'ReturnOverride',
        entity_id: investment.id,
        changes: { 
          investor_email: investorEmail,
          product_id: investment.product_id,
          period: effectivePeriod,
          return_percent: returnPercent,
          reason 
        }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
      setReason("");
      setReturnPercent(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Edit Return Override</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period</Label>
              <Input 
                type={periodType === 'monthly' ? 'month' : 'number'} 
                value={periodType === 'annual' ? period.split('-')[0] : period} 
                onChange={e => setPeriod(periodType === 'annual' ? e.target.value : e.target.value)}
                min={periodType === 'annual' ? 2020 : undefined}
                max={periodType === 'annual' ? 2030 : undefined}
                className="bg-gray-800 border-gray-700" 
              />
            </div>
          </div>
          <div>
            <Label>Return Percentage (%)</Label>
            <Input type="number" step="0.01" value={returnPercent} onChange={e => setReturnPercent(e.target.value)} className="bg-gray-800 border-gray-700" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={overrideCalculated} onCheckedChange={setOverrideCalculated} />
            <Label>Override Calculated P&L</Label>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Required" className="bg-gray-800 border-gray-700" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving...' : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Upload Statement PDF Modal
export const UploadStatementModal = ({ open, onOpenChange, investorEmail, onSave }) => {
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) return;
    setUploading(true);
    try {
      const currentUser = await User.me();
      const { file_url } = await UploadFile({ file });
      
      await Document.create({
        investor_email: investorEmail,
        title,
        type: 'statement',
        file_url,
        period,
        is_watermarked: false,
        download_count: 0
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'upload',
        entity_type: 'Document',
        changes: { investor_email: investorEmail, title, type: 'statement', period }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setUploading(false);
      setTitle("");
      setFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Upload Statement PDF</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Statement Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Q4 2024 Statement" className="bg-gray-800 border-gray-700" />
          </div>
          <div>
            <Label>Period</Label>
            <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="bg-gray-800 border-gray-700" />
          </div>
          <div>
            <Label>PDF File</Label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} className="hidden" id="statement-upload" />
              <label htmlFor="statement-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{file ? file.name : "Click to upload PDF"}</p>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !title} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {uploading ? 'Uploading...' : 'Upload Statement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add KYC Attachment Modal
export const AddKYCModal = ({ open, onOpenChange, investorEmail, onSave }) => {
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("identity");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) return;
    setUploading(true);
    try {
      const currentUser = await User.me();
      const { file_url } = await UploadFile({ file });
      
      await Document.create({
        investor_email: investorEmail,
        title,
        type: 'compliance',
        file_url,
        period: docType,
        is_watermarked: false,
        download_count: 0
      });

      await AuditLog.create({
        user_email: currentUser.email,
        action: 'upload',
        entity_type: 'KYC',
        changes: { investor_email: investorEmail, title, doc_type: docType }
      });
      
      onSave();
      onOpenChange(false);
    } finally {
      setUploading(false);
      setTitle("");
      setFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader><DialogTitle>Add KYC Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Document Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Passport Copy" className="bg-gray-800 border-gray-700" />
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="identity">Identity Document</SelectItem>
                <SelectItem value="address">Proof of Address</SelectItem>
                <SelectItem value="income">Proof of Income</SelectItem>
                <SelectItem value="accreditation">Accreditation Proof</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File</Label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} className="hidden" id="kyc-upload" />
              <label htmlFor="kyc-upload" className="cursor-pointer">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{file ? file.name : "Click to upload (PDF, JPG, PNG)"}</p>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !title} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {uploading ? 'Uploading...' : 'Upload KYC Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};