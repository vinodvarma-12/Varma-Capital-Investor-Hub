import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { AllocationRequest } from "@/entities/AllocationRequest";
import { SupportTicket } from "@/entities/SupportTicket";
import { Transaction } from "@/entities/Transaction";
import { NAV } from "@/entities/NAV";
import { AuditLog } from "@/entities/AuditLog";
import { ProductAccess } from "@/entities/ProductAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, endOfMonth } from 'date-fns';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [aumPeriod, setAumPeriod] = useState('6M');
  const [allocationRequests, setAllocationRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersData, investmentsData, productsData, requestsData, allOpenTickets, currentUser] = await Promise.all([
        User.list(),
        Investment.list('-created_date', 100),
        Product.list(),
        AllocationRequest.filter({ status: 'pending' }),
        SupportTicket.filter({ status: 'open' }),
        User.me(),
      ]);

      setUsers(usersData);
      setInvestments(investmentsData);
      setProducts(productsData);
      setAllocationRequests(requestsData);
      // Only surface tickets assigned to this admin
      setSupportTickets(allOpenTickets.filter(t => t.assigned_to === currentUser.email));
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (request) => {
    setEditingRequest(request);
    setEditForm({
      requested_amount: request.requested_amount ?? '',
      product_id: request.product_id ?? '',
      lock_in_months: request.lock_in_months ?? '',
      subscription_date: request.subscription_date ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;

    const selectedProduct = products.find(p => p.id === (editForm.product_id || editingRequest.product_id));
    const amount = parseFloat(editForm.requested_amount);
    const minTicket = selectedProduct?.minimum_ticket ?? 0;

    if (!amount || isNaN(amount)) {
      alert('Please enter a valid amount.');
      return;
    }
    if (amount < minTicket) {
      alert(`Amount $${amount.toLocaleString()} is below the minimum ticket of $${minTicket.toLocaleString()} for ${selectedProduct?.name}.`);
      return;
    }

    setIsSavingEdit(true);
    try {
      const patch = {
        requested_amount: amount,
        product_id: editForm.product_id || editingRequest.product_id,
        lock_in_months: editForm.lock_in_months && editForm.lock_in_months !== 'default' ? parseInt(editForm.lock_in_months) : null,
        subscription_date: editForm.subscription_date || null,
      };
      await AllocationRequest.update(editingRequest.id, patch);
      setEditingRequest(null);
      loadAdminData();
    } catch (err) {
      console.error('Failed to save edits:', err);
      alert('Failed to save changes: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAllocationRequest = async (requestId, status, notes = '') => {
    try {
      const currentUser = await User.me();
      const today = new Date().toISOString().split('T')[0];

      // Update the allocation request status
      await AllocationRequest.update(requestId, {
        status,
        admin_notes: notes,
        reviewed_by: currentUser.email,
        reviewed_date: today,
      });

      // If approved — auto-create investment + subscription transaction
      if (status === 'approved') {
        const request = allocationRequests.find(r => r.id === requestId);
        if (request) {
          const product = products.find(p => p.id === request.product_id);

          // Get latest NAV for this product to calculate units
          let navPerUnit = null;
          let currentUnits = null;
          try {
            const navRecords = await NAV.filter({ product_id: request.product_id }, '-date', 1);
            if (navRecords.length > 0) {
              navPerUnit = navRecords[0].nav_per_unit;
              currentUnits = navPerUnit > 0
                ? parseFloat((request.requested_amount / navPerUnit).toFixed(4))
                : null;
            }
          } catch (e) {
            console.warn('No NAV found for product, units will be null');
          }

          // Use admin-overridden lock-in if set, otherwise fall back to product default
          const effectiveLockIn = request.lock_in_months ?? product?.lock_in_months ?? null;
          const startDate = request.subscription_date || today;

          let lockInEndDate = null;
          if (effectiveLockIn) {
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + effectiveLockIn);
            lockInEndDate = endDate.toISOString().split('T')[0];
          }

          // Create investment (holding)
          await Investment.create({
            investor_email: request.investor_email,
            product_id: request.product_id,
            invested_amount: request.requested_amount,
            current_units: currentUnits,
            cost_basis: request.requested_amount,
            purchase_date: startDate,
            lock_in_months: effectiveLockIn,
            lock_in_end_date: lockInEndDate,
            status: 'active',
          });

          // Grant investor access to this product so it appears on their /products page
          await ProductAccess.grant({
            investor_email: request.investor_email,
            product_id: request.product_id,
            granted_by: currentUser.email,
          });

          // Create subscription transaction
          await Transaction.create({
            investor_email: request.investor_email,
            product_id: request.product_id,
            type: 'subscription',
            amount: request.requested_amount,
            units: currentUnits,
            nav_per_unit: navPerUnit,
            transaction_date: today,
            status: 'completed',
            notes: `Auto-created on allocation approval by ${currentUser.email}`,
          });

          // Audit log
          await AuditLog.create({
            user_email: currentUser.email,
            action: 'create',
            entity_type: 'Investment',
            entity_id: request.investor_email,
            changes: {
              investor_email: request.investor_email,
              product_id: request.product_id,
              invested_amount: request.requested_amount,
              units: currentUnits,
              nav_per_unit: navPerUnit,
              source: 'allocation_request_approval',
            },
          });
        }
      }

      loadAdminData();
    } catch (error) {
      console.error("Error updating allocation request:", error);
      alert('Failed to process request: ' + error.message);
    }
  };

  const calculateMetrics = () => {
    const totalInvestors = users.filter(u => u.role === 'investor').length;
    const totalAUM = investments
      .filter(inv => inv.status === 'active')
      .reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const activeProducts = products.filter(p => p.status === 'active').length;
    const pendingRequests = allocationRequests.length;

    return { totalInvestors, totalAUM, activeProducts, pendingRequests };
  };

  const metrics = calculateMetrics();

  const activeProducts = products.filter(p => p.status === 'active');

  // Fund colors for chart lines
  const fundColors = ['#fedea0', '#ccab6c', '#f59e0b', '#a78640', '#e2b96f'];

  // Derive which products actually have active investments (source of truth)
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  const chartProductIds = [...new Set(activeInvestments.map(inv => inv.product_id))];

  const getProductName = (productId) =>
    products.find(p => p.id === productId)?.name ?? 'Unknown Fund';

  // Build historical AUM data points from investment purchase_date
  const getAumChartData = () => {
    let monthCount;
    if (aumPeriod === '3M') monthCount = 3;
    else if (aumPeriod === '6M') monthCount = 6;
    else if (aumPeriod === '1Y') monthCount = 12;
    else {
      // 'All' — span from the earliest purchase_date to now
      const dates = activeInvestments
        .filter(inv => inv.purchase_date)
        .map(inv => new Date(inv.purchase_date));
      if (dates.length === 0) monthCount = 6;
      else {
        const earliest = new Date(Math.min(...dates));
        const now = new Date();
        const diffMs = now - earliest;
        monthCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
      }
    }

    const now = new Date();
    const points = [];

    for (let i = monthCount; i >= 0; i--) {
      const monthStart = subMonths(now, i);
      const cutoff = endOfMonth(monthStart);
      const label = format(monthStart, 'MMM yy');

      const point = { month: label };
      let monthTotal = 0;
      chartProductIds.forEach(productId => {
        const v = activeInvestments
          .filter(inv =>
            inv.product_id === productId &&
            (!inv.purchase_date || new Date(inv.purchase_date) <= cutoff)
          )
          .reduce((sum, inv) => sum + (parseFloat(inv.invested_amount) || 0), 0);
        point[productId] = v;
        monthTotal += v;
      });
      point.totalAUM = monthTotal;
      points.push(point);
    }

    const baseAUM = points[0]?.totalAUM || 0;
    return points.map(pt => ({
      ...pt,
      growth: baseAUM > 0 ? parseFloat(((pt.totalAUM - baseAUM) / baseAUM * 100).toFixed(2)) : 0,
    }));
  };

  const aumChartData = getAumChartData();
  const hasAnyAUM = chartProductIds.length > 0 &&
    aumChartData.some(pt => chartProductIds.some(id => (pt[id] || 0) > 0));

  if (loading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-gold/90">Manage your investor portal and monitor key metrics</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Investors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics.totalInvestors}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total AUM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${metrics.totalAUM.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Active Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metrics.activeProducts}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold-bright">{metrics.pendingRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* AUM Growth by Fund */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gold-bright" />
                  AUM Growth by Fund
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Cumulative invested capital over time</p>
              </div>
              {/* Period filter */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {['3M', '6M', '1Y', 'All'].map(p => (
                  <button
                    key={p}
                    onClick={() => setAumPeriod(p)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      aumPeriod === p
                        ? 'bg-[#fedea0] text-black'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasAnyAUM ? (
              <div className="h-72 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No active investments yet — data will appear here once investors are onboarded</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aumChartData} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <YAxis
                      yAxisId="aum"
                      stroke="#6b7280"
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      tickFormatter={(v) =>
                        v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M`
                        : v >= 1000 ? `$${(v / 1000).toFixed(0)}K`
                        : `$${v}`
                      }
                    />
                    <YAxis
                      yAxisId="growth"
                      orientation="right"
                      stroke="#10B981"
                      tick={{ fontSize: 11, fill: '#10B981' }}
                      tickFormatter={(v) => `${v}%`}
                      width={45}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ccab6c50', borderRadius: '8px', color: '#fff', fontSize: 13 }}
                      formatter={(value, name) =>
                        name === 'growth'
                          ? [`${value}%`, 'AUM Growth']
                          : [`$${Number(value).toLocaleString()}`, getProductName(name)]
                      }
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: value === 'growth' ? '#10B981' : '#9CA3AF', fontSize: 12 }}>
                          {value === 'growth' ? 'AUM Growth %' : getProductName(value)}
                        </span>
                      )}
                    />
                    {chartProductIds.map((productId, i) => (
                      <Line
                        key={productId}
                        yAxisId="aum"
                        type="monotone"
                        dataKey={productId}
                        stroke={fundColors[i % fundColors.length]}
                        strokeWidth={2.5}
                        dot={{ fill: fundColors[i % fundColors.length], r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    <Line
                      yAxisId="growth"
                      type="monotone"
                      dataKey="growth"
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Allocation Requests */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center justify-between">
                Pending Allocation Requests
                <Badge variant="outline" className="bg-[#b38922]/25 text-gold-bright">
                  {allocationRequests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allocationRequests.length > 0 ? (
                <div className="space-y-4">
                  {allocationRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="border border-[#ccab6c]/25 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{request.investor_email}</p>
                          <p className="text-sm text-gold/90">
                            Product: {products.find(p => p.id === request.product_id)?.name ?? '—'}
                          </p>
                          <p className="text-sm text-gold/90">
                            Amount: ${request.requested_amount?.toLocaleString()}
                          </p>
                          {request.lock_in_months && (
                            <p className="text-xs text-muted-foreground">Lock-in: {request.lock_in_months} months</p>
                          )}
                          {request.subscription_date && (
                            <p className="text-xs text-muted-foreground">Sub. date: {request.subscription_date}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gold/70 hover:text-foreground"
                          onClick={() => openEditDialog(request)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAllocationRequest(request.id, 'approved')}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-900"
                          onClick={() => handleAllocationRequest(request.id, 'rejected')}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gold/90 text-center py-8">No pending requests</p>
              )}
            </CardContent>
          </Card>

          {/* Open Support Tickets */}
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center justify-between">
                Open Support Tickets
                <Badge variant="outline" className="bg-red-900 text-red-400">
                  {supportTickets.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supportTickets.length > 0 ? (
                <div className="space-y-4">
                  {supportTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="border border-[#ccab6c]/25 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{ticket.subject}</p>
                          <p className="text-sm text-gold/90">{ticket.investor_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${
                            ticket.priority === 'urgent' ? 'border-red-400 text-red-400' :
                            ticket.priority === 'high' ? 'border-orange-400 text-orange-400' :
                            ticket.priority === 'medium' ? 'border-[#b38922] text-gold-bright' :
                            'border-[#ccab6c]/45 text-gold/90'
                          }`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gold/90 text-center py-8">No open tickets</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Allocation Request Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => { if (!open) setEditingRequest(null); }}>
        <DialogContent className="bg-card border border-[#ccab6c]/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Allocation Request</DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">{editingRequest?.investor_email}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Product */}
            <div>
              <Label className="text-foreground/80">Product</Label>
              <Select
                value={editForm.product_id}
                onValueChange={(v) => setEditForm(f => ({ ...f, product_id: v }))}
              >
                <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.status === 'active' && p.is_public).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-foreground/80">Requested Amount (USD)</Label>
              <Input
                type="number"
                min={products.find(p => p.id === (editForm.product_id || editingRequest?.product_id))?.minimum_ticket ?? 0}
                step="0.01"
                value={editForm.requested_amount}
                onChange={(e) => setEditForm(f => ({ ...f, requested_amount: e.target.value }))}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
              {(() => {
                const prod = products.find(p => p.id === (editForm.product_id || editingRequest?.product_id));
                const amt = parseFloat(editForm.requested_amount);
                if (!prod) return null;
                const belowMin = amt < prod.minimum_ticket;
                return (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${belowMin ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {belowMin && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                    {belowMin
                      ? `Below minimum ticket of $${prod.minimum_ticket.toLocaleString()}`
                      : `Minimum ticket: $${prod.minimum_ticket.toLocaleString()}`}
                  </p>
                );
              })()}
            </div>

            {/* Lock-in period */}
            <div>
              <Label className="text-foreground/80">Lock-in Period Override</Label>
              <Select
                value={editForm.lock_in_months ? String(editForm.lock_in_months) : 'default'}
                onValueChange={(v) => setEditForm(f => ({ ...f, lock_in_months: v === 'default' ? '' : v }))}
              >
                <SelectTrigger className="bg-muted border-[#ccab6c]/20 mt-1">
                  <SelectValue placeholder="Use product default…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use product default</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscription date */}
            <div>
              <Label className="text-foreground/80">Subscription Date</Label>
              <Input
                type="date"
                value={editForm.subscription_date}
                onChange={(e) => setEditForm(f => ({ ...f, subscription_date: e.target.value }))}
                className="bg-muted border-[#ccab6c]/20 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
            <Button
              className="bg-[#fedea0] text-black hover:bg-[#ccab6c]"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editForm.requested_amount || !editForm.product_id}
            >
              {isSavingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
