/**
 * Food-additive risk table (E-numbers).
 *
 * Labels in Europe/Canada list additives as E-numbers (E102, E621…), and Open Food Facts
 * returns them as tags ("en:e330"). Only additives that health authorities flag are listed
 * here — harmless ones (citric acid E330, vitamin C E300, lecithin E322, pectin E440, xanthan
 * E415…) are deliberately absent, so they are never penalised.
 *
 * Levels:
 *   high     – avoid: banned/warning-labelled in the EU, or classified as possible/probable
 *              carcinogens (IARC 2A/2B) or linked to hyperactivity in children (the
 *              "Southampton six" azo dyes, which carry an EU warning label).
 *   moderate – best limited: intolerance/allergy triggers, gut or cardiovascular concerns,
 *              or contested evidence.
 *
 * This is guidance for consumers, not a medical assessment — see the disclaimer in About.
 */

export const ADDITIVE_RISK = {
  // Colours
  e102: { name: 'Tartrazine', level: 'high', why: 'Azo dye; EU warning label (may affect attention and activity in children)' },
  e104: { name: 'Quinoline yellow', level: 'high', why: 'Azo-type dye; EU warning label for children' },
  e110: { name: 'Sunset yellow', level: 'high', why: 'Azo dye; EU warning label (may affect attention and activity in children)' },
  e122: { name: 'Carmoisine', level: 'high', why: 'Azo dye; EU warning label for children' },
  e124: { name: 'Ponceau 4R', level: 'high', why: 'Azo dye; EU warning label for children' },
  e129: { name: 'Allura red', level: 'high', why: 'Azo dye; EU warning label for children' },
  e132: { name: 'Indigotine', level: 'moderate', why: 'Synthetic dye; limited safety data' },
  e133: { name: 'Brilliant blue', level: 'moderate', why: 'Synthetic dye; possible allergic reactions' },
  e142: { name: 'Green S', level: 'moderate', why: 'Synthetic dye; limited safety data' },
  e150c: { name: 'Ammonia caramel', level: 'moderate', why: 'Can contain 4-MEI (possible carcinogen, IARC 2B)' },
  e150d: { name: 'Sulphite ammonia caramel', level: 'moderate', why: 'Can contain 4-MEI (possible carcinogen, IARC 2B)' },
  e171: { name: 'Titanium dioxide', level: 'high', why: 'Banned as a food additive in the EU (2022) over genotoxicity concerns' },
  // Preservatives
  e210: { name: 'Benzoic acid', level: 'moderate', why: 'Can form benzene with vitamin C; may affect children' },
  e211: { name: 'Sodium benzoate', level: 'moderate', why: 'Can form benzene with vitamin C; may affect children' },
  e212: { name: 'Potassium benzoate', level: 'moderate', why: 'Can form benzene with vitamin C' },
  e213: { name: 'Calcium benzoate', level: 'moderate', why: 'Can form benzene with vitamin C' },
  e220: { name: 'Sulphur dioxide', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e221: { name: 'Sodium sulphite', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e222: { name: 'Sodium bisulphite', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e223: { name: 'Sodium metabisulphite', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e224: { name: 'Potassium metabisulphite', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e228: { name: 'Potassium bisulphite', level: 'moderate', why: 'Sulphite: can trigger asthma and allergic reactions' },
  e249: { name: 'Potassium nitrite', level: 'high', why: 'Nitrites in processed meat: linked to colorectal cancer risk' },
  e250: { name: 'Sodium nitrite', level: 'high', why: 'Nitrites in processed meat: linked to colorectal cancer risk' },
  e251: { name: 'Sodium nitrate', level: 'high', why: 'Converts to nitrite; processed-meat cancer link' },
  e252: { name: 'Potassium nitrate', level: 'high', why: 'Converts to nitrite; processed-meat cancer link' },
  // Antioxidants
  e310: { name: 'Propyl gallate', level: 'moderate', why: 'Synthetic antioxidant; possible endocrine effects' },
  e319: { name: 'TBHQ', level: 'moderate', why: 'Synthetic antioxidant; immune/behavioural concerns at high doses' },
  e320: { name: 'BHA', level: 'high', why: 'Possible human carcinogen (IARC 2B); possible endocrine disruptor' },
  e321: { name: 'BHT', level: 'moderate', why: 'Synthetic antioxidant; possible endocrine disruptor' },
  // Acids / phosphates
  e338: { name: 'Phosphoric acid', level: 'moderate', why: 'High phosphate intake linked to kidney and bone concerns' },
  e339: { name: 'Sodium phosphates', level: 'moderate', why: 'Phosphate additive; high intake linked to cardiovascular/kidney concerns' },
  e340: { name: 'Potassium phosphates', level: 'moderate', why: 'Phosphate additive; concern for people with kidney disease' },
  e341: { name: 'Calcium phosphates', level: 'moderate', why: 'Phosphate additive' },
  e450: { name: 'Diphosphates', level: 'moderate', why: 'Phosphate additive; high intake linked to cardiovascular/kidney concerns' },
  e451: { name: 'Triphosphates', level: 'moderate', why: 'Phosphate additive; high intake linked to cardiovascular/kidney concerns' },
  e452: { name: 'Polyphosphates', level: 'moderate', why: 'Phosphate additive; high intake linked to cardiovascular/kidney concerns' },
  // Thickeners / emulsifiers
  e407: { name: 'Carrageenan', level: 'moderate', why: 'May cause gut inflammation in sensitive people' },
  e433: { name: 'Polysorbate 80', level: 'moderate', why: 'Emulsifier; animal studies link it to gut microbiome disruption' },
  e466: { name: 'Carboxymethylcellulose', level: 'moderate', why: 'Emulsifier; studies link it to gut microbiome changes' },
  // Flavour enhancers
  e621: { name: 'Monosodium glutamate (MSG)', level: 'moderate', why: 'Flavour enhancer; some people report sensitivity' },
  e627: { name: 'Disodium guanylate', level: 'moderate', why: 'Flavour enhancer; not for people prone to gout' },
  e631: { name: 'Disodium inosinate', level: 'moderate', why: 'Flavour enhancer; not for people prone to gout' },
  e635: { name: 'Disodium ribonucleotides', level: 'moderate', why: 'Flavour enhancer; not for people prone to gout' },
  // Sweeteners
  e950: { name: 'Acesulfame K', level: 'moderate', why: 'Artificial sweetener; may affect gut bacteria; debated evidence' },
  e951: { name: 'Aspartame', level: 'moderate', why: 'Artificial sweetener; classified possibly carcinogenic (IARC 2B, 2023)' },
  e952: { name: 'Cyclamate', level: 'moderate', why: 'Artificial sweetener; banned in some countries' },
  e954: { name: 'Saccharin', level: 'moderate', why: 'Artificial sweetener; may affect gut bacteria' },
  e955: { name: 'Sucralose', level: 'moderate', why: 'Artificial sweetener; may affect gut bacteria; heat-stability concerns' },
};

// Words already recognised by name elsewhere in the analyser — used to avoid counting the same
// additive twice when a label prints both "aspartame" and "E951".
const NAME_KEYWORDS = {
  e102: 'tartrazine', e110: 'sunset yellow', e122: 'carmoisine', e124: 'ponceau', e129: 'allura',
  e211: 'sodium benzoate', e250: 'sodium nitrite', e251: 'sodium nitrate', e320: 'bha', e321: 'bht',
  e319: 'tbhq', e407: 'carrageenan', e621: 'glutamate', e950: 'acesulfame', e951: 'aspartame',
  e954: 'saccharin', e955: 'sucralose', e171: 'titanium dioxide', e310: 'propyl gallate',
};

/**
 * Find risky additives on a product: from Open Food Facts tags ("en:e330") and from
 * E-numbers printed in the ingredient text ("colour: E150d").
 * Returns [{ code, name, level, why, keyword }] without duplicates.
 */
export function findRiskyAdditives(product) {
  const codes = new Set();

  const tags = Array.isArray(product?.additives_tags) ? product.additives_tags : [];
  for (const t of tags) {
    const m = /e\s?(\d{3,4}[a-z]?)/i.exec(String(t));
    if (m) codes.add('e' + m[1].toLowerCase());
  }

  const text = String(product?.ingredients_text || '');
  const re = /\be\s?(\d{3,4})([a-z]?)\b/gi;
  let m;
  while ((m = re.exec(text))) codes.add('e' + m[1] + m[2].toLowerCase());

  const found = [];
  for (const code of codes) {
    // "e150" alone is ambiguous (plain caramel is harmless) — only the c/d variants are listed.
    const entry = ADDITIVE_RISK[code];
    if (entry) found.push({ code, ...entry, keyword: NAME_KEYWORDS[code] || entry.name.toLowerCase() });
  }
  return found;
}
