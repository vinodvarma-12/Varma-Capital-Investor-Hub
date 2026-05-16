import React, { useState, useEffect, useMemo } from "react";
import { Document } from "@/entities/Document";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import imageCompression from "browser-image-compression";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
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
  Users,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Rows3
} from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const GLOBAL_SENTINEL = '__global__';

const DocumentForm = ({ document, investors, onSave, onCancel }) => {
  const [formData, setFormData] = useState(() => {
    if (document) return { ...document };
    return {
      title: '',
      type: 'statement',
      investor_email: '',
      period: '',
      file_url: '',
      is_watermarked: false,
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = React.useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert sentinel back to empty string for storage
    const payload = {
      ...formData,
      investor_email: formData.investor_email === GLOBAL_SENTINEL ? '' : formData.investor_email,
    };
    onSave(payload);
  };

  const compressPdf = async (file) => {
    try {
      // Convert file to base64 in chunks to avoid stack overflow on large files
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const pdf_base64 = btoa(binary);

      const result = await invokeEdgeFunction("compress-pdf", {
        pdf_base64,
        filename: file.name,
      });

      if (!result.success) throw new Error(result.error);

      // Convert base64 back to File
      const compressedBytes = Uint8Array.from(atob(result.pdf_base64), (c) => c.charCodeAt(0));
      console.log(`PDF compressed: ${Math.round(result.originalSize / 1024)}KB → ${Math.round(result.compressedSize / 1024)}KB (${result.saving}% saved)`);
      return new File([compressedBytes], file.name, { type: "application/pdf" });
    } catch (error) {
      console.warn("iLovePDF compression failed, uploading original:", error);
      return file; // fallback — still upload, just uncompressed
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
        });
        fileToUpload = new File([compressed], file.name, { type: compressed.type });
      } else if (file.type === 'application/pdf') {
        fileToUpload = await compressPdf(file);
      }
      const { file_url } = await UploadFile({ file: fileToUpload });
      setFormData(prev => ({ ...prev, file_url }));
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed. Please try again.");
      setUploadedFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const investorSelectValue = formData.investor_email === '' ? GLOBAL_SENTINEL : (formData.investor_email || GLOBAL_SENTINEL);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-1">

      {/* Title — full width */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80 text-sm">Document Title <span className="text-red-400">*</span></Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          placeholder="e.g., Q1 2024 Statement"
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#ccab6c]/60"
        />
      </div>

      {/* Type + Period — side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-sm">Document Type <span className="text-red-400">*</span></Label>
          <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}>
            <SelectTrigger className="bg-muted border-border text-foreground focus:border-[#ccab6c]/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-foreground">
              <SelectItem value="statement">Statement</SelectItem>
              <SelectItem value="tax_document">Tax Document</SelectItem>
              <SelectItem value="agreement">Agreement</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="notice">Notice</SelectItem>
              <SelectItem value="image">Image</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground/80 text-sm">Period</Label>
          <Input
            value={formData.period}
            onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
            placeholder="e.g., 2024-Q1"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-[#ccab6c]/60"
          />
          <p className="text-xs text-muted-foreground">Optional — helps with sorting</p>
        </div>
      </div>

      {/* Recipient — full width */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80 text-sm">Recipient</Label>
        <Select
          value={investorSelectValue}
          onValueChange={(val) =>
            setFormData(prev => ({ ...prev, investor_email: val === GLOBAL_SENTINEL ? '' : val }))
          }
        >
          <SelectTrigger className="bg-muted border-border text-foreground focus:border-[#ccab6c]/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground max-h-48">
            <SelectItem value={GLOBAL_SENTINEL}>
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gold-bright" />
                All Investors (Global)
              </span>
            </SelectItem>
            {investors.map(investor => (
              <SelectItem key={investor.id} value={investor.email}>
                {investor.full_name || investor.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Select a specific investor, or leave as Global to share with everyone</p>
      </div>

      {/* Drag-and-drop file upload */}
      <div className="space-y-1.5">
        <Label className="text-foreground/80 text-sm">File <span className="text-red-400">*</span></Label>
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
            dragOver
              ? 'border-[#ccab6c] bg-[#ccab6c]/5'
              : formData.file_url
              ? 'border-green-600/60 bg-green-900/10'
              : 'border-border bg-muted hover:border-[#ccab6c]/40 hover:bg-secondary/60'
          }`}
        >
          {isUploading ? (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-[#fedea0] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading <span className="text-foreground">{uploadedFileName}</span>…</p>
            </>
          ) : formData.file_url ? (
            <>
              <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-600/50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-green-400">File uploaded successfully</p>
                <p className="text-xs text-muted-foreground mt-0.5">{uploadedFileName || 'Click to replace'}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
                <Upload className="w-5 h-5 text-gold/70" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop file here or <span className="text-gold-bright">browse</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">PDF, Word, Excel, PNG, JPG — max 50 MB</p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Watermark toggle */}
      <div className="flex items-start gap-3 rounded-lg bg-muted border border-border px-4 py-3">
        <Switch
          id="watermarked"
          checked={formData.is_watermarked}
          onCheckedChange={(val) => setFormData(prev => ({ ...prev, is_watermarked: val }))}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="watermarked" className="text-foreground text-sm font-medium cursor-pointer">
            Apply investor watermark
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stamps the document with the investor's name and email when downloaded
          </p>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="border-border text-foreground/80 hover:bg-secondary">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isUploading || !formData.title || !formData.file_url}
          className="bg-[#fedea0] text-black hover:bg-[#ccab6c] font-semibold"
        >
          {isUploading ? 'Uploading…' : document ? 'Update Document' : 'Upload Document'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, typeFilter, investorFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allDocuments, allUsers, me] = await Promise.all([
        Document.list('-created_date'),
        User.list(),
        User.me(),
      ]);
      setDocuments(allDocuments);
      setAllUsers(allUsers);
      setInvestors(allUsers.filter(u => u.role === 'investor'));
      setCurrentUser(me);
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
        await Document.create({
          ...documentData,
          uploaded_by: currentUser?.email ?? '',
        });
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
      notice: "bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45",
      image: "bg-cyan-900 text-cyan-400 border-cyan-700",
    };
    return colors[type] || "bg-secondary text-foreground/80 border-border";
  };

  const documentTypes = [...new Set(documents.map(doc => doc.type))];
  const documentInvestors = [...new Set(documents.map(doc => doc.investor_email).filter(Boolean))];

  // Grouped view
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grouped'
  const [openGroups, setOpenGroups] = useState({});

  const groupedDocuments = useMemo(() => {
    const groups = {};
    filteredDocuments.forEach(doc => {
      const key = doc.uploaded_by || '__unknown__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });
    return groups;
  }, [filteredDocuments]);

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupOpen = (key) => openGroups[key] !== false;

  const getUploaderLabel = (key) => {
    if (key === '__unknown__') return 'Unknown / Legacy';
    const found = allUsers.find(u => u.email === key);
    return found?.full_name || key;
  };

  const getTypeBadgeColorAdmin = (type) => {
    const colors = {
      statement: "bg-blue-900 text-blue-400 border-blue-700",
      tax_document: "bg-green-900 text-green-400 border-green-700",
      agreement: "bg-purple-900 text-purple-400 border-purple-700",
      compliance: "bg-red-900 text-red-400 border-red-700",
      notice: "bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45",
      image: "bg-cyan-900 text-cyan-400 border-cyan-700",
    };
    return colors[type] || "bg-secondary text-foreground/80 border-border";
  };

  if (loading) {
    return <LoadingSpinner message="Loading documents..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
            <p className="text-gold/90">Upload, manage, and distribute investor documents</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewForm} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border border-[#ccab6c]/30 max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">
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
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/90" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted border-[#ccab6c]/20"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-[#ccab6c]/20">
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={investorFilter} onValueChange={setInvestorFilter}>
                <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                  <SelectValue placeholder="All Investors" />
                </SelectTrigger>
                <SelectContent className="bg-muted border-[#ccab6c]/20">
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
                className="border-border text-foreground/80"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table / Grouped View */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">
                All Documents ({filteredDocuments.length})
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Rows3 className="w-3.5 h-3.5" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grouped' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  By Uploader
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* ── GROUPED VIEW ── */}
            {viewMode === 'grouped' && (
              filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-gold/90 text-lg">No documents found</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    {searchTerm || typeFilter !== "all" || investorFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "Upload your first document to get started"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedDocuments).map(([key, docs]) => {
                    const open = isGroupOpen(key);
                    return (
                      <div key={key} className="rounded-lg border border-[#ccab6c]/25 overflow-hidden">
                        <button
                          onClick={() => toggleGroup(key)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#ccab6c]/15 border border-[#ccab6c]/25 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-gold-bright" />
                            </div>
                            <div>
                              <p className="text-foreground font-semibold text-sm">{getUploaderLabel(key)}</p>
                              <p className="text-xs text-muted-foreground">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          {open
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        </button>
                        {open && (
                          <div className="border-t border-[#ccab6c]/20">
                            {docs.map((doc, idx) => (
                              <div
                                key={doc.id}
                                className={`flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors ${idx !== docs.length - 1 ? 'border-b border-[#ccab6c]/10' : ''}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-gold-bright flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <Badge variant="outline" className={`text-xs ${getTypeBadgeColorAdmin(doc.type)}`}>
                                        {doc.type.replace('_', ' ')}
                                      </Badge>
                                      {doc.investor_email
                                        ? <span className="text-xs text-muted-foreground">{getInvestorName(doc.investor_email)}</span>
                                        : <span className="text-xs text-gold-bright">Global</span>}
                                      {doc.period && <span className="text-xs text-muted-foreground">{doc.period}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-4">
                                  <Button variant="ghost" size="sm" onClick={() => window.open(doc.file_url, '_blank')} className="text-gold/90 hover:text-foreground">
                                    <Eye className="w-3 h-3 mr-1" />View
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openEditForm(doc)} className="text-gold-bright hover:text-[#fedea0]">
                                    <Edit className="w-3 h-3 mr-1" />Edit
                                  </Button>
                                  {currentUser?.role === 'super_admin' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} className="text-red-400 hover:text-red-300">
                                      <Trash2 className="w-3 h-3 mr-1" />Delete
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (filteredDocuments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#ccab6c]/25">
                      <TableHead className="text-gold/90">Document</TableHead>
                      <TableHead className="text-gold/90">Type</TableHead>
                      <TableHead className="text-gold/90">Investor</TableHead>
                      <TableHead className="text-gold/90">Period</TableHead>
                      <TableHead className="text-gold/90">Downloads</TableHead>
                      <TableHead className="text-gold/90">Uploaded By</TableHead>
                      <TableHead className="text-gold/90">Date Added</TableHead>
                      <TableHead className="text-gold/90">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id} className="border-[#ccab6c]/25">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gold-bright" />
                            <div>
                              <p className="font-medium text-foreground">{document.title}</p>
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
                                <Users className="w-4 h-4 text-gold/90" />
                                <span className="text-foreground">{getInvestorName(document.investor_email)}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-gold-bright font-medium">Global</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {document.period || '-'}
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {document.download_count || 0}
                        </TableCell>
                        <TableCell className="text-foreground/80 text-sm">
                          {document.uploaded_by || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {format(new Date(document.created_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(document.file_url, '_blank')}
                              className="text-gold/90 hover:text-foreground"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditForm(document)}
                              className="text-gold-bright hover:text-[#fedea0]"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            {currentUser?.role === 'super_admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(document.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-gold/90 text-lg">No documents found</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {searchTerm || typeFilter !== "all" || investorFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Upload your first document to get started"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
