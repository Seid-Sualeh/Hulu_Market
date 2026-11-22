import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Platform = "telegram" | "youtube" | "facebook" | "instagram" | "tiktok";

const platforms: Platform[] = [
  "telegram",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
];

export const metadata: Metadata = {
  title: "Social Media Channels | Hulu Market",
  description: "Explore real verified social media channel listings on Hulu Market.",
};

export default async function SocialMediaPlatformPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;

  if (!platforms.includes(platform as Platform)) {
    notFound();
  }

  redirect(`/social-media?platform=${platform}`);
}
