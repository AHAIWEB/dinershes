import { designVars, type Block, type Edition, type Page } from "@/lib/epaper-data";
import { BlockView } from "./BlockView";
import logo from "@/assets/shesh-khobor-logo-cropped.png.asset.json";

type Props = {
  edition: Edition;
  page: Page;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (b: Block) => void;
  onDropBlock?: (columnIndex: number) => void;
  onDragStartBlock?: (blockId: string) => void;
};

export function NewspaperPage({
  edition,
  page,
  editable,
  selectedId,
  onSelect,
  onDropBlock,
  onDragStartBlock,
}: Props) {
  return (
    <div className="newspaper-sheet bg-newsprint-paper px-[1.4%] py-[2%] text-newsprint-ink shadow-paper" style={designVars(edition.design) as React.CSSProperties}>
      <header className="border-b-[3px] border-newsprint-ink pb-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="font-serif-bn text-[0.66rem] text-newsprint-muted">
              সত্যের সঙ্গে, মানুষের পাশে
            </p>
             <div className="flex items-center gap-2">
                <img src={logo.url} alt="শেষ খবর" className="h-9 w-36 object-contain sm:h-12 sm:w-52" />
               <h1 className="font-display-bn text-2xl leading-none text-newsprint-accent sm:text-3xl">দিনের শেষ খবর</h1>
             </div>
          </div>
          <div className="font-serif-bn text-[0.68rem] text-newsprint-muted sm:text-right">
            <p>{edition.dateBn}</p>
            <p>{edition.hijri}</p>
            <p className="font-display-bn text-xl text-newsprint-ink">সংখ্যা {edition.number}</p>
            <p className="font-serif-bn text-newsprint-accent">পৃষ্ঠা {page.no} · {page.title}</p>
          </div>
        </div>
      </header>

      <div data-newspaper-grid="true" className="newsprint-grid mt-4 grid grid-cols-6 gap-y-3">
        {page.columns.map((col, ci) => (
          <div
            key={ci}
            data-paper-column={ci}
            style={{ borderLeftWidth: "var(--d-rule, 1px)" }}
            className={`min-w-0 space-y-1 border-l border-newsprint-rule/60 pl-1 ${
              editable ? "min-h-40 outline-dashed outline-1 outline-newsprint-rule/70" : ""
            }`}
            onDragOver={editable ? (e) => e.preventDefault() : undefined}
            onDrop={
              editable
                ? (e) => {
                    e.preventDefault();
                    onDropBlock?.(ci);
                  }
                : undefined
            }
          >
            {col.map((block) => (
              <div
                key={block.id}
                data-paper-block="true"
                data-column-span={Math.min(6 - ci, Math.max(1, block.columnSpan ?? 1))}
                draggable={editable}
                onDragStart={editable ? () => onDragStartBlock?.(block.id) : undefined}
                onClick={editable ? () => onSelect?.(block) : undefined}
                style={{
                  width: `calc(${Math.min(6 - ci, Math.max(1, block.columnSpan ?? 1)) * 100}% + ${Math.min(6 - ci, Math.max(1, block.columnSpan ?? 1)) - 1} * var(--column-gap))`,
                  position: "relative",
                  zIndex: 1,
                  background: "var(--paper)",
                }}
                className={
                  editable
                    ? `cursor-pointer rounded-sm p-1 transition-colors ${
                        selectedId === block.id
                          ? "outline outline-2 outline-newsprint-accent"
                          : "hover:bg-newsprint-tint"
                      }`
                    : undefined
                }
              >
                <BlockView block={block} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <footer className="mt-4 flex flex-wrap justify-between gap-2 border-t border-newsprint-rule pt-2 font-serif-bn text-[0.6rem] text-newsprint-muted">
        <span>দিনের শেষ খবর · সংস্করণ {edition.number}</span>
        <span>
          পৃষ্ঠা {page.no} · {page.title}
        </span>
      </footer>
    </div>
  );
}
