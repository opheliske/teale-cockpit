export type Theme = {
  id: string;
  name: string;
  description: string;
};

export type ProgrammeStep = {
  title: string;
  items?: string[];
};

export type Workshop = {
  id: string;
  title: string;
  subtitle?: string;
  themeId: string;
  duration?: string;
  objectives: string[];
  programme: ProgrammeStep[];
  targetAudience: string[];
  alreadyAnimated?: boolean;
};

export const themes: Theme[] = [];
export const workshops: Workshop[] = [];
