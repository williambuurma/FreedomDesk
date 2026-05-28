const REQUIRED_FIELDS = [
  "fullName",
  "practiceName",
  "email",
  "phone",
  "practiceSoftware",
  "locations",
  "callVolume",
];

function validateLead(body) {
  const errors = {};

  for (const field of REQUIRED_FIELDS) {
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value) errors[field] = "This field is required.";
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  const phoneDigits = (body.phone || "").replace(/\D/g, "");
  if (body.phone && phoneDigits.length < 10) {
    errors.phone = "Enter a valid phone number.";
  }

  return errors;
}

function normalizeLead(body) {
  return {
    full_name: body.fullName.trim(),
    practice_name: body.practiceName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    practice_software: body.practiceSoftware.trim(),
    locations: body.locations.trim(),
    call_volume: body.callVolume.trim(),
    source: body.source || "website",
    submitted_at: new Date().toISOString(),
  };
}

async function storeInSupabase(lead) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const table = process.env.SUPABASE_TABLE || "leads";

  if (!url || !key) return { skipped: true };

  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Supabase error: ${detail}`);
  }

  return { stored: true, provider: "supabase" };
}

async function storeInAirtable(lead) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || "Leads";

  if (!apiKey || !baseId) return { skipped: true };

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        "Full Name": lead.full_name,
        "Practice Name": lead.practice_name,
        Email: lead.email,
        Phone: lead.phone,
        "Practice Software": lead.practice_software,
        Locations: lead.locations,
        "Call Volume": lead.call_volume,
        Source: lead.source,
        "Submitted At": lead.submitted_at,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Airtable error: ${detail}`);
  }

  return { stored: true, provider: "airtable" };
}

function buildConfirmationEmail(lead) {
  const firstName = lead.full_name.split(" ")[0] || "there";

  return {
    subject: "Your FreedomDesk setup request is received",
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(12,26,46,0.08);">
        <tr><td style="height:4px;background:linear-gradient(90deg,#183562,#d63850);"></td></tr>
        <tr><td style="padding:40px 36px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#183562;letter-spacing:-0.02em;">FreedomDesk</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#183562;letter-spacing:-0.03em;line-height:1.25;">Your setup request has been received.</h1>
          <p style="margin:0 0 24px;font-size:16px;color:#4a5872;line-height:1.6;">Hi ${firstName}, thank you for reaching out about FreedomDesk for <strong>${lead.practice_name}</strong>.</p>
          <p style="margin:0 0 24px;font-size:16px;color:#4a5872;line-height:1.6;">Our team will personally review your office workflow and reach out to begin setup.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#183562;background:#f3f7fd;border-radius:999px;text-align:center;">No setup headaches</td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#183562;background:#f3f7fd;border-radius:999px;text-align:center;">Guided onboarding</td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#183562;background:#f3f7fd;border-radius:999px;text-align:center;">Usually live within a week</td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#4a5872;line-height:1.5;">If you have questions before we connect, simply reply to this email.</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#4a5872;">© 2026 Buurma · FreedomDesk</p>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${firstName},

Your FreedomDesk setup request for ${lead.practice_name} has been received.

Our team will personally review your office workflow and reach out to begin setup.

No setup headaches · Guided onboarding · Usually live within a week

— FreedomDesk`,
  };
}

async function sendConfirmationEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true };

  const from = process.env.FROM_EMAIL || "FreedomDesk <onboarding@freedomdesk.com>";
  const { subject, html, text } = buildConfirmationEmail(lead);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [lead.email],
      subject,
      html,
      text,
      reply_to: process.env.REPLY_TO_EMAIL || undefined,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Email error: ${detail}`);
  }

  return { sent: true };
}

async function notifyTeam(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!apiKey || !notifyEmail) return { skipped: true };

  const from = process.env.FROM_EMAIL || "FreedomDesk <onboarding@freedomdesk.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [notifyEmail],
      subject: `New FreedomDesk lead: ${lead.practice_name}`,
      text: [
        `New setup request from ${lead.full_name}`,
        `Practice: ${lead.practice_name}`,
        `Email: ${lead.email}`,
        `Phone: ${lead.phone}`,
        `Software: ${lead.practice_software}`,
        `Locations: ${lead.locations}`,
        `Call volume: ${lead.call_volume}`,
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Team notify failed:", detail);
  }

  return { notified: true };
}

async function submitLead(body) {
  const errors = validateLead(body);
  if (Object.keys(errors).length) {
    const err = new Error("Validation failed");
    err.status = 400;
    err.errors = errors;
    throw err;
  }

  const lead = normalizeLead(body);
  const provider = process.env.LEADS_PROVIDER || "supabase";

  const storageResults = [];

  if (provider === "supabase" || provider === "both") {
    storageResults.push(await storeInSupabase(lead));
  }
  if (provider === "airtable" || provider === "both") {
    storageResults.push(await storeInAirtable(lead));
  }

  const anyStored = storageResults.some((r) => r.stored);
  const allSkipped = storageResults.every((r) => r.skipped);

  if (allSkipped && process.env.NODE_ENV === "production") {
    const err = new Error("Lead storage is not configured.");
    err.status = 503;
    throw err;
  }

  if (allSkipped) {
    console.log("\n══════════════════════════════════════");
    console.log("NEW FREEDOMDESK LEAD");
    console.log("══════════════════════════════════════");
    console.log(`Name:      ${lead.full_name}`);
    console.log(`Practice:  ${lead.practice_name}`);
    console.log(`Email:     ${lead.email}`);
    console.log(`Phone:     ${lead.phone}`);
    console.log(`Software:  ${lead.practice_software}`);
    console.log(`Locations: ${lead.locations}`);
    console.log(`Volume:    ${lead.call_volume}`);
    console.log(`Submitted: ${lead.submitted_at}`);
    console.log("══════════════════════════════════════\n");
  }

  let emailSent = false;
  try {
    const emailResult = await sendConfirmationEmail(lead);
    emailSent = Boolean(emailResult.sent);
    await notifyTeam(lead);
  } catch (emailErr) {
    console.error("Email delivery issue:", emailErr.message);
    if (!anyStored && process.env.NODE_ENV !== "production") {
      throw emailErr;
    }
  }

  return {
    ok: true,
    stored: anyStored,
    emailSent,
    devMode: allSkipped && process.env.NODE_ENV !== "production",
  };
}

async function handleLeadRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const body = req.body || {};
    const result = await submitLead(body);
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || "Unable to submit your request.",
      errors: err.errors || undefined,
    });
  }
}

module.exports = { submitLead, handleLeadRequest, validateLead };
