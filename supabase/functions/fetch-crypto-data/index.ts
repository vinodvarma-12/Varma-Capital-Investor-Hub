import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  try {
    const cryptoResponse = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h",
    );
    if (!cryptoResponse.ok) throw new Error(`CoinGecko API error: ${cryptoResponse.status}`);
    const cryptoData = await cryptoResponse.json();
    const transformedData = cryptoData.map((coin: Record<string, unknown>) => ({
      symbol: String(coin.symbol).toUpperCase(),
      name: coin.name,
      category: "crypto",
      current_price: coin.current_price,
      change_percent: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      volume: coin.total_volume,
      last_updated: new Date().toISOString(),
      is_active: true,
    }));

    return Response.json({ success: true, data: transformedData }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to fetch crypto data", details: (e as Error).message }, { status: 500, headers: cors });
  }
});
