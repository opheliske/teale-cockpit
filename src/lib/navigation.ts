export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Home", href: "/" },
      { label: "Messages", href: "/messages" },
      { label: "Suivi projet", href: "/mon-planning" },
      { label: "Mes ateliers", href: "/mes-ateliers" },
    ],
  },
  {
    title: "Bibliothèques",
    items: [
      { label: "Kits de communication", href: "/kits-communication" },
      { label: "Catalogue d'ateliers", href: "/catalogue-ateliers" },
      { label: "FAQ RH", href: "/faq-rh" },
    ],
  },
  {
    title: "Data",
    items: [
      {
        label: "Donnée d'usage",
        href: "https://my.teale.app/dashboard/engagement",
      },
    ],
  },
];

export const bottomActions: NavItem[] = [];
