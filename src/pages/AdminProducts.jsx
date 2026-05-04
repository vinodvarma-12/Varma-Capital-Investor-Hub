import React, { useState, useEffect } from "react";
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
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ProductForm = ({ product, onSave }) => {
  const [formData, setFormData] = useState(product || {
    name: '',
    description: '',
    minimum_ticket: 0,
    lock_in_months: 0,
    management_fee_percent: 0,
    performance_fee_percent: 0,
    redemption_penalty_percent: 0,
    redemption_penalty_amount: 0,
    risk_band: 'medium',
    status: 'active',
    high_water_mark: false,
    hurdle_rate: 0
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name</Label><Input value={formData.name} onChange={e => handleChange('name', e.target.value)} required /></div>
        <div><Label>Status</Label><Select value={formData.status} onValueChange={val => handleChange('status', val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Minimum Ticket ($)</Label><Input type="number" value={formData.minimum_ticket} onChange={e => handleChange('minimum_ticket', parseFloat(e.target.value))} required /></div>
        <div><Label>Lock-in (Months)</Label><Input type="number" value={formData.lock_in_months} onChange={e => handleChange('lock_in_months', parseInt(e.target.value))} required /></div>
        <div><Label>Management Fee (%)</Label><Input type="number" step="0.1" value={formData.management_fee_percent} onChange={e => handleChange('management_fee_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Performance Fee (%)</Label><Input type="number" step="0.1" value={formData.performance_fee_percent} onChange={e => handleChange('performance_fee_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Hurdle Rate (%)</Label><Input type="number" step="0.1" value={formData.hurdle_rate} onChange={e => handleChange('hurdle_rate', parseFloat(e.target.value))} /></div>
        <div><Label>Risk Band</Label><Select value={formData.risk_band} onValueChange={val => handleChange('risk_band', val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="very_high">Very High</SelectItem></SelectContent></Select></div>
        <div><Label>Redemption Penalty (%)</Label><Input type="number" step="0.1" value={formData.redemption_penalty_percent} onChange={e => handleChange('redemption_penalty_percent', parseFloat(e.target.value))} /></div>
        <div><Label>Redemption Penalty ($)</Label><Input type="number" value={formData.redemption_penalty_amount} onChange={e => handleChange('redemption_penalty_amount', parseFloat(e.target.value))} /></div>
      </div>
      <div className="flex items-center space-x-2"><Switch id="hwm" checked={formData.high_water_mark} onCheckedChange={val => handleChange('high_water_mark', val)} /><Label htmlFor="hwm">High Water Mark</Label></div>
      <Button type="submit" className="w-full bg-yellow-400 text-black hover:bg-yellow-500">Save Product</Button>
    </form>
  );
};


export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await Product.list('-created_date');
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if(productData.id) {
        await Product.update(productData.id, productData);
      } else {
        await Product.create(productData);
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch(error) {
      console.error("Failed to save product:", error);
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
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await Product.delete(productId);
        loadProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error deleting product");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Product Management</h1>
            <p className="text-gray-400">Add, edit, and manage investment products</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openFormForNew} className="bg-yellow-400 text-black hover:bg-yellow-500">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
              </DialogHeader>
              <ProductForm product={editingProduct} onSave={handleSaveProduct} />
            </DialogContent>
          </Dialog>
        </div>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white">All Products</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Risk Band</TableHead>
                    <TableHead className="text-gray-400">Min. Ticket</TableHead>
                    <TableHead className="text-gray-400">Lock-in</TableHead>
                    <TableHead className="text-gray-400">Mgt. Fee</TableHead>
                    <TableHead className="text-gray-400">Perf. Fee</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{product.name}</TableCell>
                      <TableCell className="capitalize text-gray-300">{product.risk_band}</TableCell>
                      <TableCell className="text-gray-300">${product.minimum_ticket?.toLocaleString()}</TableCell>
                      <TableCell className="text-gray-300">{product.lock_in_months} months</TableCell>
                      <TableCell className="text-gray-300">{product.management_fee_percent}%</TableCell>
                      <TableCell className="text-gray-300">{product.performance_fee_percent || 0}%</TableCell>
                      <TableCell><Badge variant={product.status === 'active' ? 'default' : 'secondary'}>{product.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openFormForEdit(product)}><Edit className="w-3 h-3 mr-1"/> Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3"/></Button>
                        </div>
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