import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SocialMediaMarketplace from "../../../components/marketplace/SocialMediaMarketplace";

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
  description: "Explore social media channel listings on Hulu Market.",
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

  return (
    <SocialMediaMarketplace
      initialPlatform={platform as Exclude<Platform, "all">}
    />
  );
}
