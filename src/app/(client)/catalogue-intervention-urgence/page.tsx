"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addUrgency,
  buildCsmSummary,
  urgencyTypeEmoji,
  urgencyTypeLabels,
  type Urgency,
  type UrgencyMode,
  type UrgencyModalities,
  type UrgencyType,
} from "@/lib/urgencies";
import { useActiveClient } from "@/lib/client-context";

type ChecklistGroup = {
  id: string;
  emoji: string;
  title: string;
  items: string[];
};

const psychologistList = [
  "Ambre Sanchez Valero",
  "Mabel Paul",
  "Sylvie Clerel",
  "Charlotte Callaut",
  "Charlotte Coutansais",
];

const videoSeries = [
  "Série de 7 vidéos pour comprendre le deuil et savoir le traverser.",
  "Série de 7 vidéos pour mieux comprendre le psychotraumatisme.",
  "Série de 7 vidéos pour apprendre à se soutenir mutuellement.",
];

const emergencyNumbers = [
  { label: "SAMU", number: "15" },
  { label: "Urgences", number: "112" },
  { label: "SOS Suicide", number: "3114" },
];

const communicationPlainText = `Chèr(e)s collègues,

C'est avec une profonde tristesse que nous avons appris le décès d'un de nos collègues. Nous savons combien une telle perte peut affecter chacun d'entre vous, tant sur le plan personnel que collectif.

Face à cette épreuve, il nous paraît essentiel de vous rappeler que vous n'êtes pas seul·e. Que vous ressentiez le besoin de parler, de partager vos émotions, ou simplement de prendre un moment pour vous, des ressources et un soutien sont à votre disposition.

Pour vous accompagner, vous avez à votre disposition l'accès à des séances individuelles, offertes, avec nos psychologues de la communauté teale. Ces échanges vous permettent de bénéficier d'un espace confidentiel pour exprimer vos ressentis et recevoir un accompagnement individuel.

Vous pouvez prendre rendez-vous directement auprès d'une de nos psychologues spécialisées :
${psychologistList.map((p) => `- ${p} : prendre rendez-vous`).join("\n")}

Vous pouvez aussi prendre rendez-vous sur la page teale dédiée, en sélectionnant le psychologue de votre choix, ou réserver un appel gratuit de 15 minutes avec un psychologue du travail chez teale, qui pourra vous orienter vers l'expert le plus adapté pour vous.

Nous souhaitons également vous mettre à disposition des contenus digitaux de l'application teale, conçus pour fournir des outils et des ressources concrètes en tout temps. Elle peut être un appui discret, que vous pouvez solliciter quand vous en ressentez le besoin, à votre rythme.
${videoSeries.map((v) => `- ${v}`).join("\n")}

Prenez soin de vous et n'hésitez pas à solliciter cet accompagnement.

⚠️ Attention, teale n'est pas un service d'urgence. Si vous en ressentez le besoin, si vous avez des idées sombres ou des pensées suicidaires, n'hésitez pas à contacter un des numéros suivants. Un professionnel de santé saura vous orienter.

SAMU : 15  ·  Urgences : 112  ·  SOS Suicide : 3114`;

const preparationGroups: ChecklistGroup[] = [
  {
    id: "communication",
    emoji: "📣",
    title: "Communication aux collaborateurs",
    items: [
      "Diffuser l'annonce de l'intervention (fournie par teale) aux collaborateurs concernés.",
      "Communiquer clairement en soulignant la confidentialité et le volontariat de la démarche.",
      "Informer les managers de proximité pour qu'ils puissent relayer l'information.",
    ],
  },
  {
    id: "salle-groupes",
    emoji: "🏛️",
    title: "Salle pour les groupes de parole",
    items: [
      "Réserver une salle fermée, calme et sans baie vitrée (ou avec rideaux), garantissant l'intimité et la confidentialité.",
      "Prévoir des chaises disposées en cercle ou en demi-cercle.",
      "Afficher un panneau « réunion confidentielle en cours » si nécessaire.",
    ],
  },
  {
    id: "bureau-permanences",
    emoji: "🪑",
    title: "Petit bureau fermé pour les permanences psychologiques",
    items: [
      "Réserver un bureau, isolé visuellement et phoniquement.",
      "Vérifier que la porte peut être fermée et qu'aucune interruption ne viendra troubler les échanges.",
    ],
  },
  {
    id: "reconfort",
    emoji: "☕",
    title: "Espace de réconfort propice à l'échange",
    items: [
      "Bouteilles d'eau (fraîche et tempérée).",
      "Mouchoirs à disposition.",
      "Optionnel : collations simples (biscuits, fruits secs…), café, thé.",
    ],
  },
  {
    id: "documentation",
    emoji: "📄",
    title: "Documentation à imprimer",
    items: [
      "Imprimer les documents de soutien fournis par teale (format A4, recto).",
      "Les disposer à l'entrée ou sur une table accessible dans la/les salles mises à disposition.",
    ],
  },
  {
    id: "jour-j",
    emoji: "🤝",
    title: "Le jour J",
    items: [
      "Garantir à nos psychologues l'accès au site / passage de la sécurité si existante.",
      "Accueillir le psychologue à l'heure convenue et lui indiquer les espaces mis à disposition.",
      "S'assurer que la communication reste visible et accessible pour tous les collaborateurs.",
      "Garder une attitude présente, mais discrète, pour permettre un climat de confiance et de sécurité.",
    ],
  },
];

type Module = {
  id: string;
  emoji: string;
  label: string;
  title: string;
  format: string;
  description: string;
  gradient: string;
  accentClass: string;
};

const modules: Module[] = [
  {
    id: "communication",
    emoji: "📣",
    label: "Module 1",
    title: "Communication RH",
    format: "Ressources clé-en-main",
    description:
      "Supports pour aider les RH à communiquer avec leurs équipes et les soutenir : matériel pédagogique pour gérer les traumatismes et les deuils sur le lieu de travail.",
    gradient: "from-[#8fb6c7] to-[#2d6b62]",
    accentClass: "bg-brand-blue-soft/15 text-brand-blue-soft",
  },
  {
    id: "suivis-individuels",
    emoji: "🫂",
    label: "Module 2",
    title: "Suivis individuels",
    format: "En présentiel ou en visio",
    description:
      "Séances individuelles de thérapie pour traiter les impacts émotionnels ou psychologiques persistants et atténuer le risque de dommages psychologiques à plus long terme.",
    gradient: "from-[#f4a89a] to-[#bb6146]",
    accentClass: "bg-brand-salmon/15 text-brand-salmon",
  },
  {
    id: "groupe-de-parole",
    emoji: "🕊️",
    label: "Module 3",
    title: "Groupe de parole",
    format: "En présentiel ou en visio",
    description:
      "Séance d'échange collectif pour mettre en sécurité, calmer et créer une connexion sociale entre les personnes ayant vécu la même expérience.",
    gradient: "from-[#2a7d4a] to-[#a8e895]",
    accentClass: "bg-brand-green-bright/15 text-brand-green-bright",
  },
];

const suivisIndividuelsBenefits = [
  "Identifier rapidement les besoins spécifiques de chacun.",
  "Le psychologue ajuste la séance en fonction de la trajectoire de chacun, évitant une approche uniformisée qui ne convient pas à tous.",
  "Création d'un espace confidentiel et sans jugement où la personne peut exprimer ses préoccupations professionnelles et personnelles.",
  "Travail sur la prévention des symptômes post-traumatiques avant qu'ils ne s'installent durablement.",
];

const groupeDeParoleDetails = [
  "Espace de stabilisation et de reconnexion pour les personnes ayant vécu la même expérience.",
  "Privilégie l'écoute mutuelle et l'accès aux ressources pratiques.",
  "Les participants se sentent moins isolés, retrouvent progressivement leur fonctionnement quotidien et savent où chercher de l'aide.",
  "Participation optionnelle, la parole est optionnelle.",
  "Animé par un psychologue facilitateur formé à la prise en charge traumatique.",
];

type Resource = {
  id: string;
  emoji: string;
  tag: string;
  title: string;
  description: string;
  file: string;
  size: string;
  pages: string;
  accentClass: string;
  iconGradient: string;
};

const resources: Resource[] = [
  {
    id: "antiseche-detresse",
    emoji: "🤝",
    tag: "Antisèche",
    title: "Accueillir la détresse d'un collaborateur",
    description:
      "Guide pratique pour repérer les signaux d'alerte et savoir comment réagir face à un collaborateur en souffrance.",
    file: "/ressources-urgence/antiseche-accueillir-detresse-collaborateur.pdf",
    size: "0,7 Mo",
    pages: "Format antisèche",
    accentClass: "bg-brand-salmon/15 text-brand-salmon",
    iconGradient: "from-[#f4a89a] to-[#bb6146]",
  },
  {
    id: "guide-rh-ptsd",
    emoji: "🧠",
    tag: "Guide RH",
    title: "Bonnes pratiques face au stress post-traumatique",
    description:
      "Conseils, postures et points de vigilance pour accompagner durablement vos équipes après un événement traumatique.",
    file: "/ressources-urgence/guide-rh-stress-post-traumatique.pdf",
    size: "0,4 Mo",
    pages: "Guide complet",
    accentClass: "bg-brand-blue-soft/15 text-brand-blue-soft",
    iconGradient: "from-[#8fb6c7] to-[#2d6b62]",
  },
];

type Pricing = {
  title: string;
  detail?: string;
  price: string;
  unit: string;
  highlight?: boolean;
};

const pricing: Pricing[] = [
  {
    title: "Groupe de parole",
    detail: "Sous 24 h — 60 min",
    price: "2 000 €",
    unit: "HT",
    highlight: true,
  },
  {
    title: "Groupe de parole",
    detail: "Sous 72 h — 60 min",
    price: "1 500 €",
    unit: "HT",
  },
  {
    title: "Séance individuelle en urgence",
    detail: "Tarif additionnel",
    price: "150 €",
    unit: "HT / séance",
  },
  {
    title: "Atelier PTSD",
    detail: "60 min",
    price: "1 500 €",
    unit: "HT",
  },
];

export default function CatalogueInterventionUrgencePage() {
  const [declareOpen, setDeclareOpen] = useState(false);

  return (
    <div className="min-h-screen px-9 py-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-8">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[2.5px] text-brand-salmon">
            Bibliothèques · Avril 2026
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.5px] text-brand-cream">
            Catalogue intervention d&apos;urgence
          </h1>
          <p className="text-[13px] leading-relaxed text-[#94a8a0]">
            L&apos;accompagnement teale en situation d&apos;urgence. Offre
            détaillée pour soutenir vos équipes face à un événement
            traumatique : communication, suivis individuels, groupes de parole
            et atelier post-traumatique.
          </p>
        </header>

        <UrgencyHotline onDeclare={() => setDeclareOpen(true)} />

        {declareOpen && (
          <DeclareUrgencyModal onClose={() => setDeclareOpen(false)} />
        )}

        <section className="mt-8">
          <PhaseHeader
            eyebrow="Phase 1"
            title="Dans les jours qui suivent l'événement traumatique"
            description="Trois modules complémentaires pour stabiliser, soutenir et accompagner vos collaborateurs au plus près du choc."
          />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FocusCard
            emoji="🫂"
            eyebrow="Focus"
            title="Suivis individuels"
            subtitle="En présentiel ou en visio — un format de permanence peut être envisagé au besoin."
            intro="Un accompagnement thérapeutique individuel dans les jours suivant un événement traumatique offre plusieurs avantages majeurs :"
            items={suivisIndividuelsBenefits}
            accent="salmon"
          />
          <FocusCard
            emoji="🕊️"
            eyebrow="Focus"
            title="Le groupe de parole"
            subtitle="Un espace de stabilisation et de reconnexion — en présentiel ou en visio."
            intro="Une séance d'échange collectif préconisée pour les personnes ayant vécu une expérience commune :"
            items={groupeDeParoleDetails}
            accent="green"
            chips={[
              { label: "Durée", value: "60 min" },
              { label: "Temporalité", value: "Dans les 72 h" },
            ]}
          />
        </section>

        <section className="mt-10">
          <PhaseHeader
            eyebrow="Phase 2"
            title="Dans les semaines qui suivent l'événement traumatique"
            description="Une fois la stabilisation amorcée, un travail collectif sur le stress post-traumatique permet de prévenir l'installation des symptômes."
          />
          <article className="mt-5 overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
              <div className="flex h-full min-h-[160px] items-center justify-center bg-gradient-to-br from-[#8fb6c7] to-[#2d6b62] p-6 text-5xl">
                <span aria-hidden>🧠</span>
              </div>
              <div className="p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-blue-soft/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-blue-soft">
                    Atelier
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
                    Durée : 60 min
                  </span>
                </div>
                <h3 className="text-lg font-medium text-brand-cream">
                  Atelier trouble du stress post-traumatique
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted-on-dark">
                  Quelques semaines après l&apos;événement, il est recommandé
                  d&apos;organiser un atelier autour du trouble du stress
                  post-traumatique pour offrir un cadre de compréhension et des
                  clés concrètes à vos équipes.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-10">
          <PhaseHeader
            eyebrow="Préparer la venue"
            title="To-do list RH avant l'intervention sur site"
            description="Une checklist pas à pas pour créer un cadre serein et respectueux pour vos collaborateurs. Cochez au fur et à mesure pour suivre votre préparation."
          />
          <PreparationChecklist />
        </section>

        <section className="mt-10">
          <PhaseHeader
            eyebrow="Kit de communication"
            title="Annonce à destination des collaborateurs"
            description="Trame d'annonce élaborée par les psychologues teale, à adapter et diffuser après un décès ou un événement traumatique au sein de votre entreprise."
          />
          <CommunicationKit />
        </section>

        <section className="mt-10">
          <PhaseHeader
            eyebrow="Ressources RH"
            title="Outils pour accompagner vos équipes"
            description="Deux documents prêts à diffuser, élaborés par les psychologues teale, pour outiller les RH face à la détresse et au stress post-traumatique."
          />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {resources.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <PhaseHeader
            eyebrow="Tarifs"
            title="Coût d'une intervention d'urgence"
            description="Tarifs HT — selon modalités et lieu d'intervention, prévoir des frais de déplacement facturés au réel."
          />
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {pricing.map((p, i) => (
              <PricingCard key={i} item={p} />
            ))}
          </div>
        </section>

        <p className="mt-10 rounded-2xl border border-brand-border-dark bg-brand-surface/50 px-5 py-4 text-[12px] leading-relaxed text-brand-muted-on-dark">
          <span className="font-semibold text-brand-cream">Bon à savoir : </span>
          Cette offre est mobilisable à la demande, indépendamment de votre
          forfait annuel. Pour déclencher une intervention, contactez sans
          délai votre Customer Success Manager.
        </p>
      </div>
    </div>
  );
}

function UrgencyHotline({ onDeclare }: { onDeclare: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-salmon/30 bg-gradient-to-br from-brand-salmon/[0.12] via-brand-upcoming/[0.06] to-transparent px-5 py-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-salmon/20 text-2xl"
          aria-hidden
        >
          🚨
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-brand-cream">
            Vous faites face à une situation d&apos;urgence ?
          </h2>
          <p className="mt-0.5 text-[13px] text-brand-muted-on-dark">
            Déclarez la situation : nous générons les informations à partager
            à votre CSM et l&apos;ajoutons à votre planning du mois.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDeclare}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-salmon px-4 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-salmon/90"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        Déclarer une situation d&apos;urgence
      </button>
    </div>
  );
}

const urgencyTypeOptions: UrgencyType[] = [
  "deces",
  "suicide",
  "accident",
  "agression",
  "harcelement",
  "autre",
];

const modalitiesOptions: Array<{
  key: keyof UrgencyModalities;
  label: string;
  hint: string;
}> = [
  {
    key: "groupeParole24h",
    label: "Groupe de parole sous 24 h",
    hint: "Intervention express",
  },
  {
    key: "groupeParole72h",
    label: "Groupe de parole sous 72 h",
    hint: "Délai standard",
  },
  {
    key: "suivisIndividuels",
    label: "Suivis individuels",
    hint: "Séances confidentielles",
  },
  {
    key: "atelierPtsd",
    label: "Atelier PTSD",
    hint: "Quelques semaines après",
  },
];

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DeclareUrgencyModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { clientId: CLIENT_ID } = useActiveClient();
  const [submitted, setSubmitted] = useState<Urgency | null>(null);

  const [type, setType] = useState<UrgencyType>("deces");
  const [eventDate, setEventDate] = useState<string>(todayIso());
  const [description, setDescription] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [mode, setMode] = useState<UrgencyMode>("presentiel");
  const [location, setLocation] = useState("");
  const [rhContact, setRhContact] = useState("");
  const [modalities, setModalities] = useState<UrgencyModalities>({
    suivisIndividuels: true,
    groupeParole24h: false,
    groupeParole72h: true,
    atelierPtsd: false,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const toggleModality = (k: keyof UrgencyModalities) =>
    setModalities((prev) => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urgency: Urgency = {
      id: `urg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      eventDate,
      type,
      description: description.trim() || undefined,
      modalities,
      affectedHeadcount: headcount.trim() || undefined,
      mode,
      location: location.trim() || undefined,
      rhContact: rhContact.trim() || undefined,
    };
    // Persist to Supabase so the declaration reaches the CSM. The summary
    // screen (copyable) stays available as a manual fallback either way.
    await addUrgency(urgency, CLIENT_ID);
    setSubmitted(urgency);
  };

  const handleCopySummary = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(buildCsmSummary(submitted));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm sm:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="declare-urgency-title"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-brand-border-dark bg-brand-surface p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-brand-muted-on-dark transition-colors hover:bg-brand-border-dark hover:text-brand-cream"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>

        {submitted ? (
          <div>
            <div className="flex items-start gap-3 pr-10">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-green-bright/20 text-2xl"
                aria-hidden
              >
                ✅
              </span>
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-brand-green-bright/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-green-bright">
                  Déclaration enregistrée
                </span>
                <h2
                  id="declare-urgency-title"
                  className="mt-3 text-xl font-medium leading-snug tracking-tight text-brand-cream"
                >
                  Urgence ajoutée à votre planning
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-brand-muted-on-dark">
                  Elle apparaît dans <strong>Suivi projet</strong>, dans le mois
                  concerné. Voici les prochaines étapes et les informations à
                  partager à votre CSM.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-salmon">
                  À faire maintenant
                </h3>
                <ol className="space-y-2 text-[13px] text-brand-cream">
                  <NextStep
                    n={1}
                    title="Contacter immédiatement votre CSM"
                    detail="Appelez Lucie Martin (CSM) et partagez le récap ci-dessous."
                  />
                  <NextStep
                    n={2}
                    title="Diffuser la communication aux collaborateurs"
                    detail="Utilisez le kit de communication ci-dessous pour annoncer la situation."
                  />
                  <NextStep
                    n={3}
                    title="Préparer la venue de l'intervenant"
                    detail="Suivez la to-do list RH (salle, espace réconfort, documentation…)."
                  />
                  <NextStep
                    n={4}
                    title="Suivre l'avancement dans votre planning"
                    detail="L'urgence est ajoutée au mois concerné dans Suivi projet."
                  />
                </ol>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal-bright">
                    Information à partager à votre CSM
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      copied
                        ? "border-brand-green-bright/40 bg-brand-green-bright/15 text-brand-green-bright"
                        : "border-brand-border-dark text-brand-cream hover:bg-white/[0.04]"
                    }`}
                  >
                    {copied ? "Récap copié" : "Copier le récap"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-brand-border-dark bg-brand-dark/40 p-4 text-[13px] leading-relaxed text-brand-cream font-sans">
                  {buildCsmSummary(submitted)}
                </pre>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-brand-border-dark pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-brand-border-dark px-4 py-2 text-[12px] font-medium text-brand-cream transition-colors hover:bg-white/[0.04]"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/mon-planning");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-salmon px-4 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-salmon/90"
              >
                Voir dans mon planning
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-start gap-3 pr-10">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-salmon/20 text-2xl"
                aria-hidden
              >
                🚨
              </span>
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-brand-salmon/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-salmon">
                  Déclaration d&apos;urgence
                </span>
                <h2
                  id="declare-urgency-title"
                  className="mt-3 text-xl font-medium leading-snug tracking-tight text-brand-cream"
                >
                  Déclarer une situation d&apos;urgence
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-brand-muted-on-dark">
                  Renseignez les informations essentielles. Nous générons
                  ensuite le récapitulatif à transmettre à votre CSM et
                  ajoutons l&apos;urgence à votre planning.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <FieldLabel label="Type d'événement *">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {urgencyTypeOptions.map((t) => {
                    const isActive = t === type;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        aria-pressed={isActive}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors ${
                          isActive
                            ? "border-brand-salmon/60 bg-brand-salmon/15 text-brand-cream"
                            : "border-brand-border-dark text-brand-muted-on-dark hover:border-brand-cream/30 hover:text-brand-cream"
                        }`}
                      >
                        <span className="text-base" aria-hidden>
                          {urgencyTypeEmoji[t]}
                        </span>
                        <span>{urgencyTypeLabels[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </FieldLabel>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldLabel label="Date de l'événement *">
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream focus:border-brand-salmon focus:outline-none"
                  />
                </FieldLabel>
                <FieldLabel label="Effectifs concernés (estimation)">
                  <input
                    type="text"
                    value={headcount}
                    onChange={(e) => setHeadcount(e.target.value)}
                    placeholder="ex. ~ 25 collaborateurs du service Tech"
                    className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-salmon focus:outline-none"
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Modalités souhaitées (plusieurs choix possibles)">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {modalitiesOptions.map((m) => {
                    const isChecked = modalities[m.key];
                    return (
                      <label
                        key={m.key}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                          isChecked
                            ? "border-brand-green-bright/50 bg-brand-green-bright/10"
                            : "border-brand-border-dark hover:border-brand-cream/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModality(m.key)}
                          className="sr-only"
                        />
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                            isChecked
                              ? "border-brand-green-bright bg-brand-green-bright"
                              : "border-brand-muted-on-dark/60"
                          }`}
                          aria-hidden
                        >
                          {isChecked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-brand-dark"
                            >
                              <path d="M5 12 10 17 19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-brand-cream">
                            {m.label}
                          </span>
                          <span className="block text-[11px] text-brand-muted-on-dark">
                            {m.hint}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FieldLabel>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldLabel label="Format souhaité">
                  <div className="inline-flex rounded-full border border-brand-border-dark bg-brand-dark p-1">
                    {(
                      [
                        { id: "presentiel", label: "Présentiel" },
                        { id: "visio", label: "Visio" },
                        { id: "mixte", label: "Mixte" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        aria-pressed={mode === m.id}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          mode === m.id
                            ? "bg-brand-salmon/20 text-brand-salmon"
                            : "text-brand-muted-on-dark hover:text-brand-cream"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </FieldLabel>
                <FieldLabel label="Lieu (si présentiel)">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ex. Bureau Paris, salle Belleville"
                    className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-salmon focus:outline-none"
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Contact RH référent">
                <input
                  type="text"
                  value={rhContact}
                  onChange={(e) => setRhContact(e.target.value)}
                  placeholder="ex. Ophélie Bazard — 06 12 34 56 78"
                  className="w-full rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-salmon focus:outline-none"
                />
              </FieldLabel>

              <FieldLabel label="Contexte (optionnel)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Quelques mots pour orienter votre CSM (sans détail nominatif)."
                  className="w-full resize-none rounded-lg border border-brand-border-dark bg-brand-dark px-3 py-2 text-sm text-brand-cream placeholder:text-brand-muted-on-dark focus:border-brand-salmon focus:outline-none"
                />
              </FieldLabel>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border-dark pt-4">
              <p className="text-[11px] text-brand-muted-on-dark">
                * Champs requis. Aucune donnée personnelle n&apos;est envoyée
                automatiquement : vous restez maître du partage à votre CSM.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-brand-border-dark px-4 py-2 text-[12px] font-medium text-brand-cream transition-colors hover:bg-white/[0.04]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-salmon px-4 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-salmon/90"
                >
                  Déclarer l&apos;urgence
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted-on-dark">
        {label}
      </span>
      {children}
    </label>
  );
}

function NextStep({
  n,
  title,
  detail,
}: {
  n: number;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-brand-dark/40 px-3 py-2.5">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-salmon/20 text-[11px] font-bold text-brand-salmon"
        aria-hidden
      >
        {n}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-brand-cream">{title}</div>
        <div className="text-[12px] text-brand-muted-on-dark">{detail}</div>
      </div>
    </li>
  );
}

function PhaseHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-teal-bright">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-xl font-medium tracking-tight text-brand-cream">
        {title}
      </h2>
      <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-brand-muted-on-dark">
        {description}
      </p>
    </header>
  );
}

function CommunicationKit() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(communicationPlainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border-dark bg-brand-dark/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg bg-brand-salmon/15 text-base"
            aria-hidden
          >
            ✉️
          </span>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-salmon">
            Template — Annonce deuil / événement tragique
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              copied
                ? "border-brand-green-bright/40 bg-brand-green-bright/15 text-brand-green-bright"
                : "border-brand-border-dark text-brand-cream hover:bg-white/[0.04]"
            }`}
          >
            {copied ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12 10 17 19 7" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            {copied ? "Texte copié" : "Copier le texte"}
          </button>
          <a
            href="/ressources-urgence/communication-urgence-collaborateurs.pdf"
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal-bright/40 bg-brand-teal-bright/10 px-3.5 py-1.5 text-[12px] font-medium text-brand-teal-bright transition-colors hover:bg-brand-teal-bright/20"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Télécharger PDF
          </a>
        </div>
      </div>

      <article className="space-y-4 p-6 text-[14px] leading-relaxed text-brand-cream">
        <p>Chèr(e)s collègues,</p>
        <p>
          C&apos;est avec une profonde tristesse que nous avons appris le décès
          d&apos;un de nos collègues. Nous savons combien une telle perte peut
          affecter chacun d&apos;entre vous, tant sur le plan personnel que
          collectif.
        </p>
        <p>
          Face à cette épreuve, il nous paraît essentiel de vous rappeler que
          <strong className="text-brand-green-bright">
            {" "}
            vous n&apos;êtes pas seul·e
          </strong>
          . Que vous ressentiez le besoin de parler, de partager vos émotions,
          ou simplement de prendre un moment pour vous, des ressources et un
          soutien sont à votre disposition.
        </p>

        <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-teal-bright">
            🧑‍⚕️ Séances individuelles offertes
          </p>
          <p className="mt-2">
            Vous avez accès à des séances individuelles, offertes, avec nos
            psychologues de la communauté teale. Ces échanges vous permettent
            de bénéficier d&apos;un espace confidentiel pour exprimer vos
            ressentis et recevoir un accompagnement individuel.
          </p>
          <p className="mt-3 text-[12px] uppercase tracking-wider text-brand-muted-on-dark">
            Prendre rendez-vous directement avec :
          </p>
          <ul className="mt-2 space-y-1.5">
            {psychologistList.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal-bright"
                  aria-hidden
                />
                <span>{p}</span>
                <span className="text-brand-muted-on-dark">·</span>
                <span className="text-brand-teal-bright underline decoration-dotted">
                  prendre rendez-vous
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-brand-muted-on-dark">
            Vous pouvez aussi vous rendre sur la{" "}
            <span className="text-brand-teal-bright underline decoration-dotted">
              page teale dédiée
            </span>{" "}
            ou réserver un{" "}
            <span className="text-brand-teal-bright underline decoration-dotted">
              appel gratuit de 15 minutes
            </span>{" "}
            avec un psychologue du travail, qui pourra vous orienter vers
            l&apos;expert le plus adapté pour vous.
          </p>
        </div>

        <div className="rounded-xl border border-brand-border-dark bg-brand-dark/40 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-teal-bright">
            📱 Contenus digitaux de l&apos;application teale
          </p>
          <p className="mt-2">
            Des outils et ressources concrètes accessibles en tout temps, un
            appui discret que vous pouvez solliciter à votre rythme :
          </p>
          <ul className="mt-2 space-y-1.5">
            {videoSeries.map((v) => (
              <li key={v} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-bright"
                  aria-hidden
                />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="italic text-brand-muted-on-dark">
          Prenez soin de vous et n&apos;hésitez pas à solliciter cet
          accompagnement.
        </p>
      </article>

      <aside className="border-t border-brand-salmon/30 bg-gradient-to-br from-brand-salmon/[0.10] via-brand-upcoming/[0.04] to-transparent px-6 py-4">
        <div className="flex items-start gap-3">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-salmon/20 text-lg"
            aria-hidden
          >
            ⚠️
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-relaxed text-brand-cream">
              <strong className="text-brand-salmon">
                teale n&apos;est pas un service d&apos;urgence.
              </strong>{" "}
              Si vous avez des idées sombres ou des pensées suicidaires,
              contactez immédiatement l&apos;un des numéros suivants. Un
              professionnel de santé saura vous orienter.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {emergencyNumbers.map((n) => (
                <div
                  key={n.label}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-dark/60 px-3 py-1.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-muted-on-dark">
                    {n.label}
                  </span>
                  <span className="text-base font-semibold text-brand-salmon">
                    {n.number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PreparationChecklist() {
  const allKeys = useMemo(
    () =>
      preparationGroups.flatMap((g) =>
        g.items.map((_, i) => `${g.id}-${i}`)
      ),
    []
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const reset = () => setChecked(new Set());

  const totalItems = allKeys.length;
  const doneItems = checked.size;
  const pct = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border-dark bg-brand-dark/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-2 w-40 overflow-hidden rounded-full bg-brand-dark">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-green-bright transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-medium text-brand-cream">
            {doneItems} / {totalItems} préparé{doneItems > 1 ? "s" : ""}
          </span>
          {doneItems > 0 && (
            <button
              type="button"
              onClick={reset}
              className="text-[11px] text-brand-muted-on-dark transition-colors hover:text-brand-cream hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <a
          href="/ressources-urgence/preparer-venue-todo-rh.pdf"
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal-bright/40 bg-brand-teal-bright/10 px-3.5 py-1.5 text-[12px] font-medium text-brand-teal-bright transition-colors hover:bg-brand-teal-bright/20"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Télécharger la fiche PDF
        </a>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 md:grid-cols-2">
        {preparationGroups.map((g) => (
          <ChecklistGroupBlock
            key={g.id}
            group={g}
            checked={checked}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistGroupBlock({
  group,
  checked,
  onToggle,
}: {
  group: ChecklistGroup;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  const groupDone = group.items.every((_, i) =>
    checked.has(`${group.id}-${i}`)
  );
  return (
    <section>
      <header className="mb-2.5 flex items-center gap-2">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg transition-colors ${
            groupDone
              ? "bg-brand-green-bright/20"
              : "bg-brand-cream/[0.06]"
          }`}
          aria-hidden
        >
          {group.emoji}
        </span>
        <h4
          className={`text-[13px] font-semibold ${
            groupDone ? "text-brand-green-bright" : "text-brand-cream"
          }`}
        >
          {group.title}
        </h4>
      </header>
      <ul className="space-y-1">
        {group.items.map((item, i) => {
          const key = `${group.id}-${i}`;
          const isChecked = checked.has(key);
          const inputId = `prep-${key}`;
          return (
            <li key={key}>
              <label
                htmlFor={inputId}
                className="group flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(key)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                    isChecked
                      ? "border-brand-green-bright bg-brand-green-bright"
                      : "border-brand-muted-on-dark/60 group-hover:border-brand-cream"
                  }`}
                  aria-hidden
                >
                  {isChecked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand-dark"
                    >
                      <path d="M5 12 10 17 19 7" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-[13px] leading-relaxed ${
                    isChecked
                      ? "text-brand-muted-on-dark line-through decoration-brand-muted-on-dark/40"
                      : "text-brand-cream"
                  }`}
                >
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ModuleCard({ module: m }: { module: Module }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-brand-border-dark bg-brand-surface transition-colors hover:border-brand-green-bright/40">
      <div
        className={`flex h-28 items-center justify-center bg-gradient-to-br ${m.gradient} text-4xl`}
      >
        <span aria-hidden>{m.emoji}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${m.accentClass}`}
          >
            {m.label}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
            {m.format}
          </span>
        </div>
        <h3 className="text-base font-medium text-brand-cream">{m.title}</h3>
        <p className="text-[13px] leading-relaxed text-brand-muted-on-dark">
          {m.description}
        </p>
      </div>
    </article>
  );
}

function FocusCard({
  emoji,
  eyebrow,
  title,
  subtitle,
  intro,
  items,
  accent,
  chips,
}: {
  emoji: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  items: string[];
  accent: "salmon" | "green";
  chips?: { label: string; value: string }[];
}) {
  const bulletClass =
    accent === "salmon" ? "bg-brand-salmon" : "bg-brand-green-bright";
  const eyebrowClass =
    accent === "salmon" ? "text-brand-salmon" : "text-brand-green-bright";
  const chipClass =
    accent === "salmon"
      ? "bg-brand-salmon/15 text-brand-salmon"
      : "bg-brand-green-bright/15 text-brand-green-bright";
  return (
    <article className="flex h-full flex-col rounded-2xl border border-brand-border-dark bg-brand-surface p-6">
      <div className="mb-3 flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${chipClass}`}
          aria-hidden
        >
          {emoji}
        </span>
        <div>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.18em] ${eyebrowClass}`}
          >
            {eyebrow}
          </p>
          <h3 className="mt-0.5 text-lg font-medium text-brand-cream">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-[13px] italic text-brand-muted-on-dark">
        {subtitle}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-brand-cream">
        {intro}
      </p>
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-brand-muted-on-dark">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClass}`}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {chips && chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-border-dark pt-4">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${chipClass}`}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-70">
                {c.label}
              </span>
              {c.value}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ResourceCard({ resource: r }: { resource: Resource }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-brand-border-dark bg-brand-surface p-5 transition-colors hover:border-brand-green-bright/40">
      <div className="flex items-start gap-3">
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-2xl ${r.iconGradient}`}
          aria-hidden
        >
          {r.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${r.accentClass}`}
            >
              {r.tag}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-brand-muted-on-dark">
              PDF · {r.size}
            </span>
          </div>
          <h3 className="text-[14px] font-medium leading-snug text-brand-cream">
            {r.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-brand-muted-on-dark">
            {r.description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <a
          href={r.file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brand-border-dark px-3 py-2 text-[12px] font-medium text-brand-cream transition-colors hover:bg-white/[0.04]"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Aperçu
        </a>
        <a
          href={r.file}
          download
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-green-bright px-3 py-2 text-[12px] font-semibold text-brand-dark transition-colors hover:bg-brand-green-bright/90"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
          Télécharger
        </a>
      </div>
    </article>
  );
}

function PricingCard({ item }: { item: Pricing }) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-5 transition-colors ${
        item.highlight
          ? "border-brand-salmon/40 bg-gradient-to-br from-brand-salmon/[0.10] via-brand-upcoming/[0.04] to-transparent"
          : "border-brand-border-dark bg-brand-surface"
      }`}
    >
      <h4 className="text-sm font-medium text-brand-cream">{item.title}</h4>
      {item.detail && (
        <p className="mt-1 text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
          {item.detail}
        </p>
      )}
      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-medium leading-none ${
            item.highlight ? "text-brand-salmon" : "text-brand-green-bright"
          }`}
        >
          {item.price}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-brand-muted-on-dark">
          {item.unit}
        </span>
      </div>
    </article>
  );
}
