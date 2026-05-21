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

    // ── 1. Fetch invitation ──────────────────────────────────────────────────
    const { data: invitations, error: invErr } = await admin
      .from("invitations")
      .select("*")
      .eq("invitation_token", token);
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

    // ── 2. Create auth user ──────────────────────────────────────────────────
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

    // ── 3. Update profile ────────────────────────────────────────────────────
    await admin.from("profiles").update({
      full_name: invitation.full_name,
      role: assignedRole,
      kyc_status: assignedRole === "investor" ? "pending" : "verified",
      investor_id: assignedRole === "investor"
        ? "INV-" + Math.random().toString(36).substring(2, 11).toUpperCase()
        : null,
      phone: invitation.phone ?? null,
      country: invitation.country ?? null,
      investor_type: invitation.investor_type ?? null,
    }).eq("id", uid);

    // ── 4. Mark invitation accepted ──────────────────────────────────────────
    await admin.from("invitations").update({ status: "accepted" }).eq("id", invitation.id);

    // ── 5. Auto-create investment if admin pre-filled committed amount ────────
    if (invitation.committed_amount && invitation.product_id) {
      const today = new Date().toISOString().split("T")[0];
      const subscriptionDate = invitation.subscription_date ?? today;

      // Get latest NAV for unit calculation
      let navPerUnit: number | null = null;
      let currentUnits: number | null = null;
      try {
        const { data: navRecords } = await admin
          .from("navs")
          .select("nav_per_unit")
          .eq("product_id", invitation.product_id)
          .order("date", { ascending: false })
          .limit(1);
        if (navRecords && navRecords.length > 0) {
          navPerUnit = navRecords[0].nav_per_unit;
          if (navPerUnit && navPerUnit > 0) {
            currentUnits = parseFloat(
              (invitation.committed_amount / navPerUnit).toFixed(4)
            );
          }
        }
      } catch (e) {
        console.warn("Could not fetch NAV, units will be null:", e);
      }

      // Determine lock-in: invitation override → product default → null
      let effectiveLockIn: number | null = invitation.lock_in_months ?? null;
      if (!effectiveLockIn) {
        try {
          const { data: product } = await admin
            .from("products")
            .select("lock_in_months")
            .eq("id", invitation.product_id)
            .single();
          effectiveLockIn = product?.lock_in_months ?? null;
        } catch (e) {
          console.warn("Could not fetch product lock-in:", e);
        }
      }

      let lockInEndDate: string | null = null;
      if (effectiveLockIn) {
        const endDate = new Date(subscriptionDate);
        endDate.setMonth(endDate.getMonth() + effectiveLockIn);
        lockInEndDate = endDate.toISOString().split("T")[0];
      }

      // Create investment record
      await admin.from("investments").insert({
        investor_email: invitation.email,
        product_id: invitation.product_id,
        invested_amount: invitation.committed_amount,
        current_units: currentUnits,
        cost_basis: invitation.committed_amount,
        purchase_date: subscriptionDate,
        lock_in_months: effectiveLockIn,
        lock_in_end_date: lockInEndDate,
        status: "active",
      });

      // Create subscription transaction
      await admin.from("transactions").insert({
        investor_email: invitation.email,
        product_id: invitation.product_id,
        type: "subscription",
        amount: invitation.committed_amount,
        units: currentUnits,
        nav_per_unit: navPerUnit,
        transaction_date: subscriptionDate,
        status: "completed",
        notes: `Auto-created on account activation (invited by ${invitation.invited_by})`,
      });

      // Audit log
      await admin.from("audit_logs").insert({
        user_email: invitation.invited_by ?? "system",
        action: "create",
        entity_type: "Investment",
        entity_id: invitation.email,
        changes: {
          investor_email: invitation.email,
          product_id: invitation.product_id,
          invested_amount: invitation.committed_amount,
          units: currentUnits,
          nav_per_unit: navPerUnit,
          source: "invitation_auto_invest",
        },
      });
    }

    return Response.json({
      success: true,
      message: "Account created successfully",
      email: invitation.email,
    }, { headers: cors });

  } catch (e) {
    console.error(e);
    return Response.json(
      { success: false, error: (e as Error).message ?? "Failed to create account" },
      { status: 500, headers: cors }
    );
  }
});
