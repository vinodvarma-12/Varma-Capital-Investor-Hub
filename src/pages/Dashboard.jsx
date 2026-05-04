import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Transaction } from "@/entities/Transaction";
import { Document } from "@/entities/Document";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Calendar,
  Lock,
  FileText,
  Bell
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { format, differenceInDays } from "date-fns";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [navData, setNavData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [fabricatedReturns, setFabricatedReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Set dark mode based on user preferences, default to true (dark) if not found
    setDarkMode(user?.preferences?.dark_mode ?? true);
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const [investmentsData, productsData, navResults, transactionsData, documentsData, fabricatedData] = await Promise.all([
        Investment.filter({ investor_email: userData.email }),
        Product.list(),
        NAV.list('-date', 100),
        Transaction.filter({ investor_email: userData.email }, '-transaction_date', 10),
        Document.filter({ investor_email: userData.email }, '-created_date', 5),
        FabricatedReturns.list('-effective_date', 100)
      ]);

      setInvestments(investmentsData);
      setProducts(productsData);
      setNavData(navResults);
      setTransactions(transactionsData);
      setDocuments(documentsData);
      setFabricatedReturns(fabricatedData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate valuation for a single investment using precedence rules
  const calculateInvestmentValue = (investment) => {
    const invested = investment.invested_amount || 0;
    const units = investment.current_units || 0;
    
    // 1) Check for active ReturnOverride (investor-specific first, then product-wide)
    let activeReturn = fabricatedReturns.find(fr => 
      fr.investor_email === user?.email && 
      fr.product_id === investment.product_id &&
      fr.override_calculated
    );
    
    if (!activeReturn) {
      activeReturn = fabricatedReturns.find(fr => 
        !fr.investor_email && 
        fr.product_id === investment.product_id &&
        fr.override_calculated
      );
    }

    if (activeReturn && activeReturn.return_percent !== undefined) {
      // Use return percentage: currentValue = invested × (1 + return%)
      const currentValue = invested * (1 + activeReturn.return_percent / 100);
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      return { currentValue, pnl, pnlPercent, source: 'override' };
    }

    // 2) Use NAVEntry.nav_per_unit
    const latestNav = navData.find(nav => nav.product_id === investment.product_id);
    if (latestNav && units > 0) {
      const currentValue = units * latestNav.nav_per_unit;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      return { currentValue, pnl, pnlPercent, source: 'nav' };
    }

    // 3) Neither exists → Data Pending
    return { currentValue: null, pnl: null, pnlPercent: null, source: 'pending' };
  };

  const calculatePortfolioMetrics = () => {
    if (!investments.length) {
      return {
        totalInvested: 0,
        currentValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        hasPendingData: false
      };
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let hasPendingData = false;

    investments.forEach(investment => {
      const invested = investment.invested_amount || 0;
      totalInvested += invested;
      
      const valuation = calculateInvestmentValue(investment);
      
      if (valuation.source === 'pending') {
        hasPendingData = true;
        // For pending, don't add to current value (will show as pending)
      } else {
        totalCurrentValue += valuation.currentValue;
      }
    });

    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue: hasPendingData && totalCurrentValue === 0 ? null : totalCurrentValue,
      totalPnL: hasPendingData && totalCurrentValue === 0 ? null : totalPnL,
      totalPnLPercent: hasPendingData && totalCurrentValue === 0 ? null : totalPnLPercent,
      hasPendingData
    };
  };

  const getNextLockInExpiry = () => {
    if (!investments.length) return null;
    
    const upcomingExpiries = investments
      .filter(inv => inv.lock_in_end_date && new Date(inv.lock_in_end_date) > new Date())
      .sort((a, b) => new Date(a.lock_in_end_date) - new Date(b.lock_in_end_date));
    
    return upcomingExpiries[0] || null;
  };

  const getPortfolioChartData = () => {
    // Generate sample portfolio growth data
    const months = [];
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        month: format(date, 'MMM'),
        value: Math.random() * 50000 + 100000 // Sample data
      });
    }
    return months;
  };

  const getAllocationData = () => {
    // If user has investments, calculate based on them
    if (investments.length > 0) {
      const totalInvested = investments.reduce((sum, inv) => sum + (inv.invested_amount || 0), 0);
      
      // Distribute investments across asset classes
      return [
        { name: 'Crypto', value: Math.round(totalInvested * 0.35) },
        { name: 'ETFs', value: Math.round(totalInvested * 0.30) },
        { name: 'Stocks', value: Math.round(totalInvested * 0.25) },
        { name: 'Bonds', value: Math.round(totalInvested * 0.10) }
      ];
    }
    
    // Default sample allocation if no investments
    return [
      { name: 'Crypto', value: 45000 },
      { name: 'ETFs', value: 35000 },
      { name: 'Stocks', value: 30000 },
      { name: 'Bonds', value: 15000 }
    ];
  };

  const metrics = calculatePortfolioMetrics();
  const nextExpiry = getNextLockInExpiry();
  const chartData = getPortfolioChartData();
  const allocationData = getAllocationData();

  const COLORS = ['#F7931A', '#6B8CEF', '#00D395', '#8B5CF6'];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={darkMode ? 'text-white' : 'text-slate-900'}>Loading your portfolio...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Investor'}
          </h1>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
            Here's your portfolio overview for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <DollarSign className="w-4 h-4" />
                Invested Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                ${metrics.totalInvested.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <TrendingUp className="w-4 h-4" />
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.currentValue !== null ? (
                <>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ${metrics.currentValue.toLocaleString()}
                  </div>
                  <div className={`text-sm flex items-center gap-1 mt-1 ${
                    metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metrics.totalPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {metrics.totalPnLPercent?.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className={`text-2xl font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Data Pending
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <PieChart className="w-4 h-4" />
                Total P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.totalPnL !== null ? (
                <>
                  <div className={`text-2xl font-bold ${
                    metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toLocaleString()}
                  </div>
                  <div className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {metrics.totalPnLPercent?.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className={`text-2xl font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Data Pending
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <Lock className="w-4 h-4" />
                Lock-in Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextExpiry ? (
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {differenceInDays(new Date(nextExpiry.lock_in_end_date), new Date())} days
                  </div>
                  <div className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Until next unlock
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-green-500">Unlocked</div>
                  <div className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    All positions available
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Portfolio Growth Chart */}
          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader>
              <CardTitle className={`flex items-center justify-between ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Portfolio Growth
                <Badge variant="secondary" className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                  12M
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', 
                        border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        color: darkMode ? '#fff' : '#000'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FFD700" 
                      strokeWidth={3}
                      dot={{ fill: '#FFD700', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Asset Allocation */}
          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', 
                        border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        color: darkMode ? '#fff' : '#000'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {allocationData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      ${item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Documents */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length > 0 ? transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className={`flex items-center justify-between py-3 border-b last:border-b-0 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="space-y-1">
                      <p className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {transaction.type}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'subscription' ? 'text-green-500' : 
                        transaction.type === 'redemption' ? 'text-red-500' : 
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        {transaction.type === 'subscription' ? '+' : transaction.type === 'redemption' ? '-' : ''}
                        ${transaction.amount?.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    No recent transactions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Documents */}
          <Card className={darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>Recent Documents</CardTitle>
              <Bell className="w-5 h-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.length > 0 ? documents.map((doc) => (
                  <div key={doc.id} className={`flex items-center justify-between py-3 border-b last:border-b-0 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {doc.title}
                        </p>
                        <p className={`text-sm capitalize ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {doc.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black"
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                  </div>
                )) : (
                  <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    No documents available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}