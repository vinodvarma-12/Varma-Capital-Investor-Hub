import { createClient } from "npm:@supabase/supabase-js@2";
import { createTOTPKeyURI, verifyTOTP } from "npm:@oslojs/otp@1.1.0";
import { encodeBase32 } from "npm:@oslojs/encoding@0.4.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeBase32(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = input.toUpperCase().replace(/=+$/, "");
  const output: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of cleanInput) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      output.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return new Uint8Array(output);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const admin = createClient(url, service);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: cors });
  }

  const action = String(body?.action ?? "");
  const code = body?.code != null ? String(body.code) : "";

  if (action === "generate") {
    const secretBytes = new Uint8Array(20);
    crypto.getRandomValues(secretBytes);
    const secret = encodeBase32(secretBytes);
    const recoveryCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const c = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      recoveryCodes.push(c.slice(0, 4) + "-" + c.slice(4));
    }
    const totpUri = createTOTPKeyURI("Varma Capital", user.email ?? "", secretBytes, 30, 6);
    const { error } = await admin.from("profiles").update({
      two_factor_secret: secret,
      two_factor_recovery_codes: recoveryCodes,
      two_factor_verified: false,
    }).eq("id", user.id);
    if (error) {
      console.error(error);
      return Response.json({ success: false, error: "Failed to save" }, { status: 500, headers: cors });
    }
    return Response.json({
      success: true,
      secret,
      qrCodeUri: totpUri,
      recoveryCodes,
    }, { headers: cors });
  }

  if (action === "verify") {
    if (!code) return Response.json({ success: false, error: "Code required" }, { status: 400, headers: cors });
    const { data: row } = await admin.from("profiles").select("two_factor_secret").eq("id", user.id).single();
    if (!row?.two_factor_secret) {
      return Response.json({ success: false, error: "2FA not set up" }, { status: 400, headers: cors });
    }
    const secretBytes = decodeBase32(row.two_factor_secret);
    const ok = verifyTOTP(secretBytes, 30, 6, code);
    if (!ok) return Response.json({ success: false, error: "Invalid code" }, { status: 400, headers: cors });
    await admin.from("profiles").update({ two_factor_enabled: true, two_factor_verified: true }).eq("id", user.id);
    return Response.json({ success: true, message: "2FA enabled successfully" }, { headers: cors });
  }

  if (action === "disable") {
    if (!code) return Response.json({ success: false, error: "Code required" }, { status: 400, headers: cors });
    const { data: row } = await admin.from("profiles").select("two_factor_secret, two_factor_recovery_codes").eq("id", user.id).single();
    if (!row?.two_factor_secret) {
      return Response.json({ success: false, error: "2FA not enabled" }, { status: 400, headers: cors });
    }
    const secretBytes = decodeBase32(row.two_factor_secret);
    let ok = verifyTOTP(secretBytes, 30, 6, code);
    const codes = (row.two_factor_recovery_codes as string[] | null) ?? [];
    if (!ok && codes.length) {
      const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const idx = codes.findIndex((rc) => rc.replace(/[^A-Z0-9]/g, "") === normalized);
      if (idx !== -1) ok = true;
    }
    if (!ok) return Response.json({ success: false, error: "Invalid code" }, { status: 400, headers: cors });
    await admin.from("profiles").update({
      two_factor_enabled: false,
      two_factor_verified: false,
      two_factor_secret: null,
      two_factor_recovery_codes: null,
    }).eq("id", user.id);
    return Response.json({ success: true, message: "2FA disabled" }, { headers: cors });
  }

  return Response.json({ success: false, error: "Invalid action" }, { status: 400, headers: cors });
});
