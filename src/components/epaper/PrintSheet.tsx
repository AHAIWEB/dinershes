import { forwardRef } from "react";
import type { Edition, Page } from "@/lib/epaper-data";
import { NewspaperPage } from "./NewspaperPage";

/**
 * Fixed 13 × 20.5 inch sheet (rendered at 96 CSS px/in = 1248 × 1968 px) so the six
 * columns keep their exact print widths regardless of the screen.
 */
export const PrintSheet = forwardRef<HTMLDivElement, { edition: Edition; page: Page }>(
  function PrintSheet({ edition, page }, ref) {
    return (
      <div
        ref={ref}
        className="print-sheet-fixed overflow-hidden bg-newsprint-paper"
        style={{ width: "13in", height: "20.5in" }}
      >
        <NewspaperPage edition={edition} page={page} />
      </div>
    );
  },
);
