import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Transaction } from "@/entities/Transaction";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const [investmentsData, productsData, navResults, transactionsData] = await Promise.all([
        Investment.filter({ investor_email: userData.email }),
        Product.list(),
        NAV.list('-date', 200),
        Transaction.filter({ investor_email: userData.email }, '-transaction_date', 50),
      ]);

      setInvestments(investmentsData);
      setProducts(productsData);
      setNavData(navResults);
      setTransactions(transactionsData);
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

  const getCurrentValue = (investment) => {
    const latestNav = navData.find(nav => nav.product_id === investment.product_id);
    if (latestNav && investment.current_units) {
      return investment.current_units * latestNav.nav_per_unit;
    }
    return investment.invested_amount || 0;
  };

  const getPnL = (investment) => {
    const currentValue = getCurrentValue(investment);
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
    currentValue: getCurrentValue(investment),
    pnl: getPnL(investment),
    locked: isLocked(investment)
  }));

  if (loading) {
    return <LoadingSpinner message="Loading your portfolio..." />;
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Portfolio Overview</h1>
          <p className="text-[#ccab6c]/90">Detailed view of your investments and transactions</p>
        </div>

        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList className="bg-zinc-900 border-[#ccab6c]/20">
            <TabsTrigger value="holdings" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-[#fedea0] data-[state=active]:text-black">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card className="bg-zinc-950 border border-[#ccab6c]/30">
              <CardHeader>
                <CardTitle className="text-white">Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedInvestments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#ccab6c]/25">
                          <TableHead className="text-[#ccab6c]/90">Product</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Units</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Cost Basis</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Current Value</TableHead>
                          <TableHead className="text-[#ccab6c]/90">P&L</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Status</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Lock-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedInvestments.map((investment) => (
                          <TableRow key={investment.id} className="border-[#ccab6c]/25">
                            <TableCell>
                              <div>
                                <p className="font-medium text-white">{investment.productName}</p>
                                <p className="text-sm text-[#ccab6c]/90">
                                  Purchased: {format(new Date(investment.purchase_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              {investment.current_units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'}
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              ${investment.invested_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-zinc-300">
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
                                      <p className="text-[#ccab6c]/90">
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
                    <p className="text-[#ccab6c]/90 text-lg">No investments found</p>
                    <p className="text-zinc-500 text-sm mt-2">Start investing to see your portfolio here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-zinc-950 border border-[#ccab6c]/30">
              <CardHeader>
                <CardTitle className="text-white">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#ccab6c]/25">
                          <TableHead className="text-[#ccab6c]/90">Date</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Product</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Type</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Units</TableHead>
                          <TableHead className="text-[#ccab6c]/90">NAV per Unit</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Amount</TableHead>
                          <TableHead className="text-[#ccab6c]/90">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id} className="border-[#ccab6c]/25">
                            <TableCell className="text-zinc-300">
                              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              {getProductName(transaction.product_id)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`capitalize ${
                                  transaction.type === 'subscription' ? 'border-green-400 text-green-400' :
                                  transaction.type === 'redemption' ? 'border-red-400 text-red-400' :
                                  'border-[#ccab6c]/45 text-[#ccab6c]/90'
                                }`}
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              {transaction.units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '-'}
                            </TableCell>
                            <TableCell className="text-zinc-300">
                              {transaction.nav_per_unit ? `$${transaction.nav_per_unit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className={`font-medium ${
                              transaction.type === 'subscription' ? 'text-green-400' : 
                              transaction.type === 'redemption' ? 'text-red-400' : 'text-zinc-300'
                            }`}>
                              {transaction.type === 'subscription' ? '+' : transaction.type === 'redemption' ? '-' : ''}
                              ${transaction.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                                className={
                                  transaction.status === 'completed' ? 'bg-green-900 text-green-400' :
                                  transaction.status === 'pending' ? 'bg-[#b38922]/25 text-[#fedea0]' :
                                  transaction.status === 'failed' ? 'bg-red-900 text-red-400' :
                                  'bg-zinc-900 text-[#ccab6c]/90'
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
                    <p className="text-[#ccab6c]/90 text-lg">No transactions found</p>
                    <p className="text-zinc-500 text-sm mt-2">Your transaction history will appear here</p>
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