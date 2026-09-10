#!/usr/bin/env node
/*
 * Converts the raw USDA FoodKeeper export (FoodSecApp/assets/data/foodkeeper.json)
 * into the compact shelf-life table the app bundles
 * (FoodSecApp/assets/data/foodkeeper-shelf-life.json).
 *
 * The raw export is ~630 KB and stores every row as an array of single-key objects
 * (e.g. [{"ID":1},{"Name":"Butter"},...]). We flatten each row, keep only the
 * fields needed for expiry estimation, and normalise every duration to days.
 *
 * Usage: node scripts/build-foodkeeper.js   (or `npm run build:foodkeeper` in FoodSecApp/)
 */
const fs = require('fs');
const path = require('path');

const RAW = path.join(__dirname, '..', 'FoodSecApp', 'assets', 'data', 'foodkeeper.json');
const OUT = path.join(__dirname, '..', 'FoodSecApp', 'assets', 'data', 'foodkeeper-shelf-life.json');

const DAYS_PER = { hours: 1 / 24, days: 1, weeks: 7, months: 30, year: 365, years: 365 };

const flatten = (row) => Object.assign({}, ...row);

/** Returns a [minDays, maxDays] pair, or null when FoodKeeper gives no numeric range. */
function toDays(min, max, metric) {
  if (!metric) return null;
  const factor = DAYS_PER[String(metric).toLowerCase()];
  if (!factor) return null; // "Package use-by date", "Indefinitely", "When Ripe", ...
  const lo = min != null ? min : max;
  const hi = max != null ? max : min;
  if (lo == null && hi == null) return null;
  return [Math.round(lo * factor), Math.round(hi * factor)];
}

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const sheet = (name) => raw.sheets.find((s) => s.name === name).data.map(flatten);

const categories = new Map(sheet('Category').map((c) => [c.ID, c]));

const products = sheet('Product')
  .filter((p) => p.Name && p.Name.trim())
  .map((p) => {
    const cat = categories.get(p.Category_ID) || {};
    const keywords = String(p.Keywords || p.Name)
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    return {
      id: p.ID,
      name: p.Name.trim(),
      subtitle: p.Name_subtitle ? p.Name_subtitle.trim() : null,
      category: cat.Category_Name || null,
      subcategory: cat.Subcategory_Name || null,
      keywords: Array.from(new Set(keywords)),
      // Durations measured from date of purchase (DOP_*) are the closest match to
      // "I just bought this"; fall back to the generic column when DOP is missing.
      pantry: toDays(p.DOP_Pantry_Min, p.DOP_Pantry_Max, p.DOP_Pantry_Metric) ||
        toDays(p.Pantry_Min, p.Pantry_Max, p.Pantry_Metric),
      fridge: toDays(p.DOP_Refrigerate_Min, p.DOP_Refrigerate_Max, p.DOP_Refrigerate_Metric) ||
        toDays(p.Refrigerate_Min, p.Refrigerate_Max, p.Refrigerate_Metric),
      fridgeOpened: toDays(
        p.Refrigerate_After_Opening_Min,
        p.Refrigerate_After_Opening_Max,
        p.Refrigerate_After_Opening_Metric
      ),
      freezer: toDays(p.DOP_Freeze_Min, p.DOP_Freeze_Max, p.DOP_Freeze_Metric) ||
        toDays(p.Freeze_Min, p.Freeze_Max, p.Freeze_Metric),
    };
  });

const out = {
  source: 'USDA FoodKeeper (FSIS), https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/foodkeeper-app',
  generatedFrom: path.basename(RAW),
  products,
};

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${products.length} products to ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
