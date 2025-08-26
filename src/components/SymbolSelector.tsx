
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown, DollarSign, Bitcoin, BarChart3, Activity, AlertTriangle } from "lucide-react";
import { tradingAPI } from "@/services/api";

interface Symbol {
  symbol: string;
  display_name: string;
  market: string;
  market_display_name: string;
  submarket: string;
  submarket_display_name: string;
  pip: number;
  display_decimals: number;
  exchange_is_open: boolean;
  is_trading_suspended: boolean;
  category: string;
}

interface SymbolSelectorProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

export const SymbolSelector = ({ selectedSymbol, onSymbolSelect }: SymbolSelectorProps) => {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<Symbol[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Load symbols from backend
  useEffect(() => {
    loadSymbols();
  }, []);

  const loadSymbols = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const symbolsData = await tradingAPI.getSymbols();
      setSymbols(symbolsData);
      setFilteredSymbols(symbolsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load symbols');
      console.error('Error loading symbols:', err);
      // Fallback to default symbols
      setSymbols(getFallbackSymbols());
      setFilteredSymbols(getFallbackSymbols());
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback symbols if backend is unavailable
  const getFallbackSymbols = (): Symbol[] => [
    {
      symbol: "EURUSD",
      display_name: "EUR/USD",
      market: "forex",
      market_display_name: "Forex",
      submarket: "major_pairs",
      submarket_display_name: "Major Pairs",
      pip: 0.0001,
      display_decimals: 5,
      exchange_is_open: true,
      is_trading_suspended: false,
      category: "forex"
    },
    {
      symbol: "GBPUSD",
      display_name: "GBP/USD",
      market: "forex",
      market_display_name: "Forex",
      submarket: "major_pairs",
      submarket_display_name: "Major Pairs",
      pip: 0.0001,
      display_decimals: 5,
      exchange_is_open: true,
      is_trading_suspended: false,
      category: "forex"
    },
    {
      symbol: "USDJPY",
      display_name: "USD/JPY",
      market: "forex",
      market_display_name: "Forex",
      submarket: "major_pairs",
      submarket_display_name: "Major Pairs",
      pip: 0.01,
      display_decimals: 3,
      exchange_is_open: true,
      is_trading_suspended: false,
      category: "forex"
    },
    {
      symbol: "AUDUSD",
      display_name: "AUD/USD",
      market: "forex",
      market_display_name: "Forex",
      submarket: "major_pairs",
      submarket_display_name: "Major Pairs",
      pip: 0.0001,
      display_decimals: 5,
      exchange_is_open: true,
      is_trading_suspended: false,
      category: "forex"
    }
  ];

  // Filter symbols based on search and category
  useEffect(() => {
    let filtered = symbols;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(symbol => symbol.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(symbol => 
        symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        symbol.display_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSymbols(filtered);
  }, [symbols, searchTerm, selectedCategory]);

  // Get unique categories (robust against undefined)
  const categories = [
    "all",
    ...Array.from(
      new Set(
        symbols
          .map((s) => (s?.category || s?.market || 'other'))
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      )
    ),
  ];

  // Get market trend indicator (mock for now)
  const getMarketTrend = (symbol: string) => {
    const trends = ["bullish", "bearish", "sideways"];
    return trends[Math.floor(Math.random() * trends.length)];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Symbol Selection</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading symbols...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Symbol Selection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={loadSymbols} variant="outline" className="w-full">
            Retry Loading Symbols
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symbol Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category || 'uncategorized'}
              variant={selectedCategory === (category || 'all') ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category || 'all')}
              className="text-xs"
            >
              {category === "all"
                ? "All"
                : typeof category === 'string'
                  ? category.charAt(0).toUpperCase() + category.slice(1)
                  : 'Uncategorized'}
            </Button>
          ))}
        </div>

        {/* Symbols Grid */}
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {filteredSymbols.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No symbols found</p>
              <p className="text-xs">Try adjusting your search or category filter</p>
            </div>
          ) : (
            filteredSymbols.map((symbol) => {
              const isSelected = selectedSymbol === symbol.symbol;
              const marketTrend = getMarketTrend(symbol.symbol);
              
            return (
                <Button
                  key={symbol.symbol}
                  variant={isSelected ? "default" : "outline"}
                  className="justify-start h-auto p-3"
                onClick={() => onSymbolSelect(symbol.symbol)}
              >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium">{symbol.display_name || symbol.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {symbol.market_display_name} • {symbol.submarket_display_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          marketTrend === 'bullish' ? 'text-green-600 border-green-600' :
                          marketTrend === 'bearish' ? 'text-red-600 border-red-600' :
                          'text-yellow-600 border-yellow-600'
                        }`}
                      >
                        {marketTrend === 'bullish' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                         marketTrend === 'bearish' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                         <BarChart3 className="w-3 h-3 mr-1" />}
                        {marketTrend}
                  </Badge>
                    </div>
                  </div>
                </Button>
              );
            })
          )}
        </div>

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground text-center">
          {symbols.length > 0 ? `Loaded ${symbols.length} symbols` : 'Using fallback symbols'}
        </div>
      </CardContent>
    </Card>
  );
};
