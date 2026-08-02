import os
import smtplib

from dotenv import load_dotenv
from email.message import EmailMessage

load_dotenv()
print("SMTP_HOST =", os.getenv("SMTP_HOST"))
print("SMTP_PORT =", os.getenv("SMTP_PORT"))
print("SMTP_USER =", os.getenv("SMTP_USER"))
print("SMTP_PASSWORD =", "***SET***" if os.getenv("SMTP_PASSWORD") else None)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(
    to_email,
    subject,
    body,
    attachments=None,
):
    msg = EmailMessage()

    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    msg.set_content(body)

    if attachments:
        for attachment in attachments:
            with open(attachment, "rb") as f:
                msg.add_attachment(
                    f.read(),
                    maintype="application",
                    subtype="octet-stream",
                    filename=attachment.split("/")[-1],
                )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)

    print(f"Email successfully sent to {to_email}")