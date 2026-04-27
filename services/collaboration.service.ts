/**
 * Collaboration API Client - for chat members, invitations, presence
 */

import { ChatRole, type ChatMember, type ChatInvitation } from "@/src/generated/prisma/client";

export type { ChatMember, ChatInvitation };

// Members API
export async function getChatMembers(chatId: string): Promise<ChatMemberWithUser[]> {
  const res = await fetch(`/api/chats/${chatId}/members`);
  if (!res.ok) throw new Error("Failed to fetch members");
  const data = await res.json();
  return data.members;
}

export async function addChatMember(
  chatId: string,
  userId: string,
  role: "VIEWER" | "EDITOR" = "VIEWER"
): Promise<ChatMember> {
  const res = await fetch(`/api/chats/${chatId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to add member" }));
    throw new Error(error.error || "Failed to add member");
  }
  const data = await res.json();
  return data.member;
}

export async function updateChatMemberRole(
  chatId: string,
  userId: string,
  role: ChatRole
): Promise<ChatMember> {
  const res = await fetch(`/api/chats/${chatId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to update member" }));
    throw new Error(error.error || "Failed to update member");
  }
  const data = await res.json();
  return data.member;
}

export async function removeChatMember(
  chatId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`/api/chats/${chatId}/members/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to remove member" }));
    throw new Error(error.error || "Failed to remove member");
  }
}

// Invitations API
export async function createInvitation(
  chatId: string,
  email?: string,
  role: "VIEWER" | "EDITOR" = "VIEWER"
): Promise<{ invitation: ChatInvitation; inviteLink: string }> {
  const res = await fetch(`/api/chats/${chatId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to create invitation" }));
    throw new Error(error.error || "Failed to create invitation");
  }
  return res.json();
}

export async function getChatInvitations(chatId: string): Promise<ChatInvitation[]> {
  const res = await fetch(`/api/chats/${chatId}/invitations`);
  if (!res.ok) throw new Error("Failed to fetch invitations");
  const data = await res.json();
  return data.invitations;
}

export async function cancelInvitation(
  chatId: string,
  invitationId: string
): Promise<void> {
  const res = await fetch(`/api/chats/${chatId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to cancel invitation" }));
    throw new Error(error.error || "Failed to cancel invitation");
  }
}

export interface InvitationDetails {
  invitation: {
    id: string;
    chatId: string;
    chatTitle: string;
    role: ChatRole;
    status: string;
    expiresAt: Date;
    email: string | null;
  };
  inviter: string | null;
  alreadyMember: boolean;
  isOwner: boolean;
}

export async function getInvitationDetails(token: string): Promise<InvitationDetails> {
  const res = await fetch(`/api/invites/${token}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to get invitation" }));
    throw new Error(error.error || "Failed to get invitation");
  }
  return res.json();
}

export async function acceptInvitation(token: string): Promise<{ success: boolean; chatId: string; role: string }> {
  const res = await fetch(`/api/invites/${token}`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to accept invitation" }));
    throw new Error(error.error || "Failed to accept invitation");
  }
  return res.json();
}

export async function declineInvitation(token: string): Promise<void> {
  const res = await fetch(`/api/invites/${token}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to decline invitation" }));
    throw new Error(error.error || "Failed to decline invitation");
  }
}

// Presence API
export interface ActiveUser {
  userId: string;
  lastSeen: number;
}

// Extended types for frontend (includes relations)
export interface ChatMemberWithUser {
  id: string;
  chatId: string;
  userId: string;
  role: ChatRole;
  createdAt: Date;
  user: {
    id: string;
    email: string;
  };
}

export async function getActiveUsers(chatId: string): Promise<ActiveUser[]> {
  const res = await fetch(`/api/chats/${chatId}/presence`);
  if (!res.ok) throw new Error("Failed to get presence");
  const data = await res.json();
  return data.activeUsers;
}

export async function updatePresence(chatId: string): Promise<void> {
  const res = await fetch(`/api/chats/${chatId}/presence`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to update presence");
}