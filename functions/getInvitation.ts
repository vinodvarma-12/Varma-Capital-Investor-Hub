import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;

  if (!token) {
    return Response.json({ success: false, error: "Token is required" }, { status: 400 });
  }

  try {
    // Find the invitation by token using service role (no auth required)
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ invitation_token: token });

    if (!invitations || invitations.length === 0) {
      return Response.json({ success: false, error: "Invalid or expired invitation" }, { status: 404 });
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
        role: invitation.role
      }
    });

  } catch (error) {
    console.error("Error fetching invitation:", error);
    return Response.json({ 
      success: false, 
      error: "Failed to fetch invitation" 
    }, { status: 500 });
  }
});