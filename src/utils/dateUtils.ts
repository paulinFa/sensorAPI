  // ISO-8601 avec fuseau obligatoire : soit 'Z', soit ±HH:MM
export const ISO_ZONED_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})$/;

/**
 * Parse une date ISO-8601 avec fuseau et retourne un objet Date.
 * Retourne null si invalide ou non fournie.
 */
export function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
