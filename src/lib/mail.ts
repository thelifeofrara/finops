import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

export function mailer() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    secure: false,
  });
  return transport;
}
