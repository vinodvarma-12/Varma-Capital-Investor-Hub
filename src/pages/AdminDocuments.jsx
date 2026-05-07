import React, { useState, useEffect } from "react";
import { Document } from "@/entities/Document";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  FileText, 
  Search, 
  Filter,
  Eye,
  Users
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const DocumentForm = ({ document, investors, onSave, onCancel }) => {
  const [formData, setFormData] = useState(document || {
    title: '',
    type: 'statement',
    investor_email: '',
    period: '',
    file_url: '',
    is_watermarked: false
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, file_url }));
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Document Title</Label>
          <Input 
            value={formData.title} 
            onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
            required 
            className="bg-zinc-900 border-[#ccab6c]/20"
          />
        </div>
        <div>
          <Label>Document Type</Label>
          <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({...prev, type: val}))}>
            <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-[#ccab6c]/20 text-white">
              <SelectItem value="statement">Statement</SelectItem>
              <SelectItem value="tax_document">Tax Document</SelectItem>
              <SelectItem value="agreement">Agreement</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="notice">Notice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Investor (Leave empty for global document)</Label>
          <Select value={formData.investor_email} onValueChange={(val) => setFormData(prev => ({...prev, investor_email: val}))}>
            <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
              <SelectValue placeholder="Select investor or leave blank" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-[#ccab6c]/20 text-white">
              <SelectItem value={null}>Global Document (All Investors)</SelectItem>
              {investors.map(investor => (
                <SelectItem key={investor.id} value={investor.email}>
                  {investor.full_name} ({investor.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Period (Optional)</Label>
          <Input 
            value={formData.period} 
            onChange={(e) => setFormData(prev => ({...prev, period: e.target.value}))}
            placeholder="e.g., 2024-Q1, 2024-12"
            className="bg-zinc-900 border-[#ccab6c]/20"
          />
        </div>
      </div>

      <div>
        <Label>Upload Document</Label>
        <Input 
          type="file" 
          onChange={(e) => handleFileUpload(e.target.files[0])}
          disabled={isUploading}
          className="bg-zinc-900 border-[#ccab6c]/20"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
        />
        {formData.file_url && (
          <p className="text-xs text-green-400 mt-2">✓ File uploaded successfully</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="watermarked" 
          checked={formData.is_watermarked}
          onCheckedChange={(val) => setFormData(prev => ({...prev, is_watermarked: val}))}
        />
        <Label htmlFor="watermarked" className="text-zinc-300">
          Document is watermarked with investor details
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isUploading || !formData.title || !formData.file_url}
          className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
        >
          {isUploading ? 'Uploading...' : document ? 'Update Document' : 'Create Document'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, typeFilter, investorFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allDocuments, allUsers] = await Promise.all([
        Document.list('-created_date'),
        User.list()
      ]);
      setDocuments(allDocuments);
      setInvestors(allUsers.filter(u => u.role === 'investor'));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.investor_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    if (investorFilter !== "all") {
      if (investorFilter === "global") {
        filtered = filtered.filter(doc => !doc.investor_email);
      } else {
        filtered = filtered.filter(doc => doc.investor_email === investorFilter);
      }
    }

    setFilteredDocuments(filtered);
  };

  const handleSave = async (documentData) => {
    try {
      if (editingDocument) {
        await Document.update(editingDocument.id, documentData);
      } else {
        await Document.create(documentData);
      }
      setIsFormOpen(false);
      setEditingDocument(null);
      loadData();
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Error saving document. Please try again.");
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await Document.delete(documentId);
        loadData();
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Error deleting document. Please try again.");
      }
    }
  };

  const openEditForm = (document) => {
    setEditingDocument(document);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingDocument(null);
    setIsFormOpen(true);
  };

  const getInvestorName = (email) => {
    if (!email) return "Global Document";
    const investor = investors.find(inv => inv.email === email);
    return investor ? investor.full_name : email;
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      statement: "bg-blue-900 text-blue-400 border-blue-700",
      tax_document: "bg-green-900 text-green-400 border-green-700",
      agreement: "bg-purple-900 text-purple-400 border-purple-700",
      compliance: "bg-red-900 text-red-400 border-red-700",
      notice: "bg-[#b38922]/25 text-[#fedea0] border-[#8a6a1a]/45"
    };
    return colors[type] || "bg-zinc-800 text-zinc-300 border-zinc-600";
  };

  const documentTypes = [...new Set(documents.map(doc => doc.type))];
  const documentInvestors = [...new Set(documents.map(doc => doc.investor_email).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Document Management</h1>
            <p className="text-[#ccab6c]/90">Upload, manage, and distribute investor documents</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewForm} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingDocument ? 'Edit Document' : 'Upload New Document'}
                </DialogTitle>
              </DialogHeader>
              <DocumentForm 
                document={editingDocument}
                investors={investors}
                onSave={handleSave}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ccab6c]/90" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900 border-[#ccab6c]/20"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-[#ccab6c]/20">
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={investorFilter} onValueChange={setInvestorFilter}>
                <SelectTrigger className="bg-zinc-900 border-[#ccab6c]/20">
                  <SelectValue placeholder="All Investors" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-[#ccab6c]/20">
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="global">Global Documents</SelectItem>
                  {documentInvestors.map(email => (
                    <SelectItem key={email} value={email}>
                      {getInvestorName(email)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setInvestorFilter("all");
                }}
                className="border-zinc-600 text-zinc-300"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white">
              All Documents ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#ccab6c]/25">
                      <TableHead className="text-[#ccab6c]/90">Document</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Type</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Investor</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Period</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Downloads</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Date Added</TableHead>
                      <TableHead className="text-[#ccab6c]/90">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id} className="border-[#ccab6c]/25">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#fedea0]" />
                            <div>
                              <p className="font-medium text-white">{document.title}</p>
                              {document.is_watermarked && (
                                <span className="text-xs bg-blue-900 text-blue-400 px-2 py-1 rounded">
                                  Watermarked
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeColor(document.type)}>
                            {document.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {document.investor_email ? (
                              <>
                                <Users className="w-4 h-4 text-[#ccab6c]/90" />
                                <span className="text-white">{getInvestorName(document.investor_email)}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[#fedea0] font-medium">Global</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {document.period || '-'}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {document.download_count || 0}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {format(new Date(document.created_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(document.file_url, '_blank')}
                              className="text-[#ccab6c]/90 hover:text-white"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(document)}
                              className="text-[#fedea0] hover:text-[#fedea0]"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(document.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
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
                <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-[#ccab6c]/90 text-lg">No documents found</p>
                <p className="text-zinc-500 text-sm mt-2">
                  {searchTerm || typeFilter !== "all" || investorFilter !== "all"
                    ? "Try adjusting your search or filters" 
                    : "Upload your first document to get started"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}