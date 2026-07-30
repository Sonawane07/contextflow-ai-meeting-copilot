export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-[42px] sm:leading-[1.05]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/58 sm:text-base">
          {description}
        </p>
      </div>
      {actions}
    </div>
  );
}
