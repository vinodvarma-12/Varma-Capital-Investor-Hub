import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Authenticate admin/super_admin
        const user = await base44.auth.me();
        if (!user || !['admin', 'super_admin'].includes(user.role)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await req.json();
        const { investor_email } = body;

        if (!investor_email) {
            return new Response(JSON.stringify({ error: 'investor_email is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if target user exists and has appropriate role
        const users = await base44.asServiceRole.entities.User.filter({ email: investor_email });
        if (!users.length || !['investor', 'admin', 'super_admin'].includes(users[0].role)) {
            return new Response(JSON.stringify({ error: 'User not found or unauthorized' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

        // Create OTP record
        await base44.asServiceRole.entities.OTP.create({
            investor_email,
            otp_code: otpCode,
            expires_at: expiresAt,
            created_by: user.email
        });

        // Send email via SendGrid
        const sendGridApiKey = Deno.env.get("SENDGRID_API_KEY");
        const senderEmail = Deno.env.get("SENDGRID_SENDER_EMAIL");

        if (sendGridApiKey && senderEmail) {
            const emailBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 0;">
                    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: bold;">Varma Capital</h1>
                        <p style="color: #333; margin: 10px 0 0 0; font-size: 16px;">One-Time Login Code</p>
                    </div>
                    
                    <div style="padding: 40px 30px; background: white;">
                        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Your Login Code</h2>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px;">${otpCode}</span>
                            </div>
                        </div>
                        
                        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            This code expires in <strong>15 minutes</strong>. If you didn't request this code, please ignore this email.
                        </p>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                            <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.5;">
                                <strong>Security Note:</strong> Never share this code with anyone. Varma Capital will never ask for your login code via phone or email.
                            </p>
                        </div>
                    </div>
                </div>
            `;

            const sendGridPayload = {
                personalizations: [{
                    to: [{ email: investor_email }],
                    subject: "Your Varma Capital one-time login code"
                }],
                from: {
                    email: senderEmail,
                    name: "Varma Capital"
                },
                content: [{
                    type: "text/html",
                    value: emailBody
                }]
            };

            const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${sendGridApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(sendGridPayload)
            });

            if (!sendGridResponse.ok) {
                console.error("SendGrid API Error:", sendGridResponse.status, await sendGridResponse.text());
            }
        }

        // Log audit
        await base44.asServiceRole.entities.AuditLog.create({
            user_email: user.email,
            action: 'create',
            entity_type: 'OTP',
            entity_id: investor_email,
            changes: { generated_for: investor_email }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'OTP generated and sent successfully',
            expires_at: expiresAt
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error generating OTP:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to generate OTP', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});