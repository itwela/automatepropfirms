# Momentum Trading Bot Setup Guide

## Overview
This is a Next.js application that implements your momentum trading strategy with real-time SignalR integration for PropFirm trading.

## Prerequisites
- Node.js 18+ installed
- PropFirm account with API access
- JWT token for SignalR connection

## Installation

1. Install dependencies:
```bash
npm install @microsoft/signalr @types/microsoft__signalr
```

2. Create environment file:
Create a `.env.local` file in the root directory with the following variables:

```env
# SignalR Connection
NEXT_PUBLIC_JWT_TOKEN=your_jwt_token_here

# Trading Strategy Configuration
NEXT_PUBLIC_MA_LENGTH=6
NEXT_PUBLIC_RMI_LENGTH=4
NEXT_PUBLIC_MOMENTUM_LENGTH=5
NEXT_PUBLIC_OVERBOUGHT_LEVEL=70
NEXT_PUBLIC_OVERSOLD_LEVEL=30

# Risk Management
NEXT_PUBLIC_TRAIL_PERCENTAGE=0.06
NEXT_PUBLIC_FIXED_STOP_LOSS=0.09
NEXT_PUBLIC_TRAIL_OFFSET=0.004
NEXT_PUBLIC_MAX_INTRADAY_LOSS=2

# Trading Hours (GMT)
NEXT_PUBLIC_TRADING_START_HOUR=6
NEXT_PUBLIC_TRADING_END_HOUR=17

# FVG Timeframes
NEXT_PUBLIC_FVG_TIMEFRAMES=5m,1h,4h
```

3. Run the development server:
```bash
npm run dev
```

## Features Implemented

### 1. SignalR Provider (`/app/providers/SignalRProvider.tsx`)
- Real-time connection to PropFirm's SignalR hub
- Automatic reconnection handling
- Data management for accounts, orders, positions, and trades
- TypeScript interfaces for all trading data

### 2. Trading Strategy Engine (`/app/components/TradingStrategy.tsx`)
- Complete implementation of your Pine Script strategy
- EMA calculation with configurable parameters
- RMI (Relative Momentum Index) calculation
- Fair Value Gap (FVG) detection across multiple timeframes
- Entry condition validation
- Risk management with trailing stops

### 3. Trading Dashboard (`/app/components/TradingDashboard.tsx`)
- Real-time account overview
- Position management
- Order tracking
- Trade history
- Strategy control panel

## Strategy Components

### Moving Average System
- EMA with configurable length (default: 6)
- Direction detection over 3 periods
- Color-coded visualization

### RMI Implementation
- Custom RMI calculation
- Configurable parameters (length: 4, momentum: 5)
- Overbought/Oversold levels (70/30)

### Fair Value Gaps
- Multi-timeframe detection (5m, 1h, 4h)
- Bullish and bearish FVG tracking
- Automatic fill detection

### Entry Conditions
**Long Entry:**
1. Price makes lower low than previous candle
2. Previous candle is bearish
3. MA direction is bullish
4. Price inside bullish FVG
5. Current candle is bullish
6. No existing position

**Short Entry:**
1. Price makes higher high than previous candle
2. Previous candle is bullish
3. MA direction is bearish
4. Price inside bearish FVG
5. Current candle is bearish
6. No existing position

### Risk Management
- Trailing stop loss: 0.06%
- Fixed stop loss: 0.09%
- Trail offset: 0.004%
- Maximum intraday loss: 2%
- Trading hours: 6:30-17:55 GMT

## Usage

1. **Setup Connection:**
   - Add your JWT token to `.env.local`
   - Set your account ID
   - The app will automatically connect to SignalR

2. **Monitor Dashboard:**
   - Overview tab shows account summary and quick stats
   - Positions tab displays open positions
   - Orders tab shows pending orders
   - Trades tab shows trade history
   - Strategy tab controls the trading algorithm

3. **Strategy Control:**
   - Start/Stop the trading strategy
   - Monitor real-time signals
   - View strategy performance

## Customization

### Strategy Parameters
You can modify the strategy parameters in the `TradingStrategy.tsx` file:

```typescript
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
  tradingDays: [1, 2, 3, 4, 5]
};
```

### Adding New Indicators
To add new technical indicators, extend the `TradingStrategyEngine` class:

```typescript
private calculateNewIndicator(data: CandleData[]): number[] {
  // Your indicator calculation
  return [];
}
```

## Security Notes

1. **Environment Variables:** Never commit your `.env.local` file to version control
2. **JWT Tokens:** Keep your JWT token secure and rotate regularly
3. **API Limits:** Be aware of PropFirm's API rate limits
4. **Testing:** Always test with paper trading first

## Troubleshooting

### Connection Issues
- Verify your JWT token is valid
- Check your internet connection
- Ensure PropFirm's API is accessible

### Strategy Issues
- Check console logs for error messages
- Verify all parameters are within valid ranges
- Ensure sufficient historical data is available

## Next Steps

1. **Backtesting:** Implement historical data backtesting
2. **Paper Trading:** Test with paper trading account first
3. **Monitoring:** Add email/SMS alerts for important events
4. **Optimization:** Fine-tune parameters based on performance
5. **Additional Features:** Add more technical indicators or filters

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify your configuration parameters
3. Test with smaller position sizes first
4. Monitor the strategy performance closely

Remember: This is a sophisticated trading system. Always start with paper trading and small position sizes to ensure everything works as expected. 