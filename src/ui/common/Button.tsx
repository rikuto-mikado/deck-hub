import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'ghost';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-35';
const STYLES: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-[0_10px_30px_rgb(201_164_92/0.22)] hover:bg-accent-hover active:brightness-95',
  ghost: 'bg-transparent text-cream ring-1 ring-cream/20 ring-inset hover:bg-cream/8 active:bg-cream/12',
};

export function Button({
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${BASE} ${STYLES[variant]} ${className}`} {...props} />;
}

/** Round icon-only button; `label` is both the accessible name and the tooltip. */
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ComponentProps<'button'> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-cream/85 transition hover:bg-cream/8 hover:text-cream focus-visible:outline-2 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
