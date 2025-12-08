export function setEmailCookie(
   email: string,
   maxAgeSeconds = 60 * 60 * 24 * 7
) {
   if (!email || typeof document === "undefined") return;
   const safe = encodeURIComponent(email.trim().toLowerCase());
   // Set cookie for entire site. maxAge in seconds (default 7 days)
   document.cookie = `email=${safe}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearEmailCookie() {
   if (typeof document === "undefined") return;
   document.cookie = `email=; path=/; max-age=0; SameSite=Lax`;
}
