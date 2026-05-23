import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Product } from "@/entities/Product";
import { ProductAccess } from "@/entities/ProductAccess";
import { AllocationRequest } from "@/entities/AllocationRequest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, DollarSign, Lock, Shield, TrendingUp, Clock } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Products() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = (product) => {
    setSelectedProduct(product);
    setRequestAmount('');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
    setRequestAmount('');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const [allProductsData, accessData] = await Promise.all([
        Product.list('-created_date'),
        ProductAccess.filter({ investor_email: userData.email }),
      ]);

      // Rules:
      // - suspended / closed  → hidden from investors entirely
      // - active + public     → show with "Request Allocation" button
      // - active + private    → show as "Coming Soon" teaser, no allocation button
      const visibleProducts = allProductsData.filter(p => p.status === 'active');
      setProducts(visibleProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationRequest = async () => {
    if (!selectedProduct || !requestAmount || parseFloat(requestAmount) < selectedProduct.minimum_ticket) {
      return;
    }

    setIsSubmitting(true);
    try {
      await AllocationRequest.create({
        investor_email: user.email,
        product_id: selectedProduct.id,
        requested_amount: parseFloat(requestAmount)
      });
      
      closeDialog();
      alert('Allocation request submitted successfully! You will be notified once reviewed.');
    } catch (error) {
      console.error("Error submitting allocation request:", error);
      alert('Error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadgeColor = (risk) => {
    const colors = {
      low: 'bg-green-900 text-green-400 border-green-700',
      medium: 'bg-[#b38922]/25 text-gold-bright border-[#8a6a1a]/45',
      medium_high: 'bg-orange-900/60 text-orange-300 border-orange-700/60',
      high: 'bg-orange-900 text-orange-400 border-orange-700',
      very_high: 'bg-red-900 text-red-400 border-red-700'
    };
    return colors[risk] || colors.medium;
  };

  if (loading) {
    return <LoadingSpinner message="Loading products..." />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Investment Products</h1>
          <p className="text-gold/90">Explore our range of investment opportunities</p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className={`bg-card border border-[#ccab6c]/30 relative overflow-hidden ${!product.is_public ? 'opacity-80' : ''}`}>

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-foreground text-xl">{product.name}</CardTitle>
                      {!product.is_public && (
                        <Badge className="bg-blue-900/60 text-blue-300 border-blue-700/60 text-xs">Coming Soon</Badge>
                      )}
                    </div>
                    <Badge className={getRiskBadgeColor(product.risk_band)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {product.risk_band?.replace(/_/g, '-').toUpperCase()} RISK
                    </Badge>
                  </div>
                  <Package className="w-8 h-8 text-gold-bright" />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Description */}
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {product.description}
                </p>

                {/* Strategy */}
                {product.strategy && (
                  <div className="text-xs text-gold/80 bg-[#ccab6c]/10 border border-[#ccab6c]/20 rounded px-3 py-1.5">
                    <span className="font-semibold text-gold-bright">Strategy: </span>{product.strategy}
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gold/90 text-xs">
                      <DollarSign className="w-3 h-3" />
                      Min Investment
                    </div>
                    <p className="text-foreground font-semibold">
                      ${product.minimum_ticket?.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gold/90 text-xs">
                      <Lock className="w-3 h-3" />
                      Lock-in Period
                    </div>
                    <p className="text-foreground font-semibold">
                      {product.lock_in_months} months
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gold/90 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Management Fee
                    </div>
                    <p className="text-foreground font-semibold">
                      {product.management_fee_percent}% p.a.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-gold/90 text-xs">
                      <Clock className="w-3 h-3" />
                      Performance Fee
                    </div>
                    <p className="text-foreground font-semibold">
                      {product.performance_fee_percent || 0}%
                    </p>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="space-y-2">
                  {product.high_water_mark && (
                    <div className="flex items-center gap-2 text-sm text-gold/90">
                      <div className="w-1 h-1 bg-[#fedea0] rounded-full" />
                      High Water Mark Applied
                    </div>
                  )}
                  {product.hurdle_rate > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gold/90">
                      <div className="w-1 h-1 bg-[#fedea0] rounded-full" />
                      Hurdle Rate: {product.hurdle_rate}%
                    </div>
                  )}
                  {(product.redemption_penalty_percent > 0 || product.redemption_penalty_amount > 0) && (
                    <div className="flex items-center gap-2 text-sm text-gold/90">
                      <div className="w-1 h-1 bg-red-400 rounded-full" />
                      Early Redemption Penalty Applies
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                {!product.is_public ? (
                  <Button
                    className="w-full bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                    disabled
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Coming Soon
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-[#fedea0] hover:bg-[#ccab6c] text-black font-semibold"
                    onClick={() => openDialog(product)}
                  >
                    Request Allocation
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-gold/90 text-lg">No products available</p>
            <p className="text-muted-foreground text-sm mt-2">Check back later for new investment opportunities</p>
          </div>
        )}
      </div>

      {/* Single controlled allocation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="bg-card border border-[#ccab6c]/30">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Request Allocation — {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-foreground/80">Investment Amount (USD)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                min={selectedProduct?.minimum_ticket}
                className="bg-muted border-[#ccab6c]/20 text-foreground"
              />
              {selectedProduct && (
                <p className="text-xs text-gold/90">
                  Minimum investment: ${selectedProduct.minimum_ticket?.toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-foreground">Important Information:</h4>
              <ul className="text-sm text-foreground/80 space-y-1">
                <li>• This is a request and requires admin approval</li>
                <li>• Funds will be locked for {selectedProduct?.lock_in_months} months</li>
                <li>• Management fee: {selectedProduct?.management_fee_percent}% per annum</li>
                <li>• You will be notified once your request is reviewed</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground/80"
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#fedea0] hover:bg-[#ccab6c] text-black"
                onClick={handleAllocationRequest}
                disabled={
                  isSubmitting ||
                  !requestAmount ||
                  parseFloat(requestAmount) < (selectedProduct?.minimum_ticket || 0)
                }
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}