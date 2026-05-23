import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Transaction } from "@/entities/Transaction";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download, Lock, Unlock } from "lucide-react";
import { format, isAfter } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Portfolio() {
  const [user, setUser] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [products, setProducts] = useState([]);
  const [navData, setNavData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fabricatedReturns, setFabricatedReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const [investmentsData, navResults, transactionsData, fabricatedData] = await Promise.all([
        Investment.filter({ investor_email: userData.email }),
        NAV.list('-date', 200),
        Transaction.filter({ investor_email: userData.email }, '-transaction_date', 50),
        FabricatedReturns.filter({ investor_email: userData.email }),
      ]);

      // Fetch products by the exact IDs in this investor's investments
      // — avoids RLS filtering out products that aren't "visible" but still need their name
      const productIds = [...new Set(investmentsData.map(inv => inv.product_id).filter(Boolean))];
      let productsData = [];
      if (productIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, status')
          .in('id', productIds);
        productsData = data ?? [];
      }

      setInvestments(investmentsData);
      setProducts(productsData);
      setNavData(navResults);
      setTransactions(transactionsData);
      setFabricatedReturns(fabricatedData);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  // Parse a date string (YYYY-MM-DD or ISO) as a LOCAL date — avoids UTC timezone shifts
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const s = typeof dateStr === 'string' ? dateStr.slice(0, 10) : String(dateStr);
    const [year, month, day] = s.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Returns the adjusted current value for an investment, accounting for:
  // - Mid-month joins (prorated return for the first period)
  // - Per-investor overrides (fabricated_returns)
  // - Full monthly returns for all subsequent periods
  const getAdjustedCurrentValue = (investment) => {
    if (!investment.invested_amount) return 0;

    // Get all NAV records for this product, sorted oldest → newest
    const productNavs = navData
      .filter(n => n.product_id === investment.product_id)
      .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    // If no NAV records at all, return invested amount
    if (productNavs.length === 0) return investment.invested_amount;

    // If only inception record (1 record), return invested amount — no return period yet
    if (productNavs.length < 2) return investment.invested_amount;

    // Overrides for this investor + product
    const overrides = fabricatedReturns.filter(
      fr => fr.product_id === investment.product_id
    );

    const purchaseDate = investment.purchase_date
      ? parseLocalDate(investment.purchase_date)
      : parseLocalDate(productNavs[0].date); // fallback to inception date

    let value = investment.invested_amount;

    for (let i = 1; i < productNavs.length; i++) {
      const prevNav = productNavs[i - 1];
      const currNav = productNavs[i];
      const prevDate = parseLocalDate(prevNav.date);
      const currDate = parseLocalDate(currNav.date);

      // Skip periods that ended before or on the day this investment started
      if (currDate <= purchaseDate) continue;

      // Official return for this period — calculated from actual NAV values
      const prevNavUnit = parseFloat(prevNav.nav_per_unit) || 0;
      const currNavUnit = parseFloat(currNav.nav_per_unit) || 0;
      const officialReturn = prevNavUnit > 0
        ? ((currNavUnit - prevNavUnit) / prevNavUnit) * 100
        : parseFloat(currNav.return_percent) || 0;

      // Check if there's an admin override for this period
      const periodKey = format(prevDate, 'yyyy-MM');
      const override = overrides.find(fr =>
        fr.period === periodKey ||
        (fr.effective_date && fr.effective_date.slice(0, 7) === periodKey)
      );

      let returnPct;
      if (override) {
        // Admin-set override takes priority
        returnPct = (override.return_percent || 0) / 100;
      } else if (purchaseDate > prevDate && purchaseDate < currDate) {
        // Investor joined mid-period — auto-prorate by days
        const totalPeriodDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
        const daysInFund = Math.round((currDate - purchaseDate) / (1000 * 60 * 60 * 24));
        returnPct = totalPeriodDays > 0
          ? (officialReturn * (daysInFund / totalPeriodDays)) / 100
          : 0;
      } else {
        // Full period — apply the official return
        returnPct = officialReturn / 100;
      }

      value = value * (1 + returnPct);
    }

    return Math.round(value * 100) / 100;
  };

  const getPnL = (investment) => {
    const currentValue = getAdjustedCurrentValue(investment);
    const investedAmount = investment.invested_amount || 0;
    return {
      amount: currentValue - investedAmount,
      percent: investedAmount > 0 ? ((currentValue - investedAmount) / investedAmount) * 100 : 0,
    };
  };

  const isLocked = (investment) => {
    if (!investment.lock_in_end_date) return false;
    return !isAfter(new Date(), new Date(investment.lock_in_end_date));
  };

  const enrichedInvestments = investments.map(investment => ({
    ...investment,
    productName: getProductName(investment.product_id),
    currentValue: getAdjustedCurrentValue(investment),
    pnl: getPnL(investment),
    locked: isLocked(investment)
  }));

  if (loading) {
    return <LoadingSpinner message="Loading your portfolio..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Portfolio Overview</h1>
          <p className="text-gold/90">Detailed view of your investments and transactions</p>
        </div>

        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList className="bg-muted border-[#ccab6c]/20">
            <TabsTrigger value="holdings" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card className="bg-card border border-[#ccab6c]/30">
              <CardHeader>
                <CardTitle className="text-foreground">Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedInvestments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#ccab6c]/25">
                          <TableHead className="text-gold/90">Product</TableHead>
                          <TableHead className="text-gold/90">Units</TableHead>
                          <TableHead className="text-gold/90">Cost Basis</TableHead>
                          <TableHead className="text-gold/90">Current Value</TableHead>
                          <TableHead className="text-gold/90">P&L</TableHead>
                          <TableHead className="text-gold/90">Status</TableHead>
                          <TableHead className="text-gold/90">Lock-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedInvestments.map((investment) => (
                          <TableRow key={investment.id} className="border-[#ccab6c]/25">
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{investment.productName}</p>
                                <p className="text-sm text-gold/90">
                                  Purchased: {format(new Date(investment.purchase_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {investment.current_units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              ${investment.invested_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              ${investment.currentValue.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className={`font-medium ${
                                  investment.pnl.amount >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {investment.pnl.amount >= 0 ? '+' : ''}${investment.pnl.amount.toLocaleString()}
                                </p>
                                <div className={`flex items-center gap-1 text-sm ${
                                  investment.pnl.percent >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {investment.pnl.percent >= 0 ? 
                                    <TrendingUp className="w-3 h-3" /> : 
                                    <TrendingDown className="w-3 h-3" />
                                  }
                                  {investment.pnl.percent.toFixed(2)}%
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={investment.status === 'active' ? 'default' : 'secondary'}>
                                {investment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {investment.locked ? (
                                  <>
                                    <Lock className="w-4 h-4 text-red-400" />
                                    <div className="text-sm">
                                      <p className="text-red-400">Locked</p>
                                      <p className="text-gold/90">
                                        Until {format(new Date(investment.lock_in_end_date), 'MMM dd, yyyy')}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 text-sm">Unlocked</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gold/90 text-lg">No investments found</p>
                    <p className="text-muted-foreground text-sm mt-2">Start investing to see your portfolio here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-card border border-[#ccab6c]/30">
              <CardHeader>
                <CardTitle className="text-foreground">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#ccab6c]/25">
                          <TableHead className="text-gold/90">Date</TableHead>
                          <TableHead className="text-gold/90">Product</TableHead>
                          <TableHead className="text-gold/90">Type</TableHead>
                          <TableHead className="text-gold/90">Units</TableHead>
                          <TableHead className="text-gold/90">NAV per Unit</TableHead>
                          <TableHead className="text-gold/90">Amount</TableHead>
                          <TableHead className="text-gold/90">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id} className="border-[#ccab6c]/25">
                            <TableCell className="text-foreground/80">
                              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {getProductName(transaction.product_id)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`capitalize ${
                                  transaction.type === 'subscription' ? 'border-green-400 text-green-400' :
                                  transaction.type === 'redemption' ? 'border-red-400 text-red-400' :
                                  'border-[#ccab6c]/45 text-gold/90'
                                }`}
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {transaction.units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '-'}
                            </TableCell>
                            <TableCell className="text-foreground/80">
                              {transaction.nav_per_unit ? `$${transaction.nav_per_unit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className={`font-medium ${
                              transaction.type === 'subscription' ? 'text-green-400' : 
                              transaction.type === 'redemption' ? 'text-red-400' : 'text-foreground/80'
                            }`}>
                              {transaction.type === 'subscription' ? '+' : transaction.type === 'redemption' ? '-' : ''}
                              ${transaction.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                                className={
                                  transaction.status === 'completed' ? 'bg-green-900 text-green-400' :
                                  transaction.status === 'pending' ? 'bg-[#b38922]/25 text-gold-bright' :
                                  transaction.status === 'failed' ? 'bg-red-900 text-red-400' :
                                  'bg-muted text-gold/90'
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gold/90 text-lg">No transactions found</p>
                    <p className="text-muted-foreground text-sm mt-2">Your transaction history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}