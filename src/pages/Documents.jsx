import React, { useState, useEffect } from "react";
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
import { Download, FileText, Search, Filter, Eye, Calendar, Plus, Upload } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { format } from "date-fns";

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
      statement: "📊",
      tax_document: "📋",
      agreement: "📝",
      compliance: "🔒",
      notice: "📢"
    };
    return icons[type] || "📄";
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      statement: "bg-blue-900 text-blue-400 border-blue-700",
      tax_document: "bg-green-900 text-green-400 border-green-700",
      agreement: "bg-purple-900 text-purple-400 border-purple-700",
      compliance: "bg-red-900 text-red-400 border-red-700",
      notice: "bg-yellow-900 text-yellow-400 border-yellow-700"
    };
    return colors[type] || "bg-gray-700 text-gray-300 border-gray-600";
  };

  const documentTypes = [...new Set(documents.map(doc => doc.type))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading your documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Documents</h1>
            <p className="text-gray-400">Access all your investment documents and agreements</p>
          </div>
          
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-400 text-black hover:bg-yellow-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Upload Document for Your Portfolio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Document Title</Label>
                    <Input
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                      placeholder="e.g., Q3 2024 Statement"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Document Type</Label>
                    <Select 
                      value={newDocument.type} 
                      onValueChange={(value) => setNewDocument({ ...newDocument, type: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="statement">Statement</SelectItem>
                        <SelectItem value="tax_document">Tax Document</SelectItem>
                        <SelectItem value="agreement">Agreement</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="notice">Notice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Period (Optional)</Label>
                    <Input
                      value={newDocument.period}
                      onChange={(e) => setNewDocument({ ...newDocument, period: e.target.value })}
                      placeholder="e.g., 2024-Q3"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Upload File</Label>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          {newDocument.file ? newDocument.file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">PDF, DOC, XLS, PNG, JPG</p>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-gray-600"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500"
                      onClick={handleUploadDocument}
                      disabled={uploading || !newDocument.title || !newDocument.file}
                    >
                      {uploading ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
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

        {/* Documents Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              Your Documents ({filteredDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Document</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Period</TableHead>
                      <TableHead className="text-gray-400">Date Added</TableHead>
                      <TableHead className="text-gray-400">Downloads</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id} className="border-gray-800">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getDocumentIcon(document.type)}</span>
                            <div>
                              <p className="font-medium text-white">{document.title}</p>
                              {document.investor_email ? (
                                <p className="text-xs text-gray-400">Personal Document</p>
                              ) : (
                                <p className="text-xs text-yellow-400">Company Document</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTypeBadgeColor(document.type)}>
                            {document.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {document.period || '-'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {format(new Date(document.created_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {document.download_count || 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(document)}
                              className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            {document.file_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(document.file_url, '_blank')}
                                className="text-gray-400 hover:text-white"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
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
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No documents found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchTerm || typeFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Documents will appear here when they become available"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Types Legend */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <div>
                  <p className="text-white font-medium">Statements</p>
                  <p className="text-xs text-gray-400">Monthly/quarterly performance reports</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-white font-medium">Tax Documents</p>
                  <p className="text-xs text-gray-400">Annual tax forms and certificates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <div>
                  <p className="text-white font-medium">Agreements</p>
                  <p className="text-xs text-gray-400">Investment agreements and contracts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="text-white font-medium">Compliance</p>
                  <p className="text-xs text-gray-400">KYC documents and compliance forms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📢</span>
                <div>
                  <p className="text-white font-medium">Notices</p>
                  <p className="text-xs text-gray-400">Important announcements and updates</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}