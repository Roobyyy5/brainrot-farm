import { useEffect, useState } from "react";
import type { CryptoPrice } from "../api/types";

const COINS = "bitcoin,ethereum,binancecoin,solana,matic-network";
const REFRESH_MS = 60_000;

export function usePriceTicker() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [error, setError] = useState(false);

  async function fetchPrices() {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) { setError(true); return; }
      const data: CryptoPrice[] = await res.json();
      setPrices(data);
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return { prices, error };
}
