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

export const themes: Theme[] = [
  {
    id: "prevention",
    name: "Prévenir les risques en santé mentale",
    description:
      "Introduction aux concepts fondamentaux de la santé mentale pour sensibiliser, comprendre les bases et reconnaître les premiers signes.",
  },
  {
    id: "stress",
    name: "Gestion du stress et des émotions",
    description:
      "Connaître les outils pratiques pour évacuer son stress de manière efficace, mieux comprendre ses réactions et apaiser ses émotions.",
  },
  {
    id: "epanouissement",
    name: "Épanouissement",
    description:
      "Donner les clefs pour aider chacun à se développer, mieux comprendre son propre fonctionnement et booster ses capacités.",
  },
  {
    id: "relations",
    name: "Relations aux autres",
    description:
      "Comprendre les clés de la communication et de l'échange pour améliorer ses relations professionnelles et personnelles.",
  },
  {
    id: "resilience",
    name: "Résilience",
    description:
      "Acquérir des compétences avancées et devenir des ambassadeurs de la santé mentale, capables de jouer un rôle clé dans la sensibilisation et le soutien autour d'eux.",
  },
];

export const workshops: Workshop[] = [
  // ─── Prévenir les risques en santé mentale ────────────────────────────────
  {
    id: "premiers-pas-sante-mentale",
    title: "Premiers pas pour prendre soin de sa santé mentale",
    themeId: "prevention",
    duration: "1h",
    objectives: [
      "Enlever les tabous de la santé mentale",
      "Savoir par où commencer pour en prendre soin",
    ],
    programme: [
      {
        title: "Qu'est-ce que la santé mentale",
        items: [
          "Définitions & pourquoi en parler",
          "Santé mentale, tous concernés",
          "Les fluctuations normales et les points d'attention",
        ],
      },
      {
        title: "Prendre soin de sa santé mentale",
        items: ["Par où commencer : mini-recette pour démarrer", "Les apports des TCC"],
      },
      {
        title: "Le soutien psychologique",
        items: ["Les différents professionnels & thématiques", "Comment se passe une séance"],
      },
    ],
    targetAudience: [
      "Vous souhaitez démocratiser le sujet de la santé mentale au sein de votre entreprise",
      "Vous souhaitez que vos collaborateurs sachent vers qui se tourner en cas de difficulté",
      "Vous n'avez pas encore de donnée teale ou la facette bien-être physique a un score bas",
    ],
  },
  {
    id: "reflexe-premiers-gestes",
    title: "Réflexe : les premiers gestes en santé mentale",
    themeId: "prevention",
    duration: "1h",
    objectives: [
      "Reconnaître que l'équilibre d'une personne est menacé",
      "Adopter les règles d'or en toutes circonstances",
    ],
    programme: [
      {
        title: "Détecter et accompagner pour prévenir l'apparition d'un trouble",
        items: [
          "Savoir détecter les signaux faibles",
          "Reconnaître qu'un trouble s'installe",
          "Focus sur trois troubles au choix : crise anxieuse, dépression, burn-out, crise suicidaire ou addictions",
        ],
      },
      {
        title: "Premiers secours en santé mentale",
        items: [
          "Accompagner : les attitudes à adopter face à une personne en difficulté",
          "Exercice pratique — guide d'entretien de l'urgence",
          "Savoir vers qui orienter",
        ],
      },
      { title: "Se protéger et prendre soin de soi" },
    ],
    targetAudience: [
      "Les données teale ont identifié des personnes « à risque » ou « critique »",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Vous souhaitez sensibiliser des référents ou des personnes relais dans l'entreprise",
    ],
  },
  {
    id: "prevenir-risques-psychosociaux",
    title: "Prévenir les risques psychosociaux",
    themeId: "prevention",
    duration: "1h",
    objectives: [
      "Comprendre les facteurs de risques, les risques et les conséquences",
      "Savoir prendre soin de soi et se tourner vers les bons acteurs",
    ],
    programme: [
      {
        title: "La prévention des risques psychosociaux (RPS)",
        items: [
          "Pourquoi ? — Cadre juridique",
          "Comment ? — Niveaux de prévention",
          "Qui ? — Rôles et responsabilités dans l'entreprise",
        ],
      },
      {
        title: "Comprendre les RPS pour mieux s'en prémunir",
        items: ["Les facteurs", "Les risques", "Les conséquences"],
      },
      {
        title: "Mon rôle en tant que collaborateur",
        items: [
          "Mises en situation",
          "Outils et démarches pratiques",
          "Se protéger et prendre soin de soi",
        ],
      },
    ],
    targetAudience: [
      "Vos collaborateurs n'ont pas été sensibilisés aux RPS",
      "Votre entreprise vit un changement important",
      "Vous souhaitez sensibiliser des référents ou des personnes relais dans l'entreprise",
      "Vos données teale montrent des scores bas sur les thématiques liées au travail",
    ],
  },

  // ─── Gestion du stress et des émotions ────────────────────────────────────
  {
    id: "apprendre-gerer-stress",
    title: "Apprendre à gérer son stress",
    themeId: "stress",
    duration: "1h",
    objectives: [
      "Comprendre les mécanismes du stress pour mieux l'appréhender",
      "Savoir utiliser les techniques et outils pour réguler son stress",
    ],
    programme: [
      {
        title: "Agir sur les conséquences du stress",
        items: [
          "Deux outils pour appréhender la réaction physiologique du corps face au stress",
        ],
      },
      {
        title: "Agir sur notre perception",
        items: [
          "Comprendre ses biais de raisonnement et réévaluer cognitivement la situation",
          "Utiliser la pleine conscience pour accepter de lâcher prise",
        ],
      },
      {
        title: "Agir sur les causes",
        items: ["Identifier les sources", "Savoir prendre soin de soi et demander de l'aide"],
      },
    ],
    targetAudience: [
      "Les données teale montrent un score de stress élevé",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Vous souhaitez donner des outils concrets à vos collaborateurs pour faire face à des périodes d'activité dense",
    ],
  },
  {
    id: "cerveau-emotions-reactions",
    title: "Notre cerveau, nos émotions, nos réactions",
    themeId: "stress",
    duration: "1h",
    objectives: ["Comprendre, réguler et faire bon usage de nos émotions"],
    programme: [
      {
        title: "Notre cerveau",
        items: ["Les 6 émotions primaires", "Comment notre cerveau traite l'information ?"],
      },
      {
        title: "Nos émotions",
        items: [
          "La clef de la gestion des émotions : la conscience de soi",
          "Comment reprendre le contrôle ?",
        ],
      },
      {
        title: "Nos réactions",
        items: ["Travailler son assertivité", "La recette : la communication non violente"],
      },
    ],
    targetAudience: [
      "Les données teale montrent des scores bas en régulation ou expression des émotions",
      "Vos collaborateurs sont exposés à des situations qui nécessitent de savoir réguler et exprimer ses émotions",
      "Vous souhaitez donner les clefs à chacun pour mieux comprendre son propre fonctionnement",
    ],
  },
  {
    id: "apaiser-charge-mentale",
    title: "5 astuces pour apaiser ma charge mentale",
    themeId: "stress",
    duration: "1h",
    objectives: [
      "Comprendre le processus derrière la charge mentale",
      "Être outillé pour détecter les signes d'alerte et préserver sa santé",
    ],
    programme: [
      {
        title: "Le processus insidieux de la charge mentale",
        items: ["Les étapes qui mènent à l'épuisement"],
      },
      {
        title: "Les signaux d'alerte",
        items: ["Faisons le point ensemble", "Que faire si je me sens dépassé ?"],
      },
      {
        title: "5 conseils pour reprendre le contrôle",
        items: [
          "Des astuces pour alléger son esprit et le quotidien",
          "Des exemples concrets pour appliquer tout de suite les conseils",
        ],
      },
    ],
    targetAudience: [
      "Les données teale montrent une charge mentale importante chez les collaborateurs",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Votre entreprise connaît des périodes d'activité intense",
    ],
  },
  {
    id: "epuisement-professionnel",
    title: "Comprendre et se protéger de l'épuisement professionnel",
    themeId: "stress",
    duration: "1h",
    objectives: [
      "Savoir détecter les facteurs de risque",
      "Être attentif à soi pour prévenir le burn-out",
    ],
    programme: [
      {
        title: "Partageons un langage commun",
        items: ["Qu'est-ce que la santé mentale", "Définition du burn-out"],
      },
      {
        title: "Détecter le burn-out",
        items: [
          "Manifestations & conséquences sur la santé",
          "Différence entre burn-out et dépression",
        ],
      },
      {
        title: "Les causes du burn-out",
        items: [
          "Environnement de travail et RPS",
          "Comprendre les profils et les terrains favorables",
        ],
      },
      { title: "Stratégie de prévention", items: ["Collective", "Individuelle"] },
      { title: "La prise en charge" },
    ],
    targetAudience: [
      "Les données teale montrent des taux de stress et de charge mentale importants",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Vous souhaitez sensibiliser chacun pour démystifier le syndrome d'épuisement professionnel",
    ],
  },

  // ─── Épanouissement ───────────────────────────────────────────────────────
  {
    id: "identifier-ses-forces",
    title: "Identifier ses forces pour mieux s'en servir",
    themeId: "epanouissement",
    duration: "1h",
    objectives: [
      "Reconnaître la valeur d'une force",
      "Identifier ses forces et apprendre à les utiliser",
    ],
    programme: [
      {
        title: "Qu'est-ce qu'une force ?",
        items: ["Exercice : se présenter à travers un référent", "Définition"],
      },
      {
        title: "La valeur des forces",
        items: ["Les 3 principes de l'approche basée sur les forces", "Et au travail ?"],
      },
      {
        title: "Reconnaître ses points forts",
        items: [
          "Identifier ses forces",
          "Différence avec les compétences",
          "Savoir s'en servir",
        ],
      },
    ],
    targetAudience: [
      "Les données teale montrent des scores bas pour l'évolution professionnelle, les ressources ou la curiosité",
      "Vos collaborateurs aimeraient se développer professionnellement",
      "Vous souhaitez proposer un atelier positif",
    ],
  },
  {
    id: "insomnies-sommeil",
    title: "5 astuces pour en finir avec les insomnies",
    subtitle: "Sommeil",
    themeId: "epanouissement",
    duration: "1h",
    objectives: [
      "Comprendre les mécanismes du sommeil",
      "Adopter les bonnes habitudes pour favoriser le sommeil",
    ],
    programme: [
      {
        title: "Comprendre l'insomnie",
        items: [
          "Définition et quelques chiffres",
          "L'installation de l'insomnie chronique",
          "Comprendre les mécanismes du sommeil",
        ],
      },
      {
        title: "Boîte à outils : 5 astuces pour favoriser le sommeil",
        items: [
          "Adopter une bonne routine",
          "Cibler le conditionnement négatif",
          "Apprendre à respecter son rythme biologique",
        ],
      },
      { title: "Connaître les professionnels vers qui s'adresser" },
    ],
    targetAudience: [
      "Les données teale montrent un bien-être physique dégradé, un niveau de stress important",
      "Vous savez que cet atelier parlera à beaucoup de vos collaborateurs",
    ],
  },
  {
    id: "muscler-son-optimisme",
    title: "Muscler son optimisme",
    themeId: "epanouissement",
    duration: "1h",
    objectives: [
      "Comprendre comment l'optimisme peut être une force",
      "Muscler son optimisme pour améliorer sa performance",
    ],
    programme: [
      {
        title: "Comprendre ce qu'est l'optimisme",
        items: ["Deux définitions", "Le style explicatif"],
      },
      {
        title: "L'impact et les bénéfices de l'optimisme",
        items: [
          "Attention aux dérives",
          "Bénéfices à l'échelle individuelle et organisationnelle",
        ],
      },
      {
        title: "Les techniques et outils pour muscler son optimisme au quotidien",
        items: ["Ressentir et cultiver les émotions positives", "Manager avec optimisme"],
      },
    ],
    targetAudience: [
      "Les données teale montrent une faible régulation des émotions, un score bas de fierté ou d'optimisme",
      "Vous sentez l'ambiance un peu dégradée",
      "Vos collaborateurs pointent plus les échecs que les réussites",
    ],
  },

  // ─── Relations aux autres ─────────────────────────────────────────────────
  {
    id: "art-du-feedback",
    title: "Maîtriser l'art du feedback",
    themeId: "relations",
    duration: "1h",
    objectives: [
      "Savoir recevoir et donner un feedback positif ou constructif",
      "Connaître les prérequis et les pièges à éviter",
    ],
    programme: [
      {
        title: "Définition et prérequis",
        items: [
          "Feedback constructif vs feedback positif",
          "Points de vigilance",
          "Prérequis : bien connaître son équipe",
        ],
      },
      {
        title: "4 situations pratiques",
        items: [
          "Donner un feedback difficile",
          "Donner un feedback à son manager",
          "Télétravail",
          "Recevoir une critique",
        ],
      },
      { title: "Comment solliciter des feedbacks" },
    ],
    targetAudience: [
      "Les données teale montrent des facettes basses sur la reconnaissance, le développement professionnel, la relation avec le supérieur",
      "Vous souhaitez mettre en place une culture du feedback",
      "Vous souhaitez améliorer la communication en entreprise",
      "Vous souhaitez booster le sentiment de reconnaissance",
    ],
  },
  {
    id: "cohesion-equipe",
    title: "La cohésion d'équipe",
    themeId: "relations",
    duration: "1h",
    objectives: [
      "Comprendre l'impact de la cohésion d'équipe sur la performance et les RPS",
      "Établir un plan d'action pour renforcer les 4 piliers de la cohésion",
    ],
    programme: [
      { title: "Définition et objectifs" },
      {
        title: "Cohésion d'équipe : enjeux et conditions de son existence",
        items: [
          "Impact sur la performance",
          "Lien entre risques psychosociaux et cohésion",
        ],
      },
      {
        title:
          "Les 4 piliers de la cohésion d'équipe : construire ensemble un plan d'actions qui vous ressemble",
        items: ["La collaboration", "L'entraide", "La communication", "La convivialité"],
      },
    ],
    targetAudience: [
      "Les données teale montrent un score bas sur la facette Relations positives",
      "Vous sentez que vos collaborateurs souffrent d'un manque de communication entre équipes",
      "Vous souhaitez renforcer l'entraide et la cohésion",
    ],
  },
  {
    id: "assertivite-s-affirmer",
    title: "Assertivité : apprendre à s'affirmer",
    themeId: "relations",
    duration: "1h",
    objectives: [
      "Comprendre ce qu'est l'affirmation de soi et savoir quand être assertif",
      "S'entraîner à s'exprimer et s'affirmer",
    ],
    programme: [
      {
        title: "Qu'est-ce que l'affirmation de soi",
        items: ["Le comportement assertif"],
      },
      {
        title: "L'affirmation de soi dans le milieu professionnel — exercices pratiques",
        items: [
          "Exprimer une demande",
          "Formuler un refus",
          "Faire et recevoir une critique",
          "Faire et recevoir un compliment",
        ],
      },
    ],
    targetAudience: [
      "Vos données teale montrent des facettes basses pour l'assertivité, l'expression des émotions ou le respect",
      "Vous notez des difficultés de communication entre collaborateurs",
      "Vous aimeriez aider vos collaborateurs à s'affirmer (face à des clients par exemple)",
    ],
  },
  {
    id: "adolescence-parentalite",
    title: "Traverser la tempête de l'adolescence",
    subtitle: "Parentalité",
    themeId: "relations",
    duration: "1h",
    objectives: [
      "Partager ses difficultés de parents",
      "Connaître des outils et bonnes pratiques pour reconnecter avec son enfant",
    ],
    programme: [
      {
        title: "C'est quoi être parent",
        items: ["Être authentique", "Se souvenir de sa propre adolescence"],
      },
      {
        title: "Rendre ses enfants « heureux » et les accompagner dans leurs difficultés",
        items: ["Quelques conseils face aux préoccupations des parents"],
      },
      {
        title: "Outils et bonnes pratiques pour reconnecter",
        items: [
          "Des parents épanouis",
          "Retrouver le dialogue et s'intéresser à l'autre",
          "Accepter d'être imparfait",
        ],
      },
    ],
    targetAudience: [
      "Les données teale montrent un niveau de stress personnel élevé",
      "Un certain nombre de vos collaborateurs sont parents",
      "Vous souhaitez promouvoir une culture d'entreprise inclusive et bienveillante envers les familles",
    ],
  },
  {
    id: "sexisme-agir-reagir",
    title: "« C'était juste une blague »",
    subtitle: "Agir et réagir face au sexisme",
    themeId: "relations",
    duration: "1h",
    objectives: [
      "Identifier et comprendre les différentes formes de harcèlement et d'agissements sexistes, ainsi que leurs impacts sur les victimes et les dynamiques au sein des organisations",
      "Acquérir les réflexes pour réagir de manière appropriée et se positionner comme acteur ou actrice de la prévention au quotidien",
    ],
    programme: [
      { title: "Reconnaître le harcèlement sexuel et les agissements sexistes" },
      { title: "Impact sur les victimes et les organisations" },
      { title: "Apprendre à réagir" },
      { title: "Tous acteurs de la prévention" },
    ],
    targetAudience: [],
  },

  // ─── Résilience ───────────────────────────────────────────────────────────
  {
    id: "maladie-chronique-inclusion",
    title: "Maladie chronique",
    subtitle: "Sensibiliser pour plus d'inclusion",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Sensibiliser les collaborateurs aux maladies chroniques et aux implications pour les salariés concernés",
      "Connaître les outils pour mieux collaborer avec les personnes concernées",
    ],
    programme: [
      {
        title: "Comprendre",
        items: [
          "Maladie chronique, de quoi parle-t-on ?",
          "Qui est concerné ?",
          "Quelles sont les implications ?",
        ],
      },
      {
        title: "Connaître les outils pour améliorer la qualité de vie",
        items: [
          "Pour le salarié concerné en dehors de l'entreprise",
          "Ce que peut mettre l'entreprise en place pour aider",
        ],
      },
      {
        title: "Allier santé et travail",
        items: ["4 outils pour agir pour une meilleure compréhension et inclusion"],
      },
    ],
    targetAudience: [
      "Les données teale ont identifié des personnes « à risque » ou « critique »",
      "Les données teale montrent des facettes faibles pour le stress personnel, le bien-être physique",
      "Vous avez connaissance de salariés concernés",
      "Vous souhaitez sensibiliser vos collaborateurs au sujet",
    ],
  },
  {
    id: "handicap-au-travail-inclusion",
    title: "Handicap au travail",
    subtitle: "Sensibiliser pour plus d'inclusion",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Sensibiliser chacun au handicap au travail",
      "Connaître les outils pour être plus inclusif et mieux collaborer avec les personnes concernées",
    ],
    programme: [
      {
        title: "Connaître",
        items: ["De quoi parle-t-on ?", "Qui est concerné ?"],
      },
      {
        title: "Comprendre",
        items: ["Les défis rencontrés", "Capacités et résilience"],
      },
      {
        title: "Inclure",
        items: [
          "4 outils pour mieux se comprendre et collaborer",
          "Conseils de communication en fonction du handicap",
        ],
      },
    ],
    targetAudience: [
      "Vous avez connaissance de salariés en situation de handicap",
      "Vous souhaitez sensibiliser vos collaborateurs dans le cadre de votre politique diversité et inclusion",
      "Vous observez des difficultés de collaboration dans les équipes liées à un manque de compréhension du handicap au travail",
    ],
  },
  {
    id: "accompagner-le-changement",
    title: "Accompagner le changement",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Comprendre le processus de changement",
      "Accompagner les réactions et les émotions associées",
    ],
    programme: [
      { title: "Le processus de changement" },
      {
        title: "Les réactions face au changement",
        items: ["Courbe de deuil", "Préoccupations face au changement", "Comportements"],
      },
      {
        title: "Accompagner le changement : le facteur humain, facteur de réussite",
        items: [
          "Accompagner les émotions",
          "Réagir aux réactions des salariés (OSBD)",
          "Adresser les préoccupations",
        ],
      },
      { title: "Détecter et orienter une personne en difficulté" },
    ],
    targetAudience: [
      "Les données teale ont identifié des personnes « à risque » ou « critique »",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Vous souhaitez sensibiliser des référents ou des personnes relais dans l'entreprise",
    ],
  },
  {
    id: "mieux-vivre-le-changement",
    title: "Mieux vivre le changement",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Comprendre le mécanisme du changement et nos réactions",
      "Connaître les outils pour mieux vivre le changement",
    ],
    programme: [
      {
        title: "Changement et incertitude",
        items: ["Cerveau et habitudes", "Comprendre le processus de changement"],
      },
      {
        title: "Nos réactions face au changement",
        items: ["La courbe de deuil", "Résistance ou soutien ?"],
      },
      {
        title: "Agir pour le changement",
        items: ["Booster son optimisme", "Cercles d'influence et de préoccupations"],
      },
      { title: "Prendre soin de soi" },
    ],
    targetAudience: [
      "Les données teale ont identifié des personnes « à risque » ou « critique »",
      "Vous avez connaissance de cas de burn-out dans l'entreprise",
      "Vous souhaitez sensibiliser des référents ou des personnes relais dans l'entreprise",
    ],
  },
  {
    id: "leading-change-with-impact",
    title: "Leading Change with Impact",
    subtitle: "Excom & Direction",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Understand why re-engagement can only be built on a clear reading of emotional reality",
      "Identify concrete levers to re-engage teams",
      "Recognize the importance of protecting themselves as leaders during a period of disruption",
    ],
    programme: [
      {
        title: "Understanding Emotional Reality",
        items: [
          "Employees' reactions and intrapersonal conflicts post-layoffs",
          "Impact on cohesion, trust, and engagement",
        ],
      },
      {
        title: "Re-engagement & Team Mobilisation",
        items: [
          "Identify main barriers",
          "How to restore purpose and psychological safety",
        ],
      },
      {
        title: "Leader Well-Being as a Strategic Lever",
        items: [
          "Role of emotional state in decision making",
          "Psychological risks and early warning signs",
          "Leader well-being and organizational performance",
        ],
      },
      { title: "Reflection & Takeaways" },
    ],
    targetAudience: ["Comités exécutifs et équipes de direction"],
  },
  {
    id: "comprendre-la-resilience",
    title: "Comprendre la résilience et la muscler",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Découvrir le concept de résilience et ses applications",
      "Renforcer ses capacités en identifiant les leviers",
    ],
    programme: [
      {
        title: "Le concept de résilience en physique vs en psychologie",
        items: ["En quoi la résilience peut me servir face au stress ?"],
      },
      {
        title: "Les 4 leviers de la résilience",
        items: [
          "Défier ses perceptions pour travailler sa flexibilité mentale",
          "Développer un réflexe de gratitude pour renforcer ses relations positives",
          "S'appuyer sur ses forces et capacités pour booster sa confiance en soi",
        ],
      },
      { title: "Maintenir une énergie positive en se ressourçant et en récupérant" },
    ],
    targetAudience: [
      "Les données teale montrent les facettes basses : capacité à faire face, capacité d'adaptation",
      "Votre entreprise a connu des bouleversements importants et vous voulez aider vos collaborateurs à en sortir grandis",
    ],
  },
  {
    id: "comportements-et-addictions",
    title: "Comportements & addictions",
    themeId: "resilience",
    duration: "1h",
    objectives: [
      "Mieux comprendre les mécanismes de l'addiction",
      "Reprendre le contrôle sur nos comportements indésirables",
    ],
    programme: [
      {
        title: "Comprendre nos comportements",
        items: ["Qu'est-ce qu'une addiction", "Des causes multifactorielles"],
      },
      {
        title: "Reprendre le contrôle",
        items: [
          "Arrêter oui, mais comment ?",
          "Changer de perspective avec la restructuration cognitive",
        ],
      },
      {
        title: "SOS plan d'urgence",
        items: [
          "Construire son plan d'urgence personnalisé",
          "Conseils et astuces pour garder le cap",
        ],
      },
    ],
    targetAudience: [
      "Vous avez connaissance de comportements addictifs au sein de l'entreprise (tabac, alcool…)",
      "Vous souhaitez sensibiliser les collaborateurs à l'occasion du mois sans tabac ou du dry january",
      "Vos collaborateurs aimeraient arrêter certains comportements",
    ],
  },
];
