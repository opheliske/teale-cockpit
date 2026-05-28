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

export const lancementKits: LancementKit[] = [];
export const animationItems: AnimationItem[] = [];
export const emailTopicKits: EmailTopicKit[] = [];
