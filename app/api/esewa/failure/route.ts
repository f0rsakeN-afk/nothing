/**
 * eSewa Failure Handler
 * GET /api/esewa/failure - Called by eSewa after failed payment
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[eSewa] Failure callback URL:", request.url);
  // Redirect back to app with failure status
  return NextResponse.redirect(new URL("/?payment=failed", request.url));
}
