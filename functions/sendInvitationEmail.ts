import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // 1. AUTH CHECK
  let user;
  try {
    user = await base44.auth.me();
    if (!user || !["admin", "super_admin"].includes(user.role)) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
  } catch (e) {
    return Response.json({ success: false, error: "Auth failed" }, { status: 401 });
  }

  // 2. BODY PARSE
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { email: inviteeEmail, fullName } = body;

  if (!inviteeEmail || !fullName) {
    return Response.json({ success: false, error: "Email and Full Name required" }, { status: 400 });
  }

  // 3. CREATE INVITATION RECORD
  const token = crypto.randomUUID();
  try {
    await base44.asServiceRole.entities.Invitation.create({
      email: inviteeEmail,
      full_name: fullName,
      invitation_token: token,
      invited_by: user.email,
      status: "pending",
    });
  } catch (dbError) {
    console.error("DB ERROR:", dbError);
    return Response.json({ success: false, error: "DB error", details: dbError.message }, { status: 500 });
  }

  // 4. SEND EMAIL VIA GOHIGHLEVEL
  const invitationLink = `https://app.varmacapital.io/#/AcceptInvitation?token=${token}`;

  const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center;">
        <h1 style="color: #000; margin: 0;">Varma Capital</h1>
        <p style="color: #333; margin: 10px 0 0 0;">Investor Portal Invitation</p>
      </div>
      
      <div style="padding: 40px 30px; background: white;">
        <h2 style="color: #333;">Welcome, ${fullName}!</h2>
        
        <p style="color: #555; line-height: 1.6;">
          You have been invited by <strong>${user.full_name || user.email}</strong> to access the Varma Capital investor portal.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${invitationLink}" 
             style="background: #FFD700; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Activate Your Account →
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This invitation link expires in 7 days.
        </p>
      </div>
      
      <div style="background: #333; color: #fff; padding: 20px; text-align: center;">
        <p style="margin: 0;">Best regards, The Varma Capital Team</p>
      </div>
    </div>
  `;

  const GHL_API_KEY = Deno.env.get("GHL_API_KEY");
  const GHL_LOCATION_ID = Deno.env.get("GHL_LOCATION_ID");

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error("GoHighLevel credentials not configured");
    return Response.json({ success: false, error: "Email service not configured" }, { status: 500 });
  }

  try {
    // First, create or find contact in GHL
    const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/upsert`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        email: inviteeEmail,
        name: fullName,
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' ') || '',
      }),
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error("GHL contact error:", contactResponse.status, errorText);
      // Continue anyway - we'll try to send email directly
    }

    const contactData = await contactResponse.json();
    const contactId = contactData?.contact?.id;

    // Send email via GHL
    const emailResponse = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        type: "Email",
        locationId: GHL_LOCATION_ID,
        contactId: contactId,
        subject: "Welcome to Varma Capital - Activate Your Account",
        html: emailBody,
        emailFrom: "Varma Capital <support@varmacapital.io>",
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("GHL email error:", emailResponse.status, errorText);
      return Response.json({ 
        success: false, 
        error: "Email delivery failed", 
        details: `GoHighLevel returned ${emailResponse.status}: ${errorText}` 
      }, { status: 500 });
    }

    console.log("Email sent successfully via GoHighLevel to:", inviteeEmail);
  } catch (emailError) {
    console.error("Email error:", emailError);
    return Response.json({ success: false, error: "Failed to send email", details: emailError.message }, { status: 500 });
  }

  // 5. SUCCESS
  return Response.json({ success: true, message: `Invitation sent to ${inviteeEmail}` });
});