import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const otpCode = String(body?.otp_code ?? body?.otpCode ?? "").trim();
    if (!email || !otpCode) {
      return Response.json({ success: false, error: "Email and OTP are required" }, { status: 400, headers: cors });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { data: profile, error: pErr } = await admin.from("profiles").select("id, email, role").eq("email", email).maybeSingle();
    if (pErr || !profile) {
      return Response.json({ success: false, error: "No account found with this email address." }, { status: 404, headers: cors });
    }
    if (!["investor", "admin", "super_admin"].includes(profile.role)) {
      return Response.json({ success: false, error: "Unauthorized access." }, { status: 403, headers: cors });
    }

    const { data: otps, error: oErr } = await admin
      .from("investor_otps")
      .select("*")
      .eq("investor_email", email)
      .eq("used", false);
    if (oErr) throw oErr;

    const now = new Date();
    const match = (otps ?? []).find(
      (o) => o.otp_code === otpCode && new Date(o.expires_at) > now,
    );
    if (!match) {
      return Response.json({ success: false, error: "Invalid or expired OTP." }, { status: 400, headers: cors });
    }

    await admin.from("investor_otps").update({ used: true }).eq("id", match.id);

    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { error: uErr } = await admin.auth.admin.updateUserById(profile.id, { password: tempPassword });
    if (uErr) throw uErr;

    return Response.json({
      success: true,
      email,
      temp_password: tempPassword,
    }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message ?? "Server error" }, { status: 500, headers: cors });
  }
});
