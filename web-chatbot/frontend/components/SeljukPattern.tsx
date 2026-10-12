"use client";


function starPoints(cx: number, cy: number, outerR: number, innerR: number) {
  const points: string[] = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function SeljukStarIcon({
  size = 24,
  className = "",
  strokeWidth = 1.4,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <polygon
        points={starPoints(30, 30, 26, 11)}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="30" cy="30" r="4.5" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

export function SeljukPatternBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id="seljuk-tile"
          width="72"
          height="72"
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0,0)"
        >
          <polygon
            points={starPoints(36, 36, 26, 11)}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#seljuk-tile)" />
    </svg>
  );
}

export function SeljukDivider({ className = "" }: { className?: string }) {
  const tileCount = 24;
  return (
    <svg
      viewBox={`0 0 ${tileCount * 30} 30`}
      width="100%"
      height="14"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {Array.from({ length: tileCount }).map((_, i) => (
        <polygon
          key={i}
          points={starPoints(15 + i * 30, 15, 13, 5.5)}
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
        />
      ))}
    </svg>
  );
}

export function SeljukEagleIcon({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/seljuk-eagle.png"
      alt="Selçuklu Çift Başlı Kartal"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}