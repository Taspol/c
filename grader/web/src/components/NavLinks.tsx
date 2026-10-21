"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

// Tabs in the top bar; the active one follows the current page
export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname.startsWith("/problems");
    if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/problems");
    return pathname.startsWith(href);
  };
  return (
    <nav>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={`navlink${isActive(item.href) ? " active" : ""}`}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
