"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type IconLabelButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  hideLabelOnMobile?: boolean;
};

export function IconLabelButton({
  icon,
  label,
  hideLabelOnMobile = true,
  className,
  type = "button",
  ...props
}: IconLabelButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className={cn(className)}
      {...props}
    >
      {icon}
      <span className={hideLabelOnMobile ? "hidden sm:inline" : undefined}>{label}</span>
    </button>
  );
}

type IconLabelLinkProps = Omit<React.ComponentProps<typeof Link>, "children"> & {
  icon: React.ReactNode;
  label: string;
  hideLabelOnMobile?: boolean;
};

export function IconLabelLink({
  icon,
  label,
  hideLabelOnMobile = true,
  className,
  ...props
}: IconLabelLinkProps) {
  return (
    <Link title={label} aria-label={label} className={cn(className)} {...props}>
      {icon}
      <span className={hideLabelOnMobile ? "hidden sm:inline" : undefined}>{label}</span>
    </Link>
  );
}
