import type { Metadata } from "next";
import { getDictionary } from "@/src/content";
import { fetchProjects } from "@/src/lib/projects-wp";
import { localizePath, resolveLocale } from "@/src/lib/i18n";
import { pageMetadata } from "@/src/lib/seo";
import ProjectsHero from "@/src/components/work/ProjectsHero";
import CtaBand from "@/src/components/ui/CtaBand";
import WorkGrid from "@/src/components/work/WorkGrid";

type PageProps = { params: Promise<{ locale: string }> };

// Los proyectos vienen de WordPress: se revalidan cada hora sin redesplegar.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  return pageMetadata({
    locale,
    path: "proyectos",
    title: dict.work.metaTitle,
    description: dict.work.metaDescription,
  });
}

export default async function WorkPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const projects = await fetchProjects(locale);

  // Portadas para el collage del hero.
  const heroItems = projects
    .filter((p) => p.cover)
    .map((p) => ({
      href: localizePath(locale, `proyectos/${p.slug}`),
      title: p.title,
      src: p.cover as string,
    }));

  return (
    <>
      <ProjectsHero title={dict.work.title} intro={dict.work.intro} items={heroItems} />
      <section className="pb-24 md:pb-36">
        <WorkGrid projects={projects} locale={locale} dict={dict} headingLevel="h2" />
      </section>
      <CtaBand
        title={dict.home.cta.title}
        text={dict.home.cta.text}
        cta={{ label: dict.common.bookCall, href: localizePath(locale, "contacto") }}
      />
    </>
  );
}