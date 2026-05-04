import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, password } = body;

  if (!token || !password) {
    return Response.json({ success: false, error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    // Find the invitation by token
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ invitation_token: token });

    if (!invitations || invitations.length === 0) {
      return Response.json({ success: false, error: "Invalid or expired invitation" }, { status: 400 });
    }

    const invitation = invitations[0];

    if (invitation.status === 'accepted') {
      return Response.json({ success: false, error: "This invitation has already been used" }, { status: 400 });
    }

    if (invitation.status === 'expired') {
      return Response.json({ success: false, error: "This invitation has expired" }, { status: 400 });
    }

    // Create user account using Base44's auth service
    const signupResult = await base44.asServiceRole.auth.createUser({
      email: invitation.email,
      password: password,
      full_name: invitation.full_name,
      role: invitation.role || 'investor'
    });

    if (!signupResult || signupResult.error) {
      return Response.json({ 
        success: false, 
        error: signupResult?.error || "Failed to create user account" 
      }, { status: 400 });
    }

    // Update user with additional data
    const users = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
    if (users && users.length > 0) {
      const assignedRole = invitation.role || 'investor';
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: invitation.full_name,
        role: assignedRole,
        kyc_status: assignedRole === 'investor' ? 'pending' : 'verified',
        investor_id: assignedRole === 'investor' ? 'INV-' + Math.random().toString(36).substr(2, 9).toUpperCase() : undefined
      });
    }

    // Mark invitation as accepted
    await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'accepted' });

    return Response.json({ 
      success: true, 
      message: "Account created successfully",
      email: invitation.email
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ 
      success: false, 
      error: error.message || "Failed to create account" 
    }, { status: 500 });
  }
});