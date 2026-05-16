import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Transaction } from "@/entities/Transaction";
import { Document } from "@/entities/Document";
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
import {
  GOLD_LIGHT,
  GOLD_MID,
  GOLD_DEEP,
  GOLD_DEEPER,
  ALLOCATION_COLORS,
} from "@/lib/varmaTheme";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [navData, setNavData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [chartTimeline, setChartTimeline] = useState('1Y');

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

      const [investmentsData, productsData, navResults, transactionsData, documentsData] = await Promise.all([
        Investment.filter({ investor_email: userData.email }),
        Product.list(),
        NAV.list('-date', 100),
        Transaction.filter({ investor_email: userData.email }, '-transaction_date', 10),
        Document.filter({ investor_email: userData.email }, '-created_date', 5),
      ]);

      setInvestments(investmentsData);
      setProducts(productsData);
      setNavData(navResults);
      setTransactions(transactionsData);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate valuation for a single investment using NAV
  const calculateInvestmentValue = (investment) => {
    const invested = investment.invested_amount || 0;
    const units = investment.current_units || 0;

    const latestNav = navData.find(nav => nav.product_id === investment.product_id);
    if (latestNav && units > 0) {
      const currentValue = units * latestNav.nav_per_unit;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      return { currentValue, pnl, pnlPercent, source: 'nav' };
    }

    // No NAV data → Data Pending
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
    const currentDate = new Date();
    let monthsBack;

    switch (chartTimeline) {
      case '6M':  monthsBack = 6;  break;
      case 'YTD': monthsBack = currentDate.getMonth(); break; // months since Jan 1
      case '5Y':  monthsBack = 60; break;
      case '1Y':
      default:    monthsBack = 12; break;
    }

    // Ensure at least 1 data point
    if (monthsBack < 1) monthsBack = 1;

    const months = [];
    for (let i = monthsBack; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push({
        month: chartTimeline === '5Y' ? format(date, 'MMM yy') : format(date, 'MMM'),
        value: Math.random() * 50000 + 100000, // Sample data — replace with real NAV later
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

  const TIMELINE_OPTIONS = [
    { key: '6M',  label: '6M' },
    { key: '1Y',  label: '1Y' },
    { key: 'YTD', label: 'YTD' },
    { key: '5Y',  label: '5Y' },
  ];

  const cardSurface = darkMode
    ? "bg-zinc-950 border border-[#ccab6c]/30"
    : "bg-white border border-[#ccab6c]/45 shadow-sm";
  const rowDivider = darkMode ? "border-[#ccab6c]/20" : "border-[#ccab6c]/25";
  const subtitle = darkMode ? "text-[#ccab6c]/85" : "text-stone-600";
  const kpiLabel = darkMode ? "text-gold/90" : "text-stone-600";
  const kpiValue = darkMode ? "text-gold-bright" : "text-stone-900";
  const sectionTitle = darkMode ? "text-white" : "text-stone-900";
  const bodyMuted = darkMode ? "text-zinc-400" : "text-stone-600";
  const legendMuted = darkMode ? "text-zinc-300" : "text-stone-700";
  const pendingMuted = darkMode ? "text-zinc-500" : "text-stone-400";
  const neutralAmount = darkMode ? "text-zinc-300" : "text-stone-700";

  const tooltipStyle = {
    backgroundColor: darkMode ? "#0c0c0c" : "#FFFFFF",
    border: `1px solid ${darkMode ? `${GOLD_MID}55` : `${GOLD_MID}90`}`,
    borderRadius: "8px",
    color: darkMode ? "#fafafa" : "#1c1917",
  };

  if (loading) {
    return <LoadingSpinner message="Loading your portfolio..." />;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div
          className="space-y-2 rounded-2xl px-3 py-4 sm:px-4"
          style={{
            background: darkMode
              ? "radial-gradient(ellipse 120% 200% at 50% 0%, rgba(254, 222, 160, 0.08), transparent 55%)"
              : "radial-gradient(ellipse 120% 200% at 50% 0%, rgba(204, 171, 108, 0.14), transparent 55%)",
          }}
        >
          <h1 className={`text-3xl font-bold ${sectionTitle}`}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Investor'}
          </h1>
          <p className={subtitle}>
            Here's your portfolio overview for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className={cardSurface}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${kpiLabel}`}>
                <DollarSign className="w-4 h-4 shrink-0 text-[#b38922]" />
                Invested Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpiValue}`}>
                ${metrics.totalInvested.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className={cardSurface}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${kpiLabel}`}>
                <TrendingUp className="w-4 h-4 shrink-0 text-[#b38922]" />
                Current Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.currentValue !== null ? (
                <>
                  <div className={`text-2xl font-bold ${kpiValue}`}>
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
                <div className={`text-2xl font-bold ${pendingMuted}`}>
                  Data Pending
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardSurface}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${kpiLabel}`}>
                <PieChart className="w-4 h-4 shrink-0 text-[#b38922]" />
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
                  <div className={`text-sm mt-1 ${bodyMuted}`}>
                    {metrics.totalPnLPercent?.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className={`text-2xl font-bold ${pendingMuted}`}>
                  Data Pending
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cardSurface}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-sm font-medium flex items-center gap-2 ${kpiLabel}`}>
                <Lock className="w-4 h-4 shrink-0 text-[#b38922]" />
                Lock-in Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextExpiry ? (
                <div>
                  <div className={`text-2xl font-bold ${kpiValue}`}>
                    {differenceInDays(new Date(nextExpiry.lock_in_end_date), new Date())} days
                  </div>
                  <div className={`text-sm mt-1 ${bodyMuted}`}>
                    Until next unlock
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-green-500">Unlocked</div>
                  <div className={`text-sm mt-1 ${bodyMuted}`}>
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
          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className={`flex items-center justify-between ${sectionTitle}`}>
                Portfolio Growth
                <div className="flex items-center gap-1">
                  {TIMELINE_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setChartTimeline(key)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        chartTimeline === key
                          ? darkMode
                            ? 'bg-[#b38922]/40 text-gold-bright border border-[#ccab6c]/60'
                            : 'bg-[#fedea0] text-[#8a6818] border border-[#b38922]/50'
                          : darkMode
                            ? 'text-[#ccab6c]/60 hover:text-[#fedea0] hover:bg-[#b38922]/20'
                            : 'text-stone-500 hover:text-[#8a6818] hover:bg-[#fedea0]/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${GOLD_MID}33`} />
                    <XAxis dataKey="month" stroke={GOLD_MID} tick={{ fill: darkMode ? GOLD_MID : GOLD_DEEPER }} />
                    <YAxis stroke={GOLD_MID} tick={{ fill: darkMode ? GOLD_MID : GOLD_DEEPER }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={GOLD_DEEP}
                      strokeWidth={3}
                      dot={{ fill: GOLD_LIGHT, stroke: GOLD_DEEP, strokeWidth: 2, r: 4 }}
                      activeDot={{ fill: GOLD_LIGHT, stroke: GOLD_DEEP, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Asset Allocation */}
          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className={sectionTitle}>Asset Allocation</CardTitle>
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
                        <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {allocationData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}
                      />
                      <span className={`text-sm ${legendMuted}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${darkMode ? "text-gold-bright" : "text-stone-900"}`}>
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
          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className={sectionTitle}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.length > 0 ? transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className={`flex items-center justify-between py-3 border-b last:border-b-0 ${rowDivider}`}>
                    <div className="space-y-1">
                      <p className={`font-medium capitalize ${sectionTitle}`}>
                        {transaction.type}
                      </p>
                      <p className={`text-sm ${bodyMuted}`}>
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'subscription' ? 'text-green-500' :
                        transaction.type === 'redemption' ? 'text-red-500' :
                        neutralAmount
                      }`}>
                        {transaction.type === 'subscription' ? '+' : transaction.type === 'redemption' ? '-' : ''}
                        ${transaction.amount?.toLocaleString()}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${darkMode ? "border-[#ccab6c]/50 text-gold" : "border-[#b38922]/45 text-[#8a6818]"}`}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <p className={`text-center py-8 ${bodyMuted}`}>
                    No recent transactions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Documents */}
          <Card className={cardSurface}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={sectionTitle}>Recent Documents</CardTitle>
              <Bell className="w-5 h-5 text-gold-bright" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.length > 0 ? documents.map((doc) => (
                  <div key={doc.id} className={`flex items-center justify-between py-3 border-b last:border-b-0 ${rowDivider}`}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gold-bright" />
                      <div>
                        <p className={`font-medium ${sectionTitle}`}>
                          {doc.title}
                        </p>
                        <p className={`text-sm capitalize ${bodyMuted}`}>
                          {doc.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        darkMode
                          ? "border-[#b38922] text-gold-bright hover:bg-[#b38922]/25 hover:text-[#fedea0]"
                          : "border-[#b38922] text-[#8a6818] hover:bg-[#fedea0]/40 hover:text-[#5c4510]"
                      }
                    >
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                  </div>
                )) : (
                  <p className={`text-center py-8 ${bodyMuted}`}>
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