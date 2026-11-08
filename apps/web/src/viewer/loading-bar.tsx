/**
 * A thin bar that fills as something loads. With no progress to show yet, a
 * short segment sweeps back and forth along it instead; with reduced motion
 * the whole bar stays put, at half strength. It takes its color from the
 * text around it.
 */
export function LoadingBar({
  progress = null,
  className = "",
}: {
  /** 0 to 1, or null while there is no real number yet. */
  progress?: number | null;
  className?: string;
}) {
  const known = progress !== null && progress > 0;
  return (
    <span
      aria-hidden="true"
      data-loading-bar={known ? "progress" : "indeterminate"}
      className={`block overflow-hidden ${className}`}
    >
      {known ? (
        <span
          className="block h-full bg-current transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }}
        />
      ) : (
        <span className="block h-full w-1/3 animate-shimmer bg-current rtl:[--shimmer-dir:-1] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50" />
      )}
    </span>
  );
}
