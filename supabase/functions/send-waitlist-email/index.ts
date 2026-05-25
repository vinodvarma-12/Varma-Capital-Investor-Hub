import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
  const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return Response.json({ success: false, error: "GHL credentials not configured" }, { status: 500, headers: cors });
  }

  try {
    const { email, full_name } = await req.json();

    if (!email || !full_name) {
      return Response.json({ success: false, error: "email and full_name are required" }, { status: 400, headers: cors });
    }

    const firstName = full_name.split(" ")[0];

    // Upsert contact in GHL
    const contactRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        email,
        name: full_name,
        firstName: full_name.split(" ")[0],
        lastName: full_name.split(" ").slice(1).join(" ") || "",
        tags: ["waitlist"],
      }),
    });

    let contactId: string | undefined;
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      contactId = contactData?.contact?.id;
    }

    if (!contactId) {
      console.error("Could not upsert GHL contact for", email);
      return Response.json({ success: false, error: "Failed to create GHL contact" }, { status: 500, headers: cors });
    }

    // Send confirmation email via GHL
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #0c0c0c; color: #fafafa; padding: 40px 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ccab6c; font-size: 24px; margin: 0;">Varma Capital</h1>
        </div>

        <p style="font-size: 16px; color: #fafafa; margin-bottom: 16px;">Dear ${firstName},</p>

        <p style="font-size: 15px; color: #d4cfc9; line-height: 1.7; margin-bottom: 16px;">
          Thank you for your interest in Varma Capital. We have received your application and added you to our waitlist.
        </p>

        <p style="font-size: 15px; color: #d4cfc9; line-height: 1.7; margin-bottom: 16px;">
          Our team carefully reviews each application and will be in touch with you shortly to discuss the next steps.
        </p>

        <div style="background: #1c1917; border-left: 3px solid #ccab6c; padding: 16px 20px; border-radius: 4px; margin: 28px 0;">
          <p style="margin: 0; color: #ccab6c; font-size: 14px; font-style: italic;">
            "Preserve capital. Grow with discipline."
          </p>
        </div>

        <p style="font-size: 15px; color: #d4cfc9; line-height: 1.7; margin-bottom: 8px;">
          If you have any questions in the meantime, feel free to reply to this email.
        </p>

        <p style="font-size: 15px; color: #d4cfc9; margin-top: 32px;">
          Warm regards,<br/>
          <strong style="color: #ccab6c;">The Varma Capital Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 32px 0;" />
        <p style="font-size: 11px; color: #6b6b6b; text-align: center; margin: 0;">
          © Varma Capital. This email was sent because you submitted a waitlist application.
        </p>
      </div>
    `;

    const emailRes = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
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
        subject: "You're on the Varma Capital Waitlist",
        html: emailHtml,
        emailFrom: "Varma Capital <support@varmacapital.io>",
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("GHL email error:", errText);
      return Response.json({ success: false, error: "Email delivery failed", details: errText }, { status: 500, headers: cors });
    }

    return Response.json({ success: true, message: `Confirmation email sent to ${email}` }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message }, { status: 500, headers: cors });
  }
});
