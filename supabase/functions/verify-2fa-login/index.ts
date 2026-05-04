import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTOTP } from "npm:@oslojs/otp@1.1.0";

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
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400, headers: cors });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const code = String(body?.code ?? "");
  if (!email || !code) {
    return Response.json({ success: false, error: "Email and code required" }, { status: 400, headers: cors });
  }

  const { data: users } = await admin.from("profiles").select("*").eq("email", email);
  if (!users?.length) {
    return Response.json({ success: false, error: "User not found" }, { status: 404, headers: cors });
  }
  const user = users[0] as Record<string, unknown>;
  if (!user.two_factor_enabled || !user.two_factor_secret) {
    return Response.json({ success: false, error: "2FA not enabled" }, { status: 400, headers: cors });
  }

  const secretBytes = decodeBase32(String(user.two_factor_secret));
  let ok = verifyTOTP(secretBytes, 30, 6, code);
  let usedRecoveryCode = false;
  let recoveryCodeIndex = -1;
  const recoveryCodes = (user.two_factor_recovery_codes as string[] | null) ?? [];

  if (!ok && recoveryCodes.length) {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (let i = 0; i < recoveryCodes.length; i++) {
      const rc = recoveryCodes[i].replace(/[^A-Z0-9]/g, "");
      if (rc === normalizedCode) {
        usedRecoveryCode = true;
        recoveryCodeIndex = i;
        ok = true;
        break;
      }
    }
  }

  if (ok || usedRecoveryCode) {
    if (usedRecoveryCode && recoveryCodeIndex !== -1) {
      const updatedCodes = [...recoveryCodes];
      updatedCodes.splice(recoveryCodeIndex, 1);
      await admin.from("profiles").update({ two_factor_recovery_codes: updatedCodes }).eq("id", user.id);
    }
    return Response.json({
      success: true,
      verified: true,
      usedRecoveryCode,
      remainingRecoveryCodes: usedRecoveryCode ? recoveryCodes.length - 1 : undefined,
    }, { headers: cors });
  }

  return Response.json({ success: false, error: "Invalid code" }, { status: 400, headers: cors });
});
