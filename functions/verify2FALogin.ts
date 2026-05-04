import { createClientFromRequest } from "npm:@base44/sdk@0.8.4";
import { verifyTOTP } from "npm:@oslojs/otp@1.1.0";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { email, code } = body;

  if (!email || !code) {
    return Response.json({ success: false, error: "Email and code required" }, { status: 400 });
  }

  // Get user by email
  const users = await base44.asServiceRole.entities.User.filter({ email: email });
  if (!users.length) {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const user = users[0];

  if (!user.two_factor_enabled || !user.two_factor_secret) {
    return Response.json({ success: false, error: "2FA not enabled" }, { status: 400 });
  }

  const secretBytes = decodeBase32(user.two_factor_secret);
  const isValid = verifyTOTP(secretBytes, 30, 6, code);

  // Check recovery codes if TOTP fails
  let usedRecoveryCode = false;
  let recoveryCodeIndex = -1;
  
  if (!isValid && user.two_factor_recovery_codes) {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i < user.two_factor_recovery_codes.length; i++) {
      const rc = user.two_factor_recovery_codes[i].replace(/[^A-Z0-9]/g, '');
      if (rc === normalizedCode) {
        usedRecoveryCode = true;
        recoveryCodeIndex = i;
        break;
      }
    }
  }

  if (isValid || usedRecoveryCode) {
    // If recovery code was used, remove it
    if (usedRecoveryCode && recoveryCodeIndex !== -1) {
      const updatedCodes = [...user.two_factor_recovery_codes];
      updatedCodes.splice(recoveryCodeIndex, 1);
      await base44.asServiceRole.entities.User.update(user.id, {
        two_factor_recovery_codes: updatedCodes
      });
    }

    return Response.json({ 
      success: true, 
      verified: true,
      usedRecoveryCode: usedRecoveryCode,
      remainingRecoveryCodes: usedRecoveryCode ? user.two_factor_recovery_codes.length - 1 : undefined
    });
  }

  return Response.json({ success: false, error: "Invalid code" }, { status: 400 });
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