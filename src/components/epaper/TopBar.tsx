import { Link } from "@tanstack/react-router";

export function TopBar({ mode }: { mode: "public" | "admin" }) {
  return (
    <div className="no-print border-b border-newsprint-rule bg-newsprint-paper">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-newsprint-accent font-display-bn text-lg text-newsprint-paper">
            দি
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display-bn text-base leading-none text-newsprint-ink">
              দিনের শেষ খবর
            </span>
           <span className="block font-sans text-[0.55rem] text-newsprint-muted">
               বাংলা ই-পেপার
            </span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 rounded-full border border-newsprint-rule p-1">
          <Link
            to="/admin"
            className={`rounded-full px-3 py-1.5 font-sans text-xs ${
              mode === "admin"
                ? "bg-newsprint-ink text-newsprint-paper"
                : "text-newsprint-muted hover:text-newsprint-ink"
            }`}
          >
             নিউজরুম
          </Link>
          <Link
            to="/"
            className={`rounded-full px-3 py-1.5 font-sans text-xs ${
              mode === "public"
                ? "bg-newsprint-ink text-newsprint-paper"
                : "text-newsprint-muted hover:text-newsprint-ink"
            }`}
          >
             আজকের পাতা
          </Link>
           <Link to="/archive" className="px-3 py-1.5 font-serif-bn text-xs text-newsprint-muted">আর্কাইভ</Link>
         </nav>
      </div>
    </div>
  );
}
