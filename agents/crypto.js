const axios = require('axios');

class CryptoAgent {
  constructor(config = {}) {
    this.exchange = config.exchange || 'binance';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.paperTrading = config.paperTrading !== false;
    this.portfolio = {};
    this.trades = [];
    this.alerts = [];
  }

  async getPrice(symbol) {
    try {
      const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      return parseFloat(response.data.price);
    } catch (error) {
      return null;
    }
  }

  async get24hStats(symbol) {
    try {
      const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      return {
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        volume: parseFloat(response.data.volume),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        lastPrice: parseFloat(response.data.lastPrice)
      };
    } catch (error) {
      return null;
    }
  }

  async analyzeTrend(symbol, interval = '1h', limit = 100) {
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      const candles = response.data.map(c => ({
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5]),
        time: c[0]
      }));

      // Calculate indicators
      const sma20 = this.calculateSMA(candles.map(c => c.close), 20);
      const sma50 = this.calculateSMA(candles.map(c => c.close), 50);
      const rsi = this.calculateRSI(candles.map(c => c.close), 14);
      const macd = this.calculateMACD(candles.map(c => c.close));

      return {
        symbol,
        currentPrice: candles[candles.length - 1].close,
        sma20: sma20[sma20.length - 1],
        sma50: sma50[sma50.length - 1],
        rsi: rsi[rsi.length - 1],
        macd: macd.macd[macd.macd.length - 1],
        signal: macd.signal[macd.signal.length - 1],
        trend: candles[candles.length - 1].close > sma20[sma20.length - 1] ? 'bullish' : 'bearish',
        recommendation: this.generateRecommendation(rsi[rsi.length - 1], macd)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateRSI(prices, period = 14) {
    const rsi = [];
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
  }

  calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    const emaFast = this.calculateEMA(prices, fast);
    const emaSlow = this.calculateEMA(prices, slow);
    const macdLine = emaFast.slice(-emaSlow.length).map((v, i) => v - emaSlow[i]);
    const signalLine = this.calculateEMA(macdLine, signal);

    return { macd: macdLine, signal: signalLine };
  }

  calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }

    return ema;
  }

  generateRecommendation(rsi, macd) {
    if (rsi > 70) return 'overbought - consider selling';
    if (rsi < 30) return 'oversold - consider buying';
    const macdValue = macd.macd[macd.macd.length - 1];
    const signalValue = macd.signal[macd.signal.length - 1];
    if (macdValue > signalValue) return 'bullish momentum';
    return 'bearish momentum';
  }

  setAlert(symbol, condition, callback) {
    const alert = {
      id: Date.now(),
      symbol,
      condition,
      callback,
      active: true,
      createdAt: new Date()
    };
    this.alerts.push(alert);
    return alert;
  }

  async checkAlerts() {
    for (const alert of this.alerts.filter(a => a.active)) {
      const price = await this.getPrice(alert.symbol);
      if (price && this.evaluateCondition(price, alert.condition)) {
        alert.callback(price, alert);
        alert.triggeredAt = new Date();
        alert.active = false;
      }
    }
  }

  evaluateCondition(price, condition) {
    // Simple condition parser: "above 50000", "below 40000", "change > 5%"
    if (condition.includes('above')) {
      const target = parseFloat(condition.match(/\d+/)?.[0]);
      return price > target;
    }
    if (condition.includes('below')) {
      const target = parseFloat(condition.match(/\d+/)?.[0]);
      return price < target;
    }
    return false;
  }

  async simulateTrade(symbol, side, amount, price = null) {
    const currentPrice = price || await this.getPrice(symbol);
    const trade = {
      id: Date.now(),
      symbol,
      side,
      amount,
      price: currentPrice,
      total: amount * currentPrice,
      timestamp: new Date(),
      type: this.paperTrading ? 'paper' : 'live'
    };

    if (this.paperTrading) {
      this.trades.push(trade);
      this.updatePortfolio(symbol, side, amount, currentPrice);
      return { success: true, trade };
    }

    // Live trading would use exchange API here
    return { success: false, error: 'Live trading not implemented' };
  }

  updatePortfolio(symbol, side, amount, price) {
    if (!this.portfolio[symbol]) {
      this.portfolio[symbol] = { amount: 0, avgPrice: 0 };
    }

    if (side === 'buy') {
      const total = this.portfolio[symbol].amount * this.portfolio[symbol].avgPrice + amount * price;
      this.portfolio[symbol].amount += amount;
      this.portfolio[symbol].avgPrice = total / this.portfolio[symbol].amount;
    } else {
      this.portfolio[symbol].amount -= amount;
    }
  }

  getPortfolio() {
    return this.portfolio;
  }

  getTrades() {
    return this.trades;
  }
}

module.exports = CryptoAgent;
