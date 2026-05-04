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
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Waitlist Entry Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Full Name</Label>
              <Input
                value={editData.full_name || ''}
                onChange={(e) => setEditData({...editData, full_name: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                value={editData.email || ''}
                onChange={(e) => setEditData({...editData, email: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Phone</Label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-gray-300">Country</Label>
              <Input
                value={editData.country || ''}
                onChange={(e) => setEditData({...editData, country: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Status</Label>
              <Select 
                value={editData.status || 'new'} 
                onValueChange={(val) => setEditData({...editData, status: val})}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700">
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
              <Label className="text-gray-300">Investor Category</Label>
              <Select 
                value={editData.investor_category || ''} 
                onValueChange={(val) => setEditData({...editData, investor_category: val})}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700">
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
            <Label className="text-gray-300">Amount Interested (USD)</Label>
            <Input
              type="number"
              value={editData.amount_interested || ''}
              onChange={(e) => setEditData({...editData, amount_interested: parseFloat(e.target.value) || null})}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div>
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({...editData, notes: e.target.value})}
              className="bg-gray-800 border-gray-700 h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-yellow-400 text-black hover:bg-yellow-500">
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
      ['Created At', 'Full Name', 'Email', 'Phone', 'Country', 'Category', 'Amount Interested', 'Status', 'Notes'].join(','),
      ...filteredEntries.map(entry => [
        format(new Date(entry.created_date), 'yyyy-MM-dd HH:mm:ss'),
        entry.full_name,
        entry.email,
        entry.phone || '',
        entry.country || '',
        entry.investor_category || '',
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
      contacted: 'bg-yellow-900 text-yellow-400 border-yellow-700',
      qualified: 'bg-green-900 text-green-400 border-green-700',
      closed: 'bg-gray-700 text-gray-300 border-gray-600'
    };
    return <Badge variant="outline" className={`capitalize ${colors[status] || 'bg-gray-700'}`}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading waitlist...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-yellow-400" />
              Waitlist Management
            </h1>
            <p className="text-gray-400">Manage investor waitlist and lead pipeline</p>
          </div>
          <Button onClick={exportToCsv} className="bg-yellow-400 text-black hover:bg-yellow-500">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Waitlist Entries ({filteredEntries.length})</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-8 bg-gray-800 border-gray-700 w-64"
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
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Created</TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Category</TableHead>
                    <TableHead className="text-gray-400 text-right">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-gray-800">
                      <TableCell className="text-gray-300">
                        {format(new Date(entry.created_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-white">{entry.full_name}</div>
                        <div className="text-sm text-gray-400">{entry.country}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{entry.email}</div>
                        <div className="text-sm text-gray-400">{entry.phone}</div>
                      </TableCell>
                      <TableCell className="text-gray-300">{entry.investor_category || '-'}</TableCell>
                      <TableCell className="text-right text-white font-medium">
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
                <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No waitlist entries found</p>
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