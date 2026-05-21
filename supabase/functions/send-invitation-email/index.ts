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

    const invitationLink = `${baseUrl}/AcceptInvitation?token=${token}`;
    const emailBody = `
      <p>You have been invited by <strong>${profile.full_name || profile.email}</strong> to Varma Capital.</p>
      <p><a href="${invitationLink}">Activate your account</a></p>
    `;

    const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
    const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      return Response.json({ success: false, error: "Email service not configured" }, { status: 500, headers: cors });
    }

    const contactResponse = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
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
      }),
    });

    let contactId: string | undefined;
    if (contactResponse.ok) {
      const contactData = await contactResponse.json();
      contactId = contactData?.contact?.id;
    }

    const emailResponse = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        type: "Email",
        locationId: GHL_LOCATION_ID,
        contactId,
        subject: "Welcome to Varma Capital - Activate Your Account",
        html: emailBody,
        emailFrom: "Varma Capital <support@varmacapital.io>",
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      return Response.json({
        success: false,
        error: "Email delivery failed",
        details: `GoHighLevel returned ${emailResponse.status}: ${errorText}`,
      }, { status: 500, headers: cors });
    }

    return Response.json({ success: true, message: `Invitation sent to ${inviteeEmail}` }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message }, { status: 500, headers: cors });
  }
});
