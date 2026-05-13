type Props = {
  title: string;
};

export default function PlaceholderPage({ title }: Props) {
  return (
    <div className="px-12 py-12">
      <h1 className="text-4xl font-medium tracking-tight text-brand-cream">
        {title}
      </h1>
      <div className="mt-10 rounded-2xl border border-dashed border-brand-border-dark bg-brand-surface px-8 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-brand-muted-on-dark">
          À venir
        </p>
        <p className="mt-3 text-brand-muted-on-dark">
          Cette rubrique sera construite lors d&apos;une prochaine étape.
        </p>
      </div>
    </div>
  );
}
