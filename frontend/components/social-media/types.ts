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
  badgeTag: string;
  followers: string;
  followersLabel?: "Followers" | "Subscribers";
  secondaryStat: string;
  status: "ACTIVE" | "ONGOING";
  price: string;
  rawPrice: number;
  avatarBg?: string;
  initials?: string;
}
