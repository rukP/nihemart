#!/usr/bin/env node
/**
 * KPay Configuration Verification Script
 * 
 * Run this script to verify your KPay configuration is correct for live environment.
 * 
 * Usage:
 *   node scripts/verify-kpay-config.js
 * 
 * Or make it executable:
 *   chmod +x scripts/verify-kpay-config.js
 *   ./scripts/verify-kpay-config.js
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Colors for terminal output
const colors = {
   reset: "\x1b[0m",
   red: "\x1b[31m",
   green: "\x1b[32m",
   yellow: "\x1b[33m",
   blue: "\x1b[34m",
   magenta: "\x1b[35m",
   cyan: "\x1b[36m",
   bold: "\x1b[1m",
};

function log(message, color = "reset") {
   console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
   log(`✅ ${message}`, "green");
}

function logError(message) {
   log(`❌ ${message}`, "red");
}

function logWarning(message) {
   log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
   log(`ℹ️  ${message}`, "blue");
}

function logHeader(message) {
   log(`\n${"=".repeat(60)}`, "cyan");
   log(`  ${message}`, "bold");
   log(`${"=".repeat(60)}`, "cyan");
}

// Load environment variables
const envFiles = [
   path.resolve(process.cwd(), ".env.local"),
   path.resolve(process.cwd(), ".env"),
];

let loaded = null;
for (const p of envFiles) {
   if (fs.existsSync(p)) {
      const result = dotenv.config({ path: p });
      if (!result.error) {
         loaded = p;
         break;
      }
   }
}

if (!loaded) {
   dotenv.config();
}

// Verification function
function verifyConfiguration() {
   logHeader("KPay Configuration Verification");

   const config = {
      environment: process.env.KPAY_ENVIRONMENT || null,
      baseUrl: process.env.KPAY_BASE_URL || null,
      liveBaseUrl: process.env.KPAY_LIVE_BASE_URL || null,
      username: process.env.KPAY_USERNAME || null,
      password: process.env.KPAY_PASSWORD || null,
      retailerId: process.env.KPAY_RETAILER_ID || null,
      webhookUrl: process.env.KPAY_WEBHOOK_URL || null,
   };

   let hasErrors = false;
   let hasWarnings = false;

   // Check environment file loaded
   logHeader("Environment File");
   if (loaded) {
      logSuccess(`Loaded environment from: ${loaded}`);
   } else {
      logWarning("No .env file found, using system environment variables");
   }

   // Check KPAY_ENVIRONMENT
   logHeader("Environment Mode");
   if (!config.environment) {
      logError("KPAY_ENVIRONMENT is NOT set!");
      logInfo("  Without this, system defaults to SANDBOX mode");
      logInfo("  Set: KPAY_ENVIRONMENT=live");
      hasErrors = true;
   } else if (config.environment === "live") {
      logSuccess(`Environment is set to: ${config.environment}`);
      logSuccess("System will use LIVE mode (real payments)");
   } else if (config.environment === "sandbox") {
      logWarning(`Environment is set to: ${config.environment}`);
      logWarning("System will use SANDBOX mode (test payments, no SMS)");
      logInfo("  For production, set: KPAY_ENVIRONMENT=live");
      hasWarnings = true;
   } else {
      logError(`Invalid environment: ${config.environment}`);
      logInfo("  Must be either 'live' or 'sandbox'");
      hasErrors = true;
   }

   // Determine effective API URL
   const effectiveUrl =
      config.environment === "live"
         ? config.liveBaseUrl || "https://pay.esicia.rw"
         : config.baseUrl || "https://pay.esicia.com";

   logHeader("API URL Configuration");
   log(`  Base URL (sandbox): ${config.baseUrl || "https://pay.esicia.com (default)"}`, "cyan");
   log(`  Live URL: ${config.liveBaseUrl || "https://pay.esicia.rw (default)"}`, "cyan");
   log(`  Effective URL: ${effectiveUrl}`, "bold");

   // Check for mismatches
   if (config.environment === "live" && effectiveUrl.includes("esicia.com")) {
      logError("CRITICAL: Environment is 'live' but using SANDBOX URL!");
      logInfo("  This means payments will NOT be real");
      logInfo("  Set: KPAY_LIVE_BASE_URL=https://pay.esicia.rw");
      hasErrors = true;
   } else if (config.environment === "live" && effectiveUrl.includes("esicia.rw")) {
      logSuccess("Correctly using LIVE URL for live environment");
   } else if (config.environment === "sandbox" && effectiveUrl.includes("esicia.com")) {
      logSuccess("Correctly using SANDBOX URL for sandbox environment");
   }

   // Check credentials
   logHeader("Credentials");
   if (!config.username) {
      logError("KPAY_USERNAME is NOT set!");
      hasErrors = true;
   } else {
      logSuccess(`Username: ${maskString(config.username)}`);
   }

   if (!config.password) {
      logError("KPAY_PASSWORD is NOT set!");
      hasErrors = true;
   } else {
      logSuccess(`Password: ${maskString(config.password)}`);
   }

   if (!config.retailerId) {
      logError("KPAY_RETAILER_ID is NOT set!");
      hasErrors = true;
   } else {
      logSuccess(`Retailer ID: ${maskString(config.retailerId)}`);
   }

   if (config.environment === "live" && config.username && config.password) {
      logWarning("IMPORTANT: Ensure you're using LIVE credentials (not sandbox)");
      logInfo("  Sandbox and live have different credentials");
   }

   // Check webhook URL
   logHeader("Webhook Configuration");
   if (!config.webhookUrl) {
      logWarning("KPAY_WEBHOOK_URL is NOT set (will use default)");
      logInfo("  Default: https://nihemart.rw/api/webhooks/kpay");
      hasWarnings = true;
   } else {
      logSuccess(`Webhook URL: ${config.webhookUrl}`);

      if (config.webhookUrl.includes("localhost")) {
         logWarning("Webhook URL points to localhost");
         logInfo("  This will NOT work in production");
         logInfo("  KPay servers cannot reach localhost");
         hasWarnings = true;
      }

      if (!config.webhookUrl.startsWith("https://") && config.environment === "live") {
         logWarning("Webhook URL is not using HTTPS");
         logInfo("  KPay may reject HTTP webhooks in production");
         hasWarnings = true;
      }
   }

   // Summary
   logHeader("Summary");

   if (hasErrors) {
      logError("Configuration has ERRORS that must be fixed!");
      log("\n  Your application will NOT work correctly with current settings.", "red");
   } else if (hasWarnings) {
      logWarning("Configuration has warnings to review");
      log("\n  Application may work but review warnings above.", "yellow");
   } else {
      logSuccess("Configuration looks good!");
      log("\n  All required settings are present and valid.", "green");
   }

   // Recommendations
   logHeader("Recommendations");

   if (config.environment === "sandbox") {
      log("  📝 You're in SANDBOX mode:", "yellow");
      log("     - Payments will be simulated", "yellow");
      log("     - No real SMS will be sent", "yellow");
      log("     - No money will be transferred", "yellow");
      log("     - Great for testing!", "yellow");
      log("\n  For production: Set KPAY_ENVIRONMENT=live", "yellow");
   } else if (config.environment === "live") {
      log("  🚀 You're in LIVE mode:", "green");
      log("     - Real payments will be processed", "green");
      log("     - SMS will be sent to customers", "green");
      log("     - Real money will be transferred", "green");
      log("     - Ensure IP is whitelisted with KPay", "green");
      log("     - Use live credentials from KPay", "green");
   }

   // Next steps
   logHeader("Next Steps");

   if (hasErrors) {
      log("  1. Fix the errors listed above", "red");
      log("  2. Run this script again to verify", "red");
      log("  3. Redeploy your application", "red");
      log("  4. Test with diagnostic endpoint", "red");
   } else {
      log("  1. Redeploy your application if you made changes", "blue");
      log("  2. Test diagnostic endpoint:", "blue");
      log("     curl https://nihemart.rw/api/debug/kpay-config", "cyan");
      log("  3. Make a test payment to verify", "blue");
      log("  4. Monitor server logs for confirmation", "blue");
   }

   log("\n");

   // Exit code
   process.exit(hasErrors ? 1 : 0);
}

function maskString(str) {
   if (!str) return "<NOT SET>";
   if (str.length <= 4) return "****";
   return `${str.slice(0, 2)}${"*".repeat(Math.min(str.length - 4, 8))}${str.slice(-2)}`;
}

// Run verification
verifyConfiguration();

