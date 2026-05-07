import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { AllocationRequest } from "@/entities/AllocationRequest";
import { SupportTicket } from "@/entities/SupportTicket";
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
      const [usersData, investmentsData, productsData, requestsData, ticketsData] = await Promise.all([
        User.list(),
        Investment.list('-created_date', 100),
        Product.list(),
        AllocationRequest.filter({ status: 'pending' }),
        SupportTicket.filter({ status: 'open' })
      ]);

      setUsers(usersData);
      setInvestments(investmentsData);
      setProducts(productsData);
      setAllocationRequests(requestsData);
      setSupportTickets(ticketsData);
    } catch (error) {
      console.error("Error loading admin data:", error);
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
      loadAdminData();
    } catch (error) {
      console.error("Error updating allocation request:", error);
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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-[#ccab6c]/90">Manage your investor portal and monitor key metrics</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#ccab6c]/90 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Investors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics.totalInvestors}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#ccab6c]/90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total AUM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${metrics.totalAUM.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#ccab6c]/90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Active Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{metrics.activeProducts}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#ccab6c]/90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#fedea0]">{metrics.pendingRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* AUM Growth Chart */}
        <Card className="bg-zinc-950 border border-[#ccab6c]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
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
          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Pending Allocation Requests
                <Badge variant="outline" className="bg-[#b38922]/25 text-[#fedea0]">
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
                          <p className="font-medium text-white">{request.investor_email}</p>
                          <p className="text-sm text-[#ccab6c]/90">
                            Product: {products.find(p => p.id === request.product_id)?.name}
                          </p>
                          <p className="text-sm text-[#ccab6c]/90">
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
                <p className="text-[#ccab6c]/90 text-center py-8">No pending requests</p>
              )}
            </CardContent>
          </Card>

          {/* Open Support Tickets */}
          <Card className="bg-zinc-950 border border-[#ccab6c]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
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
                          <p className="font-medium text-white">{ticket.subject}</p>
                          <p className="text-sm text-[#ccab6c]/90">{ticket.investor_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${
                            ticket.priority === 'urgent' ? 'border-red-400 text-red-400' :
                            ticket.priority === 'high' ? 'border-orange-400 text-orange-400' :
                            ticket.priority === 'medium' ? 'border-[#b38922] text-[#fedea0]' :
                            'border-[#ccab6c]/45 text-[#ccab6c]/90'
                          }`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300 mb-3 line-clamp-2">
                        {ticket.description}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#ccab6c]/90 text-center py-8">No open tickets</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}