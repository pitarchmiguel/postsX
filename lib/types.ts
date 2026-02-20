export const POST_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export interface PostCreateInput {
  text: string;
  threadJson?: string | null;
  scheduledAt?: string | null;
  tags?: string;
  status?: PostStatus;
  communityId?: string | null;
}

export interface PostUpdateInput {
  text?: string;
  threadJson?: string | null;
  scheduledAt?: string | null;
  tags?: string;
  status?: PostStatus;
  communityId?: string | null;
}

export interface XCommunity {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
}

export interface SettingKeys {
  POSTING_WINDOWS: string; // JSON array of "HH:mm"
  CONTENT_CATEGORIES: string; // JSON array of { name, ratio }
  UTM_TEMPLATE: string;
  SIMULATION_MODE: string; // "true" | "false"
  TIMEZONE: string;
}
