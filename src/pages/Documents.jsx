import React, { useState, useEffect, useMemo } from "react";
import { User } from "@/entities/User";
import { Document } from "@/entities/Document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, FileText, Search, Filter, Eye, Calendar, Plus, Upload, ChevronDown, ChevronRight, Users, Archive, Loader2, BarChart2, ClipboardList, FileSignature, Lock, Megaphone } from "lucide-react";
import JSZip from "jszip";
import { UploadFile } from "@/integrations/Core";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Documents() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    type: "statement",
    period: "",
    file: null
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument({ ...newDocument, file: e.target.files[0] });
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocument.title || !newDocument.file) {
      alert("Please provide a title and select a file.");
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await UploadFile({ file: newDocument.file });

      // Create document record for current user
      await Document.create({
        title: newDocument.title,
        type: newDocument.type,
        period: newDocument.period,
        file_url: file_url,
        investor_email: user.email,
        uploaded_by: user.email,
        is_watermarked: false,
        download_count: 0
      });

      alert("Document uploaded successfully!");
      setIsAddDialogOpen(false);
      setNewDocument({ title: "", type: "statement", period: "", file: null });
      loadUserAndDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadUserAndDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, searchTerm, typeFilter]);

  const loadUserAndDocuments = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
      
      // Load documents specific to this investor
      const userDocs = await Document.filter({ investor_email: userData.email }, '-created_date');
      
      // Also load global documents (no investor_email specified)
      const globalDocs = await Document.filter({ investor_email: '' }, '-created_date');
      
      setDocuments([...userDocs, ...globalDocs]);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    setFilteredDocuments(filtered);
  };

  const handleDownload = async (document) => {
    try {
      // Increment download count
      await Document.update(document.id, { 
        download_count: (document.download_count || 0) + 1 
      });
      
      // Open document in new tab
      window.open(document.file_url, '_blank');
      
      // Refresh documents to update download count
      loadUserAndDocuments();
    } catch (error) {
      console.error("Error updating download count:", error);
      // Still allow download even if count update fails
      window.open(document.file_url, '_blank');
    }
  };

  const getDocumentIcon = (type) => {
    const icons = {
      statement: <BarChart2 className="w-5 h-5" />,
      tax_document: <ClipboardList className="w-5 h-5" />,
      agreement: <FileSignature className="w-5 h-5" />,
      compliance: <Lock className="w-5 h-5" />,
      notice: <Megaphone className="w-5 h-5" />,
    };
    return icons[type] || <FileText className="w-5 h-5" />;
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      statement: "bg-blue-900 text-blue-400 border-blue-700",
      tax_document: "bg-green-900 text-green-400 border-green-700",
      agreement: "bg-purple-900 text-purple-400 border-purple-700",
      compliance: "bg-red-900 text-red-400 border-red-700",
      notice: "bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45"
    };
    return colors[type] || "bg-secondary text-foreground/80 border-border";
  };

  const documentTypes = [...new Set(documents.map(doc => doc.type))];

  // Group filtered docs: personal (investor_email = me) → my name, global → Varma Capital
  const groupedDocuments = useMemo(() => {
    const groups = {};
    filteredDocuments.forEach(doc => {
      const key = doc.investor_email === user?.email ? user?.email : '__varma__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });
    return groups;
  }, [filteredDocuments, user]);

  const [openGroups, setOpenGroups] = useState({});
  const [zipLoading, setZipLoading] = useState({}); // key → true while zipping

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadAllZip = async (e, key, docs) => {
    e.stopPropagation(); // don't toggle the accordion
    setZipLoading(prev => ({ ...prev, [key]: true }));
    try {
      const zip = new JSZip();
      await Promise.all(
        docs.map(async (doc) => {
          try {
            const res = await fetch(doc.file_url);
            const blob = await res.blob();
            // derive a safe filename from title + original extension
            const urlExt = doc.file_url.split('?')[0].split('.').pop() || 'pdf';
            const safeName = (doc.title || 'document').replace(/[^a-zA-Z0-9_\-. ]/g, '_');
            zip.file(`${safeName}.${urlExt}`, blob);
          } catch (err) {
            console.warn(`Skipping ${doc.title}: ${err.message}`);
          }
        })
      );
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const label = getUploaderLabel(key).replace(/[^a-zA-Z0-9_\- ]/g, '_');
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Varma_Capital_${label}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP error:', err);
      alert('Failed to create ZIP. Please try downloading files individually.');
    } finally {
      setZipLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Default: all groups open (treat missing key as open)
  const isGroupOpen = (key) => openGroups[key] === true;

  const getUploaderLabel = (key) => {
    if (key === '__varma__') return 'Varma Capital';
    if (key === user?.email) return user?.full_name || user?.email || 'You';
    return 'Varma Capital'; // admin/staff uploads appear as Varma Capital
  };

  if (loading) {
    return <LoadingSpinner message="Loading your documents..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-gold/90">Access all your investment documents and agreements</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border border-[#ccab6c]/30">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Upload Document for Your Portfolio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Document Title</Label>
                    <Input
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                      placeholder="e.g., Q3 2024 Statement"
                      className="bg-muted border-[#ccab6c]/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80">Document Type</Label>
                    <Select 
                      value={newDocument.type} 
                      onValueChange={(value) => setNewDocument({ ...newDocument, type: value })}
                    >
                      <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-muted border-[#ccab6c]/20">
                        <SelectItem value="statement">Statement</SelectItem>
                        <SelectItem value="tax_document">Tax Document</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="notice">Notice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80">Period (Optional)</Label>
                    <Input
                      value={newDocument.period}
                      onChange={(e) => setNewDocument({ ...newDocument, period: e.target.value })}
                      placeholder="e.g., 2024-Q3"
                      className="bg-muted border-[#ccab6c]/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80">Upload File</Label>
                    <div className="border-2 border-dashed border-[#ccab6c]/20 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gold/90 mx-auto mb-2" />
                        <p className="text-gold/90 text-sm">
                          {newDocument.file ? newDocument.file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">PDF, DOC, XLS, PNG, JPG</p>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-border"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-[#fedea0] text-black hover:bg-[#ccab6c]"
                      onClick={handleUploadDocument}
                      disabled={uploading || !newDocument.title || !newDocument.file}
                    >
                      {uploading ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </div>
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
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/90" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-[#ccab6c]/20"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-muted border-[#ccab6c]/20">
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
            </div>
          </CardContent>
        </Card>

        {/* Grouped Documents */}
        {filteredDocuments.length === 0 ? (
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-gold/90 text-lg">No documents found</p>
              <p className="text-muted-foreground text-sm mt-2">
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Documents will appear here when they become available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground px-1">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} across {Object.keys(groupedDocuments).length} uploader{Object.keys(groupedDocuments).length !== 1 ? 's' : ''}
            </p>
            {Object.entries(groupedDocuments).map(([key, docs]) => {
              const open = isGroupOpen(key);
              return (
                <Card key={key} className="bg-card border border-[#ccab6c]/30 overflow-hidden">
                  {/* Group header — clickable */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#ccab6c]/15 border border-[#ccab6c]/25 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-gold-bright" />
                      </div>
                      <div>
                        <p className="text-foreground font-semibold">{getUploaderLabel(key)}</p>
                        <p className="text-xs text-muted-foreground">
                          {docs.length} document{docs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDownloadAllZip(e, key, docs)}
                        disabled={zipLoading[key]}
                        className="text-gold-bright border-[#b38922] hover:bg-[#fedea0] hover:text-black"
                      >
                        {zipLoading[key]
                          ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Zipping…</>
                          : <><Archive className="w-3 h-3 mr-1" />Download All</>}
                      </Button>
                      {open
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Document rows */}
                  {open && (
                    <div className="border-t border-[#ccab6c]/20">
                      {docs.map((doc, idx) => (
                        <div
                          key={doc.id}
                          className={`flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors ${idx !== docs.length - 1 ? 'border-b border-[#ccab6c]/10' : ''}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xl flex-shrink-0">{getDocumentIcon(doc.type)}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{doc.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge variant="outline" className={`text-xs ${getTypeBadgeColor(doc.type)}`}>
                                  {doc.type.replace('_', ' ')}
                                </Badge>
                                {doc.period && (
                                  <span className="text-xs text-muted-foreground">{doc.period}</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(doc.created_date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(doc)}
                              className="text-gold-bright border-[#b38922] hover:bg-[#fedea0] hover:text-black"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            {doc.file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.file_url, '_blank')}
                                className="text-gold/90 hover:text-foreground"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Document Types Legend */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gold/70" />
                <div>
                  <p className="text-foreground font-medium">Statements</p>
                  <p className="text-xs text-gold/90">Monthly/quarterly performance reports</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-gold/70" />
                <div>
                  <p className="text-foreground font-medium">Tax Documents</p>
                  <p className="text-xs text-gold/90">Annual tax forms and certificates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-gold/70" />
                <div>
                  <p className="text-foreground font-medium">Agreements</p>
                  <p className="text-xs text-gold/90">Investment agreements and contracts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gold/70" />
                <div>
                  <p className="text-foreground font-medium">Compliance</p>
                  <p className="text-xs text-gold/90">KYC documents and compliance forms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-gold/70" />
                <div>
                  <p className="text-foreground font-medium">Notices</p>
                  <p className="text-xs text-gold/90">Important announcements and updates</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
