import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  Heart,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
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

export type NavigationEntry = NavigationLink;

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
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        type: "link",
        label: "Admin Control",
        href: "/admin",
        icon: ShieldCheck,
      },
      {
        type: "link",
        label: "Marketplace",
        href: "/marketplace",
        icon: ShoppingBag,
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
