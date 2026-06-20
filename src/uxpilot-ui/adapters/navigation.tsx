"use client";

import {
  Link as I18nLink,
  usePathname,
  useRouter,
} from "@/i18n/navigation";
import { ComponentProps, forwardRef, useEffect } from "react";

type UxLinkProps = Omit<ComponentProps<typeof I18nLink>, "href"> & {
  to?: string;
  href?: string;
};

/** React Router `to` prop → Next.js `href`. */
export const Link = forwardRef<HTMLAnchorElement, UxLinkProps>(function UxLink(
  { to, href, ...props },
  ref
) {
  return <I18nLink ref={ref} href={href ?? to ?? "/"} {...props} />;
});

export { usePathname, useRouter };

export function useUxLocation() {
  const pathname = usePathname();
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  return { pathname: base };
}

export function useUxNavigate() {
  const router = useRouter();
  return (to: string) => router.push(to);
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, router]);
  return null;
}
