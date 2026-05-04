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
    if (!token) return Response.json({ success: false, error: "Token is required" }, { status: 400, headers: cors });

    const { data: invitations, error } = await admin.from("invitations").select("*").eq("invitation_token", token);
    if (error) throw error;
    if (!invitations?.length) {
      return Response.json({ success: false, error: "Invalid or expired invitation" }, { status: 404, headers: cors });
    }
    const invitation = invitations[0];
    return Response.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        status: invitation.status,
        invitation_token: invitation.invitation_token,
        role: invitation.role,
      },
    }, { headers: cors });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: "Failed to fetch invitation" }, { status: 500, headers: cors });
  }
});
