import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CarFront,
  Clapperboard,
  Compass,
  GraduationCap,
  Heart,
  Home,
  House,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Monitor,
  PanelsTopLeft,
  Plus,
  Radio,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound,
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
  items: NavigationLink[];
};

export type NavigationEntry = NavigationLink | NavigationGroup;

export const navigationSections: {
  label: string;
  items: NavigationEntry[];
}[] = [
  {
    label: "Main",
    items: [
      {
        type: "link",
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        type: "group",
        label: "Marketplace",
        icon: ShoppingBag,
        items: [
          {
            type: "link",
            label: "Social Media Channels",
            href: "/social-media",
            icon: PanelsTopLeft,
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
            icon: Home,
          },
        ],
      },
      {
        type: "link",
        label: "Sell",
        href: "/sell",
        icon: Plus,
      },
      {
        type: "link",
        label: "Inbox",
        href: "/inbox",
        icon: Inbox,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        type: "link",
        label: "Profile",
        href: "/profile",
        icon: UserRound,
      },
      {
        type: "link",
        label: "Security",
        href: "/security",
        icon: ShieldCheck,
      },
      {
        type: "link",
        label: "Channels",
        href: "/channels",
        icon: ListOrdered,
      },
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
