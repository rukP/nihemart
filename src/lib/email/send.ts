import { buildAuthEmail } from "@/lib/email/templates";

export async function sendAuthEmail(
   to: string,
   type: "recovery" | "signup",
   actionLink: string,
   userId?: string
) {
   const fromEmail = process.env.EMAIL_FROM || "nihemart@gmail.com";
   const { subject, html } = buildAuthEmail(
      type,
      actionLink,
      "Nihemart",
      userId
   );

   const smtpHost = process.env.SMTP_HOST;
   const smtpPort = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
   const smtpUser = process.env.SMTP_USER;
   const smtpPass = process.env.SMTP_PASS;

   if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP env vars missing; cannot send email");
      return { ok: false, warning: "SMTP not configured" };
   }

   // Use runtime require via eval to avoid bundlers statically including
   // this Node-only dependency into client bundles.
   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
   // @ts-ignore
   const nodemailer = eval("require")("nodemailer");

   const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort!,
      secure: smtpPort === 465,
      auth: {
         user: smtpUser,
         pass: smtpPass,
      },
   });

   const info = await transporter.sendMail({
      from: `${fromEmail}`,
      to,
      subject,
      html,
   });

   return { ok: true, info };
}

export async function sendEmail(
   to: string,
   subject: string,
   html: string,
   opts?: { replyTo?: string }
) {
   const fromEmail = process.env.EMAIL_FROM || "nihemart@gmail.com";
   const smtpHost = process.env.SMTP_HOST;
   const smtpPort = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
   const smtpUser = process.env.SMTP_USER;
   const smtpPass = process.env.SMTP_PASS;

   if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP env vars missing; cannot send email");
      return { ok: false, warning: "SMTP not configured" } as const;
   }

   // Use runtime require via eval to avoid bundlers statically including
   // this Node-only dependency into client bundles.
   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
   // @ts-ignore
   const nodemailer = eval("require")("nodemailer");

   const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort!,
      secure: smtpPort === 465,
      auth: {
         user: smtpUser,
         pass: smtpPass,
      },
   });

   const mailOptions: any = {
      from: `${fromEmail}`,
      to,
      subject,
      html,
   };

   if (opts?.replyTo) mailOptions.replyTo = opts.replyTo;

   const info = await transporter.sendMail(mailOptions);

   return { ok: true, info } as const;
}
