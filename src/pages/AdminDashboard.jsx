import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { AllocationRequest } from "@/entities/AllocationRequest";
import { SupportTicket } from "@/entities/SupportTicket";
import { Transaction } from "@/entities/Transaction";
import { NAV } from "@/entities/NAV";
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
  AlertCircle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [allocationRequests, setAllocationRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);

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

          // Calculate lock-in end date from product
          let lockInEndDate = null;
          if (product?.lock_in_months) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + product.lock_in_months);
            lockInEndDate = endDate.toISOString().split('T')[0];
          }

          // Create investment (holding)
          await Investment.create({
            investor_email: request.investor_email,
            product_id: request.product_id,
            invested_amount: request.requested_amount,
            current_units: currentUnits,
            cost_basis: request.requested_amount,
            purchase_date: today,
            lock_in_months: product?.lock_in_months || null,
            lock_in_end_date: lockInEndDate,
            status: 'active',
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
    const totalAUM = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
    const activeProducts = products.filter(p => p.status === 'active').length;
    const pendingRequests = allocationRequests.length;

    return { totalInvestors, totalAUM, activeProducts, pendingRequests };
  };

  const metrics = calculateMetrics();

  const chartData = [
    { month: 'Jan', aum: 1200000 },
    { month: 'Feb', aum: 1350000 },
    { month: 'Mar', aum: 1480000 },
    { month: 'Apr', aum: 1620000 },
    { month: 'May', aum: 1750000 },
    { month: 'Jun', aum: 1890000 },
  ];

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

        {/* AUM Growth Chart */}
        <Card className="bg-card border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              AUM Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'AUM']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="aum" 
                    stroke="#FFD700" 
                    strokeWidth={3}
                    dot={{ fill: '#FFD700', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
    </div>
  );
}
