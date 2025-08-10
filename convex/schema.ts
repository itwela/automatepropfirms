import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Store all historical trades
  trades: defineTable({
    direction: v.string(), // "buy" or "sell"
    comment: v.string(), // "go_long", "exit_long", "go_short", "exit_short"
    symbol: v.string(), // "NQ1!", "MNQ1!", etc.
    contractId: v.string(), // TopStep contract ID
    timeframe: v.string(), // Trading timeframe
    timeOfMessage: v.string(), // When the signal was received
    text: v.string(), // Original signal text
    quantity: v.number(), // Number of contracts
    executedAt: v.number(), // When trade was executed
    status: v.string(), // "open", "closed", "cancelled"
    entryPrice: v.optional(v.number()), // Entry price if available
    exitPrice: v.optional(v.number()), // Exit price if available
    pnl: v.optional(v.number()), // Profit/Loss in points
    pnlDollars: v.optional(v.number()), // Profit/Loss in dollars
    closedAt: v.optional(v.number()), // When position was closed
    signalId: v.string(), // Unique identifier for the signal
    price: v.optional(v.number()), // Price of the trade
  }).index("by_symbol", ["symbol"])
    .index("by_status", ["status"])
    .index("by_signal", ["signalId"]),

  // Store current open positions for NQ/MNQ only
  currentPositions: defineTable({
    symbol: v.string(), // "NQ1!" or "MNQ1!" only
    contractId: v.string(), // TopStep contract ID
    direction: v.string(), // "long" or "short"
    quantity: v.number(), // Number of contracts
    entryPrice: v.optional(v.number()), // Entry price if available
    entryTime: v.number(), // When position was opened
    signalId: v.string(), // Reference to the original signal
    tradeId: v.id("trades"), // Reference to the trade record
    lastUpdate: v.number(), // Last time position was updated
  }).index("by_symbol", ["symbol"])
    .index("by_signal", ["signalId"])
    .index("by_trade", ["tradeId"]),

  // Store signal metadata
  signals: defineTable({
    signalId: v.string(), // Unique identifier for the signal
    direction: v.string(), // "buy" or "sell"
    comment: v.string(), // "go_long", "exit_long", etc.
    symbol: v.string(), // Trading symbol
    timeframe: v.string(), // Trading timeframe
    timeOfMessage: v.string(), // When signal was received
    price: v.optional(v.number()), // Price of the signal
    text: v.string(), // Original signal text
    receivedAt: v.number(), // When signal was processed
    status: v.string(), // "pending", "executed", "failed"
    executedAccounts: v.array(v.number()), // Account IDs where executed
    failedAccounts: v.array(v.number()), // Account IDs where failed
  }).index("by_signal", ["signalId"])
    .index("by_symbol", ["symbol"])
    .index("by_status", ["status"]),
}); 