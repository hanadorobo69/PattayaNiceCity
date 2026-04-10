import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
}

export async function sendContactEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { name, email, subject, message } = data;

  await getResend().emails.send({
    from: "Pattaya Nice City <contact@pattayanicecity.com>",
    to: "contact@pattayanicecity.com",
    replyTo: email,
    subject: `[Contact] ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #e8a840;">New Contact Message</h2>
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border: 1px solid #eee;" />
        <div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>
        <hr style="border: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">Sent from Pattaya Nice City contact form</p>
      </div>
    `,
  });
}

/** Send password reset email */
export async function sendPasswordResetEmail(data: { email: string; token: string }) {
  const { email, token } = data;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com";
  const resetLink = `${siteUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: "Pattaya Nice City <contact@pattayanicecity.com>",
    to: email,
    subject: "Reset Your Password - Pattaya Nice City",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; background: #1a1025; color: #e0d6f0; padding: 24px; border-radius: 12px;">
        <h2 style="color: #e8a840; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #c0b0d8;">You requested a password reset for your Pattaya Nice City account.</p>
        <p style="color: #c0b0d8;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}" style="display: inline-block; background-color: #e8a840; background: linear-gradient(135deg, #e8a840, #e07850); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 16px 0;">Reset Password</a>
        <p style="font-size: 13px; color: #888; margin-top: 16px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 1px solid rgba(224,120,80,0.2); margin: 20px 0;" />
        <p style="font-size: 11px; color: #666;">If the button doesn't work, copy and paste this link:<br/><a href="${resetLink}" style="color: #e07850; word-break: break-all;">${resetLink}</a></p>
        <p style="font-size: 12px; color: #888; margin-top: 16px;">Pattaya Nice City Squad</p>
      </div>
    `,
  });
}

/** Notify admin when someone comments on their post */
export async function sendCommentNotificationEmail(data: {
  adminEmail: string;
  postTitle: string;
  postSlug: string;
  commenterName: string;
  commentContent: string;
}) {
  const { adminEmail, postTitle, postSlug, commenterName, commentContent } = data;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pattayanicecity.com";

  try {
    await getResend().emails.send({
      from: "Pattaya Nice City <contact@pattayanicecity.com>",
      to: adminEmail,
      subject: `New comment on "${postTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; background: #1a1025; color: #e0d6f0; padding: 24px; border-radius: 12px;">
          <h2 style="color: #e8a840; margin-top: 0;">New Comment on Your Post</h2>
          <p style="color: #c0b0d8;">Someone just commented on <strong style="color: #3db8a0;">"${postTitle}"</strong></p>
          <div style="background: rgba(224,120,80,0.15); border-left: 3px solid #e07850; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #e8a840;">${commenterName}</p>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; color: #e0d6f0;">${commentContent.slice(0, 500)}${commentContent.length > 500 ? "..." : ""}</p>
          </div>
          <a href="${siteUrl}/post/${postSlug}#comments" style="display: inline-block; background: linear-gradient(135deg, #e8a840, #e07850); color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Post</a>
          <p style="font-size: 12px; color: #888; margin-top: 24px;">Pattaya Nice City Squad</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send comment notification email:", error);
  }
}
