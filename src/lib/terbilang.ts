// Convert a number to Indonesian words (terbilang), e.g. 1500000 -> "satu juta
// lima ratus ribu". Used on invoices and kwitansi.
const ONES = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

function threeDigits(n: number): string {
  let out = "";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 1) out += "seratus";
  else if (hundreds > 1) out += `${ONES[hundreds]} ratus`;

  if (rest > 0) {
    if (out) out += " ";
    if (rest < 12) out += ONES[rest];
    else if (rest < 20) out += `${ONES[rest - 10]} belas`;
    else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      out += `${ONES[tens]} puluh`;
      if (ones > 0) out += ` ${ONES[ones]}`;
    }
  }
  return out;
}

const SCALES = ["", "ribu", "juta", "miliar", "triliun"];

export function terbilang(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "nol";

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    // Special case: 1000 -> "seribu" (not "satu ribu").
    if (i === 1 && g === 1) {
      parts.push("seribu");
    } else {
      parts.push(`${threeDigits(g)} ${SCALES[i]}`.trim());
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// "Rupiah" suffix form used on documents.
export function terbilangRupiah(value: number): string {
  const words = terbilang(value);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupiah`;
}
