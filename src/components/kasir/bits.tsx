import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export function Mark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-xs font-semibold tracking-tight text-primary-ink">
      YG
    </span>
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet" }) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-opacity duration-150 ease-out disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-primary text-primary-ink",
        variant === "ghost" && "border border-line bg-raised text-fg",
        variant === "quiet" && "bg-transparent text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        id={id}
        className={clsx(
          "h-11 w-full rounded-lg border border-line bg-raised px-3 text-base text-fg outline-none placeholder:text-faint",
          className,
        )}
        {...props}
      />
      {hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-xl border border-line bg-surface p-4", className)}>{children}</section>;
}

export function StatusText({ status }: { status: string }) {
  const tone = status === "Sukses" ? "text-ok" : status === "Gagal" ? "text-danger" : "text-warn";
  return <span className={clsx("text-xs font-semibold", tone)}>{status}</span>;
}
