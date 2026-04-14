/**
 * Type-safe Translation Keys
 *
 * This file provides TypeScript types for all translation keys.
 * Use these for type-safe access to translations.
 *
 * Generated from messages/*.json - keep in sync!
 */

export const namespaces = [
  "common",
  "auth",
  "chat",
  "project",
  "settings",
  "notifications",
  "errors",
  "validation",
  "credits",
  "files",
  "search",
  "ai",
  "time",
  "pagination",
  "accessibility",
] as const;

export type Namespace = (typeof namespaces)[number];

// Common namespace keys
export type CommonKey =
  | "save"
  | "cancel"
  | "delete"
  | "edit"
  | "create"
  | "close"
  | "loading"
  | "search"
  | "submit"
  | "confirm"
  | "back"
  | "next"
  | "previous"
  | "copy"
  | "copied"
  | "share"
  | "download"
  | "upload"
  | "refresh"
  | "retry"
  | "yes"
  | "no"
  | "ok"
  | "or"
  | "and"
  | "but"
  | "learnMore"
  | "seeAll"
  | "showLess"
  | "showMore"
  | "required"
  | "optional"
  | "enabled"
  | "disabled"
  | "active"
  | "inactive"
  | "pending"
  | "success"
  | "error"
  | "warning"
  | "info";

// Auth namespace keys
export type AuthKey =
  | "signIn"
  | "signUp"
  | "signOut"
  | "signInWith"
  | "signUpWith"
  | "email"
  | "password"
  | "confirmPassword"
  | "forgotPassword"
  | "resetPassword"
  | "newPassword"
  | "currentPassword"
  | "changePassword"
  | "rememberMe"
  | "createAccount"
  | "alreadyHaveAccount"
  | "dontHaveAccount"
  | "welcomeBack"
  | "enterEmail"
  | "enterPassword"
  | "passwordMismatch"
  | "invalidCredentials"
  | "emailTaken"
  | "accountDeactivated"
  | "verificationEmail"
  | "verifyEmail"
  | "verifyEmailDesc"
  | "resendVerification"
  | "checkSpamFolder";

// Chat namespace keys
export type ChatKey =
  | "title"
  | "newChat"
  | "chatHistory"
  | "noChats"
  | "noChatsDesc"
  | "startChat"
  | "sendMessage"
  | "typeMessage"
  | "askFollowUp"
  | "aiThinking"
  | "aiTyping"
  | "messageSent"
  | "messageDeleted"
  | "messageEdited"
  | "renameChat"
  | "deleteChat"
  | "deleteChatConfirm"
  | "archiveChat"
  | "unarchiveChat"
  | "pinChat"
  | "unpinChat"
  | "shareChat"
  | "exportChat"
  | "chatSettings"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "olderChats"
  | "newChatTitle"
  | "untitledChat"
  | "chatCreated"
  | "members"
  | "addMembers"
  | "removeMembers"
  | "leftChat"
  | "inviteLink"
  | "copyInviteLink"
  | "invalidInviteLink";

// All translation keys combined
export type TranslationKey =
  | `${"common"}.${CommonKey}`
  | `${"auth"}.${AuthKey}`
  | `${"chat"}.${ChatKey}`
  | `${Namespace}.${string}`;

/**
 * Utility type to extract keys from a nested object
 */
type FlattenKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? FlattenKeys<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

/**
 * Get translation key type for a specific namespace
 */
export type GetKey<N extends Namespace> = FlattenKeys<
  (typeof import("../messages/en.json"))[N]
>;

/**
 * Example usage with useTranslations:
 *
 * ```typescript
 * const t = useTranslations();
 *
 * // Type-safe key (shows autocomplete in IDE)
 * t("common.save");
 *
 * // With variables
 * t("chat.members", { count: 5 });
 *
 * // With namespace
 * const t = useTranslations("settings");
 * t("language");
 * ```
 */
