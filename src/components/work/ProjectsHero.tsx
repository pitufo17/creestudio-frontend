"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type HeroItem = { href: string; title: string; src: string };

type ProjectsHeroProps = {
  title: string;
  intro?: string;
  items: HeroItem[];
};

const COLUMNS = 4;
const TILES_PER_COLUMN = 4;
const RATIOS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]"];
// Dónde empieza cada columna (en alturas de pantalla) y cuánto recorre.
// Distintos valores = cada columna sube a su ritmo (parallax).
const START = [0.8, 0.95, 0.86, 1.02];
const TRAVEL = [1, 1.2, 1.05, 1.15];

export default function ProjectsHero({ title, intro, items }: ProjectsHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // Repartimos las imágenes en columnas, repitiendo si hay pocas.
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    items.length === 0
      ? []
      : Array.from({ length: TILES_PER_COLUMN }, (_, k) => items[(c * 3 + k * 5) % items.length])
  );

  useEffect(() => {
    const root = rootRef.current;
    const titleEl = titleRef.current;
    if (!root || !titleEl) return;

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 1. Entrada del título, palabra por palabra.
      gsap.from(root.querySelectorAll("[data-word]"), {
        yPercent: 110,
        duration: 1,
        ease: "power4.out",
        stagger: 0.09,
      });
      const introEl = root.querySelector("[data-intro]");
      if (introEl) gsap.from(introEl, { opacity: 0, y: 12, duration: 0.8, delay: 0.5, ease: "power2.out" });

      // 2. Al hacer scroll: las columnas suben a distinta velocidad y el título se desvanece.
      const cols = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-col]"));
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      cols.forEach((col, i) => {
        tl.fromTo(
          col,
          { y: () => window.innerHeight * START[i % START.length] },
          { y: () => -col.offsetHeight * TRAVEL[i % TRAVEL.length], duration: 1, ease: "none" },
          0
        );
      });

      tl.to(titleEl, { opacity: 0, y: -80, scale: 0.94, duration: 0.3, ease: "power1.in" }, 0.12);
    });

    return () => mm.revert();
  }, [items.length]);

  const words = title.split(" ");

  return (
    <section ref={rootRef} className="relative h-[320svh] motion-reduce:h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:overflow-visible">
        {/* Título */}
        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center motion-reduce:pointer-events-auto motion-reduce:static motion-reduce:pb-12 motion-reduce:pt-40"
        >
          <h1 className="max-w-4xl text-balance font-display text-5xl font-bold leading-[1.02] tracking-tight text-ink sm:text-6xl md:text-8xl">
            {words.map((word, i) => (
              <span key={`${word}-${i}`}>
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <span data-word className="inline-block">
                    {word}
                  </span>
                </span>
                {i < words.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          {intro ? (
            <p data-intro className="mt-6 max-w-xl font-sans text-base leading-relaxed text-slate md:text-lg">
              {intro}
            </p>
          ) : null}
        </div>

        {/* Collage */}
        <div className="absolute inset-x-0 top-0 grid grid-cols-2 items-start gap-4 px-6 md:grid-cols-4 md:gap-6 md:px-10 motion-reduce:static motion-reduce:pb-24">
          {columns.map((tiles, c) => (
            <div
              key={c}
              data-col
              className={`flex-col gap-4 md:gap-6 ${c >= 2 ? "hidden md:flex" : "flex"}`}
            >
              {tiles.map((item, k) => (
                <Link
                  key={`${item.href}-${k}`}
                  href={item.href}
                  className={`relative block overflow-hidden rounded-md bg-mist ${RATIOS[(c + k) % RATIOS.length]} ${
                    k >= 2 ? "motion-reduce:hidden" : ""
                  }`}
                >
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    quality={90}
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover"
                  />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}