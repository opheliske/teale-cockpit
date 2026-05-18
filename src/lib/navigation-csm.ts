export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const csmNavSections: NavSection[] = [
  {
    title: "Portefeuille",
    items: [
      { label: "Vue d'ensemble", href: "/csm" },
      { label: "Clients", href: "/csm/clients" },
    ],
  },
  {
    title: "Opérations",
    items: [
      { label: "Planning global", href: "/csm/planning" },
      { label: "Ateliers", href: "/csm/ateliers" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { label: "Catalogue d'ateliers", href: "/csm/catalogue" },
      { label: "Kits de communication", href: "/csm/kits" },
    ],
  },
];
