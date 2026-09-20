const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

/** Format a Rupiah amount, e.g. 1500000n -> "Rp1.500.000". */
export function formatRupiah(amount: bigint | number): string {
  const value = typeof amount === "bigint" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "Rp0";
  return rupiahFormatter.format(Math.round(value));
}

/** Format a plain integer with Indonesian thousand separators. */
export function formatNumber(value: bigint | number): string {
  const numeric = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "0";
  return numberFormatter.format(Math.round(numeric));
}

/** Format a decimal value with Indonesian separators. */
export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return decimalFormatter.format(value);
}

/** Format a percentage value (already 0-100) for display. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 10) / 10;
  return `${decimalFormatter.format(rounded)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

/** Parse a YYYY-MM-DD text date into a local Date, or null when invalid. */
export function parseDateText(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a YYYY-MM-DD text date as an Indonesian long date. */
export function formatDateText(value: string): string {
  const date = parseDateText(value);
  if (!date) return value || "-";
  return dateFormatter.format(date);
}

/** Format a YYYY-MM-DD text date as an Indonesian short date. */
export function formatShortDateText(value: string): string {
  const date = parseDateText(value);
  if (!date) return value || "-";
  return shortDateFormatter.format(date);
}

/** Format a YYYY-MM text period as an Indonesian month + year. */
export function formatMonthPeriod(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return monthFormatter.format(date);
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayDateText(): string {
  return toDateText(new Date());
}

/** Convert a Date to a YYYY-MM-DD text value in local time. */
export function toDateText(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Convert a backend nanosecond timestamp into a Date, or null when invalid. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parse a user-typed Rupiah amount ("1.500.000", "1500000") into a bigint. */
export function parseRupiahInput(value: string): bigint | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  try {
    return BigInt(digits);
  } catch {
    return null;
  }
}

/** Format a bigint amount for an editable Rupiah input (digits only). */
export function toRupiahInput(amount: bigint): string {
  return amount.toString();
}

/** Human-readable countdown label from a day count. */
export function formatDaysRemaining(days: number): string {
  if (days > 0) return `${formatNumber(days)} hari lagi`;
  if (days === 0) return "Hari ini";
  return `Lewat ${formatNumber(Math.abs(days))} hari`;
}
