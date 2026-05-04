import React, { useState, useEffect } from "react";
import { MarketingMaterial } from "@/entities/MarketingMaterial";
import { UploadFile } from "@/integrations/Core";
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
import { PlusCircle, Edit, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const MaterialForm = ({ material, onSave, onDone }) => {
  const [formData, setFormData] = useState(material || {
    title: '',
    description: '',
    file_url: '',
    thumbnail_url: '',
    category: 'article',
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleFileUpload = async (file) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file });
        handleChange('file_url', file_url);
      } catch (e) {
        console.error("Upload failed", e);
        alert("File upload failed.");
      } finally {
        setIsUploading(false);
      }
  };
  
   const handleThumbnailUpload = async (file) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file });
        handleChange('thumbnail_url', file_url);
      } catch (e) {
        console.error("Upload failed", e);
        alert("Thumbnail upload failed.");
      } finally {
        setIsUploading(false);
      }
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><Label>Title</Label><Input value={formData.title} onChange={e => handleChange('title', e.target.value)} required /></div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} /></div>
      <div><Label>Category</Label><Select value={formData.category} onValueChange={val => handleChange('category', val)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="market_commentary">Market Commentary</SelectItem><SelectItem value="white_paper">White Paper</SelectItem><SelectItem value="webinar">Webinar</SelectItem><SelectItem value="article">Article</SelectItem><SelectItem value="report">Report</SelectItem></SelectContent></Select></div>
      
      <div>
        <Label>Content File (PDF, etc.)</Label>
        <Input type="file" onChange={e => handleFileUpload(e.target.files[0])} disabled={isUploading} />
        {formData.file_url && <a href={formData.file_url} target="_blank" className="text-xs text-yellow-400 truncate">{formData.file_url}</a>}
      </div>

       <div>
        <Label>Thumbnail Image</Label>
        <Input type="file" accept="image/*" onChange={e => handleThumbnailUpload(e.target.files[0])} disabled={isUploading} />
        {formData.thumbnail_url && <img src={formData.thumbnail_url} className="h-20 mt-2 rounded" />}
      </div>
      
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" className="bg-yellow-400 text-black hover:bg-yellow-500" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save Material'}
        </Button>
      </DialogFooter>
    </form>
  );
};


export default function AdminInsights() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await MarketingMaterial.list('-created_date');
      setMaterials(data);
    } catch (error) {
      console.error("Error loading materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if(data.id) {
        await MarketingMaterial.update(data.id, data);
      } else {
        await MarketingMaterial.create(data);
      }
      closeForm();
      loadMaterials();
    } catch(error) {
      console.error("Failed to save material:", error);
    }
  };
  
  const handleDelete = async (id) => {
      if(window.confirm("Are you sure you want to delete this material?")) {
          try {
              await MarketingMaterial.delete(id);
              loadMaterials();
          } catch(e) {
              console.error("Failed to delete", e);
          }
      }
  }

  const openFormForEdit = (material) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };
  
  const openFormForNew = () => {
    setEditingMaterial(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
      setEditingMaterial(null);
      setIsFormOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Insights & Content</h1>
            <p className="text-gray-400">Manage articles, reports, and other content for investors.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openFormForNew} className="bg-yellow-400 text-black hover:bg-yellow-500">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Material
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
              <DialogHeader>
                <DialogTitle>{editingMaterial ? 'Edit Material' : 'Create New Material'}</DialogTitle>
              </DialogHeader>
              <MaterialForm material={editingMaterial} onSave={handleSave} onDone={closeForm} />
            </DialogContent>
          </Dialog>
        </div>
        
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader><CardTitle className="text-white">All Materials</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Category</TableHead>
                    <TableHead className="text-gray-400">Created</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map(material => (
                    <TableRow key={material.id} className="border-gray-800">
                      <TableCell className="font-medium text-white">{material.title}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{material.category.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-gray-300">{new Date(material.created_date).toLocaleDateString()}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openFormForEdit(material)}><Edit className="w-3 h-3 mr-1"/> Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(material.id)}><Trash2 className="w-3 h-3 mr-1"/> Delete</Button>
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