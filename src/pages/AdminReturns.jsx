import React, { useState, useEffect } from "react";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Product } from "@/entities/Product";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, TrendingUp, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ReturnForm = ({ returnData, products, investors, onSave, onCancel }) => {
  const [formData, setFormData] = useState(returnData || {
    product_id: '',
    investor_email: '',
    period: format(new Date(), 'yyyy-MM'),
    return_percent: 0,
    nav_per_unit: 0,
    override_calculated: true,
    admin_notes: '',
    effective_date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Product</Label>
          <Select value={formData.product_id} onValueChange={(val) => setFormData({...formData, product_id: val})} required>
            <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-[#ccab6c]/20">
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Period (YYYY-MM or YYYY)</Label>
          <Input 
            value={formData.period} 
            onChange={(e) => setFormData({...formData, period: e.target.value})} 
            placeholder="e.g., 2024-01 or 2024"
            className="bg-zinc-900 border-[#ccab6c]/20"
            required
          />
        </div>
      </div>

      <div>
        <Label>Investor (leave blank for all investors in this product)</Label>
        <Select value={formData.investor_email || "all"} onValueChange={(val) => setFormData({...formData, investor_email: val === "all" ? "" : val})}>
          <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
            <SelectValue placeholder="All investors" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-[#ccab6c]/20">
            <SelectItem value="all">All Investors (Product-wide)</SelectItem>
            {investors.map(inv => (
              <SelectItem key={inv.email} value={inv.email}>
                {inv.full_name} ({inv.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Return Percentage (%)</Label>
          <Input 
            type="number" 
            step="0.01"
            value={formData.return_percent} 
            onChange={(e) => setFormData({...formData, return_percent: parseFloat(e.target.value) || 0})} 
            className="bg-zinc-900 border-[#ccab6c]/20"
            required
          />
          <p className="text-xs text-[#ccab6c]/90 mt-1">This will be shown as the investor's P&L</p>
        </div>
        <div>
          <Label>NAV per Unit (optional)</Label>
          <Input 
            type="number" 
            step="0.0001"
            value={formData.nav_per_unit} 
            onChange={(e) => setFormData({...formData, nav_per_unit: parseFloat(e.target.value) || 0})} 
            className="bg-zinc-900 border-[#ccab6c]/20"
          />
        </div>
      </div>

      <div>
        <Label>Effective Date</Label>
        <Input 
          type="date" 
          value={formData.effective_date} 
          onChange={(e) => setFormData({...formData, effective_date: e.target.value})} 
          className="bg-zinc-900 border-[#ccab6c]/20"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="override"
          checked={formData.override_calculated}
          onCheckedChange={(val) => setFormData({...formData, override_calculated: val})}
        />
        <Label htmlFor="override">Override calculated returns (must be ON for returns to display)</Label>
      </div>

      <div>
        <Label>Admin Notes</Label>
        <Textarea 
          value={formData.admin_notes} 
          onChange={(e) => setFormData({...formData, admin_notes: e.target.value})} 
          placeholder="Reason for this return override..."
          className="bg-zinc-900 border-[#ccab6c]/20"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-600">Cancel</Button>
        <Button type="submit" className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
          {returnData?.id ? 'Update Return' : 'Set Return'}
        </Button>
      </div>
    </form>
  );
};

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [filterProduct, setFilterProduct] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [returnsData, productsData, usersData, investmentsData] = await Promise.all([
        FabricatedReturns.list('-effective_date', 200),
        Product.list(),
        User.list(),
        Investment.list()
      ]);
      setReturns(returnsData);
      setProducts(productsData);
      
      // Get unique investor emails from investments
      const investorEmails = [...new Set(investmentsData.map(i => i.investor_email))];
      const investorUsers = usersData.filter(u => investorEmails.includes(u.email));
      setInvestors(investorUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingReturn?.id) {
        await FabricatedReturns.update(editingReturn.id, formData);
      } else {
        await FabricatedReturns.create(formData);
      }
      setIsFormOpen(false);
      setEditingReturn(null);
      loadData();
    } catch (error) {
      console.error("Error saving return:", error);
      alert("Error saving return override");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this return override?")) {
      try {
        await FabricatedReturns.delete(id);
        loadData();
      } catch (error) {
        console.error("Error deleting return:", error);
      }
    }
  };

  const openEdit = (returnData) => {
    setEditingReturn(returnData);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setEditingReturn(null);
    setIsFormOpen(true);
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  const filteredReturns = filterProduct === "all" 
    ? returns 
    : returns.filter(r => r.product_id === filterProduct);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading return overrides...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Return Overrides</h1>
            <p className="text-[#ccab6c]/90">Manually set monthly/annual performance % per investor or product</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                <Plus className="w-4 h-4 mr-2" />
                Set Return Override
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingReturn ? 'Edit Return Override' : 'Set Return Override'}
                </DialogTitle>
              </DialogHeader>
              <ReturnForm 
                returnData={editingReturn}
                products={products}
                investors={investors}
                onSave={handleSave}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingReturn(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="text-[#ccab6c]/90">Filter by Product:</Label>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="w-64 bg-zinc-900 border-[#ccab6c]/20">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-[#ccab6c]/20">
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#fedea0]" />
              Return Overrides ({filteredReturns.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReturns.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#ccab6c]/25">
                      <TableHead className="text-[#ccab6c]/90">Product</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Investor</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Period</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Return %</TableHead>
                      <TableHead className="text-[#ccab6c]/90">NAV/Unit</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Status</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Effective Date</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.map((ret) => (
                      <TableRow key={ret.id} className="border-[#ccab6c]/25">
                        <TableCell className="text-white font-medium">
                          {getProductName(ret.product_id)}
                        </TableCell>
                        <TableCell>
                          {ret.investor_email ? (
                            <span className="text-zinc-300">{ret.investor_email}</span>
                          ) : (
                            <Badge className="bg-blue-900 text-blue-400">
                              <Users className="w-3 h-3 mr-1" />
                              All Investors
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-300">{ret.period}</TableCell>
                        <TableCell className={`font-bold ${ret.return_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {ret.return_percent >= 0 ? '+' : ''}{ret.return_percent?.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {ret.nav_per_unit ? `$${ret.nav_per_unit.toFixed(4)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {ret.override_calculated ? (
                            <Badge className="bg-[#b38922]/25 text-[#fedea0]">Active Override</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {format(new Date(ret.effective_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(ret)} className="text-[#fedea0]">
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(ret.id)} className="text-red-400">
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-[#ccab6c]/90 text-lg">No return overrides set</p>
                <p className="text-zinc-500 text-sm mt-2">Set return overrides to control what investors see as their P&L</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white text-lg">How Return Overrides Work</CardTitle>
          </CardHeader>
          <CardContent className="text-[#ccab6c]/90 space-y-2">
            <p>• <strong className="text-white">Product-wide returns:</strong> Leave investor field blank to apply a return % to all investors in a product.</p>
            <p>• <strong className="text-white">Investor-specific returns:</strong> Select a specific investor to override their individual return.</p>
            <p>• <strong className="text-white">Priority:</strong> Investor-specific overrides take precedence over product-wide returns.</p>
            <p>• <strong className="text-white">Override switch:</strong> Must be ON for the return to be displayed to investors.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}