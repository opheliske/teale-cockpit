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

export const ATELIERS_CATALOG: AtelierCatalogItem[] = [
  { id: "comprendre-teale",        icon: "🎓", title: "Comprendre Teale",           description: "Introduction à la plateforme, aux services psy et aux ateliers disponibles.",                         duration: "60 min",  facilitator: "Pia", category: "Onboarding" },
  { id: "charge-mentale",          icon: "🧠", title: "Charge mentale",              description: "Identifier les sources de surcharge cognitive et trouver des stratégies de décharge.",                 duration: "90 min",  facilitator: "Pia", category: "Stress" },
  { id: "gestion-stress",          icon: "🌿", title: "Gestion du stress",           description: "Techniques de régulation émotionnelle et corporelle pour mieux gérer le stress au quotidien.",        duration: "90 min",  facilitator: "Pia", category: "Stress" },
  { id: "burnout",                 icon: "🚨", title: "Prévenir le burnout",         description: "Reconnaître les signaux d'alerte personnels et collectifs, agir avant l'épuisement.",                duration: "90 min",  facilitator: "Pia", category: "Stress" },
  { id: "sommeil-recuperation",    icon: "😴", title: "Sommeil & récupération",      description: "Comprendre les cycles du sommeil et adopter des habitudes pour mieux récupérer.",                    duration: "75 min",  facilitator: "Pia", category: "Bien-être" },
  { id: "intelligence-emotionnelle",icon: "❤️",title: "Intelligence émotionnelle",   description: "Développer la conscience de soi et des autres pour mieux vivre en collectif.",                      duration: "90 min",  facilitator: "Pia", category: "Bien-être" },
  { id: "parentalite-travail",     icon: "👨‍👩‍👧", title: "Parentalité & travail",    description: "Équilibrer vie professionnelle et parentale : stratégies et partage d'expériences.",               duration: "75 min",  facilitator: "Pia", category: "Bien-être" },
  { id: "cnv",                     icon: "💬", title: "Communication non-violente",  description: "Exprimer ses besoins et écouter l'autre avec empathie grâce à la méthode CNV.",                      duration: "120 min", facilitator: "Pia", category: "Communication" },
  { id: "gestion-conflits",        icon: "⚡", title: "Gestion des conflits",        description: "Transformer les tensions en opportunités de dialogue et de croissance collective.",                   duration: "120 min", facilitator: "Pia", category: "Communication" },
  { id: "manager-bienveillant",    icon: "🤝", title: "Manager bienveillant",        description: "Leadership empathique : détecter les signaux faibles, créer un espace sécurisant pour son équipe.",  duration: "120 min", facilitator: "Pia", category: "Leadership" },
  { id: "reconnexion-sens",        icon: "🌟", title: "Reconnexion au sens",         description: "Retrouver motivation et engagement en réalignant travail et valeurs personnelles.",                  duration: "90 min",  facilitator: "Pia", category: "Leadership" },
  { id: "groupe-parole",           icon: "🗣️", title: "Groupe de parole",            description: "Espace d'écoute et de partage facilité, sans jugement, sur les difficultés du quotidien professionnel.", duration: "60 min", facilitator: "Pia", category: "Bien-être" },
];

export const KITS_CATALOG: KitCatalogItem[] = [
  { id: "kit-lancement",          icon: "🚀", title: "Kit lancement",              description: "Présentation de Teale aux collaborateurs : accès, services disponibles, premiers pas.",              format: "Email + affichage", target: "Tous", category: "Lancement" },
  { id: "kit-retour-conge",       icon: "☀️", title: "Kit retour de congé",        description: "Bien reprendre après une absence : ressources de reconnexion et d'ancrage.",                          format: "Email",             target: "Tous", category: "Animation" },
  { id: "kit-sensibilisation",    icon: "💡", title: "Kit sensibilisation bien-être", description: "Focus santé mentale : chiffres clés, ressources Teale, invitation aux ateliers.",                  format: "Newsletter",        target: "Tous", category: "Sensibilisation" },
  { id: "kit-manager",            icon: "👔", title: "Kit manager",                description: "Ressources dédiées aux managers : détecter les signaux faibles, utiliser Teale avec son équipe.",     format: "Guide PDF + email", target: "Managers", category: "Management" },
  { id: "kit-burnout",            icon: "🛡️", title: "Kit prévention burnout",     description: "Signaux d'alerte, ressources psy disponibles, contacts en cas d'urgence.",                           format: "Affichage + email", target: "Tous", category: "Prévention" },
  { id: "kit-rentree",            icon: "🍂", title: "Kit rentrée",                description: "Bien reprendre après l'été : focus récupération, programme de rentrée Teale.",                         format: "Email + vidéo",     target: "Tous", category: "Animation" },
  { id: "kit-fin-annee",          icon: "🎄", title: "Kit fin d'année",            description: "Bilan personnel, ressources pour déconnecter vraiment pendant les fêtes.",                             format: "Email",             target: "Tous", category: "Animation" },
  { id: "kit-onboarding",         icon: "🌱", title: "Kit onboarding",             description: "Intégration des nouvelles recrues : découverte de Teale dès l'arrivée.",                              format: "Guide d'accueil",   target: "Recrues", category: "Lancement" },
  { id: "kit-q3-animation",       icon: "🎯", title: "Kit animation Q3",           description: "Maintenir l'engagement pendant l'été : mini-challenges bien-être, rappels plateforme.",               format: "Newsletter + push", target: "Tous", category: "Animation" },
];

export const ATELIER_CATEGORIES = ["Tous", "Stress", "Bien-être", "Communication", "Leadership", "Onboarding"];
export const KIT_CATEGORIES = ["Tous", "Lancement", "Animation", "Sensibilisation", "Management", "Prévention"];
