import Link from "next/link";

import styles from "../institutions.module.css";

export type Metric = { label: string; value: string; detail: string; tone?: "green" | "gold" };
export type Activity = { title: string; meta: string; status: string };

const links = [
  ["Portail", "/pnpi/institutions"],
  ["Dossier unifié", "/pnpi/institutions/dossier"],
  ["AGANOR", "/pnpi/institutions/aganor"],
  ["OGAPI", "/pnpi/institutions/ogapi"],
] as const;

export function InstitutionalView({
  eyebrow,
  title,
  description,
  prototype = false,
  canViewMinister = false,
  metrics = [],
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  prototype?: boolean;
  canViewMinister?: boolean;
  metrics?: Metric[];
  children: React.ReactNode;
}) {
  return (
    <section className={styles.shell}>
      <nav className={styles.nav} aria-label="Navigation des institutions partenaires">
        <Link
          className={styles.brand}
          href="/pnpi/institutions"
          aria-label="PNPI Institutions, accueil"
        >
          <span aria-hidden="true">◆</span> PNPI Institutions
        </Link>
        <div className={styles.navLinks}>
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          {canViewMinister ? (
            <Link href="/pnpi/institutions/ministre">Cockpit Ministre</Link>
          ) : null}
        </div>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.lead}>{description}</p>
        </div>
        <span className={prototype ? styles.prototype : styles.operational}>
          {prototype ? "Prototype · données de démonstration" : "Ministère · données PNPI"}
        </span>
      </header>

      {metrics.length > 0 && (
        <section className={styles.metrics} aria-label="Indicateurs clés">
          {metrics.map((metric) => (
            <article className={styles.metric} key={metric.label}>
              <p>{metric.label}</p>
              <strong className={metric.tone === "gold" ? styles.gold : ""}>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>
      )}
      {prototype ? (
        <p className={styles.demoWarning}>
          Données de démonstration : les références, volumes, dates, statuts et indicateurs affichés
          sont fictifs jusqu’à validation institutionnelle et interconnexion officielle.
        </p>
      ) : null}
      {children}
      <footer className={styles.footer}>
        Plateforme Nationale de Pilotage Industriel · République Gabonaise
      </footer>
    </section>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ActivityList({ items }: { items: Activity[] }) {
  return (
    <ul className={styles.activityList}>
      {items.map((item) => (
        <li key={item.title}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          <em>{item.status}</em>
        </li>
      ))}
    </ul>
  );
}

export { styles };
