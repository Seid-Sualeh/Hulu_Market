import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

interface CategoryViewProps {
  title: string;
  description: string;
  categoryName: string;
}

export default function CategoryView({
  title,
  description,
  categoryName,
}: CategoryViewProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/social-media"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121721] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Channels</span>
        </Link>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#121722] to-[#0d121a] p-8 sm:p-12 text-center shadow-xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
          <ShoppingBag size={28} />
        </div>

        <span className="mt-4 inline-block text-[11px] font-bold uppercase tracking-widest text-teal-400">
          Marketplace Category
        </span>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/social-media"
            className="rounded-xl bg-teal-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
          >
            Explore Social Media Channels
          </Link>
          <Link
            href="/sell"
            className="rounded-xl border border-white/15 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-white/5"
          >
            Post a Listing in {categoryName}
          </Link>
        </div>
      </div>
    </div>
  );
}
