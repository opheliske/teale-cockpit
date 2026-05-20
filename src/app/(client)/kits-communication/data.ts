export type Step = 'before' | 'dday' | 'after';
export type EmailLanguage = 'FR' | 'EN';

export type LancementKit = {
  id: string;
  title: string;
  step: Step;
  language: EmailLanguage;
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
};

export type EmailTopicKit = {
  id: string;
  title: string;
  topic: string;
  language: EmailLanguage;
};

export const lancementKits: LancementKit[] = [];
export const animationItems: AnimationItem[] = [];
export const emailTopicKits: EmailTopicKit[] = [];
