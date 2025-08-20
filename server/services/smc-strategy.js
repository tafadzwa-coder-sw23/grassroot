// Smart Money Concepts (SMC) CHOCH multi-timeframe strategy (price-action only)
// H4 → M15 → M1 top-down confirmation, liquidity sweep + FVG confluence, continuation model

class SMCStrategy {
  constructor() {
    this.maxContinuationTrades = 3;
  }

  async generateSMCSignals({ symbol, marketDataService }) {
    try {
      // 1) Top-down data
      const [h4, m15, m1] = await Promise.all([
        marketDataService.getMarketData(symbol, '4h', 500),
        marketDataService.getMarketData(symbol, '15m', 500),
        marketDataService.getMarketData(symbol, '1m', 500),
      ]);
      if (!h4?.length || !m15?.length || !m1?.length) return [];

      // 2) Detect H4 zones (simple order blocks based on engulfing moves)
      const h4Zones = this.detectZones(h4);
      if (h4Zones.length === 0) return [];

      const latestH4Zone = this.pickNearestZone(h4Zones, m15[m15.length - 1].close);
      if (!latestH4Zone) return [];

      // 3) Confirm CHOCH on M15 inside H4 zone
      if (!this.hasCHOCHInsideZone(m15, latestH4Zone)) return [];

      // 4) Confirm M1 CHOCH within M15 reaction zone
      const m15Zone = this.deriveReactionZoneFromCHOCH(m15);
      if (!m15Zone) return [];
      if (!this.hasCHOCHInsideZone(m1, m15Zone)) return [];

      // 5) Liquidity sweep + inefficiency (FVG) confluence on M1
      const swept = this.sweptNearbyLiquidity(m1);
      const fvg = this.findFVG(m1);

      // 6) Build entry signal at M1 order block with SL beyond zone edge
      const entryZone = this.detectEntryZone(m1) || m15Zone;
      const last = m1[m1.length - 1];
      const direction = latestH4Zone.type === 'demand' ? 'BUY' : 'SELL';
      const entryPrice = direction === 'BUY' ? entryZone.bottom : entryZone.top;
      const stopLoss = direction === 'BUY' ? entryZone.bottom * 0.999 : entryZone.top * 1.001;
      const takeProfit = direction === 'BUY' ? entryPrice * 1.02 : entryPrice * 0.98;

      const baseConfidence = 0.6 + (swept ? 0.1 : 0) + (fvg ? 0.1 : 0);

      return [{
        type: 'SMC_CHOCH_STACKED',
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        confidence: Math.min(0.95, baseConfidence),
        timeframe: '1m',
        chochPattern: 'multi_tf_choch',
        riskReward: 2.0,
        marketCondition: 'smc_top_down'
      }];
    } catch (e) {
      console.error('SMC strategy error:', e);
      return [];
    }
  }

  detectZones(data) {
    const zones = [];
    for (let i = 2; i < data.length - 2; i++) {
      const a = data[i - 1];
      const b = data[i];
      const c = data[i + 1];
      // Demand: down candle followed by strong up close beyond prior high
      if (b.close < b.open && c.close > c.open && c.close > b.high) {
        zones.push({ type: 'demand', top: b.open, bottom: b.low, timestamp: b.timestamp });
      }
      // Supply: up candle followed by strong down close beyond prior low
      if (b.close > b.open && c.close < c.open && c.close < b.low) {
        zones.push({ type: 'supply', top: b.high, bottom: b.open, timestamp: b.timestamp });
      }
    }
    return zones;
  }

  pickNearestZone(zones, price) {
    let best = null;
    let bestDist = Infinity;
    for (const z of zones) {
      const mid = (z.top + z.bottom) / 2;
      const d = Math.abs(price - mid);
      if (d < bestDist) { bestDist = d; best = z; }
    }
    return best;
  }

  hasCHOCHInsideZone(data, zone) {
    const inside = data.filter(d => d.low <= zone.top && d.high >= zone.bottom);
    if (inside.length < 20) return false;
    // Simple CHOCH: consecutive break of two prior swing levels
    const swingsH = this.findSwings(inside.map(d => d.high), 'high');
    const swingsL = this.findSwings(inside.map(d => d.low), 'low');
    const bosUp = swingsH.length >= 3 && swingsH[swingsH.length - 1] > swingsH[swingsH.length - 2];
    const bosDn = swingsL.length >= 3 && swingsL[swingsL.length - 1] < swingsL[swingsL.length - 2];
    return bosUp || bosDn;
  }

  deriveReactionZoneFromCHOCH(data) {
    // Use last impulse candle as reaction zone
    const n = data.length;
    for (let i = n - 3; i < n - 1; i++) {
      const b = data[i];
      const c = data[i + 1];
      if (b && c) {
        if (b.close < b.open && c.close > c.open && c.close > b.high) {
          return { top: b.open, bottom: b.low };
        }
        if (b.close > b.open && c.close < c.open && c.close < b.low) {
          return { top: b.high, bottom: b.open };
        }
      }
    }
    return null;
  }

  sweptNearbyLiquidity(data) {
    // Detect sweep: current wick extends beyond previous 3-bar high/low then closes back inside
    const n = data.length;
    if (n < 5) return false;
    const curr = data[n - 1];
    const prev = data.slice(n - 5, n - 1);
    const prevHigh = Math.max(...prev.map(c => c.high));
    const prevLow = Math.min(...prev.map(c => c.low));
    const sweptHigh = curr.high > prevHigh && curr.close < prevHigh;
    const sweptLow = curr.low < prevLow && curr.close > prevLow;
    return sweptHigh || sweptLow;
  }

  findFVG(data) {
    // Basic FVG: gap between previous high and current low, or current high and previous low
    const n = data.length;
    if (n < 2) return false;
    const a = data[n - 2];
    const b = data[n - 1];
    const bullGap = b.low > a.high;
    const bearGap = b.high < a.low;
    return bullGap || bearGap;
  }

  findSwings(arr, type) {
    const out = [];
    const w = 3;
    for (let i = w; i < arr.length - w; i++) {
      const v = arr[i];
      const left = arr.slice(i - w, i);
      const right = arr.slice(i + 1, i + w + 1);
      const isSwing = type === 'high'
        ? left.every(x => x < v) && right.every(x => x < v)
        : left.every(x => x > v) && right.every(x => x > v);
      if (isSwing) out.push(v);
    }
    return out;
  }

  detectEntryZone(data) {
    // last small order block zone
    for (let i = data.length - 4; i >= data.length - 50 && i > 2; i--) {
      const b = data[i];
      const c = data[i + 1];
      if (b && c) {
        if (b.close < b.open && c.close > c.open && c.close > b.high) {
          return { top: b.open, bottom: b.low };
        }
        if (b.close > b.open && c.close < c.open && c.close < b.low) {
          return { top: b.high, bottom: b.open };
        }
      }
    }
    return null;
  }
}

module.exports = SMCStrategy;


