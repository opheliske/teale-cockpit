export type Step = 'before' | 'dday' | 'after';
export type EmailLanguage = 'FR' | 'EN';

// `body` — CSM-authored text the client can copy from their kits page.
// Optional: when blank the client view falls back to the auto-generated
// default template (preserves behaviour for legacy rows).

export type LancementKit = {
  id: string;
  title: string;
  step: Step;
  language: EmailLanguage;
  body?: string;
};

export type AnimationItem = {
  id: string;
  title: string;
  month: string;
  type: string;
  status: string;
  landing?: string;
  languages: string[];
  imagesFr: string[];
  imagesEn: string[];
  pdfFr: string[];
  pdfEn: string[];
  body?: string;
};

export type EmailTopicKit = {
  id: string;
  title: string;
  topic: string;
  language: EmailLanguage;
  body?: string;
};

export type VisuelCategory = 'logo' | 'icone' | 'picto' | 'banniere';

export type VisuelFile = {
  id: string;
  path: string;       // storage path inside "kit-files"
  name: string;
  mimeType: string;
};

export type VisuelKit = {
  id: string;
  title: string;
  category: VisuelCategory;
  files: VisuelFile[];
  // Anciens visuels mono-fichier — conservés pour la rétro-compat. Le store
  // normalise toujours vers `files`, donc l'UI ne lit que `files`.
  path?: string;
  mimeType?: string;
};

export const VISUEL_CATEGORIES: { id: VisuelCategory; label: string; icon: string }[] = [
  { id: 'logo', label: 'Logos teale', icon: '🟢' },
  { id: 'icone', label: 'Icônes', icon: '✨' },
  { id: 'picto', label: 'Pictos thématiques', icon: '🎨' },
  { id: 'banniere', label: 'Bannières & visuels', icon: '🖼' },
];

export const lancementKits: LancementKit[] = [];
export const animationItems: AnimationItem[] = [];
export const emailTopicKits: EmailTopicKit[] = [];
export const visuelKits: VisuelKit[] = [];
