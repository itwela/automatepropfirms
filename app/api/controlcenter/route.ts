import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
import { accountService } from '../../services/accountService';
import { authService } from '../../services/authService';
// import { sendSignalsToWhopChats } from '../../services/whopServices';

dotenv.config();

//  NOTE - ADD A SYMBOL TO CONTRACT MAP AND QUANTITY CONFIG HERE🔥 Symbol to Contract mapping
const SYMBOL_CONTRACT_MAP: Record<string, string> = {
  'XAGUSD': 'CON.F.US.SIL.N25',
  'XAUUSD': 'CON.F.US.MGC.Q25',
  'NQ1!': 'CON.F.US.ENQ.U25',
  'XPTUSD': 'CON.F.US.PLE.N25',
  'NGAS': 'CON.F.US.NGE.N25',
};

//  NOTE - ADD A SYMBOL TO CONTRACT MAP AND QUANTITY CONFIG HERE🔥 Flexible Quantity Configuration per Symbol
const SYMBOL_QUANTITY_CONFIG: Record<string, number> = {
  'XAGUSD': 2,  // 2 contracts for Silver
  'XAUUSD': 4,  // 4 contracts for Gold  
  'NQ1!': 1, // 3 contracts for Nasdaq 100
  'XPTUSD': 1,   // 1 contract for Platinum
  'NGAS': 2,    // 2 contracts for Natural Gas
};

// 🔥 Easy Configuration Management
const TRADING_CONFIG = {
  symbols: SYMBOL_CONTRACT_MAP,
  quantities: SYMBOL_QUANTITY_CONFIG,
  
  // 🔥 Account IDs Array
  accountIds: [
    10173792,   // 100k Funded Challenge Leader Account
    // 9380393,   // 100k Funded Challenge - Currently Disabled - 3 DOLLARS FROM PASSING :D
],
  
  // Helper function to get quantity for a symbol
  getQuantity: (symbol: string): number => {
    return SYMBOL_QUANTITY_CONFIG[symbol] || 1; // Default to 1 if not configured
  },
  
  // Helper function to get contract for a symbol
  getContract: (symbol: string): string | null => {
    return SYMBOL_CONTRACT_MAP[symbol] || null;
  },
  
  // Helper function to validate symbol
  isValidSymbol: (symbol: string): boolean => {
    return symbol in SYMBOL_CONTRACT_MAP;
  },
  
  // Helper function to get default account ID (first in array)
  getDefaultAccountId: (): number => {
    return TRADING_CONFIG.accountIds[0]; // Use first account ID
  }
};

// Define a type for the trade object
type Trade = {
  direction: string;
  comment: string;
  symbol: string;
  contractId: string;
  accountId: number;
  timeframe: string;
  timeOfMessage: string;
  text: string;
  quantity: number;
  sessionToken: string;
};

export async function POST(request: Request) {
    const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(CONVEX_URL);

    console.log('db', convex)

    try {

        // incoming payload from tradingview for signal
        const { 
            text, 
            direction, 
            comment, 
            timeframe, 
            time_Of_Message, 
            symbol 
        } = await request.json();

        console.log('=== TRADING SIGNAL RECEIVED ===');
        console.log('Text:', text);
        console.log('Direction:', direction);
        console.log('Comment:', comment);
        console.log('Timeframe:', timeframe);
        console.log('Time of Message:', time_Of_Message);
        console.log('Symbol:', symbol);

        // 🔥 1. Build a simple action key
        const actionKey = `${direction}_${comment}`;
        console.log('Action Key:', actionKey);

        // 🔥 2. Map symbol to contract and get quantity
        const contractId = TRADING_CONFIG.getContract(symbol);
        if (!contractId) {
            console.error('❌ Unknown symbol:', symbol);
            return NextResponse.json({ 
                success: false, 
                error: `Unknown symbol: ${symbol}` 
            }, { status: 400 });
        }

        const quantity = TRADING_CONFIG.getQuantity(symbol);
        console.log('Contract ID:', contractId);
        console.log('Quantity:', quantity, 'contracts');

        // Get account ID from configuration (first in array)
        const accountId = TRADING_CONFIG.getDefaultAccountId();
        console.log('Account ID:', accountId, '(Leader Account)');

        // Get session token
        const username = process.env.NEXT_PUBLIC_USERNAME;
        const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
        
        if (!username || !apiKey) {
            console.error('❌ Username and API key must be configured');
            return NextResponse.json({ 
                success: false, 
                error: 'Username and API key must be configured' 
            }, { status: 400 });
        }

        const sessionToken = await authService.getSessionToken(username, apiKey);

        /* 
        // NOTE: 
        FROM HERE ON DOWN TO THE CATCH BLOCK, THIS IS WHERE LETS SAY I HAD AN ACCOUNT ON 
        THE LIVE AND THE CHALLENGE ACCOUNT, I CAN DIFFERENTIATE BETWEEN THE TWO AND PLACE 
        DIFFERENT TRADES ON DIFFERENT ACCOUNTS.
        */

        // 🔥 3. Build the trade object
        const trade: Trade = {
            direction,
            comment,
            symbol,
            contractId,
            accountId,
            timeframe,
            timeOfMessage: time_Of_Message,
            text,
            quantity: TRADING_CONFIG.getQuantity(symbol),
            sessionToken
        };

        console.log('Trade Object:', trade);

        // 🔥 4. Build super fast routing table (object literal)
        const orderActions: Record<string, () => Promise<unknown>> = {
            "buy_go_long": () => placeMarketOrder("buy", trade),
            "sell_exit_long": () => closePosition("buy", trade),
            "sell_go_short": () => placeMarketOrder("sell", trade),
            "buy_exit_short": () => closePosition("sell", trade),
        };

        // 🔥 5. Run the appropriate handler
        if (orderActions[actionKey]) {
            console.log(`🚀 Executing action: ${actionKey}`);
            const result = await orderActions[actionKey]();
            console.log('✅ Trade executed successfully:', result);
            
            return NextResponse.json({ 
                success: true, 
                message: 'Trade executed successfully',
                action: actionKey,
                trade: trade,
                result: result
            });
            
        } else {
            console.error("❌ Unknown trade action:", actionKey);
            return NextResponse.json({ 
                success: false, 
                error: `Unknown trade action: ${actionKey}` 
            }, { status: 400 });
        }

    } catch (error) {
        console.error('❌ Error processing trade:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// 🔥 Ultra-fast order placement function using accountService
async function placeMarketOrder(side: string, trade: Trade) {
    console.log(`🟢 Placing ${side.toUpperCase()} market order for ${trade.symbol} (${trade.contractId})`);
    
    try {
        if (side === "buy") {
            return await accountService.openLongPosition(trade.sessionToken, trade.accountId, trade.contractId, trade.quantity);
        } else {
            return await accountService.openShortPosition(trade.sessionToken, trade.accountId, trade.contractId, trade.quantity);
        }
    } catch (error) {
        console.error(`❌ Error placing ${side} order:`, error);
        throw error;
    }
}

// 🔥 Ultra-fast position closing function using accountService
async function closePosition(side: string, trade: Trade) {
    console.log(`🔴 Closing ${side.toUpperCase()} position for ${trade.symbol} (${trade.contractId})`);
    
    try {
        // Close the position using accountService
        const result = await accountService.closePosition(trade.sessionToken, trade.accountId, trade.contractId);
        
        return {
            success: result,
            action: 'CLOSE_POSITION',
            symbol: trade.symbol,
            contractId: trade.contractId,
            side: side
        };
    } catch (error) {
        console.error(`❌ Error closing ${side} position:`, error);
        throw error;
    }
}