import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { createTOTPKeyURI, verifyTOTP } from "npm:@oslojs/otp@1.1.0";
import { encodeBase32 } from "npm:@oslojs/encoding@0.4.1";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let user;
  try {
    user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  } catch (e) {
    return Response.json({ success: false, error: "Auth failed" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { action, code } = body;

  if (action === "generate") {
    // Generate new TOTP secret
    const secretBytes = new Uint8Array(20);
    crypto.getRandomValues(secretBytes);
    const secret = encodeBase32(secretBytes);
    
    // Generate recovery codes
    const recoveryCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      recoveryCodes.push(code.slice(0, 4) + '-' + code.slice(4));
    }

    // Create TOTP URI for QR code
    const totpUri = createTOTPKeyURI("Varma Capital", user.email, secretBytes, 30, 6);

    // Store secret temporarily (not verified yet)
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_secret: secret,
        two_factor_recovery_codes: recoveryCodes,
        two_factor_verified: false
      });
    } catch (e) {
      console.error("Failed to save 2FA secret:", e);
      return Response.json({ success: false, error: "Failed to save" }, { status: 500 });
    }

    return Response.json({
      success: true,
      secret: secret,
      qrCodeUri: totpUri,
      recoveryCodes: recoveryCodes
    });
  }

  if (action === "verify") {
    if (!code) {
      return Response.json({ success: false, error: "Code required" }, { status: 400 });
    }

    // Get current user data with secret
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    if (!users.length || !users[0].two_factor_secret) {
      return Response.json({ success: false, error: "2FA not set up" }, { status: 400 });
    }

    const userData = users[0];
    const secretBytes = decodeBase32(userData.two_factor_secret);
    
    // Verify the TOTP code
    const isValid = verifyTOTP(secretBytes, 30, 6, code);

    if (isValid) {
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_enabled: true,
        two_factor_verified: true
      });
      return Response.json({ success: true, message: "2FA enabled successfully" });
    } else {
      return Response.json({ success: false, error: "Invalid code" }, { status: 400 });
    }
  }

  if (action === "disable") {
    if (!code) {
      return Response.json({ success: false, error: "Code required" }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    if (!users.length || !users[0].two_factor_secret) {
      return Response.json({ success: false, error: "2FA not enabled" }, { status: 400 });
    }

    const userData = users[0];
    const secretBytes = decodeBase32(userData.two_factor_secret);
    const isValid = verifyTOTP(secretBytes, 30, 6, code);

    // Also check recovery codes
    let usedRecoveryCode = false;
    if (!isValid && userData.two_factor_recovery_codes) {
      const idx = userData.two_factor_recovery_codes.indexOf(code.toUpperCase());
      if (idx !== -1) {
        usedRecoveryCode = true;
      }
    }

    if (isValid || usedRecoveryCode) {
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_enabled: false,
        two_factor_verified: false,
        two_factor_secret: null,
        two_factor_recovery_codes: null
      });
      return Response.json({ success: true, message: "2FA disabled" });
    } else {
      return Response.json({ success: false, error: "Invalid code" }, { status: 400 });
    }
  }

  return Response.json({ success: false, error: "Invalid action" }, { status: 400 });
});

function decodeBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = input.toUpperCase().replace(/=+$/, '');
  const output = [];
  let buffer = 0;
  let bitsLeft = 0;
  
  for (const char of cleanInput) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      output.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }
  return new Uint8Array(output);
}