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

  // Verify caller is super_admin
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const adminClient = createClient(url, service);
  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin") {
    return Response.json({ success: false, error: "Only super admins can create admins" }, { status: 403, headers: cors });
  }

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const fullName = String(body?.fullName ?? "").trim();

    if (!email || !fullName) {
      return Response.json({ success: false, error: "Email and full name are required" }, { status: 400, headers: cors });
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const exists = existingUsers?.users?.some(u => u.email === email);
    if (exists) {
      return Response.json({ success: false, error: "A user with this email already exists" }, { status: 400, headers: cors });
    }

    // Create auth user via invite — Supabase sends a magic link email automatically
    const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: "admin" },
    });

    if (inviteErr || !invited?.user) {
      throw new Error(inviteErr?.message ?? "Failed to create admin user");
    }

    const uid = invited.user.id;

    // Update profile to admin role immediately (profile is auto-created by trigger)
    // Retry up to 3 times as the trigger may not have fired yet
    let profileUpdated = false;
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 500));
      const { error: updateErr } = await adminClient
        .from("profiles")
        .update({
          full_name: fullName,
          role: "admin",
          kyc_status: "verified",
        })
        .eq("id", uid);

      if (!updateErr) { profileUpdated = true; break; }
    }

    if (!profileUpdated) {
      // Insert profile if trigger didn't create it
      await adminClient.from("profiles").upsert({
        id: uid,
        email,
        full_name: fullName,
        role: "admin",
        kyc_status: "verified",
      }, { onConflict: "id" });
    }

    // Audit log
    await adminClient.from("audit_logs").insert({
      user_email: callerProfile.email,
      action: "create",
      entity_type: "AdminUser",
      entity_id: uid,
      changes: { email, full_name: fullName, role: "admin", created_by: callerProfile.email },
    });

    return Response.json({
      success: true,
      message: `Admin account created for ${email}. They will receive an email to set their password.`,
    }, { headers: cors });

  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: (e as Error).message }, { status: 500, headers: cors });
  }
});
