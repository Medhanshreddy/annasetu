/** Seasonal crop pack for AnnaSetu (PS 26032).
 *  History and climate scores are DEMO series for the prototype.
 *  They are not live IMD / DES official APIs.
 */
const SEASON = {
  name: "Kharif procurement",
  months: "October–December",
  windowDays: 75,
  note: "MSP sale is a 2–3 month window. The app is built for that season, not year-round mandi trade.",
};

const CROPS = [
  { id: "paddy", name: "Paddy", hi: "धान", te: "వరి", season: "Kharif", msp: 2300, unit: "q", water: "high", window: "Oct–Dec" },
  { id: "maize", name: "Maize", hi: "मक्का", te: "మొక్కజొన్న", season: "Kharif", msp: 2090, unit: "q", water: "medium", window: "Oct–Dec" },
  { id: "jowar", name: "Jowar", hi: "ज्वार", te: "జొన్న", season: "Kharif", msp: 3180, unit: "q", water: "low", window: "Oct–Dec" },
  { id: "bajra", name: "Bajra", hi: "बाजरा", te: "సజ్జ", season: "Kharif", msp: 2500, unit: "q", water: "low", window: "Oct–Nov" },
  { id: "cotton", name: "Cotton", hi: "कपास", te: "పత్తి", season: "Kharif", msp: 7121, unit: "q", water: "medium", window: "Oct–Jan" },
  { id: "redgram", name: "Redgram (Tur)", hi: "अरहर", te: "కందులు", season: "Kharif", msp: 7000, unit: "q", water: "medium", window: "Dec–Feb" },
];

/** Demo year book: rainIndex 0-100, yieldIndex 0-100, msp that year (illustrative). */
const HISTORY = {
  paddy: [
    { year: 2019, rain: 72, yield: 68, msp: 1815, note: "Normal monsoon" },
    { year: 2020, rain: 81, yield: 74, msp: 1868, note: "Good rain" },
    { year: 2021, rain: 64, yield: 61, msp: 1940, note: "Patchy rain" },
    { year: 2022, rain: 58, yield: 55, msp: 2040, note: "Late rain" },
    { year: 2023, rain: 70, yield: 69, msp: 2183, note: "Recovered" },
    { year: 2024, rain: 76, yield: 73, msp: 2300, note: "Steady" },
    { year: 2025, rain: 69, yield: 70, msp: 2300, note: "Current band" },
  ],
  maize: [
    { year: 2019, rain: 70, yield: 66, msp: 1760, note: "Average" },
    { year: 2020, rain: 78, yield: 72, msp: 1850, note: "Good year" },
    { year: 2021, rain: 60, yield: 58, msp: 1870, note: "Dry spell" },
    { year: 2022, rain: 55, yield: 52, msp: 1962, note: "Heat + late rain" },
    { year: 2023, rain: 73, yield: 70, msp: 2090, note: "Better" },
    { year: 2024, rain: 75, yield: 71, msp: 2090, note: "Stable" },
    { year: 2025, rain: 68, yield: 67, msp: 2090, note: "Current" },
  ],
  jowar: [
    { year: 2019, rain: 55, yield: 62, msp: 2550, note: "Dry crop held" },
    { year: 2020, rain: 60, yield: 65, msp: 2620, note: "OK" },
    { year: 2021, rain: 48, yield: 58, msp: 2738, note: "Low rain, crop OK" },
    { year: 2022, rain: 44, yield: 54, msp: 2970, note: "Drought year" },
    { year: 2023, rain: 58, yield: 64, msp: 3180, note: "Best recent" },
    { year: 2024, rain: 61, yield: 66, msp: 3180, note: "Good" },
    { year: 2025, rain: 57, yield: 63, msp: 3180, note: "Current" },
  ],
  bajra: [
    { year: 2019, rain: 50, yield: 60, msp: 2000, note: "Held in dry soil" },
    { year: 2020, rain: 58, yield: 64, msp: 2150, note: "OK" },
    { year: 2021, rain: 46, yield: 55, msp: 2250, note: "Tight rain" },
    { year: 2022, rain: 42, yield: 50, msp: 2350, note: "Drought" },
    { year: 2023, rain: 56, yield: 63, msp: 2500, note: "Better" },
    { year: 2024, rain: 59, yield: 65, msp: 2500, note: "Good" },
    { year: 2025, rain: 54, yield: 61, msp: 2500, note: "Current" },
  ],
  cotton: [
    { year: 2019, rain: 66, yield: 60, msp: 5550, note: "Average" },
    { year: 2020, rain: 74, yield: 67, msp: 5825, note: "Good rain" },
    { year: 2021, rain: 62, yield: 58, msp: 6025, note: "Pink bollworm year" },
    { year: 2022, rain: 57, yield: 52, msp: 6080, note: "Stress" },
    { year: 2023, rain: 68, yield: 64, msp: 6620, note: "Recovered" },
    { year: 2024, rain: 71, yield: 66, msp: 7121, note: "Strong MSP" },
    { year: 2025, rain: 65, yield: 62, msp: 7121, note: "Current" },
  ],
  redgram: [
    { year: 2019, rain: 68, yield: 58, msp: 5800, note: "Average" },
    { year: 2020, rain: 76, yield: 64, msp: 6000, note: "Good" },
    { year: 2021, rain: 61, yield: 55, msp: 6300, note: "Patchy" },
    { year: 2022, rain: 52, yield: 48, msp: 6600, note: "Poor rain" },
    { year: 2023, rain: 70, yield: 62, msp: 7000, note: "Best recent" },
    { year: 2024, rain: 73, yield: 63, msp: 7000, note: "Good" },
    { year: 2025, rain: 66, yield: 60, msp: 7000, note: "Current" },
  ],
};

function bestYear(cropId) {
  const rows = HISTORY[cropId] || HISTORY.paddy;
  return [...rows].sort((a, b) => b.yield + b.rain / 4 - (a.yield + a.rain / 4))[0];
}

function scoreCrop(cropId, rainNow = 68) {
  const c = CROPS.find((x) => x.id === cropId) || CROPS[0];
  const hist = HISTORY[cropId] || HISTORY.paddy;
  const last = hist[hist.length - 1];
  let score = 50;
  if (c.water === "high") score += rainNow >= 70 ? 18 : rainNow >= 55 ? 6 : -12;
  if (c.water === "medium") score += rainNow >= 55 ? 12 : 4;
  if (c.water === "low") score += rainNow < 55 ? 16 : 8;
  score += Math.min(15, (last.msp / 800) | 0);
  score += last.yield > 65 ? 8 : 0;
  return Math.max(8, Math.min(99, score));
}

function advise({ crop, district, lang }) {
  const rainNow = 68;
  const chosen = CROPS.find((x) => x.id === (crop || "paddy")) || CROPS[0];
  const ranked = CROPS.map((c) => ({
    ...c,
    score: scoreCrop(c.id, rainNow),
    best: bestYear(c.id),
  })).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const hist = HISTORY[chosen.id] || HISTORY.paddy;
  const text = pack(lang || "en", {
    chosen,
    top,
    district: district || "Rangareddy",
    rainNow,
    hist,
  });
  return {
    demo: true,
    source: "Prototype rule engine + demo year book (not live IMD)",
    season: SEASON,
    crop: chosen,
    rainIndex: rainNow,
    ranked,
    history: hist,
    bestYear: bestYear(chosen.id),
    text,
  };
}

function pack(lang, { chosen, top, district, rainNow, hist }) {
  const en = [
    `Season is ${SEASON.name} (${SEASON.months}). Sale window is about ${SEASON.windowDays} days.`,
    `You selected ${chosen.name}. MSP shown in-app is ₹${chosen.msp}/q (demo band).`,
    `Rain index now: ${rainNow}/100 (demo). ${chosen.name} is a ${chosen.water}-water crop.`,
    `Best recent year for ${chosen.name} in this book: ${bestYear(chosen.id).year} (yield ${bestYear(chosen.id).yield}, rain ${bestYear(chosen.id).rain}).`,
    `Advisor rank for ${district} this season: ${top.name} (score ${top.score}). This is a guide, not an order to change crop mid-season.`,
    `If you already grew ${chosen.name}, book the PPC in the ${chosen.window} window. Do not wait till the last week.`,
  ];
  const hi = [
    `मौसम: ${SEASON.name} (${SEASON.months})। बिक्री लगभग ${SEASON.windowDays} दिन।`,
    `आपने ${chosen.hi} चुना। MSP ₹${chosen.msp}/क्विंटल (डेमो)।`,
    `वर्षा सूचकांक ${rainNow}/100। यह फसल पानी-${chosen.water} है।`,
    `${chosen.hi} का बेहतर वर्ष: ${bestYear(chosen.id).year}।`,
    `${district} में इस सीजन सलाह: ${top.hi} (अंक ${top.score})। यह आदेश नहीं, संकेत है।`,
    `PPC स्लॉट ${chosen.window} में बुक करें।`,
  ];
  const te = [
    `సీజన్: ${SEASON.name} (${SEASON.months}). అమ్మకం సుమారు ${SEASON.windowDays} రోజులు.`,
    `మీరు ${chosen.te} ఎంచుకున్నారు. MSP ₹${chosen.msp}/క్వింటాల్ (డెమో).`,
    `వర్ష సూచి ${rainNow}/100. ఈ పంట నీరు-${chosen.water}.`,
    `${chosen.te} కి మంచి సంవత్సరం: ${bestYear(chosen.id).year}.`,
    `${district} లో ఈ సీజన్ సూచన: ${top.te} (స్కోరు ${top.score}). ఇది ఆదేశం కాదు.`,
    `PPC స్లాట్ ${chosen.window} లో బుక్ చేయండి.`,
  ];
  if (lang === "hi") return hi;
  if (lang === "te") return te;
  return en;
}

function statsFromDb(db) {
  const byCrop = {};
  try {
    const rows = db.prepare("SELECT crop, COUNT(*) AS n FROM users WHERE role='farmer' GROUP BY crop").all();
    rows.forEach((r) => { byCrop[r.crop || "Paddy"] = r.n; });
  } catch {}
  let booked = [];
  try {
    booked = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status!='cancelled'").all();
  } catch {}
  return {
    season: SEASON,
    crops: CROPS,
    farmersByCrop: byCrop,
    bookings: booked[0]?.n || 0,
    history: HISTORY,
    disclaimer: "Year book is a prototype series for the pitch. Plug DES / IMD later.",
  };
}

module.exports = { SEASON, CROPS, HISTORY, advise, statsFromDb, bestYear, scoreCrop };
