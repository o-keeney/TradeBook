"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PortfolioGallerySlide = {
  id: string;
  url: string;
  caption: string | null;
};

type PortfolioGallerySlideshowProps = {
  images: PortfolioGallerySlide[];
};

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function PortfolioGallerySlideshow({ images }: PortfolioGallerySlideshowProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const announceRef = useRef<HTMLParagraphElement>(null);

  const n = images.length;
  const current = n > 0 ? images[Math.min(index, n - 1)] : null;

  useEffect(() => {
    if (!n) return;
    setIndex((i) => Math.min(i, n - 1));
  }, [n]);

  const go = useCallback(
    (delta: number) => {
      if (n <= 0) return;
      setIndex((i) => (i + delta + n) % n);
    },
    [n],
  );

  const goTo = useCallback(
    (i: number) => {
      if (n <= 0) return;
      setIndex(((i % n) + n) % n);
    },
    [n],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (n <= 1) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [n, go]);

  useEffect(() => {
    if (!announceRef.current || !n) return;
    announceRef.current.textContent = `Slide ${Math.min(index, n - 1) + 1} of ${n}`;
  }, [index, n]);

  if (!n || !current) {
    return null;
  }

  const active = Math.min(index, n - 1);

  return (
    <div
      className="rounded-2xl border border-neutral-200 bg-neutral-950 shadow-lg dark:border-neutral-800"
      role="region"
      aria-roledescription="carousel"
      aria-label="Project photo gallery"
    >
      <div className="relative overflow-hidden rounded-t-2xl bg-neutral-900">
        <div
          className="relative aspect-[16/10] max-h-[min(70vh,52rem)] w-full touch-pan-y sm:aspect-[2/1]"
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const x0 = touchStartX.current;
            touchStartX.current = null;
            if (x0 == null || n <= 1) return;
            const x1 = e.changedTouches[0]?.clientX ?? x0;
            const dx = x1 - x0;
            if (dx > 56) go(-1);
            else if (dx < -56) go(1);
          }}
        >
          <img
            key={current.id}
            src={current.url}
            alt={current.caption?.trim() ? current.caption : `Photo ${active + 1} of ${n}`}
            className="h-full w-full object-cover transition-opacity duration-300 ease-out"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

          {n > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/70 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/70 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center px-4">
            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
              {active + 1} / {n}
            </span>
          </div>
        </div>

        {current.caption?.trim() ? (
          <figcaption className="border-t border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white/95 backdrop-blur-sm dark:bg-black/50">
            {current.caption}
          </figcaption>
        ) : (
          <div className="border-t border-white/10 bg-black/30 py-2 backdrop-blur-sm" aria-hidden />
        )}
      </div>

      {n > 1 ? (
        <div className="flex justify-center gap-2 border-t border-neutral-800 bg-neutral-950 px-3 py-3">
          {images.map((im, i) => (
            <button
              key={im.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i)}
              className={`h-2.5 w-2.5 rounded-full transition focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-950 ${
                i === active ? "scale-110 bg-white" : "bg-neutral-600 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      ) : null}

      {n > 1 ? (
        <div className="border-t border-neutral-800 bg-neutral-900/90 px-2 py-3">
          <p className="mb-2 px-2 text-center text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">
            Thumbnails · tap to jump
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
            {images.map((im, i) => (
              <button
                key={im.id}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => goTo(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:h-[4.5rem] sm:w-[6.5rem] ${
                  i === active
                    ? "border-white ring-2 ring-white/40"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <img src={im.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p ref={announceRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      {n > 1 ? (
        <p className="border-t border-neutral-800 bg-neutral-950 px-4 py-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Use arrow keys when not typing in a form · swipe on touch devices
        </p>
      ) : null}
    </div>
  );
}
