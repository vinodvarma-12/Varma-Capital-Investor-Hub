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

  const apiKey = Deno.env.get("GHL_API_KEY");
  const locationId = Deno.env.get("GHL_LOCATION_ID");

  if (!apiKey || !locationId) {
    return Response.json({ error: "GHL credentials not configured" }, { status: 500, headers: cors });
  }

  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/medias/files?locationId=${locationId}&type=file`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Version": "2021-07-28",
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GHL API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const rawFiles = json.files ?? json.medias ?? json.data ?? [];

    const files = rawFiles.map((f: Record<string, unknown>) => ({
      id: f._id ?? f.id ?? f.url,  // GHL uses _id in some versions
      name: f.name,
      url: f.url,
      type: f.fileType ?? f.type,
      size: f.size,
      created_at: f.createdAt,
      thumbnail: f.thumbnailUrl ?? null,
    }));

    return Response.json({ success: true, data: files }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Failed to fetch GHL materials", details: (e as Error).message },
      { status: 500, headers: cors }
    );
  }
});
