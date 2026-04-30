/**
 * Khalti Payment Service
 *
 * @see https://docs.khalti.com/
 */

export interface KhaltiConfig {
  isProduction: boolean;
  secretKey: string;
  publicKey: string;
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiVerifyResponse {
  idx: string;
  user_id: number;
  product_identity: string;
  product_name: string;
  amount: number;
  total_amount: number;
  status: "Completed" | "Pending" | "Refunded" | "Partial" | "Expired";
  fee_amount: number;
  refunded_amount: number;
  payload: Record<string, unknown>;
}

/**
 * Get Khalti configuration based on environment
 */
export function getKhaltiConfig(): KhaltiConfig {
  const isProduction = process.env.KHALTI_ENVIRONMENT === "production";

  return {
    isProduction,
    secretKey: process.env.KHALTI_SECRET_KEY || "test_secret_key_f953n2b0f541843c3c1ee62d22ce5c74",
    publicKey: process.env.KHALTI_PUBLIC_KEY || "test_public_key_5e3e2a1b8e2d4c6f9a1b3c2d4e5f6a7",
  };
}

/**
 * Get Khalti API endpoints
 */
export function getKhaltiEndpoints() {
  const config = getKhaltiConfig();
  return {
    initiate: config.isProduction
      ? "https://khalti.com/api/v2/epayment/initiate/"
      : "https://dev.khalti.com/api/v2/epayment/initiate/",
    verify: config.isProduction
      ? "https://khalti.com/api/v2/epayment/lookup/"
      : "https://dev.khalti.com/api/v2/epayment/lookup/",
  };
}

/**
 * Initiate Khalti payment
 */
export async function initiateKhaltiPayment(params: {
  amount: number; // in rupees
  productIdentity: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
  metadata?: Record<string, string>;
}): Promise<KhaltiInitiateResponse | null> {
  const config = getKhaltiConfig();
  const endpoints = getKhaltiEndpoints();

  // Amount must be in paisa (multiply by 100)
  const amountInPaisa = Math.round(params.amount * 100);

  try {
    const payload = {
      return_url: params.successUrl,
      website_url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      amount: amountInPaisa,
      purchase_order_id: params.productIdentity,
      purchase_order_name: params.productName,
      customer_info: {
        name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone || "9800000000",
      },
    };

    const response = await fetch(endpoints.initiate, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${config.secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Khalti] Initiation failed:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data as KhaltiInitiateResponse;
  } catch (error) {
    console.error("[Khalti] Initiation error:", error);
    return null;
  }
}

/**
 * Verify Khalti payment
 */
export async function verifyKhaltiPayment(pidx: string): Promise<KhaltiVerifyResponse | null> {
  const config = getKhaltiConfig();
  const endpoints = getKhaltiEndpoints();

  try {
    const response = await fetch(endpoints.verify, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${config.secretKey}`,
      },
      body: JSON.stringify({ idx: pidx }),
    });

    if (!response.ok) {
      console.error("[Khalti] Verification failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data as KhaltiVerifyResponse;
  } catch (error) {
    console.error("[Khalti] Verification error:", error);
    return null;
  }
}