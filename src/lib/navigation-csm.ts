export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const csmHomeItem: NavItem = { label: "Home", href: "/csm" };

export const csmNavSections: NavSection[] = [
  {
    title: "Opérations",
    items: [
      { label: "Suivi clients", href: "/csm/suivi-clients" },
      { label: "QBR et Ateliers", href: "/csm/qbr-ateliers" },
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
