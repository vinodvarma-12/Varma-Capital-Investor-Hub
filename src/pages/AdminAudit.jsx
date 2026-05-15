import React, { useState, useEffect } from "react";
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { History, Search, Download, Filter, Eye } from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: 'all',
    action: 'all',
    entity: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditLogs, filters]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        AuditLog.list('-created_date', 500),
        User.list()
      ]);
      setAuditLogs(logsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...auditLogs];

    if (filters.user !== 'all') {
      filtered = filtered.filter(log => log.user_email === filters.user);
    }

    if (filters.action !== 'all') {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.entity !== 'all') {
      filtered = filtered.filter(log => log.entity_type === filters.entity);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log => 
        new Date(log.created_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => 
        new Date(log.created_date) <= new Date(filters.dateTo)
      );
    }

    setFilteredLogs(filtered);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email,
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getUserName = (email) => {
    return users.find(u => u.email === email)?.full_name || email;
  };

  const getActionBadge = (action) => {
    const colors = {
      create: 'bg-green-900 text-green-400 border-green-700',
      update: 'bg-[#b38922]/25 text-[#fedea0] border-[#8a6a1a]/45',
      delete: 'bg-red-900 text-red-400 border-red-700',
      login: 'bg-blue-900 text-blue-400 border-blue-700',
      logout: 'bg-zinc-800 text-zinc-300 border-zinc-600',
      download: 'bg-purple-900 text-purple-400 border-purple-700',
      upload: 'bg-indigo-900 text-indigo-400 border-indigo-700'
    };
    return colors[action] || 'bg-zinc-800 text-zinc-300 border-zinc-600';
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueEntities = [...new Set(auditLogs.map(log => log.entity_type))];
  const uniqueUsers = [...new Set(auditLogs.map(log => log.user_email))];

  if (loading) {
    return <LoadingSpinner message="Loading audit logs..." />;
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <History className="w-8 h-8 text-[#fedea0]" />
              System Audit Logs
            </h1>
            <p className="text-[#ccab6c]/90">Complete audit trail of all system activities</p>
          </div>
          <Button onClick={exportAuditLog} className="bg-[#fedea0] text-black hover:bg-[#ccab6c]">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <Label className="text-zinc-300">User</Label>
                <Select value={filters.user} onValueChange={(val) => updateFilter('user', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map(email => (
                      <SelectItem key={email} value={email}>{getUserName(email)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-300">Action</Label>
                <Select value={filters.action} onValueChange={(val) => updateFilter('action', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action} className="capitalize">{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-300">Entity</Label>
                <Select value={filters.entity} onValueChange={(val) => updateFilter('entity', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {uniqueEntities.map(entity => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-zinc-300">From Date</Label>
                <Input 
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="bg-zinc-900 border-[#ccab6c]/20"
                />
              </div>

              <div>
                <Label className="text-zinc-300">To Date</Label>
                <Input 
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="bg-zinc-900 border-[#ccab6c]/20"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ user: 'all', action: 'all', entity: 'all', dateFrom: '', dateTo: '' })}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white">
              Audit Trail ({filteredLogs.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25">
                    <TableHead className="text-[#ccab6c]/90">Timestamp</TableHead>
                    <TableHead className="text-[#ccab6c]/90">User</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Action</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Entity</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Entity ID</TableHead>
                    <TableHead className="text-[#ccab6c]/90">IP Address</TableHead>
                    <TableHead className="text-[#ccab6c]/90">Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 100).map((log) => (
                    <TableRow key={log.id} className="border-[#ccab6c]/25">
                      <TableCell className="text-zinc-300">
                        {format(new Date(log.created_date), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {getUserName(log.user_email)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${getActionBadge(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-300">{log.entity_type}</TableCell>
                      <TableCell className="text-zinc-300 font-mono text-xs">
                        {log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell className="text-zinc-300 font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        {log.changes ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-[#fedea0]">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30 max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white">Audit Log Changes</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="bg-zinc-900 p-4 rounded-lg">
                                  <h4 className="font-semibold text-white mb-2">Action Details</h4>
                                  <p className="text-zinc-300">User: {getUserName(log.user_email)}</p>
                                  <p className="text-zinc-300">Action: {log.action}</p>
                                  <p className="text-zinc-300">Entity: {log.entity_type}</p>
                                  <p className="text-zinc-300">Timestamp: {format(new Date(log.created_date), 'PPpp')}</p>
                                </div>
                                <div className="bg-zinc-900 p-4 rounded-lg">
                                  <h4 className="font-semibold text-white mb-2">Changes Made</h4>
                                  <pre className="text-zinc-300 text-sm bg-zinc-950 p-3 rounded overflow-auto">
                                    {JSON.stringify(log.changes, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredLogs.length > 100 && (
              <p className="text-center text-[#ccab6c]/90 mt-4">
                Showing first 100 of {filteredLogs.length} records. Use filters to narrow results.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}