/**
 * Khalti Failure Handler
 * GET /api/khalti/failure - Called by Khalti after failed payment
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/?payment=failed", request.url));
}
