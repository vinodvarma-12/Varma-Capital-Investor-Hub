import React, { useState, useEffect, useCallback, useRef } from "react";
import { MarketTicker } from "@/entities/MarketTicker";
import { MarketPreferences } from "@/entities/MarketPreferences";
import { fetchCryptoData } from "@/functions/fetchCryptoData";
import { fetchStockData } from "@/functions/fetchStockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Clock, RefreshCw, Wifi, WifiOff,
  Settings, X, Eye, EyeOff, Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ---------------------------------------------------------------------------
// TickerCard
// ---------------------------------------------------------------------------
const TickerCard = ({ ticker, isLive = false }) => {
  const isPositive = ticker.change_percent >= 0;

  const marketClosed = ticker.last_trade_time
    ? (Date.now() - new Date(ticker.last_trade_time).getTime()) > 2 * 60 * 60 * 1000
    : false;

  return (
    <Card className="bg-card border border-[#ccab6c]/30 hover:border-[#b38922] transition-all duration-200 relative">
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {marketClosed && ticker.category !== 'crypto' && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Closed</span>
        )}
        {isLive && !marketClosed && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        )}
      </div>
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
              maximumFractionDigits: ticker.current_price < 1 ? 4 : 2,
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
            {ticker.last_trade_time && ticker.category !== 'crypto'
              ? `Last trade: ${formatDistanceToNow(new Date(ticker.last_trade_time), { addSuffix: true })}`
              : ticker.last_updated
              ? `Fetched ${formatDistanceToNow(new Date(ticker.last_updated), { addSuffix: true })}`
              : 'No update time'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// WatchlistPanel — slide-in settings panel
// ---------------------------------------------------------------------------
const CATEGORY_LABELS = {
  crypto: 'Cryptocurrencies',
  indices: 'Market Indices',
  stocks: 'Stocks',
  commodities: 'Commodities',
  forex: 'Forex',
  other: 'Other Markets',
};
const CATEGORY_ORDER = ['crypto', 'indices', 'stocks', 'commodities', 'forex', 'other'];

const WatchlistPanel = ({ allTickers, hiddenSymbols, onToggle, onClose, saving }) => {
  // Group by category
  const byCategory = allTickers.reduce((acc, t) => {
    const cat = t.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-card border-l border-[#ccab6c]/30 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#ccab6c]/20 sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Customize Watchlist</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose which tickers to display</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-5 py-3 border-b border-[#ccab6c]/10">
          <button
            onClick={() => allTickers.forEach(t => {
              if (hiddenSymbols.includes(t.symbol)) onToggle(t.symbol);
            })}
            className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Show all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            onClick={() => allTickers.forEach(t => {
              if (!hiddenSymbols.includes(t.symbol)) onToggle(t.symbol);
            })}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide all
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {allTickers.length - hiddenSymbols.length} / {allTickers.length} visible
          </span>
        </div>

        {/* Ticker list grouped by category */}
        <div className="flex-1 p-5 space-y-6">
          {CATEGORY_ORDER.map(cat => {
            const tickers = byCategory[cat];
            if (!tickers || tickers.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-gold/80 uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-2">
                  {tickers.map(ticker => {
                    const visible = !hiddenSymbols.includes(ticker.symbol);
                    return (
                      <button
                        key={ticker.symbol}
                        onClick={() => onToggle(ticker.symbol)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left ${
                          visible
                            ? 'border-[#ccab6c]/30 bg-card hover:border-[#b38922]/60'
                            : 'border-border/30 bg-muted/30 opacity-60 hover:opacity-80'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          visible
                            ? 'bg-[#b38922] border-[#b38922]'
                            : 'border-border bg-transparent'
                        }`}>
                          {visible && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{ticker.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{ticker.symbol}</span>
                        </div>

                        {ticker.current_price && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ${ticker.current_price?.toLocaleString(undefined, {
                              minimumFractionDigits: ticker.current_price < 1 ? 4 : 2,
                              maximumFractionDigits: ticker.current_price < 1 ? 4 : 2,
                            })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-[#ccab6c]/20 p-4">
          {saving ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving preferences…
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground">
              Changes save automatically
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Markets page
// ---------------------------------------------------------------------------
export default function Markets() {
  const [cryptoTickers, setCryptoTickers] = useState([]);
  const [stockTickers, setStockTickers] = useState([]);
  const [staticTickers, setStaticTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Watchlist state
  const [hiddenSymbols, setHiddenSymbols] = useState([]);
  const [showWatchlistPanel, setShowWatchlistPanel] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const saveTimer = useRef(null);

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
      if (data?.data) setCryptoTickers(data.data);
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
      if (data?.data) setStockTickers(data.data);
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
      await Promise.all([loadStaticTickers(), loadCryptoData(), loadStockData()]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading market data:", error);
    } finally {
      setLoading(false);
    }
  }, [loadStaticTickers, loadCryptoData, loadStockData]);

  // Load user watchlist preferences
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await MarketPreferences.getMyPreferences();
      if (prefs?.hidden_symbols) {
        setHiddenSymbols(prefs.hidden_symbols);
      }
    } catch (error) {
      console.error("Error loading market preferences:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAllData();
    loadPreferences();
  }, [loadAllData, loadPreferences]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadAllData]);

  // Debounced save when hiddenSymbols changes (skip on mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSavingPrefs(true);
      try {
        await MarketPreferences.saveHiddenSymbols(hiddenSymbols);
      } catch (error) {
        console.error("Error saving market preferences:", error);
      } finally {
        setSavingPrefs(false);
      }
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hiddenSymbols]);

  // Toggle a symbol's visibility
  const handleToggleSymbol = useCallback((symbol) => {
    setHiddenSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  }, []);

  // All tickers combined
  const allTickers = [...cryptoTickers, ...stockTickers, ...staticTickers];

  // Visible tickers (apply watchlist filter)
  const visibleTickers = allTickers.filter(t => !hiddenSymbols.includes(t.symbol));

  // Group visible tickers by category
  const categorizedTickers = visibleTickers.reduce((acc, ticker) => {
    const category = ticker.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(ticker);
    return acc;
  }, {});

  const hiddenCount = hiddenSymbols.filter(s => allTickers.some(t => t.symbol === s)).length;

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
            <p className="text-gold/90">Real-time prices from CoinGecko and Finnhub</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {isConnected
                ? <Wifi className="w-4 h-4 text-green-400" />
                : <WifiOff className="w-4 h-4 text-red-400" />}
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
              onClick={loadAllData}
              className="border-[#b38922] text-gold-bright"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWatchlistPanel(true)}
              className={`relative border-[#ccab6c]/50 text-foreground hover:border-[#b38922] ${hiddenCount > 0 ? 'border-amber-500/60' : ''}`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Watchlist
              {hiddenCount > 0 && (
                <span className="ml-1.5 bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {hiddenCount} hidden
                </span>
              )}
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

        {/* Hidden tickers notice */}
        {hiddenCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
            <EyeOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300/90">
              {hiddenCount} ticker{hiddenCount > 1 ? 's are' : ' is'} hidden from your watchlist.
            </p>
            <button
              onClick={() => setShowWatchlistPanel(true)}
              className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline flex-shrink-0"
            >
              Manage
            </button>
          </div>
        )}

        {/* Market categories */}
        {CATEGORY_ORDER.map(category => {
          const tickerList = categorizedTickers[category];
          if (!tickerList || tickerList.length === 0) return null;

          const isLiveCategory = category === 'crypto' || category === 'indices' || category === 'stocks';

          return (
            <div key={category}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-gold-bright">
                  {CATEGORY_LABELS[category]}
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

        {visibleTickers.length === 0 && allTickers.length > 0 && (
          <div className="text-center py-16">
            <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground text-lg font-medium">All tickers are hidden</p>
            <p className="text-muted-foreground text-sm mt-2 mb-6">
              Your watchlist is filtering out all available markets.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowWatchlistPanel(true)}
              className="border-[#b38922] text-gold-bright"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Watchlist
            </Button>
          </div>
        )}

        {allTickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gold/90 text-lg">No market data available</p>
            <p className="text-muted-foreground text-sm mt-2">Check your internet connection and try refreshing</p>
          </div>
        )}
      </div>

      {/* Watchlist panel */}
      {showWatchlistPanel && (
        <WatchlistPanel
          allTickers={allTickers}
          hiddenSymbols={hiddenSymbols}
          onToggle={handleToggleSymbol}
          onClose={() => setShowWatchlistPanel(false)}
          saving={savingPrefs}
        />
      )}
    </div>
  );
}
