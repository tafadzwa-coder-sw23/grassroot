
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, DollarSign, Bitcoin, BarChart3 } from "lucide-react";

const categoryIcons = {
  forex: DollarSign,
  crypto: Bitcoin,
  indices: BarChart3,
  commodities: TrendingUp,
};

const categoryColors = {
  forex: "bg-blue-100 text-blue-700 border-blue-200",
  crypto: "bg-orange-100 text-orange-700 border-orange-200", 
  indices: "bg-purple-100 text-purple-700 border-purple-200",
  commodities: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface Symbol {
  id: string;
  symbol: string;
  display_name: string;
  category: keyof typeof categoryIcons;
  is_active: boolean;
}

interface SymbolSelectorProps {
  selectedSymbol: string | null;
  onSymbolSelect: (symbol: string) => void;
}

// Mock data for symbols
const mockSymbols: Symbol[] = [
  { id: "1", symbol: "EURUSD", display_name: "Euro vs US Dollar", category: "forex", is_active: true },
  { id: "2", symbol: "GBPUSD", display_name: "British Pound vs US Dollar", category: "forex", is_active: true },
  { id: "3", symbol: "BTCUSDT", display_name: "Bitcoin vs Tether", category: "crypto", is_active: true },
  { id: "4", symbol: "ETHUSDT", display_name: "Ethereum vs Tether", category: "crypto", is_active: true },
  { id: "5", symbol: "SP500", display_name: "S&P 500 Index", category: "indices", is_active: true },
  { id: "6", symbol: "GOLD", display_name: "Gold Spot Price", category: "commodities", is_active: true },
  { id: "7", symbol: "USDJPY", display_name: "US Dollar vs Japanese Yen", category: "forex", is_active: true },
  { id: "8", symbol: "SOLUSDT", display_name: "Solana vs Tether", category: "crypto", is_active: true },
];

export function SymbolSelector({ selectedSymbol, onSymbolSelect }: SymbolSelectorProps) {
  const [symbols, setSymbols] = useState<Symbol[]>(mockSymbols);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredSymbols = symbols.filter(symbol => {
    const matchesSearch = symbol.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || symbol.category === selectedCategory;
    return matchesSearch && matchesCategory && symbol.is_active;
  });

  const categories = [...new Set(symbols.map(s => s.category))];

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          Select Trading Pair
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className="rounded-full"
          >
            All Categories
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="rounded-full capitalize"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Symbol Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {filteredSymbols.map((symbol) => {
            const IconComponent = categoryIcons[symbol.category];
            return (
              <Card
                key={symbol.id}
                className={`p-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                  selectedSymbol === symbol.symbol
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => onSymbolSelect(symbol.symbol)}
              >
                <CardHeader className="p-2">
                  <CardTitle className="text-lg font-bold">{symbol.symbol}</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <p className="text-sm text-slate-600">{symbol.display_name}</p>
                  <Badge className={`${categoryColors[symbol.category]} mt-2`}>
                    {symbol.category}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
