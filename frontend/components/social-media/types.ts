export type PlatformType =
  | "all"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "telegram"
  | "facebook";

export interface ChannelItem {
  id: string;
  name: string;
  platform: "youtube" | "instagram" | "tiktok" | "telegram" | "facebook";
  category: string;
  isNew?: boolean;
  linkText: string;
  linkUrl: string;
  badgeTag?: string;
  followers: string;
  followersLabel?: "Followers" | "Subscribers";
  secondaryStat?: string;
  engagement?: string;
  status?: "ACTIVE" | "ONGOING";
  price: string;
  rawPrice: number;
  avatarBg?: string;
  initials?: string;
  featured?: boolean;
  /** DB-sourced fields */
  dbId?: number;
  sellerId?: number | null;
  sellerName?: string;
  description?: string;
  screenshot_url?: string | null;
  views_or_likes?: string;
}
