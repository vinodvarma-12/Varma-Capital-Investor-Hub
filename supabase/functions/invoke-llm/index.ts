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

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500, headers: cors });
  }

  try {
    const body = await req.json();
    const prompt = String(body?.prompt ?? "");
    const schema = body?.response_json_schema;
    let messages = Array.isArray(body?.messages)
      ? body.messages
      : [{ role: "user", content: prompt }];

    if (schema) {
      messages = [
        {
          role: "system",
          content: "You must respond ONLY in valid JSON format. Do not include any extra text."
        },
        ...messages,
      ];
    }

    const payload: Record<string, unknown> = {
      model: "gpt-4o-mini",
      messages,
    };
    if (schema) {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${t}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
    return Response.json(parsed, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: (e as Error).message }, { status: 500, headers: cors });
  }
});
