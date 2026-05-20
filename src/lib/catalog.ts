export type AtelierCatalogItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  duration: string;
  facilitator: string;
  category: string;
};

export type KitCatalogItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  format: string;
  target: string;
  category: string;
};

export const ATELIERS_CATALOG: AtelierCatalogItem[] = [];
export const KITS_CATALOG: KitCatalogItem[] = [];

export const ATELIER_CATEGORIES = ["Tous", "Stress", "Bien-être", "Communication", "Leadership", "Onboarding"];
export const KIT_CATEGORIES = ["Tous", "Lancement", "Animation", "Sensibilisation", "Management", "Prévention"];
