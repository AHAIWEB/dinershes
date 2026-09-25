import type { Block, Edition, Page } from "@/lib/epaper-data";
import { BlockView } from "./BlockView";

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
    <div className="bg-newsprint-paper px-6 py-5 text-newsprint-ink shadow-paper">
      <header className="border-b-[3px] border-newsprint-ink pb-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <p className="font-serif-bn text-[0.66rem] text-newsprint-muted">
              সত্যের সঙ্গে, মানুষের পাশে
            </p>
            <h1 className="font-display-bn text-3xl leading-none text-newsprint-accent sm:text-4xl">
              দিনের শেষ খবর
            </h1>
          </div>
          <div className="font-serif-bn text-[0.68rem] text-newsprint-muted sm:text-right">
            <p>{edition.dateBn}</p>
            <p>{edition.hijri}</p>
            <p className="font-display-bn text-xl text-newsprint-ink">{edition.number}</p>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3 md:divide-x md:divide-newsprint-rule">
        {page.columns.map((col, ci) => (
          <div
            key={ci}
            className={`space-y-1 md:px-3 ${
              editable ? "min-h-40 rounded-sm outline-dashed outline-1 outline-newsprint-rule/70" : ""
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
                draggable={editable}
                onDragStart={editable ? () => onDragStartBlock?.(block.id) : undefined}
                onClick={editable ? () => onSelect?.(block) : undefined}
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
        <span>দিনের শেষ খবর · e-paper edition {edition.number}</span>
        <span>পৃষ্ঠা {page.no} · {page.title}</span>
      </footer>
    </div>
  );
}
