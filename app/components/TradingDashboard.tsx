"use client";

import React, { useState } from 'react';
import { useSignalR } from '../providers/SignalRProvider';
import { TradingStrategy } from './TradingStrategy';

export const TradingDashboard: React.FC = () => {
  const { 
    isConnected, 
    accounts, 
    positions, 
    orders, 
    trades, 
    marketData 
  } = useSignalR();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'orders' | 'trades' | 'strategy'>('overview');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'positions', label: 'Positions' },
    { id: 'orders', label: 'Orders' },
    { id: 'trades', label: 'Trades' },
    { id: 'strategy', label: 'Strategy' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Momentum Trading Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <span className="text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Account Summary */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {accounts.map((account) => (
            <div key={account.id} className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Account {account.id}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="font-semibold">{formatCurrency(account.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equity:</span>
                  <span className="font-semibold">{formatCurrency(account.equity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Profit:</span>
                  <span className={`font-semibold ${getProfitColor(account.profit)}`}>
                    {formatCurrency(account.profit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Margin:</span>
                  <span className="font-semibold">{formatCurrency(account.margin)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{positions.length}</div>
                  <div className="text-gray-400">Open Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">{orders.length}</div>
                  <div className="text-gray-400">Pending Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">{trades.length}</div>
                  <div className="text-gray-400">Total Trades</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">{marketData.length}</div>
                  <div className="text-gray-400">Market Symbols</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {trades.slice(-5).map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-semibold">{trade.symbol}</div>
                      <div className="text-sm text-gray-400">{trade.type}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${getProfitColor(trade.profit)}`}>
                        {formatCurrency(trade.profit)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {trade.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Open Positions</h3>
            {positions.length === 0 ? (
              <p className="text-gray-400">No open positions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3">Symbol</th>
                      <th className="text-left py-3">Type</th>
                      <th className="text-left py-3">Volume</th>
                      <th className="text-left py-3">Open Price</th>
                      <th className="text-left py-3">Current Price</th>
                      <th className="text-left py-3">Profit</th>
                      <th className="text-left py-3">Stop Loss</th>
                      <th className="text-left py-3">Take Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position) => (
                      <tr key={position.id} className="border-b border-gray-700">
                        <td className="py-3 font-semibold">{position.symbol}</td>
                        <td className={`py-3 ${
                          position.type === 'LONG' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {position.type}
                        </td>
                        <td className="py-3">{position.volume}</td>
                        <td className="py-3">{formatCurrency(position.openPrice)}</td>
                        <td className="py-3">{formatCurrency(position.currentPrice)}</td>
                        <td className={`py-3 font-semibold ${getProfitColor(position.profit)}`}>
                          {formatCurrency(position.profit)}
                        </td>
                        <td className="py-3">
                          {position.stopLoss ? formatCurrency(position.stopLoss) : '-'}
                        </td>
                        <td className="py-3">
                          {position.takeProfit ? formatCurrency(position.takeProfit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Pending Orders</h3>
            {orders.length === 0 ? (
              <p className="text-gray-400">No pending orders</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3">Symbol</th>
                      <th className="text-left py-3">Type</th>
                      <th className="text-left py-3">Volume</th>
                      <th className="text-left py-3">Price</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-left py-3">Stop Loss</th>
                      <th className="text-left py-3">Take Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-700">
                        <td className="py-3 font-semibold">{order.symbol}</td>
                        <td className={`py-3 ${
                          order.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {order.type}
                        </td>
                        <td className="py-3">{order.volume}</td>
                        <td className="py-3">{formatCurrency(order.price)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'PENDING' ? 'bg-yellow-600' :
                            order.status === 'FILLED' ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {order.stopLoss ? formatCurrency(order.stopLoss) : '-'}
                        </td>
                        <td className="py-3">
                          {order.takeProfit ? formatCurrency(order.takeProfit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Trade History</h3>
            {trades.length === 0 ? (
              <p className="text-gray-400">No trades found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3">Symbol</th>
                      <th className="text-left py-3">Type</th>
                      <th className="text-left py-3">Volume</th>
                      <th className="text-left py-3">Price</th>
                      <th className="text-left py-3">Profit</th>
                      <th className="text-left py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-gray-700">
                        <td className="py-3 font-semibold">{trade.symbol}</td>
                        <td className={`py-3 ${
                          trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.type}
                        </td>
                        <td className="py-3">{trade.volume}</td>
                        <td className="py-3">{formatCurrency(trade.price)}</td>
                        <td className={`py-3 font-semibold ${getProfitColor(trade.profit)}`}>
                          {formatCurrency(trade.profit)}
                        </td>
                        <td className="py-3 text-sm text-gray-400">
                          {trade.timestamp.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <TradingStrategy />
        )}
      </div>
    </div>
  );
}; 