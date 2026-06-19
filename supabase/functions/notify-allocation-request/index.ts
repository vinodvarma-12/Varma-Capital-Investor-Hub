import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return Response.json({ success: false, error: "RESEND_API_KEY not set" }, { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ success: false, error: "Auth failed" }, { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ success: false, error: "Profile not found" }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { productName, requestedAmount } = body;

    const { data: superAdmins } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("role", "super_admin");

    if (!superAdmins || superAdmins.length === 0) {
      return Response.json({ success: true, message: "No super admins to notify" }, { headers: corsHeaders });
    }

    const investorName = profile.full_name || profile.email;
    const formattedAmount = Number(requestedAmount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const submittedAt = new Date().toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const emailBody = `
      <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; background: #0c0c0c; color: #fafafa; padding: 40px 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ccab6c; font-size: 24px; margin: 0;">Varma Capital</h1>
        </div>
        <h2 style="color: #fedea0; font-size: 18px; margin-bottom: 8px;">New Allocation Request</h2>
        <p style="color: #d4cfc9; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
          An investor has submitted an allocation request that requires your review.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 12px 8px; color: #9a9a9a; width: 40%;">Investor</td>
            <td style="padding: 12px 8px; color: #fafafa; font-weight: bold;">${investorName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 12px 8px; color: #9a9a9a;">Email</td>
            <td style="padding: 12px 8px; color: #fafafa;">${profile.email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 12px 8px; color: #9a9a9a;">Product</td>
            <td style="padding: 12px 8px; color: #fafafa;">${productName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 12px 8px; color: #9a9a9a;">Requested Amount</td>
            <td style="padding: 12px 8px; color: #fedea0; font-weight: bold;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 8px; color: #9a9a9a;">Submitted At</td>
            <td style="padding: 12px 8px; color: #fafafa;">${submittedAt}</td>
          </tr>
        </table>
        <p style="color: #d4cfc9; font-size: 14px; line-height: 1.7; margin-top: 24px;">
          Please log in to the admin dashboard to review and action this request.
        </p>
        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 32px 0;" />
        <p style="font-size: 11px; color: #6b6b6b; text-align: center; margin: 0;">© Varma Capital</p>
      </div>
    `;

    const toEmails = superAdmins.map((sa) => sa.email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Varma Capital <admin@varmacapital.io>",
        to: toEmails,
        subject: `New Allocation Request — ${investorName} (${formattedAmount})`,
        html: emailBody,
      }),
    });

    const resendBody = await emailResponse.text();
    console.log("Resend status:", emailResponse.status, "body:", resendBody);

    if (!emailResponse.ok) {
      return Response.json(
        { success: false, error: "Email delivery failed", details: resendBody },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      { success: true, message: `Notified ${toEmails.length} super admin(s)` },
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return Response.json(
      { success: false, error: (e as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
});
