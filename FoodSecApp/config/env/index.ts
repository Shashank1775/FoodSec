/**
 * Runtime configuration.
 *
 * Every secret is read from the environment. Expo inlines any variable prefixed
 * with `EXPO_PUBLIC_` at bundle time, so put them in `FoodSecApp/.env`
 * (see `.env.example`). Nothing here is required: with no keys set the app runs
 * fully offline and estimates expiry dates from the bundled USDA FoodKeeper data.
 *
 * NOTE: `EXPO_PUBLIC_*` values are embedded in the client bundle and are therefore
 * visible to anyone with the app. That is acceptable for free-tier / demo keys;
 * production keys belong behind a backend.
 */

// Expo replaces *static* `process.env.EXPO_PUBLIC_*` references at bundle time;
// dynamic lookups like `process.env[name]` are NOT inlined and would always be
// undefined on device. Hence every variable is referenced literally below.
const clean = (value: string | undefined): string | undefined =>
  value && value.trim().length > 0 ? value.trim() : undefined;

/** OCR.space cloud OCR. The public demo key works out of the box but is heavily rate-limited. */
export const OCR_CONFIG = {
  apiKey: clean(process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY) ?? 'helloworld',
  endpoint: 'https://api.ocr.space/parse/image',
  language: 'eng',
  /** Receipts are resized to this width before upload (OCR.space free tier caps files at 1 MB). */
  uploadWidth: 1000,
};

/** Optional Azure OpenAI deployment used to refine expiry estimates. */
export const AZURE_OPENAI_CONFIG = {
  endpoint: clean(process.env.EXPO_PUBLIC_AZURE_OPENAI_ENDPOINT),
  apiKey: clean(process.env.EXPO_PUBLIC_AZURE_OPENAI_KEY),
  deployment: clean(process.env.EXPO_PUBLIC_AZURE_OPENAI_DEPLOYMENT),
  apiVersion: '2024-02-01',
};

export const isLLMConfigured = (): boolean =>
  Boolean(AZURE_OPENAI_CONFIG.endpoint && AZURE_OPENAI_CONFIG.apiKey && AZURE_OPENAI_CONFIG.deployment);

/** Reserved for the future REST backend; unused while persistence is local-only. */
export const API_URL = clean(process.env.EXPO_PUBLIC_API_URL);

export const APP_CONFIG = {
  /** Used when neither FoodKeeper nor the LLM can estimate an item's shelf life. */
  defaultExpiryDays: 7,
  /** Items expiring within this many days are shown as "expiring soon". */
  expiringSoonDays: 3,
};
