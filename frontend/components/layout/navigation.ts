import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  CarFront,
  Clapperboard,
  CreditCard,
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
  ShieldCheck,
  ShoppingBag,
  Star,
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
        label: "My Market Place",
        href: "/my-marketplace",
        icon: ListOrdered,
      },
      {
        type: "link",
        label: "Favorites",
        href: "/favorites",
        icon: Star,
      },
      {
        type: "link",
        label: "Transactions",
        href: "/transactions",
        icon: ArrowLeftRight,
      },
      {
        type: "link",
        label: "Deposit",
        href: "/deposit",
        icon: Plus,
      },
      {
        type: "link",
        label: "Withdraw",
        href: "/withdraw",
        icon: CreditCard,
      },
      {
        type: "link",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
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
