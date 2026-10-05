"use client";

/** Opens the browser's print dialog. The page's print styles do the rest. */
export function PrintButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4 fill-none stroke-current"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <path d="M4.5 6V2.5h7V6M4.5 11.5h-2V6.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v5h-2M4.5 9.5h7v4h-7z" />
      </svg>
      {label}
    </button>
  );
}
