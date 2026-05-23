import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYMBOL_META: Record<string, { name: string; category: string }> = {
  "SPY":   { name: "S&P 500 ETF",        category: "indices" },
  "QQQ":   { name: "NASDAQ-100 ETF",     category: "indices" },
  "DIA":   { name: "Dow Jones ETF",      category: "indices" },
  "AAPL":  { name: "Apple Inc.",         category: "stocks" },
  "MSFT":  { name: "Microsoft Corp.",    category: "stocks" },
  "GOOGL": { name: "Alphabet Inc.",      category: "stocks" },
  "AMZN":  { name: "Amazon.com Inc.",    category: "stocks" },
  "TSLA":  { name: "Tesla Inc.",         category: "stocks" },
  "NVDA":  { name: "NVIDIA Corp.",       category: "stocks" },
  "META":  { name: "Meta Platforms Inc.", category: "stocks" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const apiKey = Deno.env.get("FINHUB_NEWS_API");
  if (!apiKey) {
    return Response.json({ error: "Finnhub API key not configured" }, { status: 500, headers: cors });
  }

  try {
    const symbols = Object.keys(SYMBOL_META);

    // Fetch all symbols in parallel — no delays needed
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        if (!res.ok) throw new Error(`Finnhub ${symbol}: ${res.status}`);
        const q = await res.json();

        // q.c = current price, q.dp = % change, q.d = change amount
        if (!q.c || q.c === 0) return null;

        const meta = SYMBOL_META[symbol];
        // Use fetch time as last_updated so the UI always shows "just now"
        // q.t is the last trade time (stale-looking when markets are closed)
        return {
          symbol,
          name: meta.name,
          category: meta.category,
          current_price: q.c,
          change_percent: q.dp,
          change_amount: q.d,
          high: q.h,
          low: q.l,
          open: q.o,
          prev_close: q.pc,
          last_trade_time: new Date(q.t * 1000).toISOString(),
          last_updated: new Date().toISOString(),
          is_active: true,
        };
      })
    );

    const stockData = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    return Response.json({ success: true, data: stockData }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to fetch stock data", details: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
