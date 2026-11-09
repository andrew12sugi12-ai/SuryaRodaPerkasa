type Bar = { label: string; monthYear: string; total: number };

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(Math.round(n));
}

// Pure-SVG monthly revenue bars — no chart library, renders on the server.
export function RevenueBarChart({ data }: { data: Bar[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const W = 720;
  const H = 200;
  const padBottom = 28;
  const padTop = 18;
  const plot = H - padBottom - padTop;
  const n = data.length;
  const slot = W / n;
  const barW = Math.min(44, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly revenue bar chart" style={{ height: "auto" }}>
      {data.map((d, i) => {
        const h = (d.total / max) * plot;
        const x = i * slot + (slot - barW) / 2;
        const y = padTop + (plot - h);
        return (
          <g key={i}>
            {d.total > 0 && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {compact(d.total)}
              </text>
            )}
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, d.total > 0 ? 2 : 0)}
              rx={4}
              className="fill-primary/80"
            />
            <text
              x={x + barW / 2}
              y={H - 10}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11 }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
