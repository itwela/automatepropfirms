import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
import { accountService } from '../../services/accountService';
import { authService } from '../../services/authService';
// import { sendToNQPremiumChat_WHOP } from '../../services/whopServices';

dotenv.config();

//  NOTE - ADD A SYMBOL TO CONTRACT MAP AND QUANTITY CONFIG HERE🔥 Symbol to Contract mapping
const SYMBOL_CONTRACT_MAP: Record<string, string> = {
  'XAGUSD': 'CON.F.US.SIL.N25',
  'XAUUSD': 'CON.F.US.MGC.Q25',
  'NQ1!': 'CON.F.US.ENQ.U25',
  'MNQ1!': 'CON.F.US.MNQ.U25',
  'YM1!': 'CON.F.US.YM.U25',
  'XPTUSD': 'CON.F.US.PLE.N25',
  'NGAS': 'CON.F.US.NGE.N25',
};

//  NOTE - ADD A SYMBOL TO CONTRACT MAP AND QUANTITY CONFIG HERE🔥 Flexible Quantity Configuration per Symbol
const SYMBOL_QUANTITY_CONFIG: Record<string, number> = {
  'XAGUSD': 2,  // 2 contracts for Silver
  'XAUUSD': 4,  // 4 contracts for Gold  
  'NQ1!': 1, // 1 contract for Nasdaq 100
  'MNQ1!': 4, // 4 contracts for Nasdaq 100 Micro
  'YM1!': 1, // 1 contract for S&P 500
  'XPTUSD': 1,   // 1 contract for Platinum
  'NGAS': 2,    // 2 contracts for Natural Gas
};

// 🔥 Easy Configuration Management
const TRADING_CONFIG = {
  symbols: SYMBOL_CONTRACT_MAP,
  quantities: SYMBOL_QUANTITY_CONFIG,
  
  // 🔥 Account IDs organized by funding amount
  accountIds: {
    "100k": [
      // 100 K [ X--F--A ] Leader Account - TWEZO
      Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID),
      // 100 K [ COMBINE ] Leader Account - KRIS
      Number(process.env.TOPSTEP_FIRST_100K_COMBINE_ACCOUNT_ID_KRIS),
    ],
    // Add more funding levels as needed:
    // "50k": [
    //   Number(process.env.TOPSTEP_50K_ACCOUNT_ID_1),
    //   Number(process.env.TOPSTEP_50K_ACCOUNT_ID_2),
    // ],
    // "25k": [
    //   Number(process.env.TOPSTEP_25K_ACCOUNT_ID_1),
    // ],
  } as Record<string, number[]>,
  
  // 🔥 Account to User mapping for session tokens
  accountUserMapping: {
    // TWEZO's account
    [Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID)]: {
      username: process.env.NEXT_PUBLIC_USERNAME,
      apiKey: process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY,
    },
    // KRIS's account
    [Number(process.env.TOPSTEP_FIRST_100K_COMBINE_ACCOUNT_ID_KRIS)]: {
      username: process.env.NEXT_PUBLIC_USERNAME_KRIS,
      apiKey: process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY_KRIS,
    },
  } as Record<number, { username: string; apiKey: string }>,
  
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
  
  // Helper function to get all account IDs (flattened from all funding levels)
  getAllAccountIds: (): number[] => {
    return Object.values(TRADING_CONFIG.accountIds).flat();
  },
  
  // Helper function to get account IDs for a specific funding level
  getAccountIdsByFundingLevel: (fundingLevel: string): number[] => {
    return TRADING_CONFIG.accountIds[fundingLevel] || [];
  },
  
  // Helper function to get default account ID (first in first funding level)
  getDefaultAccountId: (): number => {
    const firstFundingLevel = Object.keys(TRADING_CONFIG.accountIds)[0];
    return TRADING_CONFIG.accountIds[firstFundingLevel]?.[0] || 0;
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
  signalId: string;
  price?: number; // Optional price field for exit orders
};

export async function POST(request: Request) {
    const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const convex = new ConvexHttpClient(CONVEX_URL);

    console.log('db', convex)

    try {

        // const results: unknown[] = [];

        // incoming payload from tradingview for signal
        const { 
            text, 
            direction, 
            comment, 
            timeframe, 
            time_Of_Message, 
            symbol ,
            price
        } = await request.json();

        // 🔥 Generate unique signal ID for tracking
        const signalId = `${symbol}_${direction}_${comment}_${Date.now()}`;
        console.log('Signal ID:', signalId);

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

        // Note: Session tokens are now obtained per user in the multi-account functions

        /* 
        // NOTE: 
        FROM HERE ON DOWN TO THE CATCH BLOCK, THIS IS WHERE LETS SAY I HAD AN ACCOUNT ON 
        THE LIVE AND THE CHALLENGE ACCOUNT, I CAN DIFFERENTIATE BETWEEN THE TWO AND PLACE 
        DIFFERENT TRADES ON DIFFERENT ACCOUNTS.
        */

        // 🔥 3. Build the trade object template (without accountId and sessionToken)
        const tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'> = {
            direction,
            comment,
            symbol,
            contractId,
            timeframe,
            timeOfMessage: time_Of_Message,
            text,
            quantity: TRADING_CONFIG.getQuantity(symbol),
            signalId,
            price // Include price in the template
        };

        console.log('Trade Template:', tradeTemplate);
        console.log('Executing on TWEZO account only');

        // 🔥 4. Build super fast routing table (object literal) for single account (TWEZO only)
        const orderActions: Record<string, () => Promise<unknown>> = {
            "buy_go_long": () => placeMarketOrder("buy", tradeTemplate),
            "sell_exit_long": () => closePosition("buy", tradeTemplate),
            "sell_go_short": () => placeMarketOrder("sell", tradeTemplate),
            "buy_exit_short": () => closePosition("sell", tradeTemplate),
        };

        // 🔥 5. Run the appropriate handler on TWEZO account only
        if (orderActions[actionKey]) {
            console.log(`🚀 Executing action: ${actionKey} on TWEZO account`);
            const results = await orderActions[actionKey]();
            console.log('✅ Trade executed successfully on TWEZO account:', results);
            
            // 🔥 Return immediately after successful execution
            return NextResponse.json({ 
                success: true, 
                message: 'Trade executed successfully on TWEZO account',
                action: actionKey,
                tradeTemplate: tradeTemplate,
                results: results
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

// 🔥 Multi-account order placement function - EXECUTING ON BOTH ACCOUNTS EXPLICITLY
// async function placeMarketOrderOnAllAccounts(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>): Promise<unknown[]> {
//     console.log(`🟢 Placing ${side.toUpperCase()} market orders on both accounts for ${tradeTemplate.symbol} (${tradeTemplate.contractId})`);
    
//     const results = [];
    
//     // 🔥 FIRST: Execute on TWEZO's account (100K XFA)
//     const twezoAccountId = Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID);
//     const twezoCredentials = TRADING_CONFIG.accountUserMapping[twezoAccountId];
    
//     try {
//         console.log(`📊 FIRST: Executing on TWEZO's account: ${twezoAccountId}`);
        
//         if (!twezoCredentials) {
//             console.error(`❌ No user credentials found for TWEZO's account ${twezoAccountId}`);
//             results.push({
//                 accountId: twezoAccountId,
//                 success: false,
//                 error: `No user credentials found for TWEZO's account ${twezoAccountId}`
//             });
//         } else {
//             // 🔥 Get session token for TWEZO
//             console.log(`🔑 Getting session token for TWEZO: ${twezoCredentials.username}`);
//             const twezoSessionToken = await authService.getSessionToken(twezoCredentials.username, twezoCredentials.apiKey);
//             console.log(`✅ Session token obtained for TWEZO's account ${twezoAccountId}`);
            
//             if (side === "buy") {
//                 const twezoResult = await accountService.openLongPosition(
//                     twezoSessionToken, 
//                     twezoAccountId, 
//                     tradeTemplate.contractId, 
//                     tradeTemplate.quantity
//                 );
                
//                 results.push({
//                     accountId: twezoAccountId,
//                     success: true,
//                     action: 'OPEN_LONG',
//                     user: twezoCredentials.username,
//                     result: twezoResult
//                 });
                
//                 console.log(`✅ Successfully executed LONG on TWEZO's account ${twezoAccountId}`);
//             } else {
//                 const twezoResult = await accountService.openShortPosition(
//                     twezoSessionToken, 
//                     twezoAccountId, 
//                     tradeTemplate.contractId, 
//                     tradeTemplate.quantity
//                 );
                
//                 results.push({
//                     accountId: twezoAccountId,
//                     success: true,
//                     action: 'OPEN_SHORT',
//                     user: twezoCredentials.username,
//                     result: twezoResult
//                 });
                
//                 console.log(`✅ Successfully executed SHORT on TWEZO's account ${twezoAccountId}`);
//             }
//         }
//     } catch (error) {
//         console.error(`❌ Error executing on TWEZO's account ${twezoAccountId}:`, error);
//         results.push({
//             accountId: twezoAccountId,
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
    
//     // 🔥 SECOND: Execute on KRIS's account (100K COMBINE)
//     const krisAccountId = Number(process.env.TOPSTEP_FIRST_100K_COMBINE_ACCOUNT_ID_KRIS);
//     const krisCredentials = TRADING_CONFIG.accountUserMapping[krisAccountId];
    
//     try {
//         console.log(`📊 SECOND: Executing on KRIS's account: ${krisAccountId}`);
        
//         if (!krisCredentials) {
//             console.error(`❌ No user credentials found for KRIS's account ${krisAccountId}`);
//             results.push({
//                 accountId: krisAccountId,
//                 success: false,
//                 error: `No user credentials found for KRIS's account ${krisAccountId}`
//             });
//         } else {
//             // 🔥 Get session token for KRIS
//             console.log(`🔑 Getting session token for KRIS: ${krisCredentials.username}`);
//             const krisSessionToken = await authService.getSessionToken(krisCredentials.username, krisCredentials.apiKey);
//             console.log(`✅ Session token obtained for KRIS's account ${krisAccountId}`);
            
//             if (side === "buy") {
//                 const krisResult = await accountService.openLongPosition(
//                     krisSessionToken, 
//                     krisAccountId, 
//                     tradeTemplate.contractId, 
//                     tradeTemplate.quantity
//                 );
                
//                 results.push({
//                     accountId: krisAccountId,
//                     success: true,
//                     action: 'OPEN_LONG',
//                     user: krisCredentials.username,
//                     result: krisResult
//                 });
                
//                 console.log(`✅ Successfully executed LONG on KRIS's account ${krisAccountId}`);
//             } else {
//                 const krisResult = await accountService.openShortPosition(
//                     krisSessionToken, 
//                     krisAccountId, 
//                     tradeTemplate.contractId, 
//                     tradeTemplate.quantity
//                 );
                
//                 results.push({
//                     accountId: krisAccountId,
//                     success: true,
//                     action: 'OPEN_SHORT',
//                     user: krisCredentials.username,
//                     result: krisResult
//                 });
                
//                 console.log(`✅ Successfully executed SHORT on KRIS's account ${krisAccountId}`);
//             }
//         }
//     } catch (error) {
//         console.error(`❌ Error executing on KRIS's account ${krisAccountId}:`, error);
//         results.push({
//             accountId: krisAccountId,
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
    
//     return results;
// }

// 🔥 Multi-account position closing function - EXECUTING ON BOTH ACCOUNTS EXPLICITLY
// async function closePositionOnAllAccounts(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>): Promise<unknown[]> {
//     console.log(`🔴 Closing ${side.toUpperCase()} positions on both accounts for ${tradeTemplate.symbol} (${tradeTemplate.contractId})`);
    
//     const results = [];
    
//     // 🔥 FIRST: Close position on TWEZO's account (100K XFA)
//     const twezoAccountId = Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID);
//     const twezoCredentials = TRADING_CONFIG.accountUserMapping[twezoAccountId];
    
//     try {
//         console.log(`📊 FIRST: Closing position on TWEZO's account: ${twezoAccountId}`);
        
//         if (!twezoCredentials) {
//             console.error(`❌ No user credentials found for TWEZO's account ${twezoAccountId}`);
//             results.push({
//                 accountId: twezoAccountId,
//                 success: false,
//                 error: `No user credentials found for TWEZO's account ${twezoAccountId}`
//             });
//         } else {
//             // 🔥 Get session token for TWEZO
//             console.log(`🔑 Getting session token for TWEZO: ${twezoCredentials.username}`);
//             const twezoSessionToken = await authService.getSessionToken(twezoCredentials.username, twezoCredentials.apiKey);
//             console.log(`✅ Session token obtained for TWEZO's account ${twezoAccountId}`);
            
//             const twezoResult = await accountService.closePosition(
//                 twezoSessionToken, 
//                 twezoAccountId, 
//                 tradeTemplate.contractId
//             );
            
//             results.push({
//                 accountId: twezoAccountId,
//                 success: true,
//                 action: 'CLOSE_POSITION',
//                 symbol: tradeTemplate.symbol,
//                 contractId: tradeTemplate.contractId,
//                 side: side,
//                 user: twezoCredentials.username,
//                 result: twezoResult
//             });
            
//             console.log(`✅ Successfully closed position on TWEZO's account ${twezoAccountId}`);
//         }
//     } catch (error) {
//         console.error(`❌ Error closing position on TWEZO's account ${twezoAccountId}:`, error);
//         results.push({
//             accountId: twezoAccountId,
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
    
//     // 🔥 SECOND: Close position on KRIS's account (100K COMBINE)
//     const krisAccountId = Number(process.env.TOPSTEP_FIRST_100K_COMBINE_ACCOUNT_ID_KRIS);
//     const krisCredentials = TRADING_CONFIG.accountUserMapping[krisAccountId];
    
//     try {
//         console.log(`📊 SECOND: Closing position on KRIS's account: ${krisAccountId}`);
        
//         if (!krisCredentials) {
//             console.error(`❌ No user credentials found for KRIS's account ${krisAccountId}`);
//             results.push({
//                 accountId: krisAccountId,
//                 success: false,
//                 error: `No user credentials found for KRIS's account ${krisAccountId}`
//             });
//         } else {
//             // 🔥 Get session token for KRIS
//             console.log(`🔑 Getting session token for KRIS: ${krisCredentials.username}`);
//             const krisSessionToken = await authService.getSessionToken(krisCredentials.username, krisCredentials.apiKey);
//             console.log(`✅ Session token obtained for KRIS's account ${krisAccountId}`);
            
//             const krisResult = await accountService.closePosition(
//                 krisSessionToken, 
//                 krisAccountId, 
//                 tradeTemplate.contractId
//             );
            
//             results.push({
//                 accountId: krisAccountId,
//                 success: true,
//                 action: 'CLOSE_POSITION',
//                 symbol: tradeTemplate.symbol,
//                 contractId: tradeTemplate.contractId,
//                 side: side,
//                 user: krisCredentials.username,
//                 result: krisResult
//                 });
            
//             console.log(`✅ Successfully closed position on KRIS's account ${krisAccountId}`);
//         }
//     } catch (error) {
//         console.error(`❌ Error closing position on KRIS's account ${krisAccountId}:`, error);
//         results.push({
//             accountId: krisAccountId,
//             success: false,
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
    
//     return results;
// }


// 🔥 Ultra-fast order placement function using accountService (TWEZO only)
async function placeMarketOrder(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>) {
// async function placeMarketOrder(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>, convex: ConvexHttpClient) {
    console.log(`🟢 Placing ${side.toUpperCase()} market order for ${tradeTemplate.symbol} (${tradeTemplate.contractId}) on TWEZO's account`);
    
    try {
        // Get TWEZO's credentials
        const twezoAccountId = Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID);
        const twezoCredentials = TRADING_CONFIG.accountUserMapping[twezoAccountId];
        
        if (!twezoCredentials) {
            throw new Error(`No user credentials found for TWEZO's account ${twezoAccountId}`);
        }
        
        // Get session token for TWEZO
        const sessionToken = await authService.getSessionToken(twezoCredentials.username, twezoCredentials.apiKey);
        
        if (side === "buy") {
            return await accountService.openLongPosition(sessionToken, twezoAccountId, tradeTemplate.contractId, tradeTemplate.quantity);
        } else {
            return await accountService.openShortPosition(sessionToken, twezoAccountId, tradeTemplate.contractId, tradeTemplate.quantity);
        }
    } catch (error) {
        console.error(`❌ Error placing ${side} order:`, error);
        throw error;
    }
}

// 🔥 Ultra-fast position closing function using accountService (TWEZO only)
// async function closePosition(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>, convex: ConvexHttpClient) {
async function closePosition(side: string, tradeTemplate: Omit<Trade, 'accountId' | 'sessionToken'>) {
    console.log(`🔴 Closing ${side.toUpperCase()} position for ${tradeTemplate.symbol} (${tradeTemplate.contractId}) on TWEZO's account`);
    
    try {
        // Get TWEZO's credentials
        const twezoAccountId = Number(process.env.TOPSTEP_FIRST_XFA_100K_FUNDED_ACCOUNT_ID);
        const twezoCredentials = TRADING_CONFIG.accountUserMapping[twezoAccountId];
        
        if (!twezoCredentials) {
            throw new Error(`No user credentials found for TWEZO's account ${twezoAccountId}`);
        }
        
        // Get session token for TWEZO
        const sessionToken = await authService.getSessionToken(twezoCredentials.username, twezoCredentials.apiKey);
        
        // Close the position using accountService
        const result = await accountService.closePosition(sessionToken, twezoAccountId, tradeTemplate.contractId);
        
        return {
            success: result,
            action: 'CLOSE_POSITION',
            symbol: tradeTemplate.symbol,
            contractId: tradeTemplate.contractId,
            side: side
        };
    } catch (error) {
        console.error(`❌ Error closing ${side} position:`, error);
        throw error;
    }
}

