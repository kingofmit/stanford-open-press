import Link from "next/link";

export function StanfordBar() {
  return (
    <div className="bg-cardinal text-white">
      <div className="mx-auto max-w-7xl px-6 py-1">
        <span className="text-xs font-sans font-medium tracking-wide">Stanford Open Press</span>
      </div>
    </div>
  );
}

export function AppHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StanfordBar />
      <header className="border-b border-fog bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {children}
        </div>
      </header>
    </>
  );
}
