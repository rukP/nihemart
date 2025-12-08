/**
 * KPay Payment Gateway Service
 *
 * This service handles integration with KPay API for processing payments
 * Supports multiple payment methods: Mobile Money (MTN, Airtel), Cards (Visa, MasterCard), SPENN, SmartCash
 */

export interface KPayConfig {
   baseUrl: string;
   username: string;
   password: string;
   retailerId: string;
   environment: "sandbox" | "live";
   webhookUrl: string;
}

export interface PaymentRequest {
   action: "pay";
   msisdn: string;
   email: string;
   details: string;
   refid: string;
   amount: number;
   currency?: string;
   cname: string;
   cnumber: string;
   pmethod: "momo" | "cc" | "spenn" | "smartcash" | "bank";
   retailerid: string;
   returl: string;
   redirecturl: string;
   bankid: string;
   logourl?: string;
}

export interface PaymentStatusRequest {
   action: "checkstatus";
   tid?: string;
   refid?: string;
}

export interface PaymentResponse {
   reply: string;
   url?: string;
   success: number;
   authkey?: string;
   tid: string;
   refid: string;
   retcode: number;
   momtransactionid?: string;
   statusdesc?: string;
   statusid?: string;
}

export interface WebhookPayload {
   tid: string;
   refid: string;
   momtransactionid?: string;
   payaccount?: string;
   statusid: string;
   statusdesc: string;
}

/**
 * Bank codes for different payment methods as per KPay documentation
 */
export const BANK_CODES = {
   // Mobile Money
   MTN_MOMO: "63510",
   AIRTEL_MONEY: "63514",
   // Cards
   VISA_MASTERCARD: "000",
   // Digital Wallets
   SPENN: "63502",
   MOBICASH: "63501",
   // Banks
   BK: "040",
   EQUITY: "192",
   KCB: "160",
   BOA: "900",
   // Add other banks as needed
} as const;

/**
 * Payment method configurations
 */
export const PAYMENT_METHODS = {
   mtn_momo: {
      code: "momo",
      name: "MTN Mobile Money",
      bankId: BANK_CODES.MTN_MOMO,
      icon: "📱",
   },
   airtel_money: {
      code: "momo",
      name: "Airtel Money",
      bankId: BANK_CODES.AIRTEL_MONEY,
      icon: "📱",
   },
   visa_card: {
      code: "cc",
      name: "Visa Card",
      bankId: BANK_CODES.VISA_MASTERCARD,
      icon: "💳",
   },
   mastercard: {
      code: "cc",
      name: "MasterCard",
      bankId: BANK_CODES.VISA_MASTERCARD,
      icon: "💳",
   },
   spenn: {
      code: "spenn",
      name: "SPENN",
      bankId: BANK_CODES.SPENN,
      icon: "💰",
   },
} as const;

export class KPayService {
   private config: KPayConfig;

   constructor(config: KPayConfig) {
      this.config = config;
   }

   /**
    * Create basic authentication header for KPay API
    */
   private getAuthHeader(): string {
      // If username/password are missing, still build header but warn to aid diagnostics
      if (!this.config.username || !this.config.password) {
         console.warn(
            "KPay: missing username or password in configuration. Check environment variables."
         );
      }

      const credentials = Buffer.from(
         `${this.config.username}:${this.config.password}`
      ).toString("base64");
      return `Basic ${credentials}`;
   }

   /**
    * Get API endpoint URL based on environment
    */
   private getApiUrl(): string {
      const url =
         this.config.environment === "live"
            ? process.env.KPAY_LIVE_BASE_URL || "https://pay.esicia.rw"
            : this.config.baseUrl;

      // Enhanced logging for troubleshooting environment issues
      try {
         const maskedUser = this.config.username
            ? `${this.config.username
                 .slice(0, Math.max(0, this.config.username.length - 2))
                 .replace(/./g, "*")}${this.config.username.slice(
                 Math.max(0, this.config.username.length - 2)
              )}`
            : "<missing>";

         const isLiveEnv = this.config.environment === "live";
         const isLiveUrl = url.includes("esicia.rw");
         const isSandboxUrl = url.includes("esicia.com");

         // Log with clear indicators
         console.info("🔧 KPay Configuration:", {
            environment: this.config.environment,
            url,
            username: maskedUser,
            retailerId: this.config.retailerId
               ? `${this.config.retailerId.slice(0, 2)}****`
               : "<missing>",
            isLiveEnvironment: isLiveEnv,
            isUsingSandboxUrl: isSandboxUrl,
            isUsingLiveUrl: isLiveUrl,
         });

         // Critical warning if environment and URL don't match
         if (isLiveEnv && isSandboxUrl) {
            console.error("🚨 CRITICAL CONFIGURATION ERROR 🚨");
            console.error(
               "Environment is set to 'live' but using SANDBOX URL!"
            );
            console.error(
               "This means payments will NOT be processed in live mode!"
            );
            console.error("Current URL:", url);
            console.error("Expected URL: https://pay.esicia.rw");
            console.error(
               "Check KPAY_ENVIRONMENT and KPAY_LIVE_BASE_URL environment variables"
            );
         }

         if (!isLiveEnv && isLiveUrl) {
            console.warn(
               "⚠️ WARNING: Using LIVE URL but environment is set to 'sandbox'"
            );
            console.warn("This configuration may cause unexpected behavior");
         }

         // Log environment variable status
         console.info("📋 Environment Variables Check:", {
            KPAY_ENVIRONMENT:
               process.env.KPAY_ENVIRONMENT ||
               "<not set, defaulting to sandbox>",
            KPAY_LIVE_BASE_URL:
               process.env.KPAY_LIVE_BASE_URL || "<not set, using default>",
            KPAY_BASE_URL:
               process.env.KPAY_BASE_URL || "<not set, using default>",
            KPAY_WEBHOOK_URL: process.env.KPAY_WEBHOOK_URL || "<not set>",
         });
      } catch (e) {
         // swallow logging errors but log the error itself
         console.error("Error in KPay logging:", e);
      }

      return url;
   }

   /**
    * Initiate a payment request
    */
   async initiatePayment(params: {
      amount: number;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      customerNumber: string;
      paymentMethod: keyof typeof PAYMENT_METHODS;
      orderReference: string;
      orderDetails: string;
      redirectUrl: string;
      logoUrl?: string;
   }): Promise<PaymentResponse> {
      const paymentConfig = PAYMENT_METHODS[params.paymentMethod];

      if (!paymentConfig) {
         throw new Error(`Unsupported payment method: ${params.paymentMethod}`);
      }

      const paymentRequest: PaymentRequest = {
         action: "pay",
         msisdn: params.customerPhone,
         email: params.customerEmail,
         details: params.orderDetails,
         refid: params.orderReference,
         amount: params.amount,
         currency: "RWF",
         cname: params.customerName,
         cnumber: params.customerNumber,
         pmethod: paymentConfig.code,
         retailerid: this.config.retailerId,
         returl: this.config.webhookUrl,
         redirecturl: params.redirectUrl,
         bankid: paymentConfig.bankId,
         logourl: params.logoUrl,
      };

      // Debug log the exact request being sent to KPay
      console.log("🔍 KPay payment request details:", {
         msisdn: paymentRequest.msisdn,
         bankid: paymentRequest.bankid,
         pmethod: paymentRequest.pmethod,
         amount: paymentRequest.amount,
         refid: paymentRequest.refid,
         customerNumber: paymentRequest.cnumber,
      });

      try {
         const result: PaymentResponse = await this.requestWithRetries(
            this.getApiUrl(),
            {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
                  Authorization: this.getAuthHeader(),
               },
               body: JSON.stringify(paymentRequest),
            }
         );

         // Log the payment initiation with detailed request info
         console.log("KPay payment initiated:", {
            refid: params.orderReference,
            paymentMethod: params.paymentMethod,
            bankId: paymentConfig.bankId,
            msisdn: params.customerPhone,
            cnumber: params.customerNumber,
            pmethod: paymentConfig.code,
            tid: result.tid,
            retcode: result.retcode,
            success: result.success,
         });

         return result;
      } catch (error) {
         // Provide richer error logging so production issues (bad credentials / wrong URL)
         // can be diagnosed without exposing secrets.
         console.error("KPay payment initiation failed:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
         });
         // Rethrow a descriptive error so calling code can set payment failure reason
         throw new Error(
            error instanceof Error
               ? `KPay request failed: ${error.message}`
               : "KPay request failed"
         );
      }
   }

   /**
    * Check payment status
    */
   async checkPaymentStatus(params: {
      transactionId?: string;
      orderReference?: string;
   }): Promise<PaymentResponse> {
      if (!params.transactionId && !params.orderReference) {
         throw new Error(
            "Either transaction ID or order reference is required"
         );
      }

      const statusRequest: PaymentStatusRequest = {
         action: "checkstatus",
         tid: params.transactionId,
         refid: params.orderReference,
      };

      try {
         const result: PaymentResponse = await this.requestWithRetries(
            this.getApiUrl(),
            {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
                  Authorization: this.getAuthHeader(),
               },
               body: JSON.stringify(statusRequest),
            }
         );

         console.log("KPay payment status checked:", {
            tid: params.transactionId,
            refid: params.orderReference,
            statusid: result.statusid,
            statusdesc: result.statusdesc,
         });

         return result;
      } catch (error) {
         console.error("KPay payment status check failed:", error);
         throw new Error("Failed to check payment status. Please try again.");
      }
   }

   /**
    * Helper to perform fetch with timeout, retries and a fallback to alternate base URL
    */
   private async requestWithRetries(
      url: string,
      options: RequestInit,
      timeoutMs = 15000,
      maxAttempts = 3
   ): Promise<any> {
      let lastErr: any = null;

      // Try the primary URL first, and if it fails due to DNS/timeout and the
      // configured baseUrl differs from the 'live' URL, attempt the alternate.
      const alternate =
         url === (process.env.KPAY_LIVE_BASE_URL || "https://pay.esicia.rw")
            ? this.config.baseUrl
            : process.env.KPAY_LIVE_BASE_URL || "https://pay.esicia.rw";

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);

            let resp: Response;
            try {
               resp = await fetch(url, {
                  ...options,
                  signal: controller.signal,
               } as any);
            } finally {
               clearTimeout(id);
            }

            if (!resp.ok) {
               let textBody: string | undefined = undefined;
               try {
                  textBody = await resp.text();
               } catch (e) {
                  textBody = `<unable to read response body: ${String(e)}>`;
               }
               console.error("KPay HTTP error response:", {
                  status: resp.status,
                  body: textBody,
               });
               throw new Error(
                  `HTTP error! status: ${resp.status} - body: ${textBody}`
               );
            }

            const json = await resp.json();
            return json;
         } catch (err: any) {
            lastErr = err;
            // If DNS not found or connect timeout and alternate URL is different, try alternate once
            const cause = err?.cause || err;
            const isDnsOrConnectError = !!(
               (cause &&
                  (cause.code === "ENOTFOUND" ||
                     cause.code === "UND_ERR_CONNECT_TIMEOUT")) ||
               // treat AbortError as a timeout/network issue so alternate URL may be attempted
               err?.name === "AbortError"
            );

            console.warn(`KPay request attempt ${attempt} failed`, {
               url,
               error: err?.message || String(err),
            });

            if (isDnsOrConnectError && alternate && alternate !== url) {
               console.info(
                  "KPay: attempting alternate API URL due to network error",
                  { alternate }
               );
               url = alternate;
               // small backoff
               await new Promise((r) => setTimeout(r, 250 * attempt));
               continue;
            }

            // small backoff before next attempt
            await new Promise((r) => setTimeout(r, 150 * attempt));
         }
      }

      // After attempts, throw last error
      throw lastErr || new Error("KPay request failed after retries");
   }

   /**
    * Validate webhook payload
    */
   validateWebhookPayload(payload: any): payload is WebhookPayload {
      return (
         payload &&
         (typeof payload.tid === "string" || typeof payload.tid === "number") &&
         (typeof payload.refid === "string" ||
            typeof payload.refid === "number") &&
         (typeof payload.statusid === "string" ||
            typeof payload.statusid === "number") &&
         (typeof payload.statusdesc === "string" ||
            typeof payload.statusdesc === "number")
      );
   }

   /**
    * Process webhook notification
    */
   processWebhookPayload(payload: WebhookPayload): {
      isSuccessful: boolean;
      isFailed: boolean;
      isPending: boolean;
      transactionId: string;
      orderReference: string;
      statusMessage: string;
   } {
      // Normalize status id: handle numeric values like 1 or strings like '1' and '01'
      const statusIdStr = String(payload.statusid || "").padStart(2, "0");

      const isSuccessful: boolean = statusIdStr === "01";

      // Check if payment is pending
      const isPending: boolean =
         statusIdStr === "02" ||
         (statusIdStr === "03" &&
            Boolean(
               payload.statusdesc &&
                  payload.statusdesc.toLowerCase().includes("pending")
            ));

      // Status '03' is failed only if it's not described as pending
      const isFailed: boolean =
         statusIdStr === "03" &&
         !Boolean(
            payload.statusdesc &&
               payload.statusdesc.toLowerCase().includes("pending")
         );

      return {
         isSuccessful,
         isFailed,
         isPending,
         transactionId: payload.tid,
         orderReference: payload.refid,
         statusMessage: payload.statusdesc,
      };
   }

   /**
    * Get error message from return code
    */
   getErrorMessage(retcode: number): string {
      const errorMessages: { [key: number]: string } = {
         0: "No error. Transaction being processed",
         401: "Missing authentication header",
         500: "Non HTTPS request",
         600: "Invalid username / password combination",
         601: "Invalid remote user",
         602: "Location / IP not whitelisted",
         603: "Empty parameter - missing required parameters",
         604: "Unknown retailer",
         605: "Retailer not enabled",
         606: "Error processing",
         607: "Failed mobile money transaction",
         608: "Used ref id – error uniqueness",
         609: "Unknown Payment method",
         610: "Unknown or not enabled Financial institution",
         611: "Transaction not found",
      };

      return errorMessages[retcode] || `Unknown error (code: ${retcode})`;
   }

   /**
    * Format phone number for KPay API (prefers 07XXXXXXXX format)
    */
   static formatPhoneNumber(phone: string): string {
      // Remove all non-digit characters except +
      const cleaned = phone.replace(/[^\d+]/g, "");

      // If already in 07XXXXXXXX format, return as is
      if (/^07\d{8}$/.test(cleaned)) {
         return cleaned;
      }

      // If starts with +250, convert to 07XXXXXXXX
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.substring(4);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If starts with 250, convert to 07XXXXXXXX
      if (cleaned.startsWith("250")) {
         const digits = cleaned.substring(3);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If 9 digits starting with 7, add 0 prefix
      if (cleaned.length === 9 && cleaned.startsWith("7")) {
         return `0${cleaned}`;
      }

      return cleaned;
   }

   /**
    * Generate unique order reference
    */
   static generateOrderReference(prefix = "NIHEMART"): string {
      const timestamp = Date.now();
      // 6-digit zero-padded random number for compactness and readability
      const random = Math.floor(Math.random() * 1000000);
      const padded = String(random).padStart(6, "0");
      return `${prefix}_${timestamp}_${padded}`;
   }
}

/**
 * Initialize KPay service with environment configuration
 */
export function initializeKPayService(): KPayService {
   const config: KPayConfig = {
      baseUrl: process.env.KPAY_BASE_URL || "https://pay.esicia.com",
      username: process.env.KPAY_USERNAME || "",
      password: process.env.KPAY_PASSWORD || "",
      retailerId: process.env.KPAY_RETAILER_ID || "",
      environment:
         (process.env.KPAY_ENVIRONMENT as "sandbox" | "live") || "sandbox",
      webhookUrl:
         process.env.KPAY_WEBHOOK_URL ||
         "https://nihemart.rw/api/webhooks/kpay",
   };

   // Log initialization with clear environment indicator
   console.info("🚀 Initializing KPay Service");
   console.info("Environment Mode:", config.environment.toUpperCase());

   // Validate required configuration
   if (!config.username || !config.password || !config.retailerId) {
      console.error("❌ KPay Initialization Failed - Missing credentials");
      console.error("Check these environment variables:");
      console.error(
         "- KPAY_USERNAME:",
         config.username ? "✓ Set" : "✗ Missing"
      );
      console.error(
         "- KPAY_PASSWORD:",
         config.password ? "✓ Set" : "✗ Missing"
      );
      console.error(
         "- KPAY_RETAILER_ID:",
         config.retailerId ? "✓ Set" : "✗ Missing"
      );
      throw new Error(
         "KPay configuration is incomplete. Please check your environment variables."
      );
   }

   // Warning for sandbox in production-like URLs
   if (
      config.environment === "sandbox" &&
      config.webhookUrl.includes("nihemart.rw")
   ) {
      console.warn(
         "⚠️ WARNING: Using SANDBOX mode with production webhook URL"
      );
      console.warn("If this is production, set KPAY_ENVIRONMENT=live");
   }

   // Success message
   console.info("✅ KPay Service initialized successfully");
   console.info("Webhook URL:", config.webhookUrl);

   return new KPayService(config);
}
