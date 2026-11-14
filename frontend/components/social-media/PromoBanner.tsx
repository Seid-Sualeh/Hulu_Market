"use client";

import Image from "next/image";

export default function PromoBanner() {
  return (
    <div className="relative h-36 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#18242b] sm:h-40 lg:h-[200px]">
      <Image
        src="/social-media-banner.png"
        alt="Hulu Market channel promotion"
        fill
        priority
        sizes="(min-width: 1024px) 80vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}
