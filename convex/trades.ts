import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new trade record
export const createTrade = mutation({
  args: {
    direction: v.string(),
    comment: v.string(),
    symbol: v.string(),
    contractId: v.string(),
    timeframe: v.string(),
    timeOfMessage: v.string(),
    text: v.string(),
    quantity: v.number(),
    signalId: v.string(),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    
      const tradeId = await ctx.db.insert("trades", {
        ...args,
        executedAt: Date.now(),
        status: "open",
      });

      // If this is NQ or MNQ, also create/update current position
      const direction = args.comment.includes("long") ? "long" : "short";
      
      // Check if there's already a position for this account/symbol
      const existingPosition = await ctx.db
        .query("currentPositions")
        .filter((q) => q.eq(q.field("symbol"), args.symbol))
        .first();

      if (existingPosition) {

        // Update existing position
        await ctx.db.patch(existingPosition._id, {
          direction,
          quantity: args.quantity,
          entryTime: Date.now(),
          signalId: args.signalId,
          tradeId,
          lastUpdate: Date.now(),
        });

      } else {

        // Create new position
        await ctx.db.insert("currentPositions", {
          symbol: args.symbol,
          contractId: args.contractId,
          direction,
          quantity: args.quantity,
          entryTime: Date.now(),
          signalId: args.signalId,
          tradeId,
          lastUpdate: Date.now(),
        });

      }

    return tradeId;
  },
});

// Close a trade and calculate P&L
export const closeTrade = mutation({
  args: {
    tradeId: v.id("trades"),
    exitPrice: v.optional(v.number()),
    pnl: v.optional(v.number()),
    pnlDollars: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trade = await ctx.db.get(args.tradeId);
    if (!trade) {
      throw new Error("Trade not found");
    }

    // Update trade status
    await ctx.db.patch(args.tradeId, {
      status: "closed",
      exitPrice: args.exitPrice,
      pnl: args.pnl,
      pnlDollars: args.pnlDollars,
      closedAt: Date.now(),
    });

    // If this is NQ or MNQ, remove from current positions
    if (trade.symbol === "NQ1!" || trade.symbol === "MNQ1!") {
      const position = await ctx.db
        .query("currentPositions")
        .withIndex("by_trade", (q) => q.eq("tradeId", args.tradeId))
        .first();

      if (position) {
        await ctx.db.delete(position._id);
      }
    }

    return { success: true };
  },
});

// Get current NQ/MNQ positions for P&L calculation
export const getCurrentNQPositions = query({
  args: {},
  handler: async (ctx) => {
    const nqPositions = await ctx.db
      .query("currentPositions")
      .withIndex("by_symbol", (q) => q.eq("symbol", "NQ1!"))
      .collect();

    const mnqPositions = await ctx.db
      .query("currentPositions")
      .withIndex("by_symbol", (q) => q.eq("symbol", "MNQ1!"))
      .collect();

    return {
      nq: nqPositions,
      mnq: mnqPositions,
      all: [...nqPositions, ...mnqPositions],
    };
  },
});

// Get trade history for a specific account
export const getAccountTradeHistory = query({
  args: { accountId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trades")
      .order("desc")
      .collect();
  },
});

// Get all trades for a specific symbol
export const getSymbolTrades = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trades")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .order("desc")
      .collect();
  },
});

// Create or update a signal record
export const upsertSignal = mutation({
  args: {
    signalId: v.string(),
    direction: v.string(),
    comment: v.string(),
    symbol: v.string(),
    timeframe: v.string(),
    timeOfMessage: v.string(),
    text: v.string(),
    executedAccounts: v.array(v.number()),
    failedAccounts: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const existingSignal = await ctx.db
      .query("signals")
      .withIndex("by_signal", (q) => q.eq("signalId", args.signalId))
      .first();

    if (existingSignal) {
      // Update existing signal
      await ctx.db.patch(existingSignal._id, {
        status: "executed",
        executedAccounts: args.executedAccounts,
        failedAccounts: args.failedAccounts,
      });
    } else {
      // Create new signal
      await ctx.db.insert("signals", {
        ...args,
        receivedAt: Date.now(),
        status: "executed",
      });
    }

    return { success: true };
  },
});

// Get signal by ID
export const getSignal = query({
  args: { signalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_signal", (q) => q.eq("signalId", args.signalId))
      .first();
  },
}); 