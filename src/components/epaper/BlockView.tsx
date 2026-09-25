import type { Block } from "@/lib/epaper-data";

export function BlockView({ block }: { block: Block }) {
  const style: React.CSSProperties = {
    marginTop: block.margin?.top,
    marginRight: block.margin?.right,
    marginBottom: block.margin?.bottom,
    marginLeft: block.margin?.left,
    paddingTop: block.padding?.top,
    paddingRight: block.padding?.right,
    paddingBottom: block.padding?.bottom,
    paddingLeft: block.padding?.left,
    textAlign: block.align,
  };

  const kicker = (
    <span className="block font-sans text-[0.55rem] uppercase tracking-[0.2em] text-newsprint-accent">
      {block.section}
    </span>
  );

  if (block.type === "divider") {
    return <hr className="my-3 border-t-2 border-newsprint-rule" style={style} />;
  }

  if (block.type === "image") {
    return (
      <figure style={style}>
        <div className="mb-1 flex items-center justify-between font-sans text-[0.55rem] uppercase tracking-[0.2em] text-newsprint-muted">
          <span>Image</span>
          <span>{block.section}</span>
        </div>
        <img
          src={block.imageSrc}
          alt={block.label}
          loading="lazy"
          className="w-full border border-newsprint-rule"
          style={{
            height: block.imageHeight,
            objectFit: block.fit ?? "cover",
            borderRadius: block.radius,
          }}
        />
        <figcaption className="mt-1 font-serif-bn text-[0.62rem] leading-snug text-newsprint-muted">
          {block.credit ?? block.label}
        </figcaption>
      </figure>
    );
  }

  if (block.type === "ad") {
    return (
      <aside
        style={style}
        className={
          block.invert
            ? "border border-newsprint-ink bg-newsprint-ink px-3 py-3 text-newsprint-paper"
            : "border border-dashed border-newsprint-rule px-3 py-3"
        }
      >
        <span className="block font-sans text-[0.55rem] uppercase tracking-[0.2em] opacity-70">
          বিজ্ঞাপন
        </span>
        <p className="mt-1 font-serif-bn text-base font-bold leading-snug">{block.label}</p>
        {block.body && <p className="mt-1 font-serif-bn text-[0.7rem] opacity-80">{block.body}</p>}
      </aside>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote
        style={style}
        className="border-l-4 border-newsprint-accent bg-newsprint-tint px-3 py-2"
      >
        {kicker}
        <p className="mt-1 font-serif-bn text-base font-bold leading-snug">{block.label}</p>
        {block.credit && (
          <cite className="mt-1 block font-serif-bn text-[0.68rem] not-italic text-newsprint-muted">
            {block.credit}
          </cite>
        )}
      </blockquote>
    );
  }

  const size = block.type === "headline" ? 1.45 : 1;
  return (
    <article style={style}>
      {kicker}
      <h3
        className="font-serif-bn font-bold leading-[1.15] text-newsprint-ink"
        style={{ fontSize: `${size * (block.fontScale ?? 1)}rem` }}
      >
        {block.label}
      </h3>
      {block.credit && (
        <p className="mt-1 font-serif-bn text-[0.6rem] text-newsprint-muted">{block.credit}</p>
      )}
      {block.body && (
        <p className="mt-1 font-serif-bn text-[0.78rem] leading-[1.5] text-newsprint-body">
          {block.body}
        </p>
      )}
    </article>
  );
}
