import { Icon } from "@/components/icons";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card animate-pulse p-5">
          <div className="h-3 w-24 rounded bg-ink/8" />
          <div className="mt-5 h-6 w-3/4 rounded bg-ink/8" />
          <div className="mt-3 h-4 w-full rounded bg-ink/6" />
          <div className="mt-8 h-9 w-1/2 rounded bg-ink/6" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card grid min-h-52 place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-ink/5 text-ink/45">
          <Icon name="inbox" className="size-5" />
        </span>
        <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink/55">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-semibold text-rose-900">Something went wrong</p>
      <p className="mt-1 text-sm text-rose-800/80">{message}</p>
      {onRetry ? (
        <button className="button-secondary mt-4" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
