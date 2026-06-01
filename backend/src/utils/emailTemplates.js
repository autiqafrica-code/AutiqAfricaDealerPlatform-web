'use strict'

// ── Shared shell ──────────────────────────────────────────────────────────────

function wrap(preheader, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autiq Africa</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0a1628;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px;">Autiq Africa</span>
              <span style="color:#667085;font-size:13px;margin-left:12px;">Dealer Platform</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e4e7ec;">
              <p style="margin:0;font-size:12px;color:#98a2b3;line-height:1.6;">
                This is an automated message from Autiq Africa Dealer Platform.<br>
                Need help? Email <a href="mailto:support@autiqafrica.com" style="color:#5c6ac4;">support@autiqafrica.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(label, url, bg = '#0a1628') {
  return `<a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">${label}</a>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e4e7ec;margin:24px 0;" />`
}

function field(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#667085;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#101828;font-weight:600;">${value}</td>
  </tr>`
}

// ── Template 1: Staff credentials ─────────────────────────────────────────────

function credentialsEmail({ name, loginEmail, password, workshopName, loginUrl }) {
  const url = loginUrl || (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login'

  const body = `
    <p style="font-size:13px;color:#667085;margin:0 0 4px;">Your login is ready</p>
    <h2 style="margin:0 0 20px;font-size:22px;color:#101828;">Welcome to Autiq Africa, ${esc(name)}!</h2>
    <p style="font-size:14px;color:#344054;line-height:1.7;margin:0 0 24px;">
      Your account has been set up for <strong>${esc(workshopName || 'your workshop')}</strong>.
      Use the credentials below to sign in for the first time.
    </p>
    <div style="background:#f8fafc;border:1px solid #e4e7ec;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${field('Login email', esc(loginEmail))}
        ${field('Temporary password', `<span style="font-family:monospace;font-size:15px;">${esc(password)}</span>`)}
        ${field('Workshop', esc(workshopName || '—'))}
      </table>
    </div>
    <p style="margin:0 0 20px;">${btn('Sign in to Autiq Africa', url)}</p>
    ${divider()}
    <p style="font-size:12px;color:#667085;margin:0;">
      Please change your password after your first login.
      If you didn't expect this email, contact your workshop manager.
    </p>`

  return wrap(`Your Autiq Africa login credentials are ready`, body)
}

// ── Template 2: Customer quotation approval ────────────────────────────────────

function customerApprovalEmail({ quoteNumber, customerName, vehicleReg, vehicleMakeModel, lineItems, totalEstimate, currency, approvalUrl, workshopName }) {
  const cur = currency || 'ZAR'

  const itemRows = (lineItems || []).map(li => `
    <tr>
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #f2f4f7;color:#101828;">${esc(li.item)}</td>
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #f2f4f7;color:#667085;text-align:center;">${esc(li.repairTime || '—')}</td>
      <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #f2f4f7;color:#101828;text-align:right;">${li.cost ? `${cur} ${parseFloat(li.cost).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—'}</td>
    </tr>`).join('')

  const body = `
    <p style="font-size:13px;color:#667085;margin:0 0 4px;">Repair quotation from ${esc(workshopName || 'your workshop')}</p>
    <h2 style="margin:0 0 20px;font-size:22px;color:#101828;">Hello ${esc(customerName)}, your quotation is ready</h2>
    <p style="font-size:14px;color:#344054;line-height:1.7;margin:0 0 24px;">
      Your repair quotation <strong>${esc(quoteNumber)}</strong> for
      <strong>${esc(vehicleReg)} — ${esc(vehicleMakeModel)}</strong> is ready for your review.
      Please approve or reject it using the link below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e4e7ec;border-radius:12px;margin-bottom:24px;overflow:hidden;">
      <thead>
        <tr style="background:#f2f4f7;">
          <th style="padding:10px 12px;font-size:12px;color:#667085;text-align:left;font-weight:600;">Item</th>
          <th style="padding:10px 12px;font-size:12px;color:#667085;text-align:center;font-weight:600;">Time</th>
          <th style="padding:10px 12px;font-size:12px;color:#667085;text-align:right;font-weight:600;">Cost</th>
        </tr>
      </thead>
      <tbody>${itemRows || '<tr><td colspan="3" style="padding:12px;color:#667085;text-align:center;">No line items</td></tr>'}</tbody>
      ${totalEstimate ? `<tfoot>
        <tr style="background:#f2f4f7;">
          <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700;color:#101828;">Total estimate</td>
          <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#101828;text-align:right;">${cur} ${parseFloat(totalEstimate).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>` : ''}
    </table>
    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;">${btn('✓ Approve quotation', `${approvalUrl}`, '#039855')}</td>
        <td>${btn('✗ Reject quotation', `${approvalUrl}`, '#d92d20')}</td>
      </tr></table>
    </div>
    ${divider()}
    <p style="font-size:12px;color:#667085;margin:0;">
      This quotation link is unique to your vehicle repair job.
      Contact ${esc(workshopName || 'the workshop')} if you have questions.
    </p>`

  return wrap(`Your repair quotation ${quoteNumber} is ready for approval`, body)
}

// ── Template 3: Staff internal assignment notification ─────────────────────────

function staffAssignmentEmail({ recipientName, roleLabel, quoteNumber, customerName, vehicleReg, vehicleMakeModel, customerComplaint, lineItems, dashboardUrl }) {
  const url = dashboardUrl || (process.env.FRONTEND_URL || 'http://localhost:5173')

  const itemList = (lineItems || []).map(li =>
    `<li style="font-size:13px;color:#344054;padding:4px 0;">${esc(li.item)}${li.priority ? ` <span style="font-size:11px;color:#667085;">(${li.priority})</span>` : ''}</li>`
  ).join('')

  const body = `
    <p style="font-size:13px;color:#667085;margin:0 0 4px;">New quotation request</p>
    <h2 style="margin:0 0 20px;font-size:22px;color:#101828;">Hi ${esc(recipientName)}, you have a new quotation to review</h2>
    <p style="font-size:14px;color:#344054;line-height:1.7;margin:0 0 20px;">
      A new quotation <strong>${esc(quoteNumber)}</strong> has been sent to you for your <strong>${esc(roleLabel)}</strong> input.
    </p>
    <div style="background:#f8fafc;border:1px solid #e4e7ec;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        ${field('Quote number', esc(quoteNumber))}
        ${field('Customer', esc(customerName))}
        ${field('Vehicle', `${esc(vehicleReg)} — ${esc(vehicleMakeModel)}`)}
        ${customerComplaint ? field('Customer complaint', esc(customerComplaint)) : ''}
      </table>
    </div>
    ${itemList ? `<p style="font-size:13px;font-weight:600;color:#101828;margin:0 0 8px;">Line items:</p>
    <ul style="margin:0 0 24px;padding-left:20px;">${itemList}</ul>` : ''}
    <p style="margin:0 0 28px;">${btn('Open Autiq Dashboard', url)}</p>
    ${divider()}
    <p style="font-size:12px;color:#667085;margin:0;">
      Log in to Autiq Africa to add your notes, cost estimate and repair time, then send back to Front Desk.
    </p>`

  return wrap(`New quotation ${quoteNumber} assigned to you`, body)
}

// ── Template 4: Onboarding email ──────────────────────────────────────────────

function onboardingEmail({ clientName, loginUrl, customBody }) {
  const url = loginUrl || (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login'

  const defaultBody = `Your Autiq Africa dealer workspace for <strong>${esc(clientName)}</strong> has been fully configured. Your workshops, users, modules, currency and invoice format are ready.`

  const body = `
    <p style="font-size:13px;color:#667085;margin:0 0 4px;">Workspace ready</p>
    <h2 style="margin:0 0 20px;font-size:22px;color:#101828;">Welcome to Autiq Africa${clientName ? `, ${esc(clientName)}` : ''}!</h2>
    <p style="font-size:14px;color:#344054;line-height:1.7;margin:0 0 24px;">
      ${customBody ? esc(customBody).replace(/\n/g, '<br>') : defaultBody}
    </p>
    <div style="background:#f0fdf4;border:1px solid #abefc6;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#101828;">What's ready:</p>
      <ul style="margin:0;padding-left:20px;">
        <li style="font-size:13px;color:#344054;padding:3px 0;">Workshop workspaces configured</li>
        <li style="font-size:13px;color:#344054;padding:3px 0;">User credential slots created</li>
        <li style="font-size:13px;color:#344054;padding:3px 0;">Modules and features activated</li>
        <li style="font-size:13px;color:#344054;padding:3px 0;">Currency and invoice format set up</li>
      </ul>
    </div>
    <p style="margin:0 0 28px;">${btn('Sign in to Autiq Africa', url)}</p>
    ${divider()}
    <p style="font-size:12px;color:#667085;margin:0;">
      Need help? Contact our support team at
      <a href="mailto:support@autiqafrica.com" style="color:#5c6ac4;">support@autiqafrica.com</a>
    </p>`

  return wrap(`Your Autiq Africa workspace is ready`, body)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

module.exports = {
  credentialsEmail,
  customerApprovalEmail,
  staffAssignmentEmail,
  onboardingEmail,
}
