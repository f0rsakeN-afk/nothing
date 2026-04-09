import "server-only";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import type { User } from "@/src/generated/prisma/client";

const globalForUser = globalThis as unknown as {
  user: User | null | undefined;
};

export async function getOrCreateUser(): Promise<User | null> {
  if (globalForUser.user !== undefined) return globalForUser.user;

  const user = await stackServerApp.getUser();
  if (!user?.primaryEmail) {
    globalForUser.user = null;
    return null;
  }

  globalForUser.user = await prisma.user.upsert({
    where: { stackId: user.id },
    update: { email: user.primaryEmail },
    create: { stackId: user.id, email: user.primaryEmail, role: "USER" },
  });

  return globalForUser.user;
}
