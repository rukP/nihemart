import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to check KPay configuration
 * IMPORTANT: Remove or secure this endpoint in production!
 */
export async function GET(_request: NextRequest) {
  try {
    // Get environment variables
    const environment = process.env.KPAYENVIRONMENT || 'sandbox';
    const baseUrl = process.env.KPAYBASE_URL || 'https://pay.esicia.com';
    const liveBaseUrl =
      process.env.KPAYLIVE_BASE_URL || 'https://pay.esicia.rw';
    const username = process.env.KPAYUSERNAME || '';
    const password = process.env.KPAYPASSWORD || '';
    const retailerId = process.env.KPAYRETAILER_ID || '';
    const webhookUrl =
      process.env.KPAYWEBHOOK_URL || 'https://nihemart.rw/api/webhooks/kpay';

    // Determine which URL will be used
    const effectiveApiUrl = environment === 'live' ? liveBaseUrl : baseUrl;

    // Mask credentials for security
    const maskString = (str: string) => {
      if (!str) return '<NOT SET>';
      if (str.length <= 4) return '****';
      return `${str.slice(0, 2)}${'*'.repeat(str.length - 4)}${str.slice(-2)}`;
    };

    // Configuration status
    const config = {
      environment,
      effectiveApiUrl,
      baseUrl,
      liveBaseUrl,
      webhookUrl,
      credentials: {
        username: maskString(username),
        password: maskString(password),
        retailerId: maskString(retailerId),
      },
      validation: {
        hasUsername: !!username,
        hasPassword: !!password,
        hasRetailerId: !!retailerId,
        isLiveEnvironment: environment === 'live',
        usingSandboxUrl: effectiveApiUrl.includes('esicia.com'),
        usingLiveUrl: effectiveApiUrl.includes('esicia.rw'),
      },
      warnings: [] as string[],
      recommendations: [] as string[],
    };

    // Add warnings and recommendations
    if (environment === 'sandbox') {
      config.warnings.push(
        '⚠️ Running in SANDBOX mode - payments will not be real'
      );
      config.recommendations.push('Set KPAYENVIRONMENT=live for production');
    }

    if (environment === 'live' && effectiveApiUrl.includes('esicia.com')) {
      config.warnings.push(
        "🚨 CRITICAL: Environment is 'live' but still using sandbox URL!"
      );
      config.recommendations.push(
        'Verify KPAYLIVE_BASE_URL is set to https://pay.esicia.rw'
      );
    }

    if (environment === 'live') {
      config.recommendations.push(
        '✅ Live environment detected - using real payment processing'
      );
    }

    if (!username || !password || !retailerId) {
      config.warnings.push('🚨 Missing required KPay credentials!');
      config.recommendations.push(
        'Set KPAYUSERNAME, KPAYPASSWORD, and KPAYRETAILER_ID'
      );
    }

    if (webhookUrl.includes('localhost')) {
      config.warnings.push(
        "⚠️ Webhook URL points to localhost - won't work in production"
      );
      config.recommendations.push(
        'Set KPAYWEBHOOK_URL to your production domain (HTTPS)'
      );
    }

    if (!webhookUrl.startsWith('https://') && environment === 'live') {
      config.warnings.push(
        '⚠️ Webhook URL not using HTTPS - KPay may reject it'
      );
      config.recommendations.push('Use HTTPS for webhook URL in production');
    }

    // Return diagnostic information
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        config,
        message:
          config.warnings.length > 0
            ? 'Configuration issues detected'
            : 'Configuration looks good',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in KPay config diagnostic:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
