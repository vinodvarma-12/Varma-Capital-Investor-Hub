import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }

    const admin = createClient(url, service);
    const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return Response.json({ error: "Unauthorized" }, { status: 403, headers: cors });
    }

    const body = await req.json();
    const investor_email = String(body?.investor_email ?? "").trim().toLowerCase();
    if (!investor_email) {
      return Response.json({ error: "investor_email is required" }, { status: 400, headers: cors });
    }

    const { data: targets } = await admin.from("profiles").select("id, role").eq("email", investor_email);
    if (!targets?.length || !["investor", "admin", "super_admin"].includes(targets[0].role)) {
      return Response.json({ error: "User not found or unauthorized" }, { status: 400, headers: cors });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin.from("investor_otps").insert({
      investor_email,
      otp_code: otpCode,
      expires_at: expiresAt,
      created_by: profile.email,
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const emailBody = `
        <p>Your Varma Capital one-time login code is:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${otpCode}</p>
        <p>This code expires in 15 minutes.</p>
      `;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Varma Capital <admin@varmacapital.io>",
          to: [investor_email],
          subject: "Your Varma Capital one-time login code",
          html: emailBody,
        }),
      });
    }

    await admin.from("audit_logs").insert({
      user_email: profile.email,
      action: "create",
      entity_type: "OTP",
      entity_id: investor_email,
      changes: { generated_for: investor_email },
    });

    return Response.json({
      success: true,
      message: "OTP generated and sent successfully",
      expires_at: expiresAt,
    }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to generate OTP", details: (e as Error).message }, { status: 500, headers: cors });
  }
});
