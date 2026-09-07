import type { MouseEvent, ReactNode } from "react";

interface NavLinkProps {
  href: string;
  onNavigate: (path: string) => void;
  className?: string;
  children: ReactNode;
}

/** An anchor that routes in-app on a plain left-click but still behaves like a
 * real link for modified clicks / middle-click / "open in new tab". */
export function NavLink({ href, onNavigate, className, children }: NavLinkProps) {
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(href);
  };
  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
