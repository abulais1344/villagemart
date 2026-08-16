export function isPromoWindowActive(startsAt: string | null, endsAt: string | null): boolean {
  const now = new Date().toISOString();
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}
