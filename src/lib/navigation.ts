/**
 * Helper function to navigate to thank-you page with access flag
 * This ensures the thank-you page knows the user came from order workflow
 */
export function navigateToThankYou(router: any) {
   if (typeof window !== "undefined") {
      sessionStorage.setItem("nihemart_thank_you_access", "true");
   }
   router.push("/thank-you");
}

