import React, { useState, useEffect } from "react";
import { Waitlist } from "@/entities/Waitlist";
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  Download, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

const WaitlistDetailDialog = ({ entry, onSave, onClose }) => {
  const [editData, setEditData] = useState(entry || {});
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      await Waitlist.update(entry.id, editData);
      
      // Log the change
      await AuditLog.create({
        user_email: user.email,
        action: 'update',
        entity_type: 'Waitlist',
        entity_id: entry.id,
        changes: { old: entry, new: editData }
      });

      onSave();
    } catch (error) {
      console.error("Error updating waitlist entry:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border border-[#ccab6c]/30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Waitlist Entry Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80">Full Name</Label>
              <Input
                value={editData.full_name || ''}
                onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div>
              <Label className="text-foreground/80">Email</Label>
              <Input
                value={editData.email || ''}
                onChange={(e) => setEditData({...editData, email: e.target.value})}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80">Phone</Label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div>
              <Label className="text-foreground/80">Country</Label>
              <Input
                value={editData.country || ''}
                onChange={(e) => setEditData({...editData, country: e.target.value})}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80">Status</Label>
              <Select 
                value={editData.status || 'new'} 
                onValueChange={(val) => setEditData({...editData, status: val})}
              >
                <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground/80">Investor Category</Label>
              <Select 
                value={editData.investor_category || ''} 
                onValueChange={(val) => setEditData({...editData, investor_category: val})}
              >
                <SelectTrigger className="bg-muted border-[#ccab6c]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accredited">Accredited</SelectItem>
                  <SelectItem value="HNW">HNW</SelectItem>
                  <SelectItem value="Family Office">Family Office</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-foreground/80">Amount Interested (USD)</Label>
            <Input
              type="number"
              value={editData.amount_interested || ''}
              onChange={(e) => setEditData({...editData, amount_interested: parseFloat(e.target.value) || null})}
              className="bg-muted border-[#ccab6c]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground/80">Heard From</Label>
              <Input
                value={editData.heard_from || ''}
                readOnly
                className="bg-muted border-[#ccab6c]/20 text-muted-foreground cursor-default"
              />
            </div>
            {editData.heard_from === 'Other' && (
              <div>
                <Label className="text-foreground/80">Specified (Other)</Label>
                <Input
                  value={editData.heard_from_other || ''}
                  readOnly
                  className="bg-muted border-[#ccab6c]/20 text-muted-foreground cursor-default"
                />
              </div>
            )}
          </div>

          <div>
            <Label className="text-foreground/80">Notes</Label>
            <Textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({...editData, notes: e.target.value})}
              className="bg-muted border-[#ccab6c]/20 h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminWaitlist() {
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    loadWaitlistData();
  }, []);

  const loadWaitlistData = async () => {
    setLoading(true);
    try {
      const entries = await Waitlist.list('-created_date');
      setWaitlistEntries(entries);
    } catch (error) {
      console.error("Error loading waitlist data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!confirm("Are you sure you want to delete this waitlist entry?")) return;

    try {
      const user = await User.me();
      await Waitlist.delete(entryId);
      
      await AuditLog.create({
        user_email: user.email,
        action: 'delete',
        entity_type: 'Waitlist',
        entity_id: entryId,
        changes: {}
      });

      loadWaitlistData();
    } catch (error) {
      console.error("Error deleting waitlist entry:", error);
    }
  };

  const exportToCsv = () => {
    const csvContent = [
      ['Created At', 'Full Name', 'Email', 'Phone', 'Country', 'Category', 'Heard From', 'Amount Interested', 'Status', 'Notes'].join(','),
      ...filteredEntries.map(entry => [
        format(new Date(entry.created_date), 'yyyy-MM-dd HH:mm:ss'),
        entry.full_name,
        entry.email,
        entry.phone || '',
        entry.country || '',
        entry.investor_category || '',
        entry.heard_from === 'Other' ? (entry.heard_from_other || 'Other') : (entry.heard_from || ''),
        entry.amount_interested || '',
        entry.status,
        (entry.notes || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEntries = waitlistEntries.filter(entry => {
    const matchesSearch = 
      entry.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || entry.investor_category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-900 text-blue-400 border-blue-700',
      contacted: 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45',
      qualified: 'bg-green-900 text-green-400 border-green-700',
      closed: 'bg-secondary text-foreground/80 border-border'
    };
    return <Badge variant="outline" className={`capitalize ${colors[status] || 'bg-secondary'}`}>{status}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner message="Loading waitlist..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-gold-bright" />
              Waitlist Management
            </h1>
            <p className="text-gold/90">Manage investor waitlist and lead pipeline</p>
          </div>
          <Button onClick={exportToCsv} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-foreground">Waitlist Entries ({filteredEntries.length})</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/90"/>
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8 bg-muted border-[#ccab6c]/20 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Accredited">Accredited</SelectItem>
                    <SelectItem value="HNW">HNW</SelectItem>
                    <SelectItem value="Family Office">Family Office</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25">
                    <TableHead className="text-gold/90">Created</TableHead>
                    <TableHead className="text-gold/90">Name</TableHead>
                    <TableHead className="text-gold/90">Contact</TableHead>
                    <TableHead className="text-gold/90">Category</TableHead>
                    <TableHead className="text-gold/90">Heard From</TableHead>
                    <TableHead className="text-gold/90 text-right">Amount</TableHead>
                    <TableHead className="text-gold/90">Status</TableHead>
                    <TableHead className="text-gold/90">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-[#ccab6c]/25">
                      <TableCell className="text-foreground/80">
                        {format(new Date(entry.created_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{entry.full_name}</div>
                        <div className="text-sm text-gold/90">{entry.country}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground">{entry.email}</div>
                        <div className="text-sm text-gold/90">{entry.phone}</div>
                      </TableCell>
                      <TableCell className="text-foreground/80">{entry.investor_category || '-'}</TableCell>
                      <TableCell className="text-foreground/80">
                        {entry.heard_from === 'Other'
                          ? entry.heard_from_other || 'Other'
                          : entry.heard_from || '-'}
                      </TableCell>
                      <TableCell className="text-right text-foreground font-medium">
                        {entry.amount_interested ? `$${entry.amount_interested.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-400 border-red-400 hover:bg-red-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-gold/90">No waitlist entries found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedEntry && (
          <WaitlistDetailDialog
            entry={selectedEntry}
            onSave={() => {
              setSelectedEntry(null);
              loadWaitlistData();
            }}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </div>
    </div>
  );
}