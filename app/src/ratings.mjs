export const RATING_KEY = 'eduresources:ratings:v1';
const validRating = value => Number.isFinite(value) && value >= 0 && value <= 5 && value * 2 === Math.floor(value * 2);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function parseCurrent(raw) {
  if (raw === null) return {values: {}, recoveryBlocked: false};
  try {
    const stored = JSON.parse(raw);
    if (stored?.version === 1 && isRecord(stored.values)) return {values: stored.values, recoveryBlocked: false};
  } catch { /* Keep unreadable data intact for an explicit recovery decision. */ }
  return {values: {}, recoveryBlocked: true};
}

function canWrite(storage) {
  const key = `eduresources:ratings:probe:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try { storage.setItem(key, '1'); storage.removeItem(key); return true; }
  catch { try { storage.removeItem(key); } catch { /* Storage itself is unavailable. */ } return false; }
}

export function loadRatings(resources, storage) {
  let target, stored;
  try {
    target = storage ?? globalThis.localStorage;
    stored = parseCurrent(target.getItem(RATING_KEY));
  } catch { return {values: {}, available: false, recoveryBlocked: false, message: 'Device storage is unavailable. Ratings last for this visit.'}; }
  const values = {};
  for (const resource of resources) if (validRating(stored.values[resource.id])) values[resource.id] = stored.values[resource.id];
  let legacyReadFailed = false;
  try {
    // Retain old keys. Without timestamps conflicting old values cannot be dated;
    // an explicit modern value (including zero) always takes precedence.
    for (let index = 0; index < target.length; index++) {
      try {
        const key = target.key(index);
        if (!key?.startsWith('rating_')) continue;
        const resource = resources.find(item => (item.file || item.url) && key.endsWith('_' + (item.file || item.url)));
        if (!resource || values[resource.id] !== undefined) continue;
        const raw = target.getItem(key);
        if (typeof raw !== 'string' || !raw.trim()) continue;
        const rating = Number(raw);
        if (validRating(rating)) values[resource.id] = rating;
      } catch { legacyReadFailed = true; }
    }
  } catch { legacyReadFailed = true; }
  const available = !stored.recoveryBlocked && canWrite(target);
  const message = stored.recoveryBlocked
    ? 'The existing ratings save is unreadable or uses another version. It has been kept; these ratings last for this visit until you choose to replace it.'
    : !available ? 'Device storage is unavailable. Ratings last for this visit.'
    : legacyReadFailed ? 'Some older ratings could not be read. Available ratings have been kept.' : '';
  // Loading never rewrites rating data. Migration becomes durable on the next
  // explicit rating change, preventing storage-event write loops between tabs.
  return {values, available, recoveryBlocked: stored.recoveryBlocked, message};
}

export function saveRatings(values, storage, {replaceUnreadable = false} = {}) {
  if (!isRecord(values) || !Object.values(values).every(validRating)) return false;
  try {
    const target = storage ?? globalThis.localStorage;
    if (!replaceUnreadable && parseCurrent(target.getItem(RATING_KEY)).recoveryBlocked) return false;
    target.setItem(RATING_KEY, JSON.stringify({version: 1, values}));
    return true;
  } catch { return false; }
}
