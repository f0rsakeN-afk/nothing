/**
 * eSewa Payment Service (Epay Integration)
 *
 * @see https://developer.esewa.com.np/pages/Epay
 */

import crypto from "crypto";

export interface EsewaPaymentRequest {
  amount: number;
  tax_amount: number;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: number;
  product_delivery_charge: number;
  success_url: string;
  failure_url: string;
}

export interface EsewaStatusResponse {
  transaction_code: string;
  status: "PENDING" | "COMPLETE" | "FULL_REFUND" | "PARTIAL_REFUND" | "AMBIGUOUS" | "NOT_FOUND" | "CANCELED";
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signature: string;
  signed_field_names: string;
}

export interface EsewaConfig {
  isProduction: boolean;
  secretKey: string;
  productCode: string;
}

/**
 * Get eSewa configuration based on environment
 */
export function getEsewaConfig(): EsewaConfig {
  const isProduction = process.env.ESEWA_ENVIRONMENT === "production";

  return {
    isProduction,
    secretKey: isProduction
      ? process.env.ESEWA_SECRET_KEY || ""
      : "8gBm/:&EnhH.1/q",
    productCode: isProduction
      ? process.env.ESEWA_PRODUCT_CODE || ""
      : "EPAYTEST",
  };
}

/**
 * Generate HMAC-SHA256 signature for eSewa Epay
 * @see https://developer.esewa.com.np/pages/Epay#signaturegeneration
 */
export function generateSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string,
  secretKey: string
): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * Verify eSewa response signature
 */
export function verifySignature(
  data: Record<string, string>,
  secretKey: string
): boolean {
  const signedFieldNames = data.signed_field_names?.split(",") || [];
  const messageParts: string[] = [];

  for (const field of signedFieldNames) {
    const value = data[field];
    if (value === undefined) return false;
    messageParts.push(`${field}=${value}`);
  }

  const message = messageParts.join(",");
  const expectedSignature = data.signature;

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  const calculatedSignature = hmac.digest("base64");

  return calculatedSignature === expectedSignature;
}

/**
 * Build eSewa payment URL
 */
export function getEsewaPaymentUrl(): string {
  const config = getEsewaConfig();
  return config.isProduction
    ? "https://epay.esewa.com.np/api/epay/main/v2/form"
    : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
}

/**
 * Build eSewa status check URL
 */
export function getEsewaStatusUrl(): string {
  const config = getEsewaConfig();
  return config.isProduction
    ? "https://esewa.com.np/api/epay/transaction/status/"
    : "https://rc.esewa.com.np/api/epay/transaction/status/";
}

/**
 * Create eSewa payment form data
 */
export function createEsewaPayment(params: {
  amount: number;
  taxAmount?: number;
  productServiceCharge?: number;
  productDeliveryCharge?: number;
  successUrl: string;
  failureUrl: string;
  transactionUuid: string;
  metadata?: Record<string, string>;
}): {
  formData: Record<string, string>;
  checksum: string;
} {
  const config = getEsewaConfig();

  const {
    amount,
    taxAmount = 0,
    productServiceCharge = 0,
    productDeliveryCharge = 0,
    successUrl,
    failureUrl,
    transactionUuid,
  } = params;

  const totalAmount = amount + taxAmount + productServiceCharge + productDeliveryCharge;

  // Generate signature
  const signature = generateSignature(
    totalAmount.toString(),
    transactionUuid,
    config.productCode,
    config.secretKey
  );

  const formData = {
    amount: amount.toString(),
    tax_amount: taxAmount.toString(),
    total_amount: totalAmount.toString(),
    transaction_uuid: transactionUuid,
    product_code: config.productCode,
    product_service_charge: productServiceCharge.toString(),
    product_delivery_charge: productDeliveryCharge.toString(),
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
  };

  return { formData, checksum: signature };
}

/**
 * Verify eSewa transaction status
 */
export async function verifyEsewaTransaction(params: {
  totalAmount: number;
  transactionUuid: string;
}): Promise<EsewaStatusResponse | null> {
  const config = getEsewaConfig();
  const statusUrl = getEsewaStatusUrl();

  console.log("[eSewa] Verifying transaction:", params);
  console.log("[eSewa] Using product code:", config.productCode);
  console.log("[eSewa] Using status URL:", statusUrl);

  const queryParams = new URLSearchParams({
    product_code: config.productCode,
    total_amount: params.totalAmount.toString(),
    transaction_uuid: params.transactionUuid,
  });

  console.log("[eSewa] Status check URL:", `${statusUrl}?${queryParams.toString()}`);

  try {
    const statusCheckUrl = `${statusUrl}?${queryParams.toString()}`;
    console.log("[eSewa] Full status check URL:", statusCheckUrl);

    const response = await fetch(statusCheckUrl);

    console.log("[eSewa] Status response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[eSewa] Status check failed:", response.status, errorText);
      return null;
    }

    const data = await response.json() as Record<string, string>;
    console.log("[eSewa] Status response data:", JSON.stringify(data));

    // Verify signature
    if (!verifySignature(data, config.secretKey)) {
      console.error("[eSewa] Signature verification failed");
      return null;
    }

    return data as unknown as EsewaStatusResponse;
  } catch (error) {
    console.error("[eSewa] Status check error:", error);
    return null;
  }
}
