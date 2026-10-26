import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


def _build_otp_email_html(otp_code: str, admin_name: str, recipient_email: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CareFlow Super Admin Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1f2937; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #f97316; margin-bottom: 6px;">
                CAREFLOW SUPER ADMIN CONTROL CENTER
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                Security Verification Code (2FA)
              </h1>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                Hello <strong style="color: #ffffff;">{admin_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                A request was initiated to change the master password for the Super Admin account associated with <span style="color: #38bdf8; font-family: monospace;">{recipient_email}</span>.
              </p>
              
              <!-- Code Card -->
              <div style="background-color: #030712; border: 1px solid #374151; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 12px;">
                  Your 6-Digit One-Time Password
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #f97316; padding: 8px 0;">
                  {otp_code}
                </div>
                <div style="font-size: 12px; color: #ef4444; font-weight: 600; margin-top: 10px;">
                  Valid for 10 minutes &bull; Single-use only
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 4px 8px 8px 4px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #fca5a5;">
                  <strong>Important Security Alert:</strong> If you did NOT initiate this password change, do not share this code. Your Super Admin credentials remain safe, but we recommend inspecting recent audit events on the platform.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">
                CareFlow Mission Control Security Team &bull; Zero-Trust Authorization Engine
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #030712; border-top: 1px solid #1f2937; text-align: center; font-size: 11px; color: #475569;">
              This is an automated security transmission sent from CareFlow Healthcare Network.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _send_sync_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> Dict[str, Any]:
    """
    Synchronous SMTP delivery via smtplib.
    Runs inside asyncio.to_thread to avoid blocking the async event loop.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            f"[2FA EMAIL MOCK] SMTP_USER or SMTP_PASSWORD not set. Email delivery to {to_email} was mocked."
        )
        return {
            "delivered": False,
            "smtp_configured": False,
            "message": "SMTP not configured in .env. Code generated in development mode.",
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        # Gmail standard TLS port 587 or SSL 465
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], [to_email], msg.as_string())

        logger.info(f"[2FA EMAIL SENT] Real verification email delivered to {to_email}.")
        return {
            "delivered": True,
            "smtp_configured": True,
            "message": f"Verification code delivered to {to_email}.",
        }
    except Exception as e:
        logger.error(f"[2FA EMAIL FAILED] Error sending email to {to_email}: {str(e)}")
        return {
            "delivered": False,
            "smtp_configured": True,
            "error": str(e),
            "message": f"Failed to deliver email via SMTP: {str(e)}",
        }


async def send_otp_verification_email(
    to_email: str, otp_code: str, admin_name: str = "Platform Administrator"
) -> Dict[str, Any]:
    """
    Dispatches the 2FA verification email asynchronously.
    """
    subject = f"[{otp_code}] CareFlow Super Admin Verification Code"
    html_content = _build_otp_email_html(otp_code, admin_name, to_email)
    text_content = (
        f"CareFlow Super Admin Security Code: {otp_code}\n\n"
        f"Hello {admin_name},\n"
        f"Use this 6-digit code to verify your Super Admin password change:\n"
        f"{otp_code}\n\n"
        f"This code will expire in 10 minutes. If you did not request this, please ignore."
    )

    result = await asyncio.to_thread(_send_sync_email, to_email, subject, html_content, text_content)
    result["code"] = otp_code
    return result
