export type BrandEmailOptions = {
   appName?: string;
   logoUrl?: string;
   primaryColorHex?: string;
   secondaryColorHex?: string;
   supportEmail?: string;
   companyPhone?: string;
   companyWebsite?: string;
   companyTagline?: string;
   companyAddress?: string;
   social?: {
      twitter?: string;
      facebook?: string;
      instagram?: string;
      linkedin?: string;
   };
};

export function buildBrandedAuthEmail(
   type: "recovery" | "signup",
   actionLink: string,
   options: BrandEmailOptions = {},
   userId?: string
) {
   const appName = options.appName || "Nihemart";
   const subject =
      type === "recovery"
         ? `Hindura ijambo ry'ibanga - Reset your ${appName} password`
         : `Emeza konti yawe - Confirm your ${appName} account`;

   // Using Nihemart brand colors: Cyan blue and Orange
   const primaryBlue = options.primaryColorHex || "#1DB4E7";
   const accentOrange = options.secondaryColorHex || "#FF6B35";

   const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
   const fallbackLogo = appUrl ? `${appUrl.replace(/\/$/, "")}/logo.png` : "";
   const logoUrl =
      options.logoUrl ||
      process.env.NEXT_PUBLIC_LOGO_URL ||
      process.env.NEXT_PUBLIC_EMAIL_LOGO ||
      fallbackLogo;
   const supportEmail = options.supportEmail || "support@nihemart.com";
   const companyPhone = options.companyPhone || "0792412177";
   const companyWebsite = options.companyWebsite || "https://nihemart.rw";
   const companyTagline =
      options.companyTagline || "Ibicuruzwa bidasanzwe muri Rwanda";
   const companyAddress = options.companyAddress || "Kigali, Rwanda";

   let confirmationLink = actionLink;
   if (type === "signup" && userId) {
      // Use our custom confirmation endpoint
      const appUrl =
         process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
      confirmationLink = `${appUrl.replace(
         /\/$/,
         ""
      )}/api/auth/confirm-email?userId=${encodeURIComponent(userId)}`;
   }

   const ctaText =
      type === "recovery" ? "Hindura ijambo ry'ibanga" : "Emeza imeyili";
   const ctaTextEn = type === "recovery" ? "Reset Password" : "Confirm Email";

   // Bilingual content (Kinyarwanda first, then English)
   const rwIntro =
      type === "recovery"
         ? "Twakiriye ubusabe bwo guhindura ijambo ry'ibanga ryawe."
         : "Urakoze kwiyandikisha kuri Nihemart. Nyamuneka emeza imeyili yawe kugirango urangize gukora konti yawe.";

   const enIntro =
      type === "recovery"
         ? "We received a request to reset your password."
         : "Thank you for signing up with Nihemart. Please confirm your email to complete your account setup.";

   const rwDescription =
      type === "recovery"
         ? "Kanda buto hepfo kugirango uhindure ijambo ry'ibanga ryawe. Iyi link izakora mu masaha 24 gusa."
         : "Kanda buto hepfo kugirango wemeze imeyili yawe ukomeze gukoresha konti yawe.";

   const enDescription =
      type === "recovery"
         ? "Click the button below to reset your password. This link will expire in 24 hours."
         : "Click the button below to confirm your email and start shopping for unique products.";

   const html = `
<!DOCTYPE html>
<html lang="rw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f5f5">
    <tr>
      <td align="center" style="padding:40px 20px">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
          <!-- Header with Logo and Brand Colors -->
          <tr>
            <td style="padding:32px 32px 24px 32px;text-align:center;background:linear-gradient(135deg, ${primaryBlue} 0%, #1ac4f7 100%)">
              ${
                 logoUrl
                    ? `<Image src="${logoUrl}" alt="${appName}" width="80" height="80" style="display:inline-block;border-radius:16px;background:#ffffff;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15)" />`
                    : `<div style="display:inline-block;width:80px;height:80px;border-radius:16px;background:#ffffff;line-height:80px;font-size:36px;font-weight:700;color:${primaryBlue}">N</div>`
              }
              <div style="font-size:28px;font-weight:700;color:#ffffff;margin-top:16px;letter-spacing:-0.5px">
                <span style="color:#ffffff">Nihe</span><span style="color:${accentOrange}">Mart</span>
              </div>
              <div style="font-size:14px;color:rgba(255,255,255,0.95);margin-top:4px">${companyTagline}</div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:40px 32px">
              <!-- Kinyarwanda Section -->
              <div style="margin-bottom:32px">
                <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">🇷🇼 Kinyarwanda</div>
                <div style="font-size:20px;color:#1a1a1a;font-weight:600;line-height:1.4;margin-bottom:12px">Muraho,</div>
                <div style="font-size:15px;color:#4a4a4a;line-height:1.7;margin-bottom:8px">${rwIntro}</div>
                <div style="font-size:14px;color:#666;line-height:1.6;margin-bottom:24px">${rwDescription}</div>
                <!-- CTA Button with Gradient -->
                <div style="text-align:center;margin:24px 0">
                  <a href="${confirmationLink}" style="background:linear-gradient(135deg, ${primaryBlue} 0%, ${accentOrange} 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-size:15px;font-weight:600;box-shadow:0 4px 12px rgba(29,180,231,0.3);transition:all 0.2s">${ctaText}</a>
                </div>
              </div>
              <!-- Divider -->
              <div style="border-top:2px dashed #e5e5e5;margin:32px 0"></div>
              <!-- English Section -->
              <div style="margin-bottom:24px">
                <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px">🇬🇧 English</div>
                <div style="font-size:20px;color:#1a1a1a;font-weight:600;line-height:1.4;margin-bottom:12px">Hello,</div>
                <div style="font-size:15px;color:#4a4a4a;line-height:1.7;margin-bottom:8px">${enIntro}</div>
                <div style="font-size:14px;color:#666;line-height:1.6;margin-bottom:24px">${enDescription}</div>
                <!-- CTA Button with Gradient -->
                <div style="text-align:center;margin:24px 0">
                  <a href="${confirmationLink}" style="background:linear-gradient(135deg, ${primaryBlue} 0%, ${accentOrange} 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;display:inline-block;font-size:15px;font-weight:600;box-shadow:0 4px 12px rgba(29,180,231,0.3)">${ctaTextEn}</a>
                </div>
              </div>
              <!-- Link Fallback -->
              <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-top:24px">
                <div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:8px">
                  <strong>Niba buto itakora / If button doesn't work:</strong>
                </div>
                <div style="font-size:12px;color:${primaryBlue};word-break:break-all;line-height:1.6">
                  <a href="${confirmationLink}" style="color:${primaryBlue};text-decoration:underline">${confirmationLink}</a>
                </div>
              </div>
              <!-- Security Notice with Brand Accent -->
              <div style="margin-top:24px;padding:12px;background:#fff8f0;border-left:3px solid ${accentOrange};border-radius:4px">
                <div style="font-size:12px;color:#666;line-height:1.6">
                  <strong style="color:#1a1a1a">⚠️ Umutekano / Security:</strong><br>
                  Niba utabisabye, wirinde gukanda iyi link. / If you didn't request this, please ignore this email.
                </div>
              </div>
            </td>
          </tr>
          <!-- Footer with Brand Colors -->
          <tr>
            <td style="padding:24px 32px;background:#fafafa;border-top:1px solid #eee">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:13px;color:#666;line-height:1.7">
                    <div style="font-weight:600;color:#1a1a1a;margin-bottom:8px">Aho waduhamagara / Contact Us</div>
                    <div style="margin-bottom:4px">
                      📧 <a href="mailto:${supportEmail}" style="color:${primaryBlue};text-decoration:none;font-weight:500">${supportEmail}</a>
                    </div>
                    <div style="margin-bottom:4px">
                      📱 <a href="tel:${companyPhone}" style="color:${accentOrange};text-decoration:none;font-weight:500">${companyPhone}</a> (WhatsApp)
                    </div>
                    <div style="margin-bottom:8px">
                      🌐 <a href="${companyWebsite}" style="color:${primaryBlue};text-decoration:none;font-weight:500">${companyWebsite}</a>
                    </div>
                    <div style="color:#999;font-size:12px;margin-top:8px">📍 ${companyAddress}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Copyright with Brand Colors -->
          <tr>
            <td style="background:linear-gradient(90deg, ${primaryBlue} 0%, ${accentOrange} 100%);padding:16px 32px;text-align:center">
              <div style="font-size:12px;color:#ffffff;font-weight:500">© ${new Date().getFullYear()} <span style="font-weight:700">NiheMart</span>. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

   return { subject, html };
}

// Back-compat wrapper used by existing callers
export function buildAuthEmail(
   type: "recovery" | "signup",
   actionLink: string,
   appName = "Nihemart",
   userId?: string
) {
   return buildBrandedAuthEmail(type, actionLink, { appName }, userId);
}
