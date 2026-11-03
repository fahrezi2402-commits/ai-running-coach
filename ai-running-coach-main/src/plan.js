import { suggestedQualityPaceForWeek } from "./paceProgression.js";

export const PLAN_START = new Date(2026, 10, 9); // Senin, 9 November 2026
export const TOTAL_WEEKS = 157; // minggu 156 = minggu lomba (Minggu 4 Nov 2029), 157 = pemulihan
export const EASY_PACE_MIN = 6.5; // lebih cepat dari ini dianggap terlalu cepat untuk lari mudah
export const EASY_PACE_MAX = 8.5; // sementara; sesuaikan setelah tes 5K (Jan 2027)
export const BLOCK_START_WEEK = 139; // Senin 2 Juli 2029

export const PHASES = [
  { id: 1, start: 1, end: 25, name: "Fase 1: Turun Berat Badan", focus: "3 lari, 1 jalan, 2 beban. Defisit kalori sedang, tes 5K (Jan) dan 10K santai (Apr 2027)." },
  { id: 2, start: 26, end: 60, name: "Fase 2: Basis Aerobik", focus: "4 lari per minggu, 28 sampai 42 km. Half marathon pertama (Nov 2027)." },
  { id: 3, start: 61, end: 112, name: "Fase 3: Daya Tahan", focus: "4-5 lari, 36 sampai 50 km. Half marathon bertarget waktu dan lari uji 28-30 km." },
  { id: 4, start: 113, end: 138, name: "Fase 4: Konsolidasi", focus: "Pertahankan 36-48 km, stabilkan berat 70-74 kg, half marathon uji pace." },
  { id: 5, start: 139, end: 155, name: "Blok Maraton 18 Minggu", focus: "Puncak 60 km/minggu, lari panjang maksimal 32 km, latihan pace maraton dan nutrisi." },
  { id: 6, start: 156, end: 156, name: "Minggu Lomba", focus: "Taper selesai. Jalankan lomba dengan sabar dan strategi nutrisi yang sudah dilatih." },
  { id: 7, start: 157, end: 157, name: "Pemulihan Pasca-Maraton", focus: "Pulihkan tubuh. Tidak ada tekanan untuk segera berlatih terstruktur." },
];

// Minggu 1-12: [catatan Selasa, km Selasa, km Jumat, km/lari Sabtu, total]
const W12 = [
  ["5 km mudah + 4 × 20 dtk langkah cepat", 5, 5, 7, 17], ["5 km mudah + 6 × 20 dtk langkah cepat", 5, 5, 8, 18],
  ["Tempo 2 × 8 mnt (RPE 7), jeda jog 3 mnt", 6, 5, 9, 20], ["5 km mudah (pemulihan)", 5, 4, 6, 15],
  ["Tempo 2 × 10 mnt (RPE 7)", 6, 5, 10, 21], ["Interval 5 × 2 mnt (RPE 8), jeda jog 2 mnt", 6, 5, 11, 22],
  ["Tempo 3 × 8 mnt (RPE 7)", 7, 5, 11, 23], ["5 km mudah (pemulihan)", 5, 4, 8, 17],
  ["Interval 6 × 2 mnt (RPE 8)", 7, 6, 12, 25], ["Tempo 20 menit menerus (RPE 7)", 7, 5, 13, 25],
  ["Interval 5 × 3 mnt (RPE 8)", 7, 6, 14, 27], ["5 km mudah (pemulihan)", 5, 4, 5, 16],
];
// Blok maraton, minggu 139-156: [total, lari panjang, catatan]
const BLK = [
  [40, 18, ""], [43, 20, ""], [46, 22, ""], [36, 16, "Pemulihan"], [48, 24, ""], [51, 26, ""], [54, 28, ""], [42, 18, "Pemulihan"],
  [56, 30, "Lari panjang 30 km."], [58, 24, "Sertakan 10 km di pace maraton."], [60, 32, "Lari panjang 32 km."], [46, 18, "Pemulihan"],
  [58, 26, "Sertakan 12-14 km di pace maraton."], [60, 32, "Puncak: latihan nutrisi lomba penuh."], [52, 24, "Sertakan 8 km di pace maraton."],
  [44, 18, "Taper 1."], [34, 14, "Taper 2."], [48, 0, "Minggu lomba."],
];

export const round1 = (v) => Math.round(v * 10) / 10;
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const fmtPace = (m) => { const s = Math.round(m * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

export function phaseForWeek(week) {
  return PHASES.find((p) => week >= p.start && week <= p.end) || PHASES[0];
}

function trendVolume(w) {
  if (w <= 12) return W12[w - 1][4];
  if (w >= 139 && w <= 156) return BLK[w - 139][0];
  if (w >= 157) return 0;
  if (w <= 25) return lerp(24, 30, (w - 13) / 12);
  if (w <= 60) return lerp(28, 42, (w - 26) / 34);
  if (w <= 101) return lerp(36, 50, (w - 61) / 40);
  if (w <= 112) return lerp(44, 38, (w - 102) / 10);
  return lerp(38, 48, (w - 113) / 25);
}

export function qualityNoteForWeek(week, phase, goalPace) {
  if (week <= 12) return `${W12[week - 1][0]}. Pemanasan 5-8 menit dan pendinginan 5 menit.`;
  if (week === 156) return "Minggu lomba: lari mudah singkat, karbohidrat cukup, tidak ada hal baru.";
  if (week >= 157) return "Pemulihan: jalan santai dan mobilitas bila nyaman.";
  if (week % 4 === 0 && week < 139) return "Minggu pemulihan: semua sesi mudah, volume turun sekitar 20%.";
  const base = {
    1: "Tempo 15-20 menit (RPE 7) atau interval 5-6 × 2-3 menit (RPE 8), gantian tiap minggu.",
    2: "Tempo 20-25 menit atau interval 6 × 3 menit; sisanya lari mudah.",
    3: "Tempo 25-30 menit, atau 3 × 10 menit di RPE 7 dengan jeda jog.",
    4: "Tempo 20-25 menit dan langkah cepat; jaga berat dan pola tidur stabil.",
    5: BLK[Math.max(0, week - 139)][2] || "Tempo atau interval sedang; fokus pada pola makan lomba.",
  }[phase.id] || "Lari mudah.";
  const sp = suggestedQualityPaceForWeek(week, goalPace);
  return sp === null ? base : `${base} Saran segmen pace maraton: ${fmtPace(sp)} min/km bila segar dan bebas nyeri.`;
}

export function createTrainingPlan() {
  const weeks = [];
  let prev = 17;
  for (let w = 1; w <= TOTAL_WEEKS; w += 1) {
    let vol = trendVolume(w);
    if (w > 12 && w < 139) vol = w % 4 === 0 ? Math.min(vol, prev * 0.82) : Math.min(vol, prev * 1.1);
    if (w > 12 && w < 139 && w % 4 !== 0) prev = vol;
    else if (w <= 12 && w % 4 !== 0) prev = vol;
    const start = new Date(PLAN_START); start.setDate(start.getDate() + (w - 1) * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const phase = phaseForWeek(w);
    weeks.push({
      week: w, start, end, phase: phase.name, phaseId: phase.id, targetVolume: round1(vol),
      easyPaceMin: EASY_PACE_MIN, easyPaceMax: EASY_PACE_MAX,
      fixed: w <= 12 ? W12[w - 1] : null, longRun: w >= 139 && w <= 155 ? BLK[w - 139][1] : null,
      qualityNote: qualityNoteForWeek(w, phase, 7.25),
    });
  }
  return weeks;
}
export const TRAINING_PLAN = createTrainingPlan();

function runKm(day, row) {
  if (row.fixed) return { 2: row.fixed[1], 5: row.fixed[2], 6: row.fixed[3] }[day] || 0;
  const v = row.targetVolume;
  if (row.longRun) { const rest = v - row.longRun; return round1({ 2: rest * 0.3, 3: rest * 0.4, 5: rest * 0.3, 6: row.longRun }[day] || 0); }
  const sh = row.phaseId === 1 ? { 2: 0.3, 5: 0.25, 6: 0.45 } : { 2: 0.22, 3: 0.2, 5: 0.18, 6: 0.4 };
  return round1(v * (sh[day] || 0));
}

export function getWorkoutForDate(date, row, lockReason = "", goalPace) {
  if (lockReason) return { title: "Istirahat / Pemulihan (terkunci)", type: "Recovery", distance: 0, note: lockReason, locked: true };
  const d = date.getDay(), W = row.week, mk = (title, type, distance, note) => ({ title, type, distance, note, locked: false });
  if (W >= 157) return mk("Pemulihan pasca-maraton", "Recovery", 0, "Tidak ada target lari. Jalan santai dan mobilitas bila nyaman; mulai berlari lagi setelah gerak harian terasa normal.");
  if (W === 156) {
    if (d === 0) return mk("Hari lomba: marathon 42,2 km", "Race", 42.2, "Mulai lebih lambat dari target, karbohidrat sekitar 60 g per jam, minum sesuai cuaca. Jalan di pos air bila perlu.");
    if (d === 2) return mk("Lari mudah singkat + langkah cepat", "Shakeout", 6, "Mudah saja, 4 × 20 detik langkah cepat. Berhenti saat masih segar.");
    if (d === 4) return mk("Lari mudah singkat", "Shakeout", 4, "Sangat mudah. Siapkan perlengkapan lomba dan makanan yang sudah biasa.");
    return mk("Istirahat", "Rest", 0, "Istirahat, makan makanan yang biasa, cukup minum, dan siapkan logistik lomba.");
  }
  const block = row.phaseId === 5, p1 = row.phaseId === 1;
  if (d === 1) return mk(block ? "Kekuatan pemeliharaan" : "Kekuatan A", "Strength", 0, block ? "2 set per gerakan, fokus menjaga kekuatan." : "Push-up, row (band atau inverted), pike push-up, dead bug, plank, reverse snow angel. 3 set, sisakan 2-3 repetisi, buang napas saat mengerahkan tenaga.");
  if (d === 4) return mk(block ? "Kekuatan ringan" : "Kekuatan B", "Strength", 0, block ? "Mobilitas dan pola B ringan, 2 set, tidak sampai gagal." : "Split squat, single-leg RDL, glute bridge, step-up, calf raise, hamstring slider, side plank. Jangan sampai gagal.");
  if (d === 0) return mk("Istirahat penuh", "Rest", 0, "Istirahat atau jalan santai 30-40 menit. Tidur 7-9 jam; tidak perlu mengganti sesi yang terlewat.");
  if (d === 2) return mk(W === 12 ? "Lari mudah pemulihan" : "Lari kualitas", W % 4 === 0 && W <= 12 ? "Easy" : "Quality", runKm(2, row), qualityNoteForWeek(W, phaseForWeek(W), goalPace));
  if (d === 3) return p1 ? mk("Jalan 5-7 km", "Cross-training", 0, "Tempo cepat tapi nyaman, RPE 3-5, masih bisa mengobrol (sekitar 50-70 menit).") : mk(block ? "Lari menengah" : "Lari mudah", "Easy", runKm(3, row), "RPE 4-5, masih bisa bicara kalimat utuh. Pemanasan dan pendinginan jalan 5 menit.");
  if (d === 5) return mk("Lari mudah", "Easy", runKm(5, row), "RPE 4-5. Boleh diganti jalan 5-7 km bila terasa lelah. Jangan menambah jarak untuk mengejar sesi yang terlewat.");
  if (W === 12) return mk("Tes 5K", "Quality", 7, "Pemanasan 2 km, lari 5 km dengan usaha terbaik yang terkontrol, lalu pendinginan. Catat waktunya untuk menetapkan pace latihan.");
  return mk("Lari panjang", "Long easy", runKm(6, row), `RPE 4-5. Latih asupan karbohidrat 30-60 g per jam bila di atas 75 menit.${row.longRun && BLK[W - 139][2] ? " " + BLK[W - 139][2] : ""}`);
}
