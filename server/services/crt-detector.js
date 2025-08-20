// Candle Range Theory (CRT) detector – price-action only
// Detects three-candle setup on a driving timeframe (default 1h) and
// optionally refines entries using a lower timeframe (default 5m) FVG.

class CRTDetector {
  constructor(options = {}) {
    this.driverTimeframe = options.driverTimeframe || '1h';
    this.entryTimeframe = options.entryTimeframe || '5m';
  }

  async detect(symbol, marketDataService) {
    try {
      const driver = await marketDataService.getMarketData(symbol, this.driverTimeframe, 300);
      if (!driver || driver.length < 3) return [];

      const setups = this.findThreeCandleSetups(driver);
      if (setups.length === 0) return [];

      // Use the most recent valid setup
      const setup = setups[setups.length - 1];

      // Optional refinement: look for FVG on lower timeframe after sweep
      let refinedEntry = null;
      try {
        const lower = await marketDataService.getMarketData(symbol, this.entryTimeframe, 200);
        refinedEntry = this.findFirstFVG(lower, setup.sweepDirection);
      } catch {}

      const direction = setup.sweepDirection === 'up' ? 'SELL' : 'BUY';
      const entryPrice = refinedEntry?.price ?? setup.entryHint;
      const stopLoss = setup.sweepDirection === 'up' ? setup.sweepHigh * 1.0005 : setup.sweepLow * 0.9995;
      const takeProfit = setup.sweepDirection === 'up' ? setup.crl : setup.crh;

      const confidence = Math.min(0.95, 0.65 + (refinedEntry ? 0.1 : 0));

      return [{
        type: 'CRT_THREE_CANDLE',
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        confidence,
        timeframe: this.entryTimeframe,
        chochPattern: 'crt_liquidity_sweep',
        riskReward: Math.abs(takeProfit - entryPrice) / Math.max(1e-9, Math.abs(entryPrice - stopLoss)),
        marketCondition: 'crt'
      }];
    } catch (e) {
      console.error('CRT detection error:', e);
      return [];
    }
  }

  findThreeCandleSetups(data) {
    const out = [];
    for (let i = 2; i < data.length; i++) {
      const c1 = data[i - 2]; // range candle
      const c2 = data[i - 1]; // sweep candle
      const c3 = data[i];     // trigger/confirmation candle
      if (!c1 || !c2 || !c3) continue;

      const crh = c1.high;
      const crl = c1.low;

      // Sweep up: breaks above CRH but closes back inside range
      const sweptUp = c2.high > crh && c2.close < crh;
      // Sweep down: breaks below CRL but closes back inside range
      const sweptDown = c2.low < crl && c2.close > crl;

      // Invalidation: sweep candle closes outside the range
      const invalid = c2.close > crh || c2.close < crl;
      if (invalid) continue;

      if (sweptUp) {
        out.push({
          sweepDirection: 'up',
          crh, crl,
          sweepHigh: c2.high,
          sweepLow: c2.low,
          entryHint: c3.open
        });
      } else if (sweptDown) {
        out.push({
          sweepDirection: 'down',
          crh, crl,
          sweepHigh: c2.high,
          sweepLow: c2.low,
          entryHint: c3.open
        });
      }
    }
    return out;
  }

  findFirstFVG(data, sweepDirection) {
    if (!data || data.length < 2) return null;
    for (let i = 1; i < data.length; i++) {
      const a = data[i - 1];
      const b = data[i];
      const bullGap = b.low > a.high;
      const bearGap = b.high < a.low;
      if (sweepDirection === 'up' && bearGap) {
        // short entry near gap top
        return { price: a.low };
      }
      if (sweepDirection === 'down' && bullGap) {
        // long entry near gap bottom
        return { price: a.high };
      }
    }
    return null;
  }
}

module.exports = CRTDetector;


