// Spreadsheet formula-injection guard (OWASP "CSV injection"). Rows are appended with
// valueInputOption=RAW, so Sheets itself never evaluates them, but a CSV/Excel export would. Any value
// starting with a formula trigger gets a leading apostrophe, which spreadsheets treat as "text".
const TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return TRIGGERS.some((t) => text.startsWith(t)) ? `'${text}` : text;
}
