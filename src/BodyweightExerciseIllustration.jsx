const line = { fill: "none", stroke: "#6ee7b7", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" };
const floor = <path d="M12 88H168" stroke="#475569" strokeWidth="2" />;

function Head({ x, y }) {
  return <circle cx={x} cy={y} r="7" fill="#cbd5e1" />;
}

function ExerciseDrawing({ type }) {
  switch (type) {
    case "squat":
      return (
        <>
          <Head x="83" y="20" />
          <path d="M83 28v22m0-14L67 45m16-9 16 9m-16-1-15 9-10 18m25-27 14 9 9 18" {...line} />
          <path d="M125 27v18m0-10-12 9m12-9 12 9m-12-8-11 9-10 6 10 5m11-20 11 9 10 6-10 5" {...line} />
        </>
      );
    case "lunge":
      return (
        <>
          <Head x="82" y="18" />
          <path d="M82 26v28m0-18-17 13m17-13 18 13m-18 5-10 20-21 4m31-24 13 13 23 1" {...line} />
        </>
      );
    case "lateral":
      return (
        <>
          <Head x="76" y="20" />
          <path d="M76 28v25m0-17-16 13m16-13 17 10m-17 7-10 18-20 4m30-22 14 9 20 1m16-29v18m0-10-10 8m10-8 10 8" {...line} />
          <path d="M35 81h18m53 0h18" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "singleBridge":
      return (
        <>
          <Head x="36" y="68" />
          <path d="M44 68 69 67l25-20 23 18 18 1m-66 1-7 12m55-15 6 15m19-14 6 14m-44-35 2-17 13-12" {...line} />
        </>
      );
    case "ytw":
      return (
        <>
          <Head x="90" y="57" />
          <path d="M83 61 53 36m37 21 30-21m-30 21-35 0m35 0 35 0m-35 0-19 20m19-20 19 20" {...line} />
        </>
      );
    case "pike":
      return (
        <>
          <Head x="36" y="70" />
          <path d="M44 68 71 60l21-27 21 26 26 9m-70-16-14-14m42-5 14-13m13 40-3 15m-43-14-5 14" {...line} />
        </>
      );
    case "pushup":
      return (
        <>
          <Head x="39" y="50" />
          <path d="M47 54 94 61l34 4m-78-11 16 13m30-6 7 19m25-14 3 14m-72-13-5 13m72-13 12 13" {...line} />
        </>
      );
    case "snowAngel":
      return (
        <>
          <Head x="90" y="58" />
          <path d="M82 62 55 42m35 16 28-16m-28 16-33 0m33 0 33 0m-60 3-13 14m73-14 13 14" {...line} />
        </>
      );
    case "mountain":
      return (
        <>
          <Head x="34" y="49" />
          <path d="M42 51 84 54l42 3m-84-6 13 14m29-11 3 17m39-14 3 14m-72-6-4 9m77-3 3 3m-61-22 18 10 11-13" {...line} />
        </>
      );
    case "hollow":
      return (
        <>
          <Head x="43" y="61" />
          <path d="M51 62q33-25 64-5m-64 5-17-18m17 18-13 18m60-23 21 8 15 13m-36-17 5 19m-24-15-9 14" {...line} />
        </>
      );
    default:
      return null;
  }
}

export default function BodyweightExerciseIllustration({ type, label }) {
  return (
    <svg
      viewBox="0 0 180 100"
      role="img"
      aria-label={`Ilustrasi posisi ${label}`}
      className="h-24 w-full rounded-lg border border-slate-800 bg-slate-900/80"
    >
      {floor}
      <ExerciseDrawing type={type} />
    </svg>
  );
}
