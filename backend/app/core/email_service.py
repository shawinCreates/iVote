"""
email_service.py — SendGrid email integration for iVote
=======================================================
Sends password-reset emails via SendGrid's HTTP API.
Falls back to console logging when SENDGRID_API_KEY is not set
(useful for local development without a SendGrid account).
"""
from __future__ import annotations

import os
import secrets
import string
from datetime import datetime, timedelta, timezone

APP_URL        = os.getenv("APP_URL", "http://localhost:8000")
SENDGRID_KEY   = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "noreply@ivote.app")
FROM_NAME      = os.getenv("FROM_NAME",  "iVote — Campus Election System")
RESET_EXPIRY_H = int(os.getenv("RESET_TOKEN_EXPIRY_HOURS", "2"))


def _send_via_sendgrid(to_email: str, subject: str, html_body: str) -> bool:
    """Send a single transactional email via SendGrid REST API."""
    try:
        import sendgrid as sg_module
        from sendgrid.helpers.mail import Mail
    except ImportError:
        print("[EMAIL] sendgrid package not installed — pip install sendgrid")
        return False

    sg  = sg_module.SendGridAPIClient(api_key=SENDGRID_KEY)
    msg = Mail(
        from_email=(FROM_EMAIL, FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=html_body,
    )
    try:
        resp = sg.send(msg)
        return resp.status_code in (200, 202)
    except Exception as e:
        print(f"[EMAIL] SendGrid error: {e}")
        return False


def _send_console(to_email: str, subject: str, html_body: str) -> bool:
    """Fallback: print email to stdout (dev/test mode)."""
    print(f"\n{'='*60}")
    print(f"[EMAIL — DEV MODE] To: {to_email}")
    print(f"Subject: {subject}")
    print(html_body)
    print('='*60)
    return True


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if SENDGRID_KEY:
        return _send_via_sendgrid(to_email, subject, html_body)
    return _send_console(to_email, subject, html_body)


# ── Token helpers ─────────────────────────────────────────────────────────────

def generate_reset_token() -> str:
    """Generate a 64-character URL-safe random token."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(64))


def reset_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=RESET_EXPIRY_H)


# ── Email templates ───────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, full_name: str, token: str) -> bool:
    reset_url = f"{APP_URL}/reset-password?token={token}"
    subject   = "Reset your iVote password"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d1b2a;font-family:'DM Sans',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#0f2236;border:1px solid #1e3a5f;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0d1b2a,#1a3a5c);
                     padding:32px;text-align:center;border-bottom:1px solid #1e3a5f">
            <div style="font-size:28px;font-weight:800;letter-spacing:2px;
                        color:#00d4ff;font-family:monospace">iVOTE</div>
            <div style="color:#64748b;font-size:13px;margin-top:4px">
              Secure Campus Election System
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 36px">
            <h2 style="color:#e2e8f0;font-size:22px;margin:0 0 12px">
              Password Reset Request
            </h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">
              Hi <strong style="color:#e2e8f0">{full_name}</strong>,<br><br>
              We received a request to reset your iVote password.
              Click the button below to choose a new one.
              This link expires in <strong style="color:#00d4ff">{RESET_EXPIRY_H} hours</strong>.
            </p>
            <div style="text-align:center;margin:32px 0">
              <a href="{reset_url}"
                 style="display:inline-block;background:linear-gradient(135deg,#0088aa,#00d4ff);
                        color:#0d1b2a;font-weight:700;font-size:15px;
                        padding:14px 36px;border-radius:8px;text-decoration:none;
                        letter-spacing:0.5px">
                Reset My Password
              </a>
            </div>
            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0">
              If you didn't request this, you can safely ignore this email.
              Your password will not change.<br><br>
              Or copy this link manually:<br>
              <a href="{reset_url}"
                 style="color:#00d4ff;word-break:break-all;font-size:12px">
                {reset_url}
              </a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #1e3a5f;
                     text-align:center;color:#475569;font-size:12px">
            iVote · Tribhuvan University Campus Election System<br>
            This is an automated message — please do not reply.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to_email, subject, html)
