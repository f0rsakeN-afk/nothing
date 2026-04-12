/**
 * Stripe Webhook API
 * POST /api/stripe/webhook - Handle Stripe webhook events
 * Handles subscription creation, updates, cancellations, and credit purchases
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeConfig } from "@/lib/stripe-config";
import { SubscriptionStatus } from "@/src/generated/prisma/client";
import prisma from "@/lib/prisma";

const stripe = new Stripe(stripeConfig.secretKey);

// Stripe subscription fields we use (for type safety)
interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  metadata: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (userId && planId && session.subscription) {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as StripeSubscription;

          // Get or create subscription record
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              planId,
              stripeSubId: subscription.id,
              stripeCustomerId: session.customer as string,
              status: mapStripeStatus(subscription.status),
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              planId,
              stripeSubId: subscription.id,
              stripeCustomerId: session.customer as string,
              status: mapStripeStatus(subscription.status),
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          // Update user's plan tier
          const plan = await prisma.plan.findUnique({ where: { id: planId } });
          if (plan) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                planTier: plan.tier,
                planId: plan.id,
                credits: plan.credits,
                maxChats: plan.maxChats,
                maxProjects: plan.maxProjects,
                maxMessages: plan.maxMessages,
                features: plan.features,
              },
            });
          }

          console.log(`Subscription created for user ${userId}, plan ${planId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as StripeSubscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const existingSub = await prisma.subscription.findUnique({
            where: { stripeSubId: subscription.id },
          });

          if (existingSub) {
            await prisma.subscription.update({
              where: { id: existingSub.id },
              data: {
                status: mapStripeStatus(subscription.status),
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as unknown as StripeSubscription;

        const existingSub = await prisma.subscription.findUnique({
          where: { stripeSubId: subscription.id },
        });

        if (existingSub) {
          // Get user's current credits BEFORE we update anything
          const user = await prisma.user.findUnique({
            where: { id: existingSub.userId },
            select: { credits: true, features: true },
          });

          const remainingCredits = user?.credits || 0;

          // Downgrade user to free plan but KEEP their credits
          const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });

          await prisma.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
            },
          });

          if (freePlan) {
            // Keep remaining credits (they paid for them)
            // Cap usage limits to free tier (fair use policy)
            // Keep features if they have credits remaining, otherwise revert to free
            const keepFeatures = remainingCredits > 0;
            const featuresToSet = keepFeatures
              ? user?.features || freePlan.features
              : freePlan.features;

            await prisma.user.update({
              where: { id: existingSub.userId },
              data: {
                planTier: "FREE",
                planId: null,
                // KEEP remaining credits - this is the key! They paid for them
                credits: remainingCredits,
                // Cap usage limits to free tier to prevent abuse
                maxChats: freePlan.maxChats,
                maxProjects: freePlan.maxProjects,
                maxMessages: freePlan.maxMessages,
                features: featuresToSet,
              },
            });

            console.log(
              `Subscription ended for user ${existingSub.userId}. ` +
              `Kept ${remainingCredits} credits, features: ${keepFeatures ? "kept" : "removed"}`
            );
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as { subscription?: string; billing_reason?: string };
        const subId = invoice.subscription;
        if (subId && invoice.billing_reason === "subscription_cycle") {
          const subscription = await stripe.subscriptions.retrieve(subId) as unknown as StripeSubscription;

          await prisma.subscription.updateMany({
            where: { stripeSubId: subscription.id },
            data: {
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              status: "ACTIVE",
            },
          });

          // Credit rollover - add new monthly credits ON TOP of existing
          // This is a unique feature: unused credits carry over to next month
          const existingSub = await prisma.subscription.findFirst({
            where: { stripeSubId: subscription.id },
            include: { user: true },
          });

          if (existingSub) {
            const plan = await prisma.plan.findUnique({ where: { id: existingSub.planId } });
            if (plan) {
              await prisma.user.update({
                where: { id: existingSub.userId },
                data: {
                  // Add new monthly credits on top of existing (rollover)
                  credits: existingSub.user.credits + plan.credits,
                },
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as { subscription?: string };
        const subId = invoice.subscription;
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: subId },
            data: { status: "UNPAID" },
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { userId, credits } = paymentIntent.metadata || {};

        if (userId && credits) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              credits: {
                increment: parseInt(credits, 10),
              },
            },
          });
          console.log(`Added ${credits} credits to user ${userId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "canceled":
      return "CANCELED";
    case "past_due":
      return "PAST_DUE";
    case "trialing":
      return "TRIALING";
    case "unpaid":
      return "UNPAID";
    default:
      return "ACTIVE";
  }
}
