import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Product } from "@/entities/Product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { PlusCircle, Edit, Trash2, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ProductForm = ({ product, onSave }) => {
  const [formData, setFormData] = useState(product || {
    name: '',
    description: '',
    strategy: '',
    minimum_ticket: 0,
    lock_in_months: 0,
    management_fee_percent: 0,
    performance_fee_percent: 0,
    redemption_penalty_percent: 0,
    redemption_penalty_amount: 0,
    risk_band: 'medium',
    status: 'active',
    high_water_mark: false,
    hurdle_rate: 0,
    is_public: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name</Label><Input value={formData.name} onChange={e => handleChange('name', e.target.value)} required /></div>
        <div><Label>Status</Label>
          <Select value={formData.status} onValueChange={val => handleChange('status', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} /></div>
      <div><Label>Strategy</Label><Input value={formData.strategy || ''} onChange={e => handleChange('strategy', e.target.value)} placeholder="e.g. Multi-strategy — crypto, commodities, structured products" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Minimum Ticket ($)</Label><Input type="number" value={formData.minimum_ticket} onChange={e => handleChange('minimum_ticket', parseFloat(e.target.value))} required /></div>
        <div><Label>Lock-in (Months)</Label><Input type="number" value={formData.lock_in_months} onChange={e => handleChange('lock_in_months', parseInt(e.target.value))} required /></div>
        <div><Label>Management Fee (%)</Label><Input type="number" step="0.1" value={formData.management_fee_percent} onChange={e => handleChange('management_fee_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Performance Fee (%)</Label><Input type="number" step="0.1" value={formData.performance_fee_percent} onChange={e => handleChange('performance_fee_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Hurdle Rate (%)</Label><Input type="number" step="0.1" value={formData.hurdle_rate} onChange={e => handleChange('hurdle_rate', parseFloat(e.target.value))} /></div>
        <div><Label>Risk Band</Label>
          <Select value={formData.risk_band} onValueChange={val => handleChange('risk_band', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="medium_high">Medium-High</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Redemption Penalty (%)</Label><Input type="number" step="0.1" value={formData.redemption_penalty_percent} onChange={e => handleChange('redemption_penalty_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Redemption Penalty ($)</Label><Input type="number" value={formData.redemption_penalty_amount} onChange={e => handleChange('redemption_penalty_amount', parseFloat(e.target.value))} /></div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="hwm" checked={formData.high_water_mark} onCheckedChange={val => handleChange('high_water_mark', val)} />
        <Label htmlFor="hwm">High Water Mark</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="is_public" checked={formData.is_public} onCheckedChange={val => handleChange('is_public', val)} />
        <Label htmlFor="is_public">Public</Label>
      </div>
      <Button type="submit" className="w-full bg-[#fedea0] text-black hover:bg-[#ccab6c]">Save Product</Button>
    </form>
  );
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, userData] = await Promise.all([
        Product.list('-created_date'),
        User.me(),
      ]);
      setProducts(productsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id) {
        await Product.update(productData.id, productData);
      } else {
        await Product.create(productData);
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      loadData();
      toast.success(productData.id ? 'Product updated.' : 'Product created.');
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error('Failed to save product.');
    }
  };


  const openFormForEdit = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openFormForNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product? This will also delete all related investments, NAV records, and transactions.")) {
      try {
        await Product.delete(productId);
        loadData();
        toast.success('Product deleted.');
      } catch (error) {
        console.error("Error deleting product:", error);
        const msg = error?.message || error?.details || JSON.stringify(error);
        alert(`Failed to delete product:\n${msg}`);
        toast.error('Error deleting product.');
      }
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const visibleProducts = isSuperAdmin ? products : products.filter(p => p.is_public);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Product Management</h1>
            <p className="text-gold/90">Add, edit, and manage investment products</p>
          </div>
          {isSuperAdmin && (
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={openFormForNew} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                </DialogHeader>
                <ProductForm product={editingProduct} onSave={handleSaveProduct} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader><CardTitle className="text-foreground">All Products</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25">
                    <TableHead className="text-gold/90">Name</TableHead>
                    <TableHead className="text-gold/90">Risk Band</TableHead>
                    <TableHead className="text-gold/90">Min. Ticket</TableHead>
                    <TableHead className="text-gold/90">Lock-in</TableHead>
                    <TableHead className="text-gold/90">Mgt. Fee</TableHead>
                    <TableHead className="text-gold/90">Perf. Fee</TableHead>
                    <TableHead className="text-gold/90">Status</TableHead>
                    {isSuperAdmin && <TableHead className="text-gold/90">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProducts.map(product => (
                    <TableRow key={product.id} className="border-[#ccab6c]/25">
                      <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                      <TableCell className="capitalize text-foreground/80">{product.risk_band}</TableCell>
                      <TableCell className="text-foreground/80">${product.minimum_ticket?.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground/80">{product.lock_in_months} months</TableCell>
                      <TableCell className="text-foreground/80">{product.management_fee_percent}%</TableCell>
                      <TableCell className="text-foreground/80">{product.performance_fee_percent || 0}%</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}
                            className={
                              product.status === 'suspended' ? 'bg-orange-900/60 text-orange-300' :
                              product.status === 'closed' ? 'bg-red-900/60 text-red-300' : ''
                            }>
                            {product.status}
                          </Badge>
                          <span className={`inline-flex items-center gap-1 text-xs ${product.is_public ? 'text-green-400' : 'text-muted-foreground'}`}>
                            {product.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Private</>}
                          </span>
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openFormForEdit(product)}>
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
