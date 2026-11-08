/** Natural content height as a percentage of the usable page height. */
export function columnFillPercent(contentHeight: number, pageHeight: number) {
  if (!Number.isFinite(contentHeight) || !Number.isFinite(pageHeight) || pageHeight <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((contentHeight / pageHeight) * 100)));
}