export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-7.5rem)] max-w-5xl flex-col justify-center lg:min-h-[calc(100vh-5rem)]">
      <div className="max-w-2xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Hulu Market
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Your next great find starts here.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
          Explore the marketplace using the navigation to find products,
          services, and communities.
        </p>
      </div>
    </main>
  );
}
