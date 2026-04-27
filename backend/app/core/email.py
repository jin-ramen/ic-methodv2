from datetime import datetime, timezone
from html import escape
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema

from app.core.config import settings

_client: FastMail | None = None


def _mail_client() -> FastMail:
    global _client
    if _client is None:
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.mail_username,
            MAIL_PASSWORD=settings.mail_password,
            MAIL_FROM=settings.mail_from,
            MAIL_SERVER=settings.mail_server,
            MAIL_PORT=settings.mail_port,
            MAIL_STARTTLS=settings.mail_starttls,
            MAIL_SSL_TLS=settings.mail_ssl_tls,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        _client = FastMail(conf)
    return _client


def _resolve_timezone(user_timezone: str | None) -> ZoneInfo:
    tz_name = user_timezone or settings.app_timezone or "UTC"
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _fmt_dt(dt: datetime | None, user_timezone: str | None = None) -> str:
  if dt is None:
    return "TBD"
  if dt.tzinfo is None:
    dt = dt.replace(tzinfo=timezone.utc)
  local_dt = dt.astimezone(_resolve_timezone(user_timezone))
  day = local_dt.strftime("%d").lstrip("0")
  time_12h = local_dt.strftime("%I:%M %p").lstrip("0")
  return f"{day} {local_dt.strftime('%B %Y')} · {time_12h} {local_dt.strftime('%Z')}"


async def send_booking_confirmation_email(
    *,
    to_email: str,
    first_name: str,
    session_start: datetime | None,
    session_end: datetime | None,
    method_name: str | None,
    user_timezone: str | None = None,
) -> None:
    start_txt = _fmt_dt(session_start, user_timezone)
    end_txt = _fmt_dt(session_end, user_timezone)
    method_txt = escape(method_name or "Session")
    name_txt = escape(first_name)

    body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=GFS+Didot&display=swap" rel="stylesheet">
  <title>Booking Confirmation</title>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {{
      .email-card {{ background-color: rgba(58,32,21,1) !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e3ddcf;">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width:540px;background-color:rgba(107,67,46,0.85);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,237,232,0.25);">
              <span style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:24px;font-weight:300;letter-spacing:0.06em;color:#FFEDE8;">IC Method.</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 10px;font-family:'GFS Didot',Didot,'Bodoni MT',Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Booking Confirmation</p>
              <h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.25;color:#FFEDE8;">Your booking<br>is confirmed.</h1>
              <p style="margin:0 0 36px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:13px;line-height:1.75;letter-spacing:0.02em;color:rgba(255,237,232,0.75);">Hello {name_txt}, we look forward to seeing you.</p>

              <!-- Detail rows -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Method</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{method_txt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Begins</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{start_txt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);border-bottom:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Ends</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{end_txt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,237,232,0.75);">434 Burwood Rd, Hawthorn VIC 3122</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    
    

    message = MessageSchema(
        subject="Your booking is confirmed — IC Method.",
        recipients=[to_email],
        body=body,
        subtype="html",
    )

    try:
        await _mail_client().send_message(message)
    except Exception as e:
        raise RuntimeError(f"Failed to send booking confirmation email: {e}") from e


async def send_booking_cancellation_email(
    *,
    to_email: str,
    first_name: str,
    session_start: datetime | None,
    session_end: datetime | None,
    method_name: str | None,
    cancellation_type: str | None,
    user_timezone: str | None = None,
) -> None:
    start_txt = _fmt_dt(session_start, user_timezone)
    end_txt = _fmt_dt(session_end, user_timezone)
    method_txt = escape(method_name or "Session")
    name_txt = escape(first_name)
    type_label = "Late Cancellation" if cancellation_type == "late" else "Cancellation"

    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=GFS+Didot&display=swap" rel="stylesheet">
  <title>Booking Cancelled</title>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {{
      .email-card {{ background-color: rgba(58,32,21,1) !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e3ddcf;">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width:540px;background-color:rgba(107,67,46,0.85);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,237,232,0.25);">
              <span style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:24px;font-weight:300;letter-spacing:0.06em;color:#FFEDE8;">IC Method.</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 10px;font-family:'GFS Didot',Didot,'Bodoni MT',Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">{type_label}</p>
              <h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.25;color:#FFEDE8;">Your booking<br>has been cancelled.</h1>
              <p style="margin:0 0 36px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:13px;line-height:1.75;letter-spacing:0.02em;color:rgba(255,237,232,0.75);">Hello {name_txt}, your booking has been successfully cancelled. We hope to see you again soon.</p>

              <!-- Detail rows -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Method</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{method_txt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Was Scheduled</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{start_txt}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);border-bottom:1px solid rgba(255,237,232,0.25);">
                    <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Ends</p>
                    <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{end_txt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,237,232,0.75);">434 Burwood Rd, Hawthorn VIC 3122</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    message = MessageSchema(
        subject="Your booking has been cancelled — IC Method.",
        recipients=[to_email],
        body=body,
        subtype="html",
    )

    try:
        await _mail_client().send_message(message)
    except Exception as e:
        raise RuntimeError(f"Failed to send booking cancellation email: {e}") from e


async def send_booking_reminder_email(
    *,
    to_email: str,
    first_name: str,
    session_start: datetime | None,
    session_end: datetime | None,
    method_name: str | None,
    user_timezone: str | None = None,
) -> None:
    start_txt = _fmt_dt(session_start, user_timezone)
    end_txt = _fmt_dt(session_end, user_timezone)
    method_txt = escape(method_name or "Session")
    name_txt = escape(first_name)

    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=GFS+Didot&display=swap" rel="stylesheet">
  <title>Session Reminder</title>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {{
      .email-card {{ background-color: rgba(58,32,21,1) !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:transparent;">
    <tr>
      <td align="center" style="padding:48px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width:540px;background-color:rgba(107,67,46,0.85);border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,237,232,0.25);">
              <span style="font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:24px;font-weight:300;letter-spacing:0.06em;color:#FFEDE8;">IC Method.</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0;position:relative;overflow:hidden;">
              <div style="position:relative;padding:36px 40px 0;">
                <p style="margin:0 0 10px;font-family:'GFS Didot',Didot,'Bodoni MT',Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Session Reminder</p>
                <h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.25;color:#FFEDE8;">Your session<br>is tomorrow.</h1>
                <p style="margin:0 0 36px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:13px;line-height:1.75;letter-spacing:0.02em;color:rgba(255,237,232,0.75);">Hello {name_txt}, this is a reminder for your upcoming session.</p>

                <!-- Detail rows -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                      <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Method</p>
                      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{method_txt}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);">
                      <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Begins</p>
                      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{start_txt}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 0;border-top:1px solid rgba(255,237,232,0.25);border-bottom:1px solid rgba(255,237,232,0.25);">
                      <p style="margin:0 0 5px;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,237,232,0.75);">Ends</p>
                      <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:19px;font-weight:300;letter-spacing:0.04em;color:#FFEDE8;">{end_txt}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0;font-family:'GFS Didot',Didot,Georgia,serif;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,237,232,0.75);">434 Burwood Rd, Hawthorn VIC 3122</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    message = MessageSchema(
        subject="Your session is tomorrow — IC Method.",
        recipients=[to_email],
        body=body,
        subtype="html",
    )

    try:
        await _mail_client().send_message(message)
    except Exception as e:
        raise RuntimeError(f"Failed to send booking reminder email: {e}") from e