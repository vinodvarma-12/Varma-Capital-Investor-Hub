import React, { useState, useEffect, useCallback } from "react";
import { MarketTicker } from "@/entities/MarketTicker";
import { fetchCryptoData } from "@/functions/fetchCryptoData";
import { fetchStockData } from "@/functions/fetchStockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import LoadingSpinner from "@/components/LoadingSpinner";

const TickerCard = ({ ticker, isLive = false }) => {
  const isPositive = ticker.change_percent >= 0;
  return (
    <Card className="bg-card border border-[#ccab6c]/30 hover:border-[#b38922] transition-all duration-200 relative">
      {isLive && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-foreground flex items-center justify-between">
          <span className="text-lg">{ticker.name}</span>
          <Badge variant="outline" className="bg-muted text-foreground/80 text-xs">
            {ticker.symbol}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-foreground">
            ${ticker.current_price?.toLocaleString(undefined, { 
              minimumFractionDigits: ticker.current_price < 1 ? 4 : 2,
              maximumFractionDigits: ticker.current_price < 1 ? 4 : 2 
            })}
          </div>
          
          <div className={`flex items-center gap-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">
              {isPositive ? '+' : ''}{ticker.change_percent?.toFixed(2)}%
            </span>
            <span className="text-gold/90 text-sm">24h</span>
          </div>

          {ticker.market_cap && (
            <div className="text-xs text-muted-foreground">
              <span className="text-gold/90">Market Cap: </span>
              ${(ticker.market_cap / 1e9).toFixed(1)}B
            </div>
          )}

          {ticker.volume && (
            <div className="text-xs text-muted-foreground">
              <span className="text-gold/90">Volume: </span>
              ${(ticker.volume / 1e6).toFixed(1)}M
            </div>
          )}
          
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {ticker.last_updated ? 
              `Updated ${formatDistanceToNow(new Date(ticker.last_updated))} ago` :
              'No update time'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Markets() {
  const [cryptoTickers, setCryptoTickers] = useState([]);
  const [stockTickers, setStockTickers] = useState([]);
  const [staticTickers, setStaticTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load static tickers from database
  const loadStaticTickers = useCallback(async () => {
    try {
      const tickers = await MarketTicker.filter({ is_active: true });
      setStaticTickers(tickers);
    } catch (error) {
      console.error("Error loading static tickers:", error);
    }
  }, []);

  // Load live crypto data
  const loadCryptoData = useCallback(async () => {
    try {
      const { data } = await fetchCryptoData();
      if (data?.data) {
        setCryptoTickers(data.data);
      }
      setIsConnected(true);
    } catch (error) {
      console.error("Error loading crypto data:", error);
      setIsConnected(false);
    }
  }, []);

  // Load live stock data
  const loadStockData = useCallback(async () => {
    try {
      const { data } = await fetchStockData();
      if (data?.data) {
        setStockTickers(data.data);
      }
      setIsConnected(true);
    } catch (error) {
      console.error("Error loading stock data:", error);
      setIsConnected(false);
    }
  }, []);

  // Load all market data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStaticTickers(),
        loadCryptoData(),
        loadStockData()
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadStaticTickers, loadCryptoData, loadStockData]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAllData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadAllData]);

  // Manual refresh
  const handleManualRefresh = () => {
    loadAllData();
  };

  // Organize all tickers by category
  const allTickers = [...cryptoTickers, ...stockTickers, ...staticTickers];
  const categorizedTickers = allTickers.reduce((acc, ticker) => {
    const category = ticker.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ticker);
    return acc;
  }, {});

  // Category display order and names
  const categoryOrder = ['crypto', 'indices', 'stocks', 'commodities', 'forex', 'other'];
  const categoryNames = {
    crypto: 'Cryptocurrencies',
    indices: 'Market Indices',
    stocks: 'Stocks',
    commodities: 'Commodities',
    forex: 'Forex',
    other: 'Other Markets'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-gold-bright animate-spin mx-auto" />
          <div className="text-foreground">Loading live market data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Live Markets</h1>
            <p className="text-gold/90">Real-time prices from CoinGecko and Alpha Vantage</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'border-green-400 text-green-400' : 'border-border'}
            >
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="border-[#b38922] text-gold-bright"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Last update info */}
        {lastUpdate && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDistanceToNow(lastUpdate)} ago
            </p>
          </div>
        )}

        {/* Market categories */}
        {categoryOrder.map(category => {
          const tickerList = categorizedTickers[category];
          if (!tickerList || tickerList.length === 0) return null;

          const isLiveCategory = category === 'crypto' || category === 'indices' || category === 'stocks';

          return (
            <div key={category}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-gold-bright">
                  {categoryNames[category]}
                </h2>
                {isLiveCategory && (
                  <Badge className="bg-green-900 text-green-400 text-xs">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                    LIVE
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tickerList.map((ticker, index) => (
                  <TickerCard 
                    key={`${ticker.symbol}-${index}`} 
                    ticker={ticker} 
                    isLive={isLiveCategory}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {allTickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gold/90 text-lg">No market data available</p>
            <p className="text-muted-foreground text-sm mt-2">Check your internet connection and try refreshing</p>
          </div>
        )}
      </div>
    </div>
  );
}