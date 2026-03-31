export type ChangeType = "feature" | "fix" | "improvement" | "breaking";

export type Change = {
  type: ChangeType;
  text: string;
};

export type ChangelogEntry = {
  /** Semantic version string, e.g. "1.3.0" */
  version: string;
  /** ISO 8601 date string, e.g. "2025-03-20" */
  date: string;
  title: string;
  description: string;
  changes: Change[];
};
