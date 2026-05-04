import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function companyName(symbol: string) {
  const names: Record<string, string> = {
    SPY: "S&P 500 ETF",
    QQQ: "NASDAQ-100 ETF",
    DIA: "Dow Jones ETF",
    AAPL: "Apple Inc.",
    MSFT: "Microsoft Corp.",
    GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com Inc.",
    TSLA: "Tesla Inc.",
    NVDA: "NVIDIA Corp.",
    META: "Meta Platforms Inc.",
  };
  return names[symbol] || symbol;
}

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

  try {
    const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!apiKey) throw new Error("Alpha Vantage API key not configured");

    const symbols = ["SPY", "QQQ", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META"];
    const stockData: Record<string, unknown>[] = [];

    for (let i = 0; i < Math.min(symbols.length, 5); i++) {
      const symbol = symbols[i];
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      );
      if (!response.ok) continue;
      const data = await response.json();
      const quote = data["Global Quote"];
      if (!quote?.["05. price"]) continue;
      stockData.push({
        symbol,
        name: companyName(symbol),
        category: ["SPY", "QQQ", "DIA"].includes(symbol) ? "indices" : "stocks",
        current_price: parseFloat(quote["05. price"]),
        change_percent: parseFloat(String(quote["10. change percent"]).replace("%", "")),
        change_amount: parseFloat(quote["09. change"]),
        volume: parseInt(quote["06. volume"], 10),
        last_updated: new Date().toISOString(),
        is_active: true,
      });
      if (i < Math.min(symbols.length, 5) - 1) {
        await new Promise((r) => setTimeout(r, 12000));
      }
    }

    return Response.json({
      success: true,
      data: stockData,
      note: `Fetched ${stockData.length} of ${symbols.length} symbols due to API rate limits`,
    }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch stock data", details: (e as Error).message }, { status: 500, headers: cors });
  }
});
