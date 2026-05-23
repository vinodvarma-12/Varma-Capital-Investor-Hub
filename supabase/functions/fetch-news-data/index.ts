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

  const apiKey = Deno.env.get("FINHUB_NEWS_API");
  if (!apiKey) {
    return Response.json({ error: "Finnhub API key not configured" }, { status: 500, headers: cors });
  }

  const body = await req.json().catch(() => ({}));
  const category = body.category ?? "general";

  // Only allow known categories
  const allowedCategories = ["general", "forex", "crypto", "merger"];
  if (!allowedCategories.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400, headers: cors });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);

    const data = await res.json();

    // Filter and limit to 18 articles
    const articles = (data || [])
      .filter((a: Record<string, unknown>) => a.headline && a.url)
      .slice(0, 18);

    return Response.json({ success: true, data: articles }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to fetch news", details: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
