/** Show budget with € when the stored text does not already include a euro marker. */
export function formatBudgetDisplay(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/^[€\u20ac]/.test(t) || /\bEUR\b/i.test(t)) return t;
  return `€${t}`;
}
