"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface JournalNavProps {
  slug: string;
}

export function JournalNav({ slug }: JournalNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Current Issue", href: `/${slug}` },
    { label: "Archives", href: `/${slug}/issues` },
    { label: "Search", href: `/${slug}/search` },
    { label: "About", href: `/${slug}/about` },
    { label: "Submit", href: "/submissions/new" },
  ];

  function isActive(href: string) {
    if (href === `/${slug}`) return pathname === `/${slug}`;
    return pathname.startsWith(href);
  }

  return (
    <div>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden text-white/70 hover:text-white p-1"
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Nav links */}
      <div className={`${open ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-1 sm:gap-6 mt-2 sm:mt-0`}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`text-sm py-1 sm:py-0 transition-colors ${
              isActive(link.href)
                ? "text-white font-semibold"
                : "text-white/60 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
