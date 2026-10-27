export function gapSentence(chain: number | null, book: number | null): string {
  if (chain === null || book === null) return "The book price is offline, so this market cannot be logged.";
  const gap = Math.round((chain - book) * 100);
  if (gap >= 1) return `Chain is ${gap} points above the book.`;
  if (gap <= -1) return `Chain is ${Math.abs(gap)} points below the book.`;
  return "Chain and the book are even.";
}
