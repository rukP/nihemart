"use client";

// Utilities for guest info handling: phone formatting/normalization and name helpers
export default function useGuestInfo() {
   const formatPhoneInput = (input: string) => {
      // Remove all non-digit characters except +
      const cleaned = input.replace(/[^\+\d]/g, "");

      // If starts with +250, format as +250 XXX XXX XXX
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.slice(4);
         if (digits.length <= 3) return `+250 ${digits}`;
         if (digits.length <= 6)
            return `+250 ${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `+250 ${digits.slice(0, 3)} ${digits.slice(
            3,
            6
         )} ${digits.slice(6, 9)}`;
      }

      // If starts with 07, format as 07X XXX XXX
      if (cleaned.startsWith("07")) {
         const digits = cleaned;
         if (digits.length <= 3) return digits;
         if (digits.length <= 6)
            return `${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
            6,
            10
         )}`;
      }

      return cleaned;
   };

   const normalizePhone = (raw: string) => {
      if (!raw) return raw;
      const digits = raw.replace(/[^\d]/g, "");

      // If it's 10 digits starting with 07
      if (digits.length === 10 && digits.startsWith("07")) {
         return `+250${digits.slice(1)}`;
      }

      // If it's 12 digits starting with 250
      if (digits.length === 12 && digits.startsWith("250")) {
         return `+${digits}`;
      }

      // If already in +250 format
      if (raw.startsWith("+250")) {
         return raw.replace(/[^\d+]/g, "");
      }

      return raw;
   };

   const deriveFullName = (
      firstName?: string,
      lastName?: string,
      fallback?: string
   ) => {
      const f = (firstName || "").trim();
      const l = (lastName || "").trim();
      if (f || l) return `${f} ${l}`.trim();
      return (fallback || "").trim();
   };

   return {
      formatPhoneInput,
      normalizePhone,
      deriveFullName,
   } as const;
}
