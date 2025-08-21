import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMarketData, CandleData } from '@/hooks/useMarketData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface MarketChartProps {
  symbol: string;
  interval: string;
  height?: number;
}

export function MarketChart({ symbol, interval, height = 400 }: MarketChartProps) {
  const { candles, isConnected, error } = useMarketData(symbol, interval);

  // Format data for Recharts
  const chartData = React.useMemo(() => {
    return candles.map(candle => ({
      time: candle.epoch * 1000, // Convert to milliseconds
      open: parseFloat(candle.open as any),
      high: parseFloat(candle.high as any),
      low: parseFloat(candle.low as any),
      close: parseFloat(candle.close as any),
    }));
  }, [candles]);

  // Format x-axis ticks
  const formatXAxis = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm');
  };

  // Format tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-2 text-sm">
          <p className="font-medium">{format(new Date(label), 'PPpp')}</p>
          <p>Open: {data.open.toFixed(5)}</p>
          <p>High: {data.high.toFixed(5)}</p>
          <p>Low: {data.low.toFixed(5)}</p>
          <p>Close: {data.close.toFixed(5)}</p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - {interval} Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - {interval} Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Connecting to market data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {symbol} - {interval} Chart
          <span className="text-sm text-muted-foreground ml-2">
            {candles.length} candles loaded
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fill: '#a0aec0', fontSize: 12 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                width={80}
                tick={{ fill: '#a0aec0', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#8884d8"
                dot={false}
                strokeWidth={2}
                name="Price"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
