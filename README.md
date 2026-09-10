# FoodSec

**Scan a grocery receipt, get an expiry date for everything on it, and use it before it goes bad.**

FoodSec is a React Native (Expo) app that turns a photo of a receipt into a tracked inventory. Each line item is matched against the USDA FoodKeeper shelf-life dataset (optionally refined by an LLM), given an estimated expiry date, and surfaced on the dashboard as it approaches "use soon" or "expired". It runs entirely on-device with no backend.

The original product spec lives in [`docs/context.md`](docs/context.md); this README describes what is actually built.

## Status: what works today vs. planned

| Area | Today | Planned |
|---|---|---|
| Accounts | Local email + password accounts (salted PBKDF2 hash, stored on device); session persists across restarts | Real backend auth (Clerk/JWT), biometrics |
| Receipt scanning | Camera or photo library -> OCR -> parsed line items -> review sheet -> saved to inventory | On-device OCR (iOS Vision / Android ML Kit) via a custom dev build |
| OCR | [OCR.space](https://ocr.space) REST API (works in Expo Go; needs network; free demo key by default) | - |
| Expiry estimation | Offline fuzzy match against 661 USDA FoodKeeper products; optional Azure OpenAI refinement when keys are set | Storage-location awareness (pantry vs fridge), barcode lookup |
| Inventory | List with search / category filter / sort, details, edit (name, quantity, expiry), delete | Store name per receipt, receipt history UI |
| Dashboard | "Expiring soon" and "expired" items sorted by urgency | - |
| Persistence | AsyncStorage (JSON per collection) | REST/MongoDB backend with sync (`EXPO_PUBLIC_API_URL` is reserved for it) |
| Notifications | - | Local/push reminders 3 days before and on the day of expiry |

## How it works

```
 Camera / library photo
        |
        v
 OCRService ------- resize + JPEG compress (expo-image-manipulator) --> OCR.space --> raw text
        |
        v
 ReceiptParser ---- drop totals/payment/header lines, peel off price + quantity --> line items
        |
        v
 LLMService ------- FoodKeeperService.estimateShelfLife(name)  (offline, always)
        |           + optional Azure OpenAI refinement            (only if configured)
        v
 ItemService ------ DraftItem[] (name, category, estimatedExpiry, price...)
        |
        v   user reviews / removes lines
 DatabaseService -- AsyncStorage  -->  Items tab, Home dashboard
```

Key design decisions:

- **No backend.** The spec targets MongoDB, but a mobile client cannot talk to Mongo directly and there is no server yet. `DatabaseService` is an AsyncStorage repository with the method surface a REST client would have, so swapping in HTTP later touches one file. Models (`app/services/api/models.ts`) mirror the spec's schema.
- **Cloud OCR instead of tesseract.js.** Pure-JS OCR cannot run inside React Native and native OCR needs a custom build, so OCR.space is used to keep Expo Go working with zero setup.
- **FoodKeeper first, LLM second.** Expiry always has an offline answer; the LLM (if configured) only refines it, and any failure silently falls back.
- **Status is derived, not stored.** `fresh` / `soon` / `expired` is recomputed from `estimatedExpiry` on every read, so items age correctly without a background job.

## Folder layout

```
CursorAppTest/
├── FoodSecApp/                     Expo app (TypeScript)
│   ├── App.tsx                     Providers + auth-gated navigation (tabs: Home, Scan, Items)
│   ├── app/
│   │   ├── screens/                auth/, home/, scan/, items/
│   │   ├── components/             PhotoPreviewSection (OCR trigger)
│   │   ├── contexts/               AuthContext (session restore, login/register/logout)
│   │   ├── navigation/types.ts     Typed param lists for every navigator
│   │   └── services/
│   │       ├── api/                DatabaseService (AsyncStorage), AuthService, ItemService, models
│   │       ├── ocr/                OCRService (OCR.space)
│   │       ├── receipt/            ReceiptParser (text -> line items)
│   │       ├── expiry/             FoodKeeperService (fuzzy shelf-life lookup)
│   │       ├── ml/                 LLMService (optional Azure OpenAI, falls back to FoodKeeper)
│   │       └── ExpirationService   Date math + status/colour helpers
│   ├── assets/data/                foodkeeper.json (raw USDA export), foodkeeper-shelf-life.json (bundled)
│   ├── config/env/                 Reads EXPO_PUBLIC_* variables
│   ├── __tests__/                  Jest tests
│   └── .env.example                Template for optional API keys
├── scripts/build-foodkeeper.js     Regenerates the compact shelf-life table from the raw export
├── docs/context.md                 Original product spec
└── README.md
```

## Setup

Requirements: Node 18+, npm, and either the Expo Go app on a phone or an iOS Simulator / Android emulator.

```bash
cd FoodSecApp
npm install
cp .env.example .env      # optional - everything runs without keys
npx expo start            # then press i / a, or scan the QR code with Expo Go
```

### Environment variables (`FoodSecApp/.env`)

All optional. Expo inlines `EXPO_PUBLIC_*` values into the JS bundle at build time, so restart `expo start` after editing, and never put production secrets here.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_OCR_SPACE_API_KEY` | Your own OCR.space key ([free tier](https://ocr.space/ocrapi/freekey)). Without it the public demo key is used, which is rate-limited. |
| `EXPO_PUBLIC_AZURE_OPENAI_ENDPOINT` / `_KEY` / `_DEPLOYMENT` | Enables LLM refinement of expiry estimates. All three are required; otherwise FoodKeeper alone is used. |
| `EXPO_PUBLIC_API_URL` | Reserved for the future backend; unused. |

### Trying it on a simulator

Simulators have no camera; use the picture icon on the Scan tab to pick a receipt image from the photo library instead (drag an image into the simulator window to add it).

## Development

```bash
npm test              # Jest (receipt parser, FoodKeeper matching, expiry maths)
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint (eslint-config-expo)
npm run build:foodkeeper   # regenerate assets/data/foodkeeper-shelf-life.json from foodkeeper.json
```

`ios/` and `android/` are not committed; run `npx expo prebuild` if you need native projects (e.g. for on-device OCR).

## Data credit

Shelf-life data comes from the **USDA FoodKeeper** app/dataset published by the USDA Food Safety and Inspection Service:
<https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/foodkeeper-app>.
The raw export is at `FoodSecApp/assets/data/foodkeeper.json`; `scripts/build-foodkeeper.js` flattens it into the compact table the app bundles.

## Roadmap

1. Local notifications 3 days before and on the day of expiry (`expo-notifications`).
2. Backend + sync: REST API in front of MongoDB, JWT auth; `DatabaseService`/`AuthService` are the seams.
3. On-device OCR (iOS Vision, Android ML Kit) through a custom dev build, keeping OCR.space as the Expo Go fallback.
4. Receipt history: the `Receipt` model and `DatabaseService.createReceipt` exist, but the scan flow does not write receipts yet and there is no UI.
5. Store name / purchase date extraction from the receipt header.
6. Storage-location choice per item (pantry / fridge / freezer) using the other FoodKeeper columns.
