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
  /** Posiciones de las palabras del título que van dentro de un círculo (solo si hay 2 o más palabras). */
  circleWords?: number[];
};

/**
 * true  = respeta a quien tiene activado "reducir movimiento" en su sistema (recomendado en producción).
 * false = anima siempre. Útil para probar si el efecto no se ve porque Windows tiene las animaciones desactivadas.
 */
const RESPECT_REDUCED_MOTION = true;

// Proporciones variadas para que la grilla tenga ritmo (tarjetas de distinta altura).
const RATIOS = ["aspect-[3/2]", "aspect-[4/5]", "aspect-square", "aspect-[5/4]", "aspect-[3/4]", "aspect-[16/10]"];

// Cuánto sube cada tarjeta (px) mientras el hero sale de pantalla (parallax).
const DEPTHS = [-170, -240, -200, -280, -190, -260, -220];

// De dónde entra cada trozo del título, en fracción de pantalla: izquierda, arriba, derecha, abajo.
const ENTER = [
  { x: -0.7, y: 0, r: -6 },
  { x: 0, y: -0.55, r: 4 },
  { x: 0.7, y: 0, r: 6 },
  { x: 0, y: 0.55, r: -4 },
];

// Hacia dónde se separa cada trozo al hacer scroll (px).
const SPREAD = [
  { x: -160, y: 0 },
  { x: 0, y: -90 },
  { x: 160, y: 0 },
  { x: 0, y: 90 },
];

/** "Proyectos" → ["Pro", "yec", "tos"]. Las palabras cortas no se parten. */
function splitChunks(word: string): string[] {
  const parts = word.length >= 7 ? 3 : word.length >= 5 ? 2 : 1;
  const size = Math.ceil(word.length / parts);
  const out: string[] = [];
  for (let i = 0; i < word.length; i += size) out.push(word.slice(i, i + size));
  return out;
}

export default function ProjectsHero({ title, intro, items, circleWords = [1, 2] }: ProjectsHeroProps) {
  const rootRef = useRef<HTMLElement>(null);

  // Dos columnas: las tarjetas se reparten una a una.
  const columns = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];

  // Título partido en palabras y trozos; cada trozo recibe una dirección de entrada.
  const words = title.split(" ");
  let counter = 0;
  const layout = words.map((word, wi) => ({
    word,
    circled: words.length > 1 && circleWords.includes(wi),
    chunks: splitChunks(word).map((text) => ({ text, dir: counter++ % ENTER.length })),
  }));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const query = RESPECT_REDUCED_MOTION ? "(prefers-reduced-motion: no-preference)" : "(min-width: 0px)";

    mm.add(query, () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. Título: cada trozo llega desde un lado distinto.
      root.querySelectorAll<HTMLElement>("[data-chunk]").forEach((el, i) => {
        const d = ENTER[Number(el.dataset.dir) % ENTER.length];
        gsap.fromTo(
          el,
          { opacity: 0, x: d.x * vw, y: d.y * vh, rotate: d.r },
          { opacity: 1, x: 0, y: 0, rotate: 0, duration: 1.5, ease: "power4.out", delay: 0.1 + i * 0.1 }
        );
      });

      // Círculos de las palabras: se dibujan cuando el texto ya está en su sitio.
      gsap.fromTo(
        root.querySelectorAll("[data-ring]"),
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.6)", delay: 1.3, stagger: 0.15 }
      );

      // Subtítulo.
      const introEl = root.querySelector("[data-intro]");
      if (introEl) {
        gsap.fromTo(introEl, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out", delay: 1.4 });
      }

      // 2. Scroll: el título se abre (cada trozo se aleja hacia su lado) y se desvanece.
      const spreadScroll = {
        trigger: root,
        start: "top top",
        end: () => `+=${window.innerHeight * 0.8}`,
        scrub: 0.5,
        invalidateOnRefresh: true,
      };
      root.querySelectorAll<HTMLElement>("[data-spread]").forEach((el) => {
        const s = SPREAD[Number(el.parentElement?.dataset.dir ?? 0) % SPREAD.length];
        gsap.to(el, { x: s.x, y: s.y, ease: "none", scrollTrigger: spreadScroll });
      });
      root.querySelectorAll("[data-ring-wrap]").forEach((el) => {
        gsap.to(el, { scale: 1.2, opacity: 0, ease: "none", scrollTrigger: spreadScroll });
      });
      const titleEl = root.querySelector("[data-title]");
      if (titleEl) gsap.to(titleEl, { opacity: 0, ease: "none", scrollTrigger: spreadScroll });

      // 3. Tarjetas: entran desde su lado (izquierda o derecha) con un giro leve.
      //    Las visibles al cargar entran en cascada; las de más abajo entran al llegar con el scroll.
      root.querySelectorAll<HTMLElement>("[data-in]").forEach((el, i) => {
        const fromLeft = el.dataset.col === "0";
        const visibleAtLoad = el.getBoundingClientRect().top < vh;
        gsap.fromTo(
          el,
          { opacity: 0, x: fromLeft ? -120 : 120, y: 100, rotate: fromLeft ? -4 : 4, scale: 0.92 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            duration: 1.3,
            ease: "power4.out",
            delay: visibleAtLoad ? 1.5 + i * 0.15 : 0,
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          }
        );
      });

      // 4. Parallax: cada tarjeta sube a su propio ritmo mientras el hero sale de pantalla.
      root.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => {
        gsap.to(el, {
          y: Number(el.dataset.depth),
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.5 },
        });
      });
    });

    return () => mm.revert();
  }, [items.length]);

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-svh flex-col items-center overflow-x-clip bg-paper px-6 pb-12 pt-32 md:px-8 md:pb-16 md:pt-40"
    >
      {/* Título */}
      <div className="relative z-10 text-center">
        <h1
          data-title
          className="font-display text-[clamp(48px,14vw,230px)] font-semibold leading-[0.92] tracking-[-0.03em] text-ink"
        >
          {layout.map(({ word, circled, chunks }, wi) => (
            <span key={`${word}-${wi}`}>
              <span
                className={`relative inline-block whitespace-nowrap ${
                  circled ? "mx-[0.04em] px-[0.18em] pb-[0.06em]" : ""
                }`}
              >
                {circled ? (
                  <span data-ring-wrap className="pointer-events-none absolute inset-0">
                    <span
                      data-ring
                      className="block size-full rounded-full border-[3px] border-ink motion-safe:opacity-0"
                    />
                  </span>
                ) : null}
                {chunks.map((chunk, ci) => (
                  <span
                    key={ci}
                    data-chunk
                    data-dir={chunk.dir}
                    className="inline-block motion-safe:opacity-0"
                  >
                    <span data-spread className="inline-block">
                      {chunk.text}
                    </span>
                  </span>
                ))}
              </span>
              {wi < layout.length - 1 ? " " : null}
            </span>
          ))}
        </h1>
        {intro ? (
          <p
            data-intro
            className="mx-auto mt-6 max-w-xl font-sans text-[clamp(16px,2vw,22px)] leading-snug text-slate motion-safe:opacity-0"
          >
            {intro}
          </p>
        ) : null}
      </div>

      {/* Grilla de tarjetas */}
      <div className="relative z-0 mt-10 grid w-full max-w-[1100px] grid-cols-2 gap-3.5 md:gap-6">
        {columns.map((col, c) => (
          <div key={c} className={`flex flex-col gap-3.5 md:gap-6 ${c === 1 ? "mt-10 md:mt-[60px]" : ""}`}>
            {col.map((item, k) => (
              <div key={item.href} data-depth={DEPTHS[(c * 3 + k) % DEPTHS.length]} className="will-change-transform">
                <div data-in data-col={c} className="motion-safe:opacity-0">
                  <Link
                    href={item.href}
                    className={`group relative block overflow-hidden rounded-[14px] bg-mist shadow-[0_1px_2px_rgba(9,17,20,0.08)] transition-[transform,box-shadow] duration-[350ms] ease-out hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-[0_18px_40px_rgba(9,17,20,0.16)] ${
                      RATIOS[(c + k * 2) % RATIOS.length]
                    }`}
                  >
                    <Image
                      src={item.src}
                      alt={item.title}
                      fill
                      quality={90}
                      priority={c === 0 && k === 0}
                      sizes="(min-width: 1100px) 550px, 50vw"
                      className="object-cover"
                    />
                    <span className="absolute bottom-3 left-3 translate-y-1.5 rounded-full bg-white/90 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.1em] text-ink opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {item.title}
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}