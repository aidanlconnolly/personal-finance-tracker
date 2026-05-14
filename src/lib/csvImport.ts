import type { StockLot } from "../types";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      cur.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(field);
      field = "";
      if (cur.some((v) => v.trim() !== "")) rows.push(cur);
      cur = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    if (cur.some((v) => v.trim() !== "")) rows.push(cur);
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  ticker: ["ticker", "symbol", "security", "investment"],
  shares: ["shares", "quantity", "qty", "units"],
  costBasis: ["cost basis", "cost basis per share", "cost/share", "cost per share", "average cost", "avg cost", "unit cost"],
  totalCost: ["total cost", "total cost basis", "amount invested", "basis"],
  currentPrice: ["price", "current price", "last", "market price", "close"],
  marketValue: ["market value", "current value", "total value", "value"],
  purchaseDate: ["purchase date", "acquired", "acquisition date", "date acquired", "open date", "date"],
};

function detectColumns(headers: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const key of Object.keys(HEADER_ALIASES)) {
    const aliases = HEADER_ALIASES[key];
    for (const a of aliases) {
      const idx = normalized.indexOf(a);
      if (idx !== -1) {
        result[key] = idx;
        break;
      }
    }
  }
  return result;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/[$,\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  if (cleaned === "" || cleaned === "-") return undefined;
  const v = parseFloat(cleaned);
  return isFinite(v) ? v : undefined;
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Accept YYYY-MM-DD or MM/DD/YYYY
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(trimmed);
  if (us) {
    const yr = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${yr}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  return undefined;
}

export interface ImportResult {
  lots: StockLot[];
  skippedRows: number;
  detectedColumns: Record<string, string>;
}

export function importLotsFromCsv(text: string, institution: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { lots: [], skippedRows: 0, detectedColumns: {} };
  }
  const headers = rows[0];
  const cols = detectColumns(headers);
  const detectedColumns: Record<string, string> = {};
  for (const k of Object.keys(cols)) detectedColumns[k] = headers[cols[k]];

  const lots: StockLot[] = [];
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const ticker = cols.ticker !== undefined ? row[cols.ticker]?.trim().toUpperCase() : "";
    const shares = parseNumber(cols.shares !== undefined ? row[cols.shares] : undefined);
    if (!ticker || shares === undefined || shares <= 0) {
      skipped++;
      continue;
    }
    let costBasis = parseNumber(cols.costBasis !== undefined ? row[cols.costBasis] : undefined);
    const totalCost = parseNumber(cols.totalCost !== undefined ? row[cols.totalCost] : undefined);
    if (costBasis === undefined && totalCost !== undefined) {
      costBasis = totalCost / shares;
    }
    let currentPrice = parseNumber(cols.currentPrice !== undefined ? row[cols.currentPrice] : undefined);
    const marketValue = parseNumber(cols.marketValue !== undefined ? row[cols.marketValue] : undefined);
    if (currentPrice === undefined && marketValue !== undefined) {
      currentPrice = marketValue / shares;
    }
    if (costBasis === undefined) {
      skipped++;
      continue;
    }
    const purchaseDate = parseDate(cols.purchaseDate !== undefined ? row[cols.purchaseDate] : undefined) ?? today;
    lots.push({
      id: `lot-import-${Date.now()}-${r}`,
      ticker,
      shares,
      costBasis,
      purchaseDate,
      currentPrice,
      institution,
    });
  }

  return { lots, skippedRows: skipped, detectedColumns };
}
