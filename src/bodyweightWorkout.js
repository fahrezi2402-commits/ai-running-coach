const OFF_DAY_TYPES = new Set(["Rest", "Strength", "Cross-training"]);

export const BODYWEIGHT_WORKOUT = {
  equipment: "Tanpa alat dan tanpa beban",
  warmup: [
    { name: "Cat-cow", duration: "10 repetisi perlahan" },
    { name: "World's greatest stretch", duration: "5 repetisi tiap sisi, tanpa memaksa rentang gerak" },
    { name: "Leg swings depan-belakang dan ke samping", duration: "10–15 ayunan tiap arah per kaki" },
    { name: "High knees atau marching di tempat", duration: "30 detik; pilih marching low-impact bila perlu" },
    { name: "Butt kicks atau langkah tumit ke belakang", duration: "30 detik; pilih langkah low-impact bila perlu" },
    { name: "Gerak dinamis ringan", duration: "lanjutkan sampai total pemanasan 7–10 menit" },
  ],
  movements: [
    {
      category: "Kaki & otot bawah",
      name: "Squat tanpa lompatan",
      illustration: "squat",
      prescription: "2–3 putaran × 12–15 repetisi",
      steps: [
        "Berdiri dengan kaki selebar bahu, ujung kaki sedikit mengarah keluar.",
        "Dorong pinggul ke belakang dan tekuk lutut; turun hanya sejauh tetap nyaman, dengan telapak kaki menapak.",
        "Jaga lutut searah ujung kaki dan berdiri kembali dengan terkendali.",
      ],
      easier: "Kurangi kedalaman dan lakukan 8–10 repetisi; tidak perlu melompat.",
    },
    {
      category: "Kaki & otot bawah",
      name: "Reverse lunge",
      illustration: "lunge",
      prescription: "2–3 putaran × 8–10 repetisi per kaki",
      steps: [
        "Berdiri tegak, langkahkan satu kaki ke belakang dengan jarak yang nyaman.",
        "Tekuk kedua lutut sedikit sambil menjaga badan stabil dan lutut depan searah jari kaki.",
        "Dorong melalui kaki depan untuk kembali berdiri, lalu ganti sisi.",
      ],
      easier: "Gunakan langkah pendek dan tekukan dangkal; bila perlu lakukan split squat dangkal tanpa langkah.",
    },
    {
      category: "Kaki & otot bawah",
      name: "Lateral step",
      illustration: "lateral",
      prescription: "2–3 putaran × 8–10 langkah per sisi",
      steps: [
        "Berdiri dengan lutut sedikit lunak dan kaki selebar pinggul.",
        "Langkahkan satu kaki ke samping, lalu ikuti dengan kaki lainnya tanpa menyilangkan kaki.",
        "Jaga langkah kecil dan terkendali, lalu ulangi ke arah sebaliknya.",
      ],
      easier: "Perkecil langkah dan lakukan perlahan; tidak perlu melompat atau melakukan bounding.",
    },
    {
      category: "Glutes & punggung",
      name: "Single-leg glute bridge",
      illustration: "singleBridge",
      prescription: "2–3 putaran × 8–12 repetisi per kaki",
      steps: [
        "Berbaring telentang, satu lutut ditekuk dengan telapak kaki menapak; kaki lainnya terangkat nyaman.",
        "Tekan tumit kaki yang menapak dan kencangkan glutes untuk mengangkat pinggul tanpa memutar panggul.",
        "Turunkan perlahan, selesaikan repetisi, lalu ganti sisi.",
      ],
      easier: "Letakkan kedua telapak kaki di lantai dan lakukan glute bridge dua kaki.",
    },
    {
      category: "Glutes & punggung",
      name: "Prone Y-T-W raises",
      illustration: "ytw",
      prescription: "2–3 putaran × 8–10 siklus; tahan tiap bentuk 2 detik",
      steps: [
        "Berbaring tengkurap dengan dahi menghadap lantai; satu siklus adalah bentuk Y, lalu T, lalu W.",
        "Angkat lengan sedikit untuk tiap bentuk, ibu jari menghadap ke atas dan bahu jauh dari telinga.",
        "Tahan tiap bentuk 2 detik lalu turunkan dengan terkendali; leher tetap netral.",
      ],
      easier: "Kurangi tinggi angkatan atau gerakkan satu bentuk saja pada satu waktu.",
    },
    {
      category: "Dada, bahu & lengan",
      name: "Pike push-up",
      illustration: "pike",
      prescription: "2–3 putaran × 6–10 repetisi",
      steps: [
        "Mulai bertumpu pada tangan dan kaki, lalu angkat pinggul membentuk V terbalik.",
        "Tekuk siku dan turunkan kepala ke arah lantai di antara tangan tanpa menekuk leher.",
        "Dorong lantai untuk kembali; jaga gerak kecil dan terkendali.",
      ],
      easier: "Tahan posisi V terbalik 10–20 detik tanpa menekuk siku.",
    },
    {
      category: "Dada, bahu & lengan",
      name: "Push-up standar atau tangan rapat",
      illustration: "pushup",
      prescription: "2–3 putaran × 8–12 repetisi",
      steps: [
        "Mulai bertumpu pada tangan dan ujung kaki; letakkan tangan selebar bahu atau sedikit lebih rapat.",
        "Jaga badan lurus dari kepala sampai tumit, lalu tekuk siku untuk menurunkan dada sejauh nyaman.",
        "Dorong lantai untuk kembali ke awal tanpa mengunci siku.",
      ],
      easier: "Lakukan knee push-up dengan tangan selebar bahu dan kurangi rentang gerak bila perlu.",
    },
    {
      category: "Dada, bahu & lengan",
      name: "Prone reverse snow angels",
      illustration: "snowAngel",
      prescription: "2–3 putaran × 8–12 repetisi",
      steps: [
        "Berbaring tengkurap dengan dahi menghadap lantai dan lengan di samping tubuh.",
        "Angkat tangan sedikit dari lantai lalu geser lengan perlahan membentuk lengkung ke arah atas kepala.",
        "Kembalikan lengan ke sisi tubuh tanpa mengangkat bahu atau melengkungkan punggung.",
      ],
      easier: "Jaga tangan menyentuh lantai dan lakukan gerakan lebih pendek. Ini latihan postur tanpa tarikan; bukan pengganti gerakan row berbeban.",
    },
    {
      category: "Core & stabilitas",
      name: "Mountain climber perlahan",
      illustration: "mountain",
      prescription: "2–3 putaran × 20–30 detik",
      steps: [
        "Mulai dari posisi plank tinggi dengan tangan di bawah bahu dan badan stabil.",
        "Bawa satu lutut ke arah dada, kembalikan kaki, lalu bergantian sisi dengan tempo terkendali.",
        "Jaga pinggul tidak bergoyang dan berhenti jika bentuk tubuh mulai berubah.",
      ],
      easier: "Dari posisi berdiri, lakukan marching dengan mengangkat lutut bergantian.",
    },
    {
      category: "Core & stabilitas",
      name: "Hollow body hold",
      illustration: "hollow",
      prescription: "2–3 putaran × 15–30 detik",
      steps: [
        "Berbaring telentang, tekuk lutut dan letakkan lengan di samping tubuh.",
        "Kencangkan perut ringan dan jaga punggung bawah nyaman menempel ke lantai.",
        "Angkat kepala dan bahu sedikit; tahan sambil bernapas, lalu rileks perlahan.",
      ],
      easier: "Pertahankan kaki menapak di lantai dan angkat kepala/bahu hanya jika nyaman.",
    },
  ],
  cooldown: [
    { name: "Hip flexor stretch / kneeling lunge stretch", duration: "45 detik per sisi, rentang nyaman" },
    { name: "Hamstring stretch", duration: "45 detik per sisi, tanpa memantul" },
    { name: "Calf stretch", duration: "45 detik per sisi, tanpa memantul" },
    { name: "Pigeon pose", duration: "45 detik per sisi; ganti dengan posisi telentang nyaman bila pinggul tidak nyaman" },
    { name: "Child's pose", duration: "1 menit atau lebih singkat bila terasa tidak nyaman" },
  ],
};

export function isBodyweightWorkoutAvailable(entry) {
  return Boolean(
    entry
    && entry.week < 150
    && entry.workout
    && !entry.workout.locked
    && entry.workout.distance === 0
    && OFF_DAY_TYPES.has(entry.workout.type),
  );
}
