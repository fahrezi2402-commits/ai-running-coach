const OFF_DAY_TYPES = new Set(["Rest", "Strength", "Cross-training"]);

export const BODYWEIGHT_WORKOUT = {
  equipment: "Tanpa alat dan tanpa beban",
  warmup: [
    { name: "Cat-cow dilanjutkan thoracic thread-the-needle", duration: "8 repetisi per sisi" },
    { name: "World's greatest stretch", duration: "6 repetisi per sisi" },
    { name: "Leg swings depan-belakang dan ke samping", duration: "15 ayunan tiap arah per kaki" },
    { name: "Inchworm ke push-up lalu downward-dog push", duration: "8 repetisi; modifikasi dengan lutut menapak" },
    { name: "A/B skips atau marching A-skip", duration: "30 detik; marching jadi pilihan low-impact" },
    { name: "Fast feet atau langkah cepat di tempat", duration: "30 detik; pilih langkah tanpa lompatan" },
    { name: "Wall slides", duration: "8–10 repetisi; gerakkan lengan di dinding tanpa menarik/menahan tubuh" },
    { name: "Gerak dinamis ringan", duration: "lanjutkan sampai total pemanasan 12–15 menit" },
  ],
  blocks: [
    {
      name: "A · Kaki dan gerak dinamis",
      movements: [
        {
          name: "Calf raise pelan",
          illustration: "calfRaise",
          prescription: "1–2 putaran × 12–15 repetisi",
          steps: [
            "Berdiri dengan kaki selebar pinggul dan jari kaki menghadap ke depan.",
            "Angkat tumit perlahan, tahan sejenak, lalu turunkan dengan kendali.",
            "Jaga badan tegak dan gerak dalam rentang yang nyaman.",
          ],
          easier: "Kurangi tinggi angkatan dan lakukan 8–10 repetisi.",
          advanced: "Pogo jumps selama 45 detik adalah pilihan dampak tinggi tingkat lanjut saja, bukan gerakan default; tetap gunakan calf raise bila ragu atau belum terbiasa.",
        },
        {
          name: "Bodyweight squat pelan",
          illustration: "squat",
          prescription: "1–2 putaran × 8–12 repetisi",
          steps: [
            "Berdiri dengan kaki selebar bahu dan ujung kaki sedikit mengarah keluar.",
            "Dorong pinggul ke belakang, tekuk lutut, dan turun sejauh tetap nyaman dengan telapak kaki menapak.",
            "Jaga lutut searah ujung kaki lalu berdiri kembali dengan terkendali.",
          ],
          easier: "Kurangi kedalaman dan lakukan 6–8 repetisi.",
          advanced: "Depth-jump-to-jump-squat 12 repetisi merupakan opsi eksplosif tingkat lanjut, bukan default hari libur; jika ingin low-impact, tetap pilih squat pelan tanpa lompatan.",
        },
        {
          name: "Reverse lunge atau split squat statis",
          illustration: "lunge",
          prescription: "1–2 putaran × 8–10 repetisi per kaki",
          steps: [
            "Pilih langkah mundur atau posisi split stance diam dengan kedua kaki tetap di lantai.",
            "Tekuk lutut sedikit, jaga badan stabil dan lutut depan searah jari kaki.",
            "Dorong melalui kaki depan untuk kembali tegak; selesaikan satu sisi lalu ganti.",
          ],
          easier: "Pilih langkah lebih pendek, tekukan dangkal, atau 6 repetisi per sisi.",
          advanced: "Tingkatkan rentang gerak atau coba single-leg squat dangkal tanpa alat hanya bila gerak dasar terasa stabil. Bulgarian split squat dengan kaki belakang di kursi tidak digunakan.",
        },
        {
          name: "Single-leg RDL reach",
          illustration: "singleRdl",
          prescription: "1–2 putaran × 8–10 repetisi per kaki",
          steps: [
            "Berdiri pada satu kaki dengan lutut sedikit lunak.",
            "Dorong pinggul ke belakang sambil condongkan badan dan jangkau tangan ke arah lantai; kaki bebas bergerak ke belakang untuk keseimbangan.",
            "Kembali tegak dengan menekan telapak kaki yang menapak, lalu ulangi dan ganti sisi.",
          ],
          easier: "Sentuhkan ujung kaki bebas ke lantai sebagai penyangga keseimbangan.",
        },
      ],
    },
    {
      name: "B · Glutes, punggung, dada, bahu, dan lengan",
      movements: [
        {
          name: "Single-leg glute bridge",
          illustration: "singleBridge",
          prescription: "1–2 putaran × 8–12 repetisi per kaki; tahan 2–3 detik",
          steps: [
            "Berbaring telentang, satu lutut ditekuk dengan telapak kaki menapak dan kaki lain diangkat nyaman.",
            "Tekan tumit dan kencangkan glutes untuk mengangkat pinggul tanpa memutar panggul.",
            "Tahan 2–3 detik, turunkan perlahan, lalu ganti kaki.",
          ],
          easier: "Letakkan kedua telapak kaki di lantai dan lakukan glute bridge dua kaki.",
        },
        {
          name: "Pike push-up",
          illustration: "pike",
          prescription: "1–2 putaran × 6–10 repetisi",
          steps: [
            "Mulai bertumpu pada tangan dan kaki, lalu angkat pinggul membentuk V terbalik.",
            "Tekuk siku dan turunkan kepala ke arah lantai di antara tangan tanpa menekuk leher.",
            "Dorong lantai untuk kembali ke awal dengan gerakan terkendali.",
          ],
          easier: "Tahan posisi V terbalik 10–20 detik atau lakukan pike push-up dengan lutut sedikit ditekuk.",
          advanced: "Pike push-up dengan kaki ditinggikan pada kursi tidak digunakan; tetap lakukan versi lantai tanpa alat.",
        },
        {
          name: "Push-up standar atau knee push-up",
          illustration: "pushup",
          prescription: "1–2 putaran × 8–12 repetisi",
          steps: [
            "Mulai bertumpu pada tangan dan ujung kaki, atau lutut untuk versi lebih ringan.",
            "Jaga badan sejajar dari kepala ke tumit atau lutut, lalu tekuk siku untuk menurunkan dada sejauh nyaman.",
            "Dorong lantai sampai lengan kembali lurus tanpa mengunci siku.",
          ],
          easier: "Pilih knee push-up dengan rentang gerak kecil dan 5–8 repetisi.",
          advanced: "Archer push-up 6–8 per sisi adalah variasi tingkat lanjut; gunakan push-up standar atau lutut sebagai pilihan dasar.",
        },
        {
          name: "Prone Y-T-W-I raises",
          illustration: "ytwi",
          prescription: "1–2 putaran × 6 siklus; tahan tiap bentuk 2 detik",
          steps: [
            "Berbaring tengkurap dengan dahi menghadap lantai; bentuk lengan berurutan seperti Y, T, W, lalu I.",
            "Angkat lengan sedikit, jaga bahu jauh dari telinga dan leher tetap netral.",
            "Tahan tiap bentuk 2 detik dan turunkan lengan sebelum pindah ke bentuk berikutnya.",
          ],
          easier: "Kurangi tinggi angkatan atau lakukan satu bentuk lengan pada satu waktu.",
          advanced: "Gerakan ini menggantikan pola row tanpa beban; jangan gunakan doorframe/table row, scapular pull-up, atau furnitur sebagai anchor.",
        },
        {
          name: "Prone reverse snow angels",
          illustration: "snowAngel",
          prescription: "1–2 putaran × 8–10 repetisi",
          steps: [
            "Berbaring tengkurap dengan dahi menghadap lantai dan lengan di samping tubuh.",
            "Angkat tangan sedikit dan gerakkan lengan perlahan membentuk lengkung ke arah atas kepala.",
            "Kembalikan lengan ke sisi tubuh tanpa mengangkat bahu atau melengkungkan punggung.",
          ],
          easier: "Jaga tangan menyentuh lantai dan gunakan lintasan gerak yang lebih pendek.",
        },
      ],
    },
    {
      name: "C · Core dan stabilitas",
      movements: [
        {
          name: "Side plank",
          illustration: "sidePlank",
          prescription: "1–2 putaran × 15–30 detik per sisi",
          steps: [
            "Berbaring miring dan letakkan siku di bawah bahu.",
            "Angkat pinggul sehingga badan membentuk garis nyaman; jaga leher netral.",
            "Bernapas teratur lalu turunkan pinggul dengan kendali dan ganti sisi.",
          ],
          easier: "Tekuk lutut dan lakukan side plank dari lutut selama 10–20 detik.",
          advanced: "Ini variasi stabilitas tanpa anchor sebagai pengganti Pallof hold; jangan menarik atau menahan doorframe.",
        },
        {
          name: "Dead bug",
          illustration: "deadBug",
          prescription: "1–2 putaran × 8 repetisi per sisi (16 total)",
          steps: [
            "Berbaring telentang dengan lutut di atas pinggul dan tangan mengarah ke atas.",
            "Kencangkan perut ringan; turunkan satu tumit dan lengan berlawanan secara perlahan.",
            "Kembali ke tengah tanpa membuat punggung bawah semakin melengkung, lalu ganti sisi.",
          ],
          easier: "Gerakkan satu kaki saja atau kurangi jarak gerak.",
        },
        {
          name: "Mountain climber terkendali",
          illustration: "mountain",
          prescription: "1–2 putaran × maksimal 60 detik sesuai kemampuan",
          steps: [
            "Mulai dari plank tinggi dengan tangan di bawah bahu dan badan stabil.",
            "Bawa lutut bergantian ke arah dada, perlahan atau cepat sesuai kendali.",
            "Jaga pinggul tetap stabil; berhenti atau beralih ke marching jika bentuk tubuh berubah.",
          ],
          easier: "Pilih mountain climber pelan selama 20–30 detik atau marching berdiri low-impact.",
          advanced: "Hindari menjadikan tempo intensitas tinggi sebagai default pada hari libur; tak perlu mengejar kelelahan.",
        },
      ],
    },
  ],
  cooldown: [
    { name: "Hip flexor stretch / kneeling lunge stretch", duration: "60–90 detik per sisi, rentang nyaman" },
    { name: "Hamstring stretch", duration: "60 detik per sisi, tanpa memantul" },
    { name: "Calf stretch", duration: "45–60 detik per sisi, tanpa memantul" },
    { name: "Figure-4 atau pigeon pose", duration: "90 detik per sisi; pilih posisi telentang bila lebih nyaman" },
    { name: "Child's pose dengan jangkauan samping", duration: "90 detik total, bergerak lembut ke kiri dan kanan" },
    { name: "Jalan pelan dan atur napas", duration: "2–3 menit" },
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
