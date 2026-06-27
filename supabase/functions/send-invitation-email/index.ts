import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const baseUrl = Deno.env.get("APP_BASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  try {
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ success: false, error: "Auth failed" }, { status: 401, headers: cors });
    }

    const admin = createClient(url, service);
    const { data: profile } = await admin.from("profiles").select("email, full_name, role").eq("id", user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 403, headers: cors });
    }

    const body = await req.json();
    const inviteeEmail = String(body?.email ?? "").trim().toLowerCase();
    const fullName = String(body?.fullName ?? "").trim();
    if (!inviteeEmail || !fullName) {
      return Response.json({ success: false, error: "Email and Full Name required" }, { status: 400, headers: cors });
    }

    // Role — only super_admin can invite admins
    const allowedRoles = ["investor", "admin"];
    const inviteeRole = allowedRoles.includes(body?.role) ? body.role : "investor";
    if (inviteeRole === "admin" && profile.role !== "super_admin") {
      return Response.json({ success: false, error: "Only super admins can invite admins" }, { status: 403, headers: cors });
    }

    // Optional onboarding fields
    const phone = body?.phone ? String(body.phone).trim() : null;
    const country = body?.country ? String(body.country).trim() : null;
    const investorType = body?.investorType ?? null;
    const productId = body?.productId ?? null;
    const committedAmount = body?.committedAmount ? Number(body.committedAmount) : null;
    const lockInMonths = body?.lockInMonths ? Number(body.lockInMonths) : null;
    const subscriptionDate = body?.subscriptionDate ?? null;

    const token = crypto.randomUUID();
    const { error: dbErr } = await admin.from("invitations").insert({
      email: inviteeEmail,
      full_name: fullName,
      invitation_token: token,
      invited_by: profile.email,
      role: inviteeRole,
      status: "pending",
      phone,
      country,
      investor_type: investorType,
      product_id: productId,
      committed_amount: committedAmount,
      lock_in_months: lockInMonths,
      subscription_date: subscriptionDate,
    });
    if (dbErr) {
      console.error(dbErr);
      return Response.json({ success: false, error: "DB error", details: dbErr.message }, { status: 500, headers: cors });
    }

    // Restore GHL contact upsert (non-blocking — email still sends if GHL fails)
    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    if (GHL_API_KEY && GHL_LOCATION_ID) {
      fetch("https://services.leadconnectorhq.com/contacts/upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          email: inviteeEmail,
          name: fullName,
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ").slice(1).join(" ") || "",
          phone: phone ?? undefined,
          tags: inviteeRole === "investor" ? ["investor", "new investor"] : [inviteeRole],
        }),
      }).catch(e => console.warn("GHL contact upsert failed:", e));
    }

    const invitationLink = `${baseUrl}/AcceptInvitation?token=${token}`;
    const isAdmin = inviteeRole === "admin";
    const emailSubject = isAdmin
      ? "You've been added as an Admin — Varma Capital"
      : "Welcome to Varma Capital - Activate Your Account";
    const emailBody = `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #0c0c0c; color: #fafafa; padding: 40px 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ccab6c; font-size: 24px; margin: 0;">Varma Capital</h1>
        </div>
        <p style="font-size: 16px;">Dear ${fullName},</p>
        <p style="font-size: 15px; color: #d4cfc9; line-height: 1.7;">
          ${isAdmin
            ? `You have been granted <strong style="color:#fedea0">Admin access</strong> to the Varma Capital Investor Hub by <strong>${profile.full_name || profile.email}</strong>.`
            : `You have been invited by <strong>${profile.full_name || profile.email}</strong> to join the Varma Capital Investor Hub.`
          }
        </p>
        <p style="font-size: 15px; color: #d4cfc9; line-height: 1.7;">
          Click the button below to set your password and activate your account.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${invitationLink}" style="background: #ccab6c; color: #000; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px;">
            Activate Account
          </a>
        </div>
        <p style="font-size: 12px; color: #6b6b6b; text-align: center;">
          If the button doesn't work, copy this link: ${invitationLink}
        </p>
        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 32px 0;" />
        <p style="font-size: 11px; color: #6b6b6b; text-align: center; margin: 0;">
          © Varma Capital
        </p>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return Response.json({ success: false, error: "Email service not configured" }, { status: 500, headers: cors });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Varma Capital <admin@varmacapital.io>",
        to: [inviteeEmail],
        subject: emailSubject,
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      return Response.json({
        success: false,
        error: "Email delivery failed",
        details: `Resend returned ${emailResponse.status}: ${errorText}`,
      }, { status: 500, headers: cors });
    }

    return Response.json({ success: true, message: `Invitation sent to ${inviteeEmail}` }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message }, { status: 500, headers: cors });
  }
});
