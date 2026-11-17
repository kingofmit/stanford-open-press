import Link from "next/link";

interface EditorialNavProps {
  slug: string;
  active: "dashboard" | "settings" | "templates" | "reviewers" | "analytics";
}

export function EditorialNav({ slug, active }: EditorialNavProps) {
  const links = [
    { key: "dashboard", label: "Overview", href: `/editorial/${slug}` },
    { key: "settings", label: "Settings", href: `/editorial/${slug}/settings` },
    { key: "templates", label: "Templates", href: `/editorial/${slug}/templates` },
    { key: "reviewers", label: "Reviewers", href: `/editorial/${slug}/reviewers` },
    { key: "analytics", label: "Analytics", href: `/editorial/${slug}/analytics` },
  ];

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex gap-6 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active === link.key
                  ? "border-cardinal text-cardinal"
                  : "border-transparent text-cool-grey hover:text-cardinal hover:border-cardinal/30"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
