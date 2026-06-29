import nodemailer from "nodemailer";
import { env } from "./env.js";

function createTransport() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST ?? "smtp.gmail.com",
    port: env.SMTP_PORT,          // 587
    secure: false,                 // STARTTLS (не SSL)
    requireTLS: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,         // App Password від Google
    },
  });
}

export async function sendSupportEmail(opts: {
  fromUsername: string;
  fromEmail: string | null;
  subject: string;
  message: string;
}): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    console.log(`[SUPPORT] ${opts.fromUsername}: ${opts.subject}\n${opts.message}`);
    return false;
  }

  const replyTo = opts.fromEmail ?? undefined;

  try {
    await transport.sendMail({
      from: `"FIGABRAIN Support" <${env.SMTP_FROM ?? env.SMTP_USER}>`,
      to: env.SMTP_FROM ?? env.SMTP_USER,
      replyTo,
      subject: `[Support] ${opts.subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#05060a;color:#fff;border-radius:16px;padding:32px">
          <h2 style="background:linear-gradient(90deg,#7c5cff,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 16px">
            FIGABRAIN — Support Request
          </h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="color:#888;font-size:12px;padding:4px 0;width:100px">Користувач:</td>
              <td style="color:#fff;font-size:13px">@${opts.fromUsername}</td>
            </tr>
            <tr>
              <td style="color:#888;font-size:12px;padding:4px 0">Email:</td>
              <td style="color:#fff;font-size:13px">${opts.fromEmail ?? "не вказано"}</td>
            </tr>
            <tr>
              <td style="color:#888;font-size:12px;padding:4px 0">Тема:</td>
              <td style="color:#fff;font-size:13px">${opts.subject}</td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #222;margin-bottom:20px">
          <p style="white-space:pre-wrap;color:#ccc;font-size:14px;line-height:1.6">${opts.message.replace(/</g, "&lt;")}</p>
          <hr style="border:none;border-top:1px solid #111;margin-top:24px">
          <p style="color:#333;font-size:11px;margin:8px 0 0">
            ${replyTo ? `Відповісти: Reply-To встановлено на ${replyTo}` : "Користувач не вказав email — відповісти через особисті повідомлення на платформі."}
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[MAILER] Support email error:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  appUrl: string
): Promise<boolean> {
  const transport = createTransport();
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  if (!transport) {
    console.log(`[MAILER] SMTP не налаштовано. Reset link: ${resetUrl}`);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"FIGABRAIN" <${env.SMTP_FROM ?? env.SMTP_USER}>`,
      to: toEmail,
      subject: "Скидання пароля FIGABRAIN",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#05060a;color:#fff;border-radius:16px;padding:32px">
          <h2 style="background:linear-gradient(90deg,#7c5cff,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 8px">
            FIGABRAIN
          </h2>
          <p style="color:#aaa;margin:0 0 24px;font-size:13px">Your social profile. Your wallet. Your rewards.</p>

          <p style="margin:0 0 20px">Ти запросив скидання пароля. Натисни кнопку нижче — посилання дійсне <strong>1 годину</strong>.</p>

          <a href="${resetUrl}"
             style="display:inline-block;background:linear-gradient(90deg,#7c5cff,#22d3ee);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px">
            Скинути пароль
          </a>

          <p style="color:#555;font-size:12px;margin:24px 0 0">
            Якщо ти нічого не запитував — просто ігноруй цей лист. Пароль не зміниться.
          </p>
          <hr style="border:none;border-top:1px solid #222;margin:20px 0">
          <p style="color:#333;font-size:11px;margin:0">
            Або скопіюй це посилання вручну:<br>
            <span style="color:#7c5cff">${resetUrl}</span>
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[MAILER] Помилка надсилання:", err);
    return false;
  }
}
