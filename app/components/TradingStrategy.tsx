"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSignalR } from '../providers/SignalRProvider';

// Types for the strategy
export interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FVG {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  high: number;
  low: number;
  timestamp: Date;
  timeframe: string;
  filled: boolean;
}

export interface StrategySignal {
  type: 'LONG' | 'SHORT';
  symbol: string;
  price: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  confidence: number;
  reason: string;
}

export interface StrategyConfig {
  // Moving Average settings
  maType: 'EMA' | 'SMA';
  maLength: number;
  maSource: 'CLOSE' | 'OPEN' | 'HIGH' | 'LOW';
  
  // RMI settings
  rmiLength: number;
  momentumLength: number;
  overboughtLevel: number;
  oversoldLevel: number;
  useRSI: boolean;
  
  // FVG settings
  fvgTimeframes: string[];
  maxBarsBack: number;
  
  // Risk Management
  trailPercentage: number;
  fixedStopLoss: number;
  trailOffset: number;
  maxIntradayLoss: number;
  
  // Trading hours
  tradingStartHour: number;
  tradingEndHour: number;
  tradingDays: number[];
}

export class TradingStrategyEngine {
  private config: StrategyConfig;
  private candles: CandleData[] = [];
  private fvgs: FVG[] = [];
  private signals: StrategySignal[] = [];

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  // Calculate EMA
  private calculateEMA(data: number[], length: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (length + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema[i] = data[i];
      } else {
        ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
      }
    }
    
    return ema;
  }

  // Calculate RMI
  private calculateRMI(data: CandleData[], length: number, momentumLength: number): number[] {
    const rmi: number[] = [];
    
    for (let i = momentumLength; i < data.length; i++) {
      const up = Math.max(data[i].close - data[i - momentumLength].close, 0);
      const down = Math.max(data[i - momentumLength].close - data[i].close, 0);
      
      // Calculate EMA of up and down movements
      const upEMA = this.calculateEMA([up], length)[0];
      const downEMA = this.calculateEMA([down], length)[0];
      
      rmi[i] = downEMA === 0 ? 0 : 100 - (100 / (1 + upEMA / downEMA));
    }
    
    return rmi;
  }

  // Detect Fair Value Gaps
  private detectFVGs(candles: CandleData[], timeframe: string): FVG[] {
    const fvgs: FVG[] = [];
    
    for (let i = 2; i < candles.length; i++) {
      const current = candles[i];
      const prev1 = candles[i - 1];
      const prev2 = candles[i - 2];
      
      // Bullish FVG
      if (prev1.close < prev2.low && current.high < prev2.low) {
        fvgs.push({
          id: `${timeframe}_bull_${i}`,
          type: 'BULLISH',
          high: prev2.low,
          low: prev1.close,
          timestamp: current.timestamp,
          timeframe,
          filled: false
        });
      }
      
      // Bearish FVG
      if (prev1.close > prev2.high && current.low > prev2.high) {
        fvgs.push({
          id: `${timeframe}_bear_${i}`,
          type: 'BEARISH',
          high: prev1.close,
          low: prev2.high,
          timestamp: current.timestamp,
          timeframe,
          filled: false
        });
      }
    }
    
    return fvgs;
  }

  // Check if price is inside FVG
  private isPriceInsideFVG(price: number, fvg: FVG): boolean {
    if (fvg.type === 'BULLISH') {
      return price > fvg.low && price < fvg.high;
    } else {
      return price > fvg.low && price < fvg.high;
    }
  }

  // Check if FVG is filled
  private isFVGFilled(fvg: FVG, currentPrice: number): boolean {
    if (fvg.type === 'BULLISH') {
      return currentPrice <= fvg.high;
    } else {
      return currentPrice >= fvg.low;
    }
  }

  // Generate trading signals
  public generateSignals(candles: CandleData[]): StrategySignal[] {
    if (candles.length < 10) return [];
    
    this.candles = candles;
    const signals: StrategySignal[] = [];
    
    // Calculate indicators
    const closePrices = candles.map(c => c.close);
    const ma = this.calculateEMA(closePrices, this.config.maLength);
    const rmi = this.calculateRMI(candles, this.config.rmiLength, this.config.momentumLength);
    
    // Detect FVGs for each timeframe
    this.fvgs = this.config.fvgTimeframes.flatMap(tf => this.detectFVGs(candles, tf));
    
    // Check for entry conditions
    for (let i = 3; i < candles.length; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      const prev2 = candles[i - 2];
      
      // Check MA direction
      const maDirection = ma[i] > ma[i - 3] ? 'BULLISH' : ma[i] < ma[i - 3] ? 'BEARISH' : 'NEUTRAL';
      
      // Check if price is inside FVG
      const insideBullishFVG = this.fvgs.some(fvg => 
        fvg.type === 'BULLISH' && !fvg.filled && this.isPriceInsideFVG(current.close, fvg)
      );
      
      const insideBearishFVG = this.fvgs.some(fvg => 
        fvg.type === 'BEARISH' && !fvg.filled && this.isPriceInsideFVG(current.close, fvg)
      );
      
      // Long entry conditions
      if (current.low < prev.low && 
          prev.close < prev.open && 
          maDirection === 'BULLISH' && 
          insideBullishFVG && 
          current.close > current.open) {
        
        const stopLoss = current.low * (1 - this.config.fixedStopLoss / 100);
        const takeProfit = current.close * (1 + this.config.trailPercentage / 100);
        
        signals.push({
          type: 'LONG',
          symbol: 'SYMBOL', // This should be passed as parameter
          price: current.close,
          stopLoss,
          takeProfit,
          timestamp: current.timestamp,
          confidence: 0.8,
          reason: 'Momentum strategy long signal'
        });
      }
      
      // Short entry conditions
      if (current.high > prev.high && 
          prev.close > prev.open && 
          maDirection === 'BEARISH' && 
          insideBearishFVG && 
          current.close < current.open) {
        
        const stopLoss = current.high * (1 + this.config.fixedStopLoss / 100);
        const takeProfit = current.close * (1 - this.config.trailPercentage / 100);
        
        signals.push({
          type: 'SHORT',
          symbol: 'SYMBOL', // This should be passed as parameter
          price: current.close,
          stopLoss,
          takeProfit,
          timestamp: current.timestamp,
          confidence: 0.8,
          reason: 'Momentum strategy short signal'
        });
      }
    }
    
    this.signals = signals;
    return signals;
  }

  // Update FVG status
  public updateFVGs(currentPrice: number): void {
    this.fvgs = this.fvgs.map(fvg => ({
      ...fvg,
      filled: this.isFVGFilled(fvg, currentPrice)
    }));
  }

  // Get current signals
  public getSignals(): StrategySignal[] {
    return this.signals;
  }

  // Get current FVGs
  public getFVGs(): FVG[] {
    return this.fvgs;
  }
}

// React component for the trading strategy
export const TradingStrategy: React.FC = () => {
  const { isConnected, positions, orders, trades } = useSignalR();
  const [strategyEngine, setStrategyEngine] = useState<TradingStrategyEngine | null>(null);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [isStrategyActive, setIsStrategyActive] = useState(false);

  // Default strategy configuration
  const defaultConfig: StrategyConfig = {
    maType: 'EMA',
    maLength: 6,
    maSource: 'CLOSE',
    rmiLength: 4,
    momentumLength: 5,
    overboughtLevel: 70,
    oversoldLevel: 30,
    useRSI: false,
    fvgTimeframes: ['5m', '1h', '4h'],
    maxBarsBack: 100,
    trailPercentage: 0.06,
    fixedStopLoss: 0.09,
    trailOffset: 0.004,
    maxIntradayLoss: 2,
    tradingStartHour: 6,
    tradingEndHour: 17,
    tradingDays: [1, 2, 3, 4, 5] // Monday to Friday
  };

  useEffect(() => {
    if (!strategyEngine) {
      const engine = new TradingStrategyEngine(defaultConfig);
      setStrategyEngine(engine);
    }
  }, [strategyEngine]);

  const startStrategy = useCallback(() => {
    setIsStrategyActive(true);
    console.log('Trading strategy started');
  }, []);

  const stopStrategy = useCallback(() => {
    setIsStrategyActive(false);
    console.log('Trading strategy stopped');
  }, []);

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Momentum Trading Strategy</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className={`inline-block px-2 py-1 rounded text-sm ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Strategy Status</h3>
          <div className={`inline-block px-2 py-1 rounded text-sm ${
            isStrategyActive ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {isStrategyActive ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Positions</h3>
          <div className="text-2xl font-bold">{positions.length}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Orders</h3>
          <div className="text-2xl font-bold">{orders.length}</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Trades</h3>
          <div className="text-2xl font-bold">{trades.length}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={startStrategy}
          disabled={!isConnected || isStrategyActive}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Start Strategy
        </button>
        
        <button
          onClick={stopStrategy}
          disabled={!isStrategyActive}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Stop Strategy
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Recent Signals</h3>
        {signals.length === 0 ? (
          <p className="text-gray-400">No signals generated yet</p>
        ) : (
          <div className="space-y-2">
            {signals.slice(-5).map((signal, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className={`font-semibold ${
                  signal.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {signal.type}
                </span>
                <span>{signal.symbol}</span>
                <span>${signal.price.toFixed(2)}</span>
                <span className="text-sm text-gray-400">
                  {signal.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 