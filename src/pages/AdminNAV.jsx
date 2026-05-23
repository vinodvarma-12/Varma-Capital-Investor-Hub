import React, { useState, useEffect } from "react";
import { NAV } from "@/entities/NAV";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Product } from "@/entities/Product";
import { Investment } from "@/entities/Investment";
import { supabase } from "@/lib/supabase/client";
import { User } from "@/entities/User";
import { AuditLog } from "@/entities/AuditLog";
import { ExtractDataFromUploadedFile, UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Upload,
  Plus,
  Edit,
  TrendingUp,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const inputCls = "bg-muted border-[#ccab6c]/20 text-foreground placeholder:text-muted-foreground";

const NAVForm = ({ products, navRecords, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    product_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    nav_per_unit: "",
    admin_notes: "",
  });

  // Latest NAV for selected product
  const prevNav = formData.product_id
    ? navRecords
        .filter((n) => n.product_id === formData.product_id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  // Auto-calculate return % from previous NAV
  const calcReturn = (navVal, prev) => {
    if (!prev || !navVal || parseFloat(navVal) <= 0) return null;
    return parseFloat(
      (((parseFloat(navVal) - prev.nav_per_unit) / prev.nav_per_unit) * 100).toFixed(4)
    );
  };

  const isInception = !prevNav;
  const autoReturn = calcReturn(formData.nav_per_unit, prevNav);
  const hasReturn = autoReturn !== null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      nav_per_unit: parseFloat(formData.nav_per_unit),
      return_percent: autoReturn ?? 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Fund + Date ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-foreground/80">Fund <span className="text-red-400">*</span></Label>
          <Select value={formData.product_id} onValueChange={(val) => setFormData((f) => ({ ...f, product_id: val }))}>
            <SelectTrigger className={inputCls}>
              <SelectValue placeholder="Select fund…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/80">Date <span className="text-red-400">*</span></Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
            className={inputCls}
            required
          />
        </div>
      </div>

      {/* ── Previous NAV context ── */}
      {formData.product_id && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
          isInception
            ? "border-[#ccab6c]/30 bg-[#ccab6c]/5 text-gold/80"
            : "border-[#ccab6c]/20 bg-muted text-foreground/80"
        }`}>
          {isInception ? (
            <span>📌 No previous NAV — this will be the <strong className="text-gold">inception record</strong>. Use $100.00.</span>
          ) : (
            <span>
              📊 Previous NAV: <strong className="text-foreground">${prevNav.nav_per_unit.toFixed(2)}</strong>
              <span className="text-muted-foreground ml-2 text-xs">({format(new Date(prevNav.date), "dd MMM yyyy")})</span>
            </span>
          )}
        </div>
      )}

      {/* ── NAV per Unit ── */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">NAV per Unit ($) <span className="text-red-400">*</span></Label>
        <Input
          type="number"
          step="0.0001"
          min="0"
          placeholder="e.g. 105.00"
          value={formData.nav_per_unit}
          onChange={(e) => setFormData((f) => ({ ...f, nav_per_unit: e.target.value }))}
          className={inputCls}
          required
        />
        {/* Auto-calculated return shown inline below the field */}
        {hasReturn && (
          <p className={`text-sm font-medium mt-1 ${autoReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
            {autoReturn >= 0 ? "▲" : "▼"} Monthly return: {autoReturn >= 0 ? "+" : ""}{autoReturn.toFixed(2)}%
            <span className="text-muted-foreground font-normal ml-2 text-xs">auto-calculated from previous NAV</span>
          </p>
        )}
        {isInception && formData.nav_per_unit && (
          <p className="text-xs text-muted-foreground mt-1">Inception record — return will be 0%</p>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">
          Notes
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">optional</span>
        </Label>
        <Textarea
          value={formData.admin_notes}
          onChange={(e) => setFormData((f) => ({ ...f, admin_notes: e.target.value }))}
          placeholder='e.g. "Strong crypto performance this month"'
          rows={2}
          className={inputCls}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" className="border-border text-foreground/80" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!formData.product_id || !formData.nav_per_unit}
          className="bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold"
        >
          Save NAV Record
        </Button>
      </div>
    </form>
  );
};

// ── Per-Investor Override Form ─────────────────────────────────────────────
const OverrideForm = ({ products, investors, investments, navRecords, existing, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    investor_email: existing?.investor_email ?? "",
    product_id: existing?.product_id ?? "",
    effective_date: existing?.effective_date ?? "",
    nav_per_unit: existing?.nav_per_unit ?? "",
    admin_notes: existing?.admin_notes ?? "",
  });

  // Only active + public products
  const publicProducts = products.filter(p => p.status === 'active' && p.is_public);

  // Investors who have an active investment in the selected fund
  const eligibleInvestors = formData.product_id
    ? investors.filter(u =>
        u.role === 'investor' &&
        investments.some(inv => inv.product_id === formData.product_id && inv.investor_email === u.email && inv.status === 'active')
      )
    : investors.filter(u => u.role === 'investor');

  // Get the investor's purchase_date for the selected fund
  const getInvestorPurchaseDate = (email, productId) => {
    const inv = investments.find(i => i.investor_email === email && i.product_id === productId && i.status === 'active');
    return inv?.purchase_date ?? null;
  };

  // Auto-calculate prorated return based on purchase_date and official NAV for that month
  const calcProratedReturn = (purchaseDate, productId) => {
    if (!purchaseDate || !productId) return null;
    const purchase = new Date(purchaseDate);
    const year = purchase.getFullYear();
    const month = purchase.getMonth();

    // Find official NAV record for this product in the same month
    const navRecord = navRecords.find(n => {
      const d = new Date(n.date);
      return n.product_id === productId && d.getFullYear() === year && d.getMonth() === month;
    });
    if (!navRecord || navRecord.return_percent == null) return null;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayJoined = purchase.getDate();
    const daysIn = daysInMonth - dayJoined + 1;
    const prorated = parseFloat(((navRecord.return_percent * daysIn) / daysInMonth).toFixed(4));

    return { prorated, fullReturn: navRecord.return_percent, daysIn, daysInMonth, dayJoined };
  };

  const proratedInfo = calcProratedReturn(formData.effective_date, formData.product_id);

  // When fund changes, reset investor + date
  const handleProductChange = (productId) => {
    setFormData(f => ({ ...f, product_id: productId, investor_email: "", effective_date: "" }));
  };

  // When investor changes, auto-fill their purchase_date
  const handleInvestorChange = (email) => {
    const purchaseDate = getInvestorPurchaseDate(email, formData.product_id);
    setFormData(f => ({ ...f, investor_email: email, effective_date: purchaseDate ?? "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      nav_per_unit: formData.nav_per_unit !== "" ? parseFloat(formData.nav_per_unit) : null,
      return_percent: proratedInfo ? proratedInfo.prorated : 0,
      override_calculated: true,
      period: formData.effective_date ? formData.effective_date.slice(0, 7) : "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg border border-[#b38922]/30 bg-[#b38922]/5 px-4 py-3 text-sm text-gold/80">
        ⚠️ <strong>Exceptional use only.</strong> Mid-month join proration is now <em>automatic</em> — you don't need an override for that. Use this only when a specific investor needs a <em>different</em> return than the standard NAV (e.g. a special fee arrangement or correcting a data error).
      </div>

      {/* Fund */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">Fund <span className="text-red-400">*</span></Label>
        <Select value={formData.product_id} onValueChange={handleProductChange}>
          <SelectTrigger className={inputCls}><SelectValue placeholder="Select fund…" /></SelectTrigger>
          <SelectContent>
            {publicProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Investor */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">Investor <span className="text-red-400">*</span></Label>
        <Select
          value={formData.investor_email}
          onValueChange={handleInvestorChange}
          disabled={!formData.product_id}
        >
          <SelectTrigger className={inputCls}>
            <SelectValue placeholder={formData.product_id ? "Select investor…" : "Select a fund first…"} />
          </SelectTrigger>
          <SelectContent>
            {eligibleInvestors.map(u => (
              <SelectItem key={u.email} value={u.email}>
                {u.full_name ? `${u.full_name} (${u.email})` : u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date — auto-filled from purchase_date, editable */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">
          Join Date <span className="text-red-400">*</span>
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">auto-filled from investor's purchase date</span>
        </Label>
        <Input
          type="date"
          value={formData.effective_date}
          onChange={(e) => setFormData(f => ({ ...f, effective_date: e.target.value }))}
          className={inputCls}
          required
        />
      </div>

      {/* Auto-calculated prorated return */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">Return (Prorated)</Label>
        {proratedInfo ? (
          <div className="rounded-lg border border-green-700/40 bg-green-900/10 px-4 py-3 space-y-1">
            <p className={`text-lg font-bold ${proratedInfo.prorated >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {proratedInfo.prorated >= 0 ? '+' : ''}{proratedInfo.prorated.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Full month return: {proratedInfo.fullReturn >= 0 ? '+' : ''}{proratedInfo.fullReturn.toFixed(2)}%
              &nbsp;×&nbsp;
              ({proratedInfo.daysIn} days in / {proratedInfo.daysInMonth} days in month)
              &nbsp;= {proratedInfo.prorated.toFixed(4)}%
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[#ccab6c]/20 bg-muted px-4 py-3 text-sm text-muted-foreground">
            {!formData.product_id || !formData.investor_email
              ? 'Select a fund and investor to calculate'
              : !formData.effective_date
              ? 'Select a join date to calculate'
              : 'No official NAV record found for this month — add a NAV record first'}
          </div>
        )}
      </div>

      {/* NAV per unit — optional */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">
          NAV per Unit
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">optional</span>
        </Label>
        <Input
          type="number"
          step="0.0001"
          min="0"
          placeholder="e.g. 103.50"
          value={formData.nav_per_unit}
          onChange={(e) => setFormData(f => ({ ...f, nav_per_unit: e.target.value }))}
          className={inputCls}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80">
          Notes
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">optional</span>
        </Label>
        <Textarea
          value={formData.admin_notes}
          onChange={(e) => setFormData(f => ({ ...f, admin_notes: e.target.value }))}
          placeholder='e.g. "Prorated first month — joined on 15th"'
          rows={2}
          className={inputCls}
        />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="outline" className="border-border text-foreground/80" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!formData.product_id || !formData.investor_email || !formData.effective_date || !proratedInfo}
          className="bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold"
        >
          Save Override
        </Button>
      </div>
    </form>
  );
};

const CSVUploadForm = ({ products, onUpload, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [productId, setProductId] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile || !productId) return;

    setUploading(true);
    try {
      // Upload file first
      const { file_url } = await UploadFile({ file: selectedFile });

      // Extract data from CSV
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  nav_per_unit: { type: "number" },
                  return_percent: { type: "number" },
                  investor_email: { type: "string" },
                },
              },
            },
          },
        },
      });

      if (result.status === "success") {
        onUpload(result.output.records, productId);
      } else {
        alert("Error processing CSV: " + result.details);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Product</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>CSV File</Label>
        <Input
          type="file"
          accept=".csv"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <p className="text-xs text-gold/90 mt-1">
          Expected columns: date, nav_per_unit, return_percent, investor_email
          (optional)
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !productId || uploading}
          className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
        >
          {uploading ? "Processing..." : "Upload & Process"}
        </Button>
      </div>
    </div>
  );
};

export default function AdminNAV() {
  const [navRecords, setNavRecords] = useState([]);
  const [fabricatedReturns, setFabricatedReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNAVForm, setShowNAVForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [editingNAV, setEditingNAV] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [navData, fabricatedData, productsData, investmentsData, usersData] = await Promise.all([
        NAV.list("-date", 100),
        FabricatedReturns.list("-created_date", 100),
        Product.list(),
        Investment.list(),
        User.list(),
      ]);
      setNavRecords(navData);
      setFabricatedReturns(fabricatedData);
      setProducts(productsData);
      setInvestments(investmentsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading NAV data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Total invested capital for a product (active investments only)
  const getProductAUM = (productId) =>
    investments
      .filter((inv) => inv.product_id === productId && inv.status === "active")
      .reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);

  // Compute monthly return live from NAV history — avoids relying on stored value
  const getNavReturn = (nav) => {
    const prev = navRecords
      .filter(
        (n) =>
          n.product_id === nav.product_id &&
          new Date(n.date) < new Date(nav.date)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!prev) return null; // inception record — no prior NAV
    return ((nav.nav_per_unit - prev.nav_per_unit) / prev.nav_per_unit) * 100;
  };

  const handleSaveNAV = async (formData) => {
    try {
      const user = await User.me();

      // Upsert the official NAV record (primary source of truth)
      const existingNAV = navRecords.find(
        (n) => n.product_id === formData.product_id && n.date === formData.date,
      );

      if (existingNAV) {
        await NAV.update(existingNAV.id, {
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent || 0,
          admin_notes: formData.admin_notes || null,
          is_official: true,
        });
      } else {
        await NAV.create({
          product_id: formData.product_id,
          date: formData.date,
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent || 0,
          admin_notes: formData.admin_notes || null,
          is_official: true,
        });
      }

      // Log the action
      await AuditLog.create({
        user_email: user.email,
        action: existingNAV ? "update" : "create",
        entity_type: "NAV",
        entity_id: formData.product_id,
        changes: {
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent,
          date: formData.date,
        },
      });

      setShowNAVForm(false);
      loadData();
    } catch (error) {
      console.error("Error saving NAV:", error);
      alert("Error saving NAV data");
    }
  };

  const handleSaveOverride = async (formData) => {
    try {
      const user = await User.me();
      if (editingOverride) {
        await FabricatedReturns.update(editingOverride.id, {
          investor_email: formData.investor_email,
          product_id: formData.product_id,
          effective_date: formData.effective_date,
          period: formData.period,
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent,
          override_calculated: true,
          admin_notes: formData.admin_notes,
        });
      } else {
        await FabricatedReturns.create({
          investor_email: formData.investor_email,
          product_id: formData.product_id,
          effective_date: formData.effective_date,
          period: formData.period,
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent,
          override_calculated: true,
          admin_notes: formData.admin_notes,
        });
      }
      await AuditLog.create({
        user_email: user.email,
        action: editingOverride ? "update" : "create",
        entity_type: "FabricatedReturn",
        entity_id: formData.investor_email,
        changes: formData,
      });
      setShowOverrideForm(false);
      setEditingOverride(null);
      loadData();
    } catch (error) {
      console.error("Error saving override:", error);
      alert("Error saving override: " + error.message);
    }
  };

  const handleCSVUpload = async (records, productId) => {
    try {
      const user = await User.me();

      for (const record of records) {
        await FabricatedReturns.create({
          investor_email: record.investor_email || null,
          product_id: productId,
          period: format(new Date(record.date), "yyyy-MM"),
          return_percent: record.return_percent || 0,
          nav_per_unit: record.nav_per_unit,
          override_calculated: true,
          admin_notes: "Uploaded via CSV",
          effective_date: record.date,
        });

        // Also create NAV record
        await NAV.create({
          product_id: productId,
          date: record.date,
          nav_per_unit: record.nav_per_unit,
          is_official: true,
        });
      }

      await AuditLog.create({
        user_email: user.email,
        action: "create",
        entity_type: "NAV",
        entity_id: productId,
        changes: { bulk_upload: true, records_count: records.length },
      });

      setShowCSVUpload(false);
      loadData();
      alert(`Successfully uploaded ${records.length} NAV records`);
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      alert("Error processing CSV upload");
    }
  };

  const getProductName = (productId) => {
    return products.find((p) => p.id === productId)?.name || "Unknown Product";
  };

  if (loading) {
    return <LoadingSpinner message="Loading NAV management..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              NAV Management
            </h1>
            <p className="text-gold/90">
              Record monthly NAV per unit for each fund — portfolio values update automatically
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#b38922] text-gold-bright"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-[#ccab6c]/30">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Upload NAV Data via CSV
                  </DialogTitle>
                </DialogHeader>
                <CSVUploadForm
                  products={products}
                  onUpload={handleCSVUpload}
                  onCancel={() => setShowCSVUpload(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showNAVForm} onOpenChange={(open) => { setShowNAVForm(open); if (!open) setEditingNAV(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add NAV Record
                </Button>
              </DialogTrigger>
              <DialogContent style={{ width: '60vw', maxWidth: '60vw' }} className="bg-card border border-[#ccab6c]/30 text-foreground">
                <DialogHeader className="border-b border-[#ccab6c]/20 pb-4 mb-1">
                  <DialogTitle className="text-foreground text-lg">
                    Add NAV Record
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the end-of-month NAV for a fund. Return % is calculated automatically.
                  </p>
                </DialogHeader>
                <NAVForm
                  products={products}
                  navRecords={navRecords}
                  onSave={handleSaveNAV}
                  onCancel={() => {
                    setShowNAVForm(false);
                    setEditingNAV(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="official" className="space-y-6">
          <TabsList className="bg-muted border border-[#ccab6c]/20">
            <TabsTrigger
              value="official"
              className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black"
            >
              Official NAVs
            </TabsTrigger>
            <TabsTrigger
              value="fabricated"
              className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black"
            >
              Per-Investor Overrides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fabricated">
            <Card className="bg-card border border-[#ccab6c]/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-gold-bright" />
                      Per-Investor Return Overrides
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Mid-month join proration is automatic. Use overrides only for special cases — e.g. a custom fee arrangement or data correction.
                    </p>
                  </div>
                  <Button
                    className="bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold shrink-0"
                    onClick={() => { setEditingOverride(null); setShowOverrideForm(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ccab6c]/25">
                        <TableHead className="text-gold/90">
                          Date
                        </TableHead>
                        <TableHead className="text-gold/90">
                          Product
                        </TableHead>
                        <TableHead className="text-gold/90">
                          Investor
                        </TableHead>
                        <TableHead className="text-gold/90">
                          NAV/Unit
                        </TableHead>
                        <TableHead className="text-gold/90">
                          Return %
                        </TableHead>
                        <TableHead className="text-gold/90">
                          Override
                        </TableHead>
                        <TableHead className="text-gold/90">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fabricatedReturns.map((record) => (
                        <TableRow
                          key={record.id}
                          className="border-[#ccab6c]/25"
                        >
                          <TableCell className="text-foreground/80">
                            {format(
                              new Date(record.effective_date),
                              "MMM dd, yyyy",
                            )}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            {getProductName(record.product_id)}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {record.investor_email || (
                              <Badge
                                variant="secondary"
                                className="bg-blue-900 text-blue-300"
                              >
                                All Investors
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            ${record.nav_per_unit?.toFixed(4)}
                          </TableCell>
                          <TableCell
                            className={`font-medium ${
                              record.return_percent >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {record.return_percent > 0 ? "+" : ""}
                            {record.return_percent?.toFixed(2)}%
                          </TableCell>
                          <TableCell>
                            {record.override_calculated ? (
                              <Badge className="bg-[#b38922]/25 text-gold-bright">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Override
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Calculated
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingOverride(record);
                                setShowOverrideForm(true);
                              }}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="official">
            <Card className="bg-card border border-[#ccab6c]/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-gold-bright" />
                      Official NAV Records
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Read-only. Monthly return and Total AUM are auto-calculated.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#ccab6c]/25">
                        <TableHead className="text-gold/90">Date</TableHead>
                        <TableHead className="text-gold/90">Fund</TableHead>
                        <TableHead className="text-gold/90">NAV per Unit</TableHead>
                        <TableHead className="text-gold/90">Monthly Return</TableHead>
                        <TableHead className="text-gold/90">Total AUM</TableHead>
                        <TableHead className="text-gold/90">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {navRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No NAV records yet. Use "Add NAV Record" to get started.
                          </TableCell>
                        </TableRow>
                      )}
                      {navRecords.map((nav) => {
                        const ret = getNavReturn(nav);
                        const aum = getProductAUM(nav.product_id);
                        return (
                          <TableRow key={nav.id} className="border-[#ccab6c]/25">
                            <TableCell className="text-foreground/80 whitespace-nowrap">
                              {format(new Date(nav.date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-foreground font-medium">
                              {getProductName(nav.product_id)}
                            </TableCell>
                            <TableCell className="text-foreground font-semibold">
                              ${nav.nav_per_unit?.toFixed(4)}
                            </TableCell>
                            <TableCell className={
                              ret == null
                                ? "text-muted-foreground text-sm"
                                : ret >= 0
                                ? "text-green-400 font-medium"
                                : "text-red-400 font-medium"
                            }>
                              {ret == null
                                ? <span className="italic text-xs">Inception</span>
                                : `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {aum > 0 ? `$${aum.toLocaleString()}` : <span className="text-muted-foreground text-xs italic">No investments</span>}
                            </TableCell>
                            <TableCell className="text-foreground/60 text-sm max-w-[200px] truncate">
                              {nav.admin_notes || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Per-Investor Override Dialog */}
      <Dialog open={showOverrideForm} onOpenChange={(open) => { setShowOverrideForm(open); if (!open) setEditingOverride(null); }}>
        <DialogContent style={{ width: '60vw', maxWidth: '60vw' }} className="bg-card border border-[#ccab6c]/30 text-foreground">
          <DialogHeader className="border-b border-[#ccab6c]/20 pb-4 mb-1">
            <DialogTitle className="text-foreground text-lg">
              {editingOverride ? "Edit Return Override" : "Add Return Override"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Set a custom return for one specific investor for a given period.
            </p>
          </DialogHeader>
          <OverrideForm
            products={products}
            investors={users}
            investments={investments}
            navRecords={navRecords}
            existing={editingOverride}
            onSave={handleSaveOverride}
            onCancel={() => { setShowOverrideForm(false); setEditingOverride(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
