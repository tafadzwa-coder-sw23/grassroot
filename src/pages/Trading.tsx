import { useState } from 'react';
import { MarketChart } from '@/components/MarketChart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SYMBOLS = [
  { value: 'frxEURUSD', label: 'EUR/USD' },
  { value: 'frxGBPUSD', label: 'GBP/USD' },
  { value: 'frxUSDJPY', label: 'USD/JPY' },
  { value: 'R_100', label: 'Volatility 100 Index' },
];

const INTERVALS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
];

export function Trading() {
  const [symbol, setSymbol] = useState('frxEURUSD');
  const [interval, setInterval] = useState('15m');
  const [chartHeight, setChartHeight] = useState(500);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Dashboard</h1>
          <p className="text-muted-foreground">Real-time market data and analysis</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="w-full sm:w-48">
            <label className="text-sm font-medium mb-1 block">Symbol</label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-48">
            <label className="text-sm font-medium mb-1 block">Timeframe</label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <MarketChart symbol={symbol} interval={interval} height={chartHeight} />
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Chart Controls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setChartHeight(prev => Math.max(300, prev - 50))}
              >
                - Zoom Out
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setChartHeight(prev => Math.min(800, prev + 50))}
              >
                + Zoom In
              </Button>
              <div className="text-sm text-muted-foreground ml-auto self-center">
                {chartHeight}px height
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
