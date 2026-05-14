export async function fetchPrice(ticker: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${ticker}`);
  const json = await res.json();
  const price: number = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error(`No price found for ${ticker}`);
  return price;
}

export async function fetchPrices(
  tickers: string[]
): Promise<Record<string, number>> {
  const unique = [...new Set(tickers)];
  const results = await Promise.allSettled(
    unique.map(async (t) => ({ ticker: t, price: await fetchPrice(t) }))
  );
  const map: Record<string, number> = {};
  for (const r of results) {
    if (r.status === "fulfilled") map[r.value.ticker] = r.value.price;
  }
  return map;
}

export interface PriceHistory {
  ticker: string;
  closes: number[];
}

export async function fetchHistory(
  ticker: string,
  range: "1mo" | "3mo" | "6mo" = "3mo"
): Promise<PriceHistory> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo history returned ${res.status} for ${ticker}`);
  const json = await res.json();
  const raw: unknown[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const closes = raw.filter((v): v is number => typeof v === "number" && isFinite(v));
  if (closes.length === 0) throw new Error(`No history for ${ticker}`);
  return { ticker, closes };
}

export async function fetchHistories(
  tickers: string[]
): Promise<Record<string, PriceHistory>> {
  const unique = [...new Set(tickers)];
  const results = await Promise.allSettled(unique.map((t) => fetchHistory(t)));
  const map: Record<string, PriceHistory> = {};
  for (const r of results) {
    if (r.status === "fulfilled") map[r.value.ticker] = r.value;
  }
  return map;
}
