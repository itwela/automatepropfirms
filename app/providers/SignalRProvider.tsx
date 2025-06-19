"use client";

import { HttpTransportType, HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Types for the trading data
export interface AccountData {
  id: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  profit: number;
}

export interface OrderData {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  timestamp: Date;
}

export interface PositionData {
  id: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: Date;
}

export interface TradeData {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  profit: number;
  timestamp: Date;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

interface SignalRContextType {
  connection: HubConnection | null;
  isConnected: boolean;
  accounts: AccountData[];
  orders: OrderData[];
  positions: PositionData[];
  trades: TradeData[];
  marketData: MarketData[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  subscribeToAccount: (accountId: number) => void;
  subscribeToOrders: (accountId: number) => void;
  subscribeToPositions: (accountId: number) => void;
  subscribeToTrades: (accountId: number) => void;
  subscribeToMarket: (symbols: string[]) => void;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const useSignalR = () => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalR must be used within a SignalRProvider');
  }
  return context;
};

interface SignalRProviderProps {
  children: React.ReactNode;
  jwtToken: string;
  selectedAccountId: number;
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({ 
  children, 
  jwtToken, 
  selectedAccountId 
}) => {
  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (isConnected || connection || isConnecting) {
      console.log('Already connected or connecting, skipping...');
      return;
    }
    if (!jwtToken) {
      console.error('No JWT token provided for SignalR connection');
      return;
    }
    setIsConnecting(true);
    try {
      console.log('Connecting to SignalR with ProjectX API key...');
      const userHubUrl = `https://rtc.topstepx.com/hubs/user?access_token=${jwtToken}`;
      const rtcConnection = new HubConnectionBuilder()
        .withUrl(userHubUrl, {
          transport: HttpTransportType.WebSockets,
          timeout: 30000 // 30s
        })
        .withAutomaticReconnect([0, 5000, 15000, 30000]) // 0s, 5s, 15s, 30s
        .build();

      rtcConnection.onclose((error) => {
        console.log('SignalR connection closed:', error);
        setIsConnected(false);
        setConnection(null);
        setIsConnecting(false);
      });
      rtcConnection.onreconnecting((error) => {
        console.log('SignalR reconnecting due to error:', error);
        setIsConnected(false);
      });
      rtcConnection.onreconnected((connectionId) => {
        console.log('SignalR reconnected with ID:', connectionId);
        setIsConnected(true);
        setTimeout(() => {
          if (selectedAccountId && rtcConnection.state === 'Connected') {
            console.log('Resubscribing to channels after reconnection...');
            rtcConnection.invoke('SubscribeAccounts').catch(console.error);
            rtcConnection.invoke('SubscribeOrders', selectedAccountId).catch(console.error);
            rtcConnection.invoke('SubscribePositions', selectedAccountId).catch(console.error);
            rtcConnection.invoke('SubscribeTrades', selectedAccountId).catch(console.error);
          }
        }, 1000);
      });

      rtcConnection.on('GatewayUserAccount', (data: AccountData) => {
        console.log('Received account update:', data);
        setAccounts(prev => {
          const existing = prev.find(acc => acc.id === data.id);
          if (existing) {
            return prev.map(acc => acc.id === data.id ? data : acc);
          }
          return [...prev, data];
        });
      });
      rtcConnection.on('GatewayUserOrder', (data: OrderData) => {
        console.log('Received order update:', data);
        setOrders(prev => {
          const existing = prev.find(order => order.id === data.id);
          if (existing) {
            return prev.map(order => order.id === data.id ? data : order);
          }
          return [...prev, data];
        });
      });
      rtcConnection.on('GatewayUserPosition', (data: PositionData) => {
        console.log('Received position update:', data);
        setPositions(prev => {
          const existing = prev.find(pos => pos.id === data.id);
          if (existing) {
            return prev.map(pos => pos.id === data.id ? data : pos);
          }
          return [...prev, data];
        });
      });
      rtcConnection.on('GatewayUserTrade', (data: TradeData) => {
        console.log('Received trade update:', data);
        setTrades(prev => {
          const existing = prev.find(trade => trade.id === data.id);
          if (existing) {
            return prev.map(trade => trade.id === data.id ? data : trade);
          }
          return [...prev, data];
        });
      });

      console.log('Starting SignalR connection...');
      await rtcConnection.start();
      setConnection(rtcConnection);
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to ProjectX TopStep SignalR hub');

      if (selectedAccountId) {
        console.log('Subscribing to account channels for ID:', selectedAccountId);
        try {
          await rtcConnection.invoke('SubscribeAccounts');
          await rtcConnection.invoke('SubscribeOrders', selectedAccountId);
          await rtcConnection.invoke('SubscribePositions', selectedAccountId);
          await rtcConnection.invoke('SubscribeTrades', selectedAccountId);
          console.log('Successfully subscribed to all channels');
        } catch (error) {
          console.error('Error subscribing to channels:', error);
        }
      }
    } catch (error) {
      setIsConnecting(false);
      setIsConnected(false);
      setConnection(null);
      console.error('Error starting SignalR connection:', error);
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          console.error('Authentication failed - check your JWT token');
        } else if (error.message.includes('403')) {
          console.error('Access forbidden - check your account permissions');
        } else if (error.message.includes('timeout')) {
          console.error('Connection timeout - check your network connection');
        }
      }
    }
  }, [jwtToken, selectedAccountId, isConnected, connection, isConnecting]);

  const disconnect = useCallback(async () => {
    if (connection) {
      try {
        console.log('Disconnecting from SignalR...');
        await connection.stop();
        console.log('Successfully disconnected from SignalR');
      } catch (error) {
        console.error('Error stopping SignalR connection:', error);
      } finally {
        setConnection(null);
        setIsConnected(false);
      }
    } else {
      console.log('No active connection to disconnect');
      setIsConnected(false);
    }
  }, [connection]);

  const subscribeToAccount = useCallback(async () => {
    if (connection && isConnected && connection.state === 'Connected') {
      try {
        await connection.invoke('SubscribeAccounts');
        console.log('Successfully subscribed to accounts');
      } catch (error) {
        console.error('Error subscribing to accounts:', error);
      }
    } else {
      console.warn('Cannot subscribe to accounts - connection not ready');
    }
  }, [connection, isConnected]);

  const subscribeToOrders = useCallback(async (accountId: number) => {
    if (connection && isConnected && connection.state === 'Connected') {
      try {
        await connection.invoke('SubscribeOrders', accountId);
        console.log(`Successfully subscribed to orders for account ${accountId}`);
      } catch (error) {
        console.error('Error subscribing to orders:', error);
      }
    } else {
      console.warn('Cannot subscribe to orders - connection not ready');
    }
  }, [connection, isConnected]);

  const subscribeToPositions = useCallback(async (accountId: number) => {
    if (connection && isConnected && connection.state === 'Connected') {
      try {
        await connection.invoke('SubscribePositions', accountId);
        console.log(`Successfully subscribed to positions for account ${accountId}`);
      } catch (error) {
        console.error('Error subscribing to positions:', error);
      }
    } else {
      console.warn('Cannot subscribe to positions - connection not ready');
    }
  }, [connection, isConnected]);

  const subscribeToTrades = useCallback(async (accountId: number) => {
    if (connection && isConnected && connection.state === 'Connected') {
      try {
        await connection.invoke('SubscribeTrades', accountId);
        console.log(`Successfully subscribed to trades for account ${accountId}`);
      } catch (error) {
        console.error('Error subscribing to trades:', error);
      }
    } else {
      console.warn('Cannot subscribe to trades - connection not ready');
    }
  }, [connection, isConnected]);

  const subscribeToMarket = useCallback((symbols: string[]) => {
    if (connection && isConnected) {
      // This would need to be implemented based on the market hub
      // For now, we'll just log the request
      console.log('Market subscription requested for symbols:', symbols);
    }
  }, [connection, isConnected]);

  useEffect(() => {
    // Only auto-connect if both jwtToken and selectedAccountId are provided
    // and we're not already connected
    if (jwtToken && selectedAccountId && !isConnected) {
      console.log('Initializing SignalR connection with ProjectX API key');
      connect();
    }

    return () => {
      disconnect();
    };
  }, [jwtToken, selectedAccountId, connect, disconnect, isConnected]);

  useEffect(() => {
    const functionToUseNeededVariablesForSuccessfulBuild = () => {
      console.log('Need To Log', setMarketData);
    }

    functionToUseNeededVariablesForSuccessfulBuild();
  }, []);

  const value: SignalRContextType = {
    connection,
    isConnected,
    accounts,
    orders,
    positions,
    trades,
    marketData,
    connect,
    disconnect,
    subscribeToAccount,
    subscribeToOrders,
    subscribeToPositions,
    subscribeToTrades,
    subscribeToMarket,
  };

  return (
    <SignalRContext.Provider value={value}>
      {children}
    </SignalRContext.Provider>
  );
}; 