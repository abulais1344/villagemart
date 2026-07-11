export function isRestaurantOpen(
  openingTime: string | null,
  closingTime: string | null,
  isOpenFlag?: boolean | null,
  adminOverride?: boolean | null,
): boolean {
  if (adminOverride === true) return true;
  if (adminOverride === false) return false;
  if (isOpenFlag === false) return false;
  if (!openingTime || !closingTime) return true;
  const now = new Date();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const openMins  = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins; // overnight span
}
