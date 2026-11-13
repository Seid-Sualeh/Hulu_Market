import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CarFront,
  Clapperboard,
  Compass,
  Heart,
  House,
  Inbox,
  LayoutDashboard,
  LogOut,
  Monitor,
  PanelsTopLeft,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  UserRound,
  Wrench,
} from "lucide-react";

export type NavigationLink = {
  type: "link";
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  type: "group";
  label: string;
  icon: LucideIcon;
  items: NavigationEntry[];
};

export type NavigationEntry = NavigationLink | NavigationGroup;

export const navigationSections: {
  label: string;
  items: NavigationEntry[];
}[] = [
  {
    label: "Discover",
    items: [
      { type: "link", label: "Dashboard", href: "/", icon: LayoutDashboard },
      {
        type: "group",
        label: "Marketplace",
        icon: Compass,
        items: [
          {
            type: "group",
            label: "Social Media Channels",
            icon: PanelsTopLeft,
            items: [
              {
                type: "link",
                label: "Telegram",
                href: "/social-media/telegram",
                icon: Smartphone,
              },
              {
                type: "link",
                label: "YouTube",
                href: "/social-media/youtube",
                icon: Clapperboard,
              },
              {
                type: "link",
                label: "Facebook",
                href: "/social-media/facebook",
                icon: UserRound,
              },
              {
                type: "link",
                label: "Instagram",
                href: "/social-media/instagram",
                icon: PanelsTopLeft,
              },
              {
                type: "link",
                label: "TikTok",
                href: "/social-media/tiktok",
                icon: Clapperboard,
              },
            ],
          },
          {
            type: "link",
            label: "Houses & Properties",
            href: "/houses-properties",
            icon: House,
          },
          {
            type: "link",
            label: "Vehicles",
            href: "/vehicles",
            icon: CarFront,
          },
          {
            type: "link",
            label: "Electronics",
            href: "/electronics",
            icon: Monitor,
          },
          {
            type: "link",
            label: "Ebooks & Digital Products",
            href: "/ebooks-digital-products",
            icon: BookOpen,
          },
          {
            type: "link",
            label: "Educational Videos",
            href: "/educational-videos",
            icon: Clapperboard,
          },
          {
            type: "link",
            label: "Home & Furniture",
            href: "/home-furniture",
            icon: House,
          },
        ],
      },
      { type: "link", label: "Services", href: "/services", icon: Wrench },
    ],
  },
  {
    label: "Your space",
    items: [
      {
        type: "link",
        label: "Sell / Create Listing",
        href: "/sell",
        icon: Plus,
      },
      { type: "link", label: "Favorites", href: "/favorites", icon: Heart },
      { type: "link", label: "Inbox", href: "/inbox", icon: Inbox },
    ],
  },
  {
    label: "Account",
    items: [
      { type: "link", label: "Profile", href: "/profile", icon: UserRound },
      {
        type: "link",
        label: "Security",
        href: "/security",
        icon: ShieldCheck,
      },
      { type: "link", label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const logoutNavigationItem: NavigationLink = {
  type: "link",
  label: "Logout",
  href: "/logout",
  icon: LogOut,
};

export const brandIcon = ShoppingBag;
