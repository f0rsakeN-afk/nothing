import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations/contact.validation";
import { checkApiRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkApiRateLimit(request, "default");
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { type: "validation_error", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    const { name, email, topic, message } = parsed.data;

    const contact = await prisma.contact.create({
      data: { name, email, topic, message },
    });

    return NextResponse.json({ success: true, data: contact }, { status: 201 });
  } catch (error) {
    console.error("Contact submission error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to submit contact form" } },
      { status: 500 },
    );
  }
}