"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface PortfolioChartProps {
  holdings: Array<{
    ticker: string;
    purchase_date: string;
    purchase_price: number;
    quantity: number;
  }>;
}

interface ChartDataPoint {
  date: string;
  value: number;
  purchases: Array<{ ticker: string; price: number; date: string }>;
}

export function PortfolioChart({ holdings }: PortfolioChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [holdings]);

  async function loadChartData() {
    if (holdings.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Hent historisk data for alle tickers
      const allHistoricalData: Record<string, Array<{ date: Date; price: number }>> = {};

      for (const holding of holdings) {
        try {
          const response = await fetch(
            `/api/prices/${encodeURIComponent(holding.ticker)}?historical=true&days=90`
          );
          const result = await response.json();

          if (result.success && result.data) {
            allHistoricalData[holding.ticker] = result.data;
          }
        } catch (err) {
          console.error(`Error fetching historical data for ${holding.ticker}:`, err);
        }
      }

      // Kombiner data til en portefølje-tidslinje
      const dateMap = new Map<string, ChartDataPoint>();

      // Start fra 90 dager siden
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      // Fyll inn alle dager
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, "yyyy-MM-dd");
        dateMap.set(dateStr, {
          date: dateStr,
          value: 0,
          purchases: [],
        });
      }

      // Legg til kjøpspunkter
      for (const holding of holdings) {
        const purchaseDate = format(new Date(holding.purchase_date), "yyyy-MM-dd");
        const existing = dateMap.get(purchaseDate);
        if (existing) {
          existing.purchases.push({
            ticker: holding.ticker,
            price: holding.purchase_price,
            date: purchaseDate,
          });
        }
      }

      // Beregn porteføljeverdi for hver dag
      for (const [dateStr, point] of dateMap.entries()) {
        let totalValue = 0;
        const currentDate = new Date(dateStr);

        for (const holding of holdings) {
          const purchaseDate = new Date(holding.purchase_date);
          if (currentDate >= purchaseDate) {
            // Hent pris for denne datoen
            const historicalData = allHistoricalData[holding.ticker];
            if (historicalData && historicalData.length > 0) {
              // Finn nærmeste dato
              let price = holding.purchase_price; // Fallback til kjøpspris
              for (let i = historicalData.length - 1; i >= 0; i--) {
                const histDate = new Date(historicalData[i].date);
                if (histDate <= currentDate) {
                  price = historicalData[i].price;
                  break;
                }
              }
              totalValue += holding.quantity * price;
            } else {
              // Bruk kjøpspris hvis historisk data ikke finnes
              totalValue += holding.quantity * holding.purchase_price;
            }
          }
        }

        point.value = totalValue;
      }

      // Konverter til array og sorter
      const sortedData = Array.from(dateMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Reduser til ~30 datapunkter for bedre ytelse (ta hver 3. dag)
      const reducedData = sortedData.filter((_, index) => index % 3 === 0 || index === sortedData.length - 1);

      setChartData(reducedData);
    } catch (err) {
      console.error("Error loading chart data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Laster graf...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Ingen data tilgjengelig for graf
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#9CA3AF"
          tick={{ fill: "#9CA3AF", fontSize: 10 }}
          tickFormatter={(value) => format(new Date(value), "dd.MM", { locale: nb })}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#9CA3AF"
          tick={{ fill: "#9CA3AF", fontSize: 10 }}
          tickFormatter={formatCurrency}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1F2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            color: "#F3F4F6",
          }}
          labelFormatter={(value) => format(new Date(value), "dd. MMMM yyyy", { locale: nb })}
          formatter={(value: number) => [`${formatCurrency(value)} NOK`, "Porteføljeverdi"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#6366F1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#818CF8" }}
        />
        {/* Marker kjøpspunkter */}
        {chartData.map((point, index) =>
          point.purchases.length > 0 ? (
            <ReferenceLine
              key={`purchase-${index}`}
              x={point.date}
              stroke="#10B981"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
