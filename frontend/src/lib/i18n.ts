type Locale = "fr" | "en";

const translations: Record<Locale, Record<string, string>> = {
  fr: {
    "nav.dashboard": "Tableau de bord",
    "nav.ati": "Agrements ATI",
    "nav.operateurs": "Operateurs",
    "nav.inspections": "Inspections",
    "nav.notifications": "Notifications",
    "nav.profile": "Mon profil",
    "common.loading": "Chargement...",
    "common.error": "Une erreur est survenue",
    "common.retry": "Reessayer",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.confirm": "Confirmer",
    "common.search": "Rechercher",
    "common.no_results": "Aucun resultat",
    "common.back": "Retour",
    "common.next": "Suivant",
    "common.previous": "Precedent",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.ati": "ATI Permits",
    "nav.operateurs": "Operators",
    "nav.inspections": "Inspections",
    "nav.notifications": "Notifications",
    "nav.profile": "My Profile",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Retry",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.search": "Search",
    "common.no_results": "No results",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
  },
};

let currentLocale: Locale = "fr";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}
export function getLocale(): Locale {
  return currentLocale;
}
export function t(key: string): string {
  return translations[currentLocale]?.[key] ?? translations.fr[key] ?? key;
}
