import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { supabase } from "@/lib/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Users, ShieldCheck, UserCog, Trash2, Search, Shield, UserPlus, Mail } from "lucide-react";
import { format } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

export default function ManageAdmins() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '' });
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await User.list();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    setActionLoading(targetUser.id);
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', targetUser.id);
      await loadUsers();
      toast.success(`${targetUser.full_name || targetUser.email} is now ${
        newRole === 'admin' ? 'an Admin' : 'an Investor'
      }.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update role.');
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  const handleInviteAdmin = async () => {
    if (!inviteForm.email || !inviteForm.fullName) {
      toast.error('Email and full name are required.');
      return;
    }
    setInviteSending(true);
    try {
      const res = await invokeEdgeFunction('send-invitation-email', {
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: 'admin',
      });
      if (res?.success === false) throw new Error(res.error || 'Failed to send invitation');
      toast.success(`Invitation sent to ${inviteForm.email}. They will be created as admin once they activate their account.`);
      setInviteOpen(false);
      setInviteForm({ email: '', fullName: '' });
    } catch (e) {
      console.error(e);
      toast.error(`Failed: ${e.message}`);
    } finally {
      setInviteSending(false);
    }
  };

  const admins = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
  const investors = users.filter(u => u.role === 'investor');

  const filtered = (list) => list.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner message="Loading users..." />;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <UserCog className="w-8 h-8 text-gold-bright" />
              Manage Admins
            </h1>
            <p className="text-gold/90">Invite new admins or manage existing access</p>
          </div>
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Admin
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted border-[#ccab6c]/20"
          />
        </div>

        {/* Current Admins */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold-bright" />
              Current Admins
              <Badge className="ml-1 bg-[#b38922]/25 text-gold-bright border border-[#8a6a1a]/45">
                {admins.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25">
                    <TableHead className="text-gold/90">Name</TableHead>
                    <TableHead className="text-gold/90">Email</TableHead>
                    <TableHead className="text-gold/90">Role</TableHead>
                    <TableHead className="text-gold/90">Joined</TableHead>
                    <TableHead className="text-gold/90">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered(admins).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No admins found
                      </TableCell>
                    </TableRow>
                  ) : filtered(admins).map(admin => (
                    <TableRow key={admin.id} className="border-[#ccab6c]/25">
                      <TableCell className="text-foreground font-medium">{admin.full_name || '—'}</TableCell>
                      <TableCell className="text-foreground/80">{admin.email}</TableCell>
                      <TableCell>
                        <Badge className={admin.role === 'super_admin'
                          ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                          : 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
                        }>
                          <Shield className="w-3 h-3 mr-1" />
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        {admin.created_date ? format(new Date(admin.created_date), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        {admin.role === 'super_admin' ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            disabled={actionLoading === admin.id}
                            onClick={() => setConfirmDialog({ user: admin, action: 'demote' })}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Remove Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Investors — promote to admin */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-bright" />
              Investors
              <Badge className="ml-1 bg-muted text-muted-foreground border border-border">
                {investors.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#ccab6c]/25">
                    <TableHead className="text-gold/90">Name</TableHead>
                    <TableHead className="text-gold/90">Email</TableHead>
                    <TableHead className="text-gold/90">KYC</TableHead>
                    <TableHead className="text-gold/90">Joined</TableHead>
                    <TableHead className="text-gold/90">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered(investors).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No investors found
                      </TableCell>
                    </TableRow>
                  ) : filtered(investors).map(inv => (
                    <TableRow key={inv.id} className="border-[#ccab6c]/25">
                      <TableCell className="text-foreground font-medium">{inv.full_name || '—'}</TableCell>
                      <TableCell className="text-foreground/80">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${
                          inv.kyc_status === 'verified' ? 'border-green-700 text-green-400' :
                          inv.kyc_status === 'pending' ? 'border-[#8a6a1a]/45 text-gold-bright' :
                          'border-red-700 text-red-400'
                        }`}>
                          {inv.kyc_status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        {inv.created_date ? format(new Date(inv.created_date), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#b38922]/50 text-gold-bright hover:bg-[#fedea0] hover:text-black"
                          disabled={actionLoading === inv.id}
                          onClick={() => setConfirmDialog({ user: inv, action: 'promote' })}
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" /> Make Admin
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Admin dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gold-bright" /> Add Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              The admin account will be created immediately with admin role. They'll receive an email with a link to set their password.
            </p>
            <div className="space-y-1.5">
              <Label className="text-gold/90">Full Name <span className="text-red-400">*</span></Label>
              <Input
                placeholder="e.g. John Smith"
                value={inviteForm.fullName}
                onChange={e => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gold/90 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email Address <span className="text-red-400">*</span>
              </Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={inviteForm.email}
                onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-muted border-[#ccab6c]/20"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteSending}>
                Cancel
              </Button>
              <Button
                onClick={handleInviteAdmin}
                disabled={inviteSending || !inviteForm.email || !inviteForm.fullName}
                className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
              >
                {inviteSending ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="bg-card border border-[#ccab6c]/30 text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'promote' ? 'Promote to Admin' : 'Remove Admin Access'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground/80">
              {confirmDialog?.action === 'promote'
                ? <>Make <strong>{confirmDialog?.user?.full_name || confirmDialog?.user?.email}</strong> an admin? They will gain access to all admin features.</>
                : <>Remove admin access from <strong>{confirmDialog?.user?.full_name || confirmDialog?.user?.email}</strong>? They will be reverted to an investor.</>
              }
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                onClick={() => handleRoleChange(
                  confirmDialog.user,
                  confirmDialog.action === 'promote' ? 'admin' : 'investor'
                )}
                disabled={actionLoading === confirmDialog?.user?.id}
                className={confirmDialog?.action === 'promote'
                  ? 'bg-[#fedea0] text-black hover:bg-[#ccab6c]'
                  : 'bg-red-900 text-red-200 hover:bg-red-800'
                }
              >
                {actionLoading === confirmDialog?.user?.id
                  ? 'Saving…'
                  : confirmDialog?.action === 'promote' ? 'Yes, Make Admin' : 'Yes, Remove'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
