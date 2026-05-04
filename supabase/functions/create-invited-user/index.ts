import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  try {
    const body = await req.json();
    const token = String(body?.token ?? "");
    const password = String(body?.password ?? "");
    if (!token || !password) {
      return Response.json({ success: false, error: "Token and password are required" }, { status: 400, headers: cors });
    }
    if (password.length < 8) {
      return Response.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400, headers: cors });
    }

    const { data: invitations, error: invErr } = await admin.from("invitations").select("*").eq("invitation_token", token);
    if (invErr) throw invErr;
    if (!invitations?.length) {
      return Response.json({ success: false, error: "Invalid or expired invitation" }, { status: 400, headers: cors });
    }
    const invitation = invitations[0];
    if (invitation.status === "accepted") {
      return Response.json({ success: false, error: "This invitation has already been used" }, { status: 400, headers: cors });
    }
    if (invitation.status === "expired") {
      return Response.json({ success: false, error: "This invitation has expired" }, { status: 400, headers: cors });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: invitation.full_name },
    });
    if (createErr || !created?.user) {
      return Response.json({
        success: false,
        error: createErr?.message ?? "Failed to create user account",
      }, { status: 400, headers: cors });
    }

    const uid = created.user.id;
    const assignedRole = invitation.role || "investor";
    await admin.from("profiles").update({
      full_name: invitation.full_name,
      role: assignedRole,
      kyc_status: assignedRole === "investor" ? "pending" : "verified",
      investor_id: assignedRole === "investor"
        ? "INV-" + Math.random().toString(36).substring(2, 11).toUpperCase()
        : null,
    }).eq("id", uid);

    await admin.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);

    return Response.json({
      success: true,
      message: "Account created successfully",
      email: invitation.email,
    }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message ?? "Failed to create account" }, { status: 500, headers: cors });
  }
});
