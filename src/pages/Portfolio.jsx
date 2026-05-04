import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Investment } from "@/entities/Investment";
import { Product } from "@/entities/Product";
import { NAV } from "@/entities/NAV";
import { Transaction } from "@/entities/Transaction";
import { FabricatedReturns } from "@/entities/FabricatedReturns";
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

      const [investmentsData, productsData, navResults, transactionsData, fabricatedData] = await Promise.all([
        Investment.filter({ investor_email: userData.email }),
        Product.list(),
        NAV.list('-date', 200),
        Transaction.filter({ investor_email: userData.email }, '-transaction_date', 50),
        FabricatedReturns.list('-effective_date', 100)
      ]);

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

  const getCurrentValue = (investment) => {
    const invested = investment.invested_amount || 0;
    
    // Check for investor-specific fabricated return first
    let fabReturn = fabricatedReturns.find(fr => 
      fr.investor_email === user?.email && 
      fr.product_id === investment.product_id &&
      fr.override_calculated
    );
    
    // Fall back to product-wide fabricated return
    if (!fabReturn) {
      fabReturn = fabricatedReturns.find(fr => 
        !fr.investor_email && 
        fr.product_id === investment.product_id &&
        fr.override_calculated
      );
    }

    if (fabReturn && fabReturn.return_percent !== undefined) {
      // Use admin-set return percentage
      return invested + (invested * (fabReturn.return_percent / 100));
    } else if (fabReturn && fabReturn.nav_per_unit && investment.current_units) {
      // Use admin-set NAV
      return investment.current_units * fabReturn.nav_per_unit;
    } else {
      // Fall back to NAV entity
      const latestNav = navData.find(nav => nav.product_id === investment.product_id);
      if (latestNav && investment.current_units) {
        return investment.current_units * latestNav.nav_per_unit;
      }
    }
    return invested;
  };

  const getPnL = (investment) => {
    const currentValue = getCurrentValue(investment);
    const investedAmount = investment.invested_amount || 0;
    
    // Check for admin-set return percentage
    let fabReturn = fabricatedReturns.find(fr => 
      fr.investor_email === user?.email && 
      fr.product_id === investment.product_id &&
      fr.override_calculated
    );
    if (!fabReturn) {
      fabReturn = fabricatedReturns.find(fr => 
        !fr.investor_email && 
        fr.product_id === investment.product_id &&
        fr.override_calculated
      );
    }

    if (fabReturn && fabReturn.return_percent !== undefined) {
      return {
        amount: investedAmount * (fabReturn.return_percent / 100),
        percent: fabReturn.return_percent
      };
    }

    return {
      amount: currentValue - investedAmount,
      percent: investedAmount > 0 ? ((currentValue - investedAmount) / investedAmount) * 100 : 0
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
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading your portfolio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Portfolio Overview</h1>
          <p className="text-gray-400">Detailed view of your investments and transactions</p>
        </div>

        <Tabs defaultValue="holdings" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="holdings" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Holdings
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {enrichedInvestments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Product</TableHead>
                          <TableHead className="text-gray-400">Units</TableHead>
                          <TableHead className="text-gray-400">Cost Basis</TableHead>
                          <TableHead className="text-gray-400">Current Value</TableHead>
                          <TableHead className="text-gray-400">P&L</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Lock-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedInvestments.map((investment) => (
                          <TableRow key={investment.id} className="border-gray-800">
                            <TableCell>
                              <div>
                                <p className="font-medium text-white">{investment.productName}</p>
                                <p className="text-sm text-gray-400">
                                  Purchased: {format(new Date(investment.purchase_date), 'MMM dd, yyyy')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {investment.current_units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              ${investment.invested_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-gray-300">
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
                                      <p className="text-gray-400">
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
                    <p className="text-gray-400 text-lg">No investments found</p>
                    <p className="text-gray-500 text-sm mt-2">Start investing to see your portfolio here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800">
                          <TableHead className="text-gray-400">Date</TableHead>
                          <TableHead className="text-gray-400">Product</TableHead>
                          <TableHead className="text-gray-400">Type</TableHead>
                          <TableHead className="text-gray-400">Units</TableHead>
                          <TableHead className="text-gray-400">NAV per Unit</TableHead>
                          <TableHead className="text-gray-400">Amount</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id} className="border-gray-800">
                            <TableCell className="text-gray-300">
                              {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {getProductName(transaction.product_id)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`capitalize ${
                                  transaction.type === 'subscription' ? 'border-green-400 text-green-400' :
                                  transaction.type === 'redemption' ? 'border-red-400 text-red-400' :
                                  'border-gray-400 text-gray-400'
                                }`}
                              >
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {transaction.units?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '-'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {transaction.nav_per_unit ? `$${transaction.nav_per_unit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className={`font-medium ${
                              transaction.type === 'subscription' ? 'text-green-400' : 
                              transaction.type === 'redemption' ? 'text-red-400' : 'text-gray-300'
                            }`}>
                              {transaction.type === 'subscription' ? '+' : transaction.type === 'redemption' ? '-' : ''}
                              ${transaction.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                                className={
                                  transaction.status === 'completed' ? 'bg-green-900 text-green-400' :
                                  transaction.status === 'pending' ? 'bg-yellow-900 text-yellow-400' :
                                  transaction.status === 'failed' ? 'bg-red-900 text-red-400' :
                                  'bg-gray-800 text-gray-400'
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
                    <p className="text-gray-400 text-lg">No transactions found</p>
                    <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
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