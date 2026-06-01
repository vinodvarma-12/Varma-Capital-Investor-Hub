import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { AllocationRequest } from "@/entities/AllocationRequest";
import { SupportTicket } from "@/entities/SupportTicket";
import { AuditLog } from "@/entities/AuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Shield,
  Activity,
  UserCheck,
  FileText,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, endOfMonth } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function SuperAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [allocationRequests, setAllocationRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [growthPeriod, setGrowthPeriod] = useState('6M');

  useEffect(() => {
    loadSuperAdminData();
  }, []);

  const loadSuperAdminData = async () => {
    try {
      const [usersData, investmentsData, productsData, requestsData, ticketsData, logsData] = await Promise.all([
        User.list(),
        Investment.list('-created_date', 100),
        Product.list(),
        AllocationRequest.filter({ status: 'pending' }),
        SupportTicket.filter({ status: 'open' }),
        AuditLog.list('-created_date', 50)
      ]);

      setUsers(usersData);
      setInvestments(investmentsData);
      setProducts(productsData);
      setAllocationRequests(requestsData);
      setSupportTickets(ticketsData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error("Error loading super admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationRequest = async (requestId, status, notes = '') => {
    try {
      await AllocationRequest.update(requestId, {
        status,
        admin_notes: notes,
        reviewed_by: (await User.me()).email,
        reviewed_date: new Date().toISOString().split('T')[0]
      });
      loadSuperAdminData();
    } catch (error) {
      console.error("Error updating allocation request:", error);
    }
  };

  const calculateMetrics = () => {
    const totalInvestors = users.filter(u => u.role === 'investor').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const totalSuperAdmins = users.filter(u => u.role === 'super_admin').length;
    const totalAUM = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const activeProducts = products.filter(p => p.status === 'active').length;
    const pendingRequests = allocationRequests.length;
    const openTickets = supportTickets.length;

    return { 
      totalInvestors, 
      totalAdmins, 
      totalSuperAdmins, 
      totalAUM, 
      activeProducts, 
      pendingRequests,
      openTickets
    };
  };

  const metrics = calculateMetrics();

  // Build real chart data from investments and users, respecting growthPeriod
  const activeInvestments = investments.filter(inv => inv.status === 'active');

  const chartData = (() => {
    let monthCount;
    if (growthPeriod === '3M') monthCount = 3;
    else if (growthPeriod === '6M') monthCount = 6;
    else if (growthPeriod === '1Y') monthCount = 12;
    else {
      // 'All' — span from earliest purchase_date or created_date to now
      const invDates = activeInvestments
        .filter(inv => inv.purchase_date)
        .map(inv => new Date(inv.purchase_date));
      const userDates = users
        .filter(u => u.created_date)
        .map(u => new Date(u.created_date));
      const allDates = [...invDates, ...userDates];
      if (allDates.length === 0) monthCount = 6;
      else {
        const earliest = new Date(Math.min(...allDates));
        const now = new Date();
        monthCount = Math.max(1, Math.ceil((now - earliest) / (1000 * 60 * 60 * 24 * 30)));
      }
    }

    const now = new Date();
    return Array.from({ length: monthCount + 1 }, (_, i) => {
      const monthDate = subMonths(now, monthCount - i);
      const cutoff = endOfMonth(monthDate);
      const label = format(monthDate, 'MMM yy');

      const aum = activeInvestments
        .filter(inv => !inv.purchase_date || new Date(inv.purchase_date) <= cutoff)
        .reduce((sum, inv) => sum + (parseFloat(inv.invested_amount) || 0), 0);

      const userCount = users.filter(u =>
        !u.created_date || new Date(u.created_date) <= cutoff
      ).length;

      return { month: label, aum, users: userCount };
    });
  })();

  if (loading) {
    return <LoadingSpinner message="Loading super admin dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-gold-bright" />
            Super Admin Dashboard
          </h1>
          <p className="text-gold/90">Complete system overview and administrative controls</p>
        </div>

        <div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{users.length}</div>
              <div className="text-sm text-gold/90 mt-1">
                {metrics.totalInvestors} Investors • {metrics.totalAdmins} Admins • {metrics.totalSuperAdmins} Super Admins
              </div>
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
              <div className="text-sm text-gold/90 mt-1">
                Across {metrics.activeProducts} active products
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold-bright">{metrics.pendingRequests}</div>
              <div className="text-sm text-gold/90 mt-1">
                Allocation requests awaiting review
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gold/90 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Support Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{metrics.openTickets}</div>
              <div className="text-sm text-gold/90 mt-1">
                Open support tickets
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Growth Chart */}
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Platform Growth
                </CardTitle>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {['3M', '6M', '1Y', 'All'].map(p => (
                    <button
                      key={p}
                      onClick={() => setGrowthPeriod(p)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        growthPeriod === p
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
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <YAxis yAxisId="aum" stroke="#6b7280" tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`}
                    />
                    <YAxis yAxisId="users" orientation="right" stroke="#6b7280" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ccab6c50', borderRadius: '8px', color: '#fff', fontSize: 13 }}
                      formatter={(value, name) => name === 'aum' ? [`$${Number(value).toLocaleString()}`, 'AUM'] : [value, 'Users']}
                    />
                    <Legend formatter={v => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{v === 'aum' ? 'AUM' : 'Users'}</span>} />
                    <Line yAxisId="aum" type="monotone" dataKey="aum" stroke="#FFD700" strokeWidth={2.5}
                      dot={{ fill: '#FFD700', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="aum"
                    />
                    <Line yAxisId="users" type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2.5}
                      dot={{ fill: '#10B981', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Roles Breakdown */}
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                User Access Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-red-400" />
                    <span className="text-foreground font-medium">Super Admins</span>
                  </div>
                  <Badge className="bg-red-600 text-foreground">{metrics.totalSuperAdmins}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-foreground font-medium">Admins</span>
                  </div>
                  <Badge className="bg-blue-600 text-foreground">{metrics.totalAdmins}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-green-400" />
                    <span className="text-foreground font-medium">Investors</span>
                  </div>
                  <Badge className="bg-green-600 text-foreground">{metrics.totalInvestors}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Required & Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Allocation Requests */}
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
                        <div>
                          <p className="font-medium text-foreground">{request.investor_email}</p>
                          <p className="text-sm text-gold/90">
                            Product: {products.find(p => p.id === request.product_id)?.name}
                          </p>
                          <p className="text-sm text-gold/90">
                            Amount: ${request.requested_amount?.toLocaleString()}
                          </p>
                        </div>
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

          {/* Recent System Activity */}
          <Card className="bg-card border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-[#ccab6c]/25 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-foreground text-sm">
                        <span className="font-medium">{log.user_email}</span>
                        <span className="text-gold/90 mx-2">•</span>
                        <span className="capitalize">{log.action}</span>
                        <span className="text-gold/90 mx-2">•</span>
                        <span className="text-gold/90">{log.entity_type}</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(log.created_date), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {log.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
