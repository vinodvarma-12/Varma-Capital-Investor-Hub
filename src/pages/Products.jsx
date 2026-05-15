import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Product } from "@/entities/Product";
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

export default function Products() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const productsData = await Product.filter({ status: 'active' });
      setProducts(productsData);
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
      
      setSelectedProduct(null);
      setRequestAmount('');
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
      medium: 'bg-[#b38922]/25 text-[#fedea0] border-[#8a6a1a]/45',
      high: 'bg-orange-900 text-orange-400 border-orange-700',
      very_high: 'bg-red-900 text-red-400 border-red-700'
    };
    return colors[risk] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Investment Products</h1>
          <p className="text-[#ccab6c]/90">Explore our range of investment opportunities</p>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="bg-zinc-950 border border-[#ccab6c]/30 relative overflow-hidden">
              {/* Locked Overlay — only shown for private products */}
              {!product.is_public && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-[#b38922]/50 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-[#fedea0]" />
                  </div>
                  <p className="text-white font-semibold text-lg">Coming Soon</p>
                  <p className="text-[#ccab6c]/90 text-sm mt-1">Contact admin to unlock</p>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-white text-xl">{product.name}</CardTitle>
                    <Badge className={getRiskBadgeColor(product.risk_band)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {product.risk_band?.replace('_', ' ').toUpperCase()} RISK
                    </Badge>
                  </div>
                  <Package className="w-8 h-8 text-[#fedea0]" />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Description */}
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {product.description}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[#ccab6c]/90 text-xs">
                      <DollarSign className="w-3 h-3" />
                      Min Investment
                    </div>
                    <p className="text-white font-semibold">
                      ${product.minimum_ticket?.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[#ccab6c]/90 text-xs">
                      <Lock className="w-3 h-3" />
                      Lock-in Period
                    </div>
                    <p className="text-white font-semibold">
                      {product.lock_in_months} months
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[#ccab6c]/90 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      Management Fee
                    </div>
                    <p className="text-white font-semibold">
                      {product.management_fee_percent}% p.a.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[#ccab6c]/90 text-xs">
                      <Clock className="w-3 h-3" />
                      Performance Fee
                    </div>
                    <p className="text-white font-semibold">
                      {product.performance_fee_percent || 0}%
                    </p>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="space-y-2">
                  {product.high_water_mark && (
                    <div className="flex items-center gap-2 text-sm text-[#ccab6c]/90">
                      <div className="w-1 h-1 bg-[#fedea0] rounded-full" />
                      High Water Mark Applied
                    </div>
                  )}
                  {product.hurdle_rate > 0 && (
                    <div className="flex items-center gap-2 text-sm text-[#ccab6c]/90">
                      <div className="w-1 h-1 bg-[#fedea0] rounded-full" />
                      Hurdle Rate: {product.hurdle_rate}%
                    </div>
                  )}
                  {(product.redemption_penalty_percent > 0 || product.redemption_penalty_amount > 0) && (
                    <div className="flex items-center gap-2 text-sm text-[#ccab6c]/90">
                      <div className="w-1 h-1 bg-red-400 rounded-full" />
                      Early Redemption Penalty Applies
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-[#fedea0] hover:bg-[#ccab6c] text-black font-semibold"
                      onClick={() => setSelectedProduct(product)}
                    >
                      Request Allocation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border border-[#ccab6c]/30">
                    <DialogHeader>
                      <DialogTitle className="text-white">
                        Request Allocation - {selectedProduct?.name}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-300">Investment Amount (USD)</Label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={requestAmount}
                          onChange={(e) => setRequestAmount(e.target.value)}
                          min={selectedProduct?.minimum_ticket}
                          className="bg-zinc-900 border-[#ccab6c]/20 text-white"
                        />
                        {selectedProduct && (
                          <p className="text-xs text-[#ccab6c]/90">
                            Minimum investment: ${selectedProduct.minimum_ticket?.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-white">Important Information:</h4>
                        <ul className="text-sm text-zinc-300 space-y-1">
                          <li>• This is a request and requires admin approval</li>
                          <li>• Funds will be locked for {selectedProduct?.lock_in_months} months</li>
                          <li>• Management fee: {selectedProduct?.management_fee_percent}% per annum</li>
                          <li>• You will be notified once your request is reviewed</li>
                        </ul>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-zinc-600 text-zinc-300"
                          onClick={() => {
                            setSelectedProduct(null);
                            setRequestAmount('');
                          }}
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
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-[#ccab6c]/90 text-lg">No products available</p>
            <p className="text-zinc-500 text-sm mt-2">Check back later for new investment opportunities</p>
          </div>
        )}
      </div>
    </div>
  );
}