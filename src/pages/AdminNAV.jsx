import React, { useState, useEffect } from "react";
import { NAV } from "@/entities/NAV";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Product } from "@/entities/Product";
import { Investment } from "@/entities/Investment";
import { User } from "@/entities/User";
import { AuditLog } from "@/entities/AuditLog";
import { ExtractDataFromUploadedFile, UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Upload, 
  Plus, 
  Edit, 
  TrendingUp, 
  Calendar as CalendarIcon,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NAVForm = ({ nav, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState(nav || {
    product_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    nav_per_unit: 0,
    return_percent: 0,
    investor_email: '',
    admin_notes: '',
    override_calculated: false
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
          <Select value={formData.product_id} onValueChange={(val) => setFormData({...formData, product_id: val})}>
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.date} 
            onChange={(e) => setFormData({...formData, date: e.target.value})} 
            required 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>NAV per Unit</Label>
          <Input 
            type="number" 
            step="0.0001"
            value={formData.nav_per_unit} 
            onChange={(e) => setFormData({...formData, nav_per_unit: parseFloat(e.target.value)})} 
            required 
          />
        </div>
        <div>
          <Label>Return %</Label>
          <Input 
            type="number" 
            step="0.01"
            value={formData.return_percent} 
            onChange={(e) => setFormData({...formData, return_percent: parseFloat(e.target.value)})} 
          />
        </div>
      </div>

      <div>
        <Label>Specific Investor (optional)</Label>
        <Input 
          type="email"
          placeholder="Leave blank for all investors"
          value={formData.investor_email} 
          onChange={(e) => setFormData({...formData, investor_email: e.target.value})} 
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="override"
          checked={formData.override_calculated}
          onCheckedChange={(val) => setFormData({...formData, override_calculated: val})}
        />
        <Label htmlFor="override">Override calculated P&L</Label>
      </div>

      <div>
        <Label>Admin Notes</Label>
        <Textarea 
          value={formData.admin_notes} 
          onChange={(e) => setFormData({...formData, admin_notes: e.target.value})} 
          placeholder="Reason for this NAV/return adjustment..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-yellow-400 text-black hover:bg-yellow-500">
          Save NAV/Return
        </Button>
      </div>
    </form>
  );
};

const CSVUploadForm = ({ products, onUpload, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [productId, setProductId] = useState('');
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
                  investor_email: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success') {
        onUpload(result.output.records, productId);
      } else {
        alert('Error processing CSV: ' + result.details);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Product</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
        <p className="text-xs text-gray-400 mt-1">
          Expected columns: date, nav_per_unit, return_percent, investor_email (optional)
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || !productId || uploading}
          className="bg-yellow-400 text-black hover:bg-yellow-500"
        >
          {uploading ? 'Processing...' : 'Upload & Process'}
        </Button>
      </div>
    </div>
  );
};

export default function AdminNAV() {
  const [navRecords, setNavRecords] = useState([]);
  const [fabricatedReturns, setFabricatedReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNAVForm, setShowNAVForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingNAV, setEditingNAV] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [navData, fabricatedData, productsData] = await Promise.all([
        NAV.list('-date', 100),
        FabricatedReturns.list('-created_date', 100),
        Product.list()
      ]);
      setNavRecords(navData);
      setFabricatedReturns(fabricatedData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading NAV data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNAV = async (formData) => {
    try {
      const user = await User.me();
      
      // Create fabricated return record
      await FabricatedReturns.create({
        investor_email: formData.investor_email || null,
        product_id: formData.product_id,
        period: format(new Date(formData.date), 'yyyy-MM'),
        return_percent: formData.return_percent,
        nav_per_unit: formData.nav_per_unit,
        override_calculated: formData.override_calculated,
        admin_notes: formData.admin_notes,
        effective_date: formData.date
      });

      // Also create/update NAV record
      const existingNAV = navRecords.find(n => 
        n.product_id === formData.product_id && 
        n.date === formData.date
      );

      if (existingNAV) {
        await NAV.update(existingNAV.id, {
          nav_per_unit: formData.nav_per_unit
        });
      } else {
        await NAV.create({
          product_id: formData.product_id,
          date: formData.date,
          nav_per_unit: formData.nav_per_unit,
          is_official: true
        });
      }

      // Log the action
      await AuditLog.create({
        user_email: user.email,
        action: 'update',
        entity_type: 'NAV',
        entity_id: formData.product_id,
        changes: {
          nav_per_unit: formData.nav_per_unit,
          return_percent: formData.return_percent,
          date: formData.date,
          investor_email: formData.investor_email
        }
      });

      setShowNAVForm(false);
      setEditingNAV(null);
      loadData();
    } catch (error) {
      console.error("Error saving NAV:", error);
      alert("Error saving NAV data");
    }
  };

  const handleCSVUpload = async (records, productId) => {
    try {
      const user = await User.me();
      
      for (const record of records) {
        await FabricatedReturns.create({
          investor_email: record.investor_email || null,
          product_id: productId,
          period: format(new Date(record.date), 'yyyy-MM'),
          return_percent: record.return_percent || 0,
          nav_per_unit: record.nav_per_unit,
          override_calculated: true,
          admin_notes: 'Uploaded via CSV',
          effective_date: record.date
        });

        // Also create NAV record
        await NAV.create({
          product_id: productId,
          date: record.date,
          nav_per_unit: record.nav_per_unit,
          is_official: true
        });
      }

      await AuditLog.create({
        user_email: user.email,
        action: 'create',
        entity_type: 'NAV',
        entity_id: productId,
        changes: { bulk_upload: true, records_count: records.length }
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
    return products.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading NAV management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">NAV & Returns Management</h1>
            <p className="text-gray-400">Set NAVs, fabricate returns, and manage investor portfolio values</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-yellow-400 text-yellow-400">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Upload NAV Data via CSV</DialogTitle>
                </DialogHeader>
                <CSVUploadForm 
                  products={products}
                  onUpload={handleCSVUpload}
                  onCancel={() => setShowCSVUpload(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={showNAVForm} onOpenChange={setShowNAVForm}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-400 text-black hover:bg-yellow-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Set NAV/Return
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingNAV ? 'Edit NAV/Return' : 'Set New NAV/Return'}
                  </DialogTitle>
                </DialogHeader>
                <NAVForm 
                  nav={editingNAV}
                  products={products}
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

        <Tabs defaultValue="fabricated" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="fabricated" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Admin-Set Returns
            </TabsTrigger>
            <TabsTrigger value="official" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Official NAVs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fabricated">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  Admin-Controlled Returns & NAVs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400">Product</TableHead>
                        <TableHead className="text-gray-400">Investor</TableHead>
                        <TableHead className="text-gray-400">NAV/Unit</TableHead>
                        <TableHead className="text-gray-400">Return %</TableHead>
                        <TableHead className="text-gray-400">Override</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fabricatedReturns.map((record) => (
                        <TableRow key={record.id} className="border-gray-800">
                          <TableCell className="text-gray-300">
                            {format(new Date(record.effective_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {getProductName(record.product_id)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {record.investor_email || (
                              <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                                All Investors
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            ${record.nav_per_unit?.toFixed(4)}
                          </TableCell>
                          <TableCell className={`font-medium ${
                            record.return_percent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {record.return_percent > 0 ? '+' : ''}{record.return_percent?.toFixed(2)}%
                          </TableCell>
                          <TableCell>
                            {record.override_calculated ? (
                              <Badge className="bg-yellow-900 text-yellow-400">
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
                                setEditingNAV(record);
                                setShowNAVForm(true);
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
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Official NAV Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400">Product</TableHead>
                        <TableHead className="text-gray-400">NAV per Unit</TableHead>
                        <TableHead className="text-gray-400">Total AUM</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {navRecords.map((nav) => (
                        <TableRow key={nav.id} className="border-gray-800">
                          <TableCell className="text-gray-300">
                            {format(new Date(nav.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {getProductName(nav.product_id)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            ${nav.nav_per_unit?.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {nav.total_aum ? `$${nav.total_aum.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={nav.is_official ? "default" : "secondary"}>
                              {nav.is_official ? 'Official' : 'Indicative'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}