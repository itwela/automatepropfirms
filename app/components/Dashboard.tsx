"use client";

import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { accountService, AccountInfo, Position } from '../services/accountService';

export const Dashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  const [closingPositionId, setClosingPositionId] = useState<number | null>(null);

  const addLog = (message: string) => {
    console.log(`[Dashboard] ${message}`);
  };

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Auto-refresh positions every 5 minutes when an account is selected
  useEffect(() => {
    if (!selectedAccount) return;

    // Initial load
    loadPositions(selectedAccount);

    // Set next refresh time
    const nextRefresh = new Date(Date.now() + 5 * 60 * 1000);
    setNextRefreshTime(nextRefresh);

    // Set up interval for auto-refresh (5 minutes = 300,000 ms)
    const intervalId = setInterval(() => {
      addLog('Auto-refreshing positions...');
      loadPositions(selectedAccount);
      
      // Update next refresh time
      const newNextRefresh = new Date(Date.now() + 5 * 60 * 1000);
      setNextRefreshTime(newNextRefresh);
    }, 5 * 60 * 1000);

    // Cleanup interval on unmount or when selectedAccount changes
    return () => {
      clearInterval(intervalId);
    };
  }, [selectedAccount]);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    setError(null);
    
    try {
      addLog('Loading accounts...');
      
      // Get credentials from environment variables
      const envUsername = process.env.NEXT_PUBLIC_USERNAME;
      const envApiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
      
      if (!envUsername || !envApiKey) {
        throw new Error('Username and API key must be configured in environment variables');
      }
      
      setUserName(envUsername);
      setApiKey(envApiKey);
      
      // Get session token
      const sessionToken = await authService.getSessionToken(envUsername, envApiKey);
      
      // Search for accounts
      const foundAccounts = await accountService.searchAccounts(sessionToken, true);
      
      addLog(`Found ${foundAccounts.length} accounts`);
      setAccounts(foundAccounts);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load accounts: ${errorMessage}`);
      addLog(`Error loading accounts: ${errorMessage}`);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const loadPositions = async (account: AccountInfo) => {
    setIsLoadingPositions(true);
    setPositionsError(null);
    setPositions([]);
    
    try {
      addLog(`Loading positions for account ${account.id}...`);

      // Get session token
      const sessionToken = await authService.getSessionToken(userName, apiKey);
      
      // Search for open positions
      const foundPositions = await accountService.searchOpenPositions(sessionToken, account.id);
      
      addLog(`Found ${foundPositions.length} open positions for account ${account.id}`);
      setPositions(foundPositions);
      setLastRefreshTime(new Date());
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPositionsError(`Failed to load positions: ${errorMessage}`);
      addLog(`Error loading positions: ${errorMessage}`);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  const closePosition = async (position: Position) => {
    if (!selectedAccount) return;
    
    setClosingPositionId(position.id);
    
    try {
      addLog(`Closing position ${position.id} for contract ${position.contractId}...`);

      // Get session token
      const sessionToken = await authService.getSessionToken(userName, apiKey);
      
      // Close the position
      await accountService.closePosition(sessionToken, selectedAccount.id, position.contractId);
      
      addLog(`Successfully closed position ${position.id}`);
      
      // Refresh positions to show updated list
      await loadPositions(selectedAccount);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error closing position: ${errorMessage}`);
      alert(`Failed to close position: ${errorMessage}`);
    } finally {
      setClosingPositionId(null);
    }
  };

  const handleAccountSelect = (account: AccountInfo) => {
    setSelectedAccount(account);
    loadPositions(account);
  };

  const clearSelectedAccount = () => {
    setSelectedAccount(null);
    setPositions([]);
    setPositionsError(null);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Helper function to get position type name
  const getPositionTypeName = (type: number): string => {
    switch (type) {
      case 1: return 'Long';
      case 2: return 'Short';
      default: return `Unknown (${type})`;
    }
  };

  // Helper function to format time difference
  const formatTimeDifference = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`;
    } else {
      return `${diffSeconds}s`;
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Trading Dashboard</h2>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-800 rounded">
          <h3 className="font-semibold mb-2">Error:</h3>
          <p className="text-red-200">{error}</p>
          <button
            onClick={loadAccounts}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingAccounts && (
        <div className="mb-6 p-4 bg-blue-800 rounded text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading accounts...</p>
        </div>
      )}

      {/* Account Selection */}
      {!isLoadingAccounts && !error && accounts.length > 0 && !selectedAccount && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Select an Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts
              .sort((a, b) => b.id - a.id)
              .map((account) => (
              <div 
                key={account.id} 
                className="p-4 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer transition-colors border border-gray-600"
                onClick={() => handleAccountSelect(account)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-lg">Account {account.id}</h4>
                    <p className="text-gray-400 text-sm">{account.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(account.balance)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Trading: {account.canTrade ? 'Enabled' : 'Disabled'}</span>
                  <span>Visible: {account.isVisible ? 'Yes' : 'No'}</span>
                </div>
                <div className="mt-3 text-xs text-blue-400">
                  Click to view dashboard →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Account Dashboard */}
      {selectedAccount && (
        <div className="space-y-6">
          {/* Account Header */}
          <div className="flex items-center justify-between p-4 bg-blue-900 rounded border border-blue-700">
            <div>
              <h3 className="text-xl font-bold text-blue-200">
                Account {selectedAccount.id} - {selectedAccount.name}
              </h3>
              <p className="text-blue-300">Trading Dashboard</p>
            </div>
            <button
              onClick={clearSelectedAccount}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Change Account
            </button>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800 rounded border border-gray-600">
              <h4 className="text-gray-400 text-sm font-medium">Balance</h4>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(selectedAccount.balance)}
              </p>
            </div>
            <div className="p-4 bg-gray-800 rounded border border-gray-600">
              <h4 className="text-gray-400 text-sm font-medium">Trading Status</h4>
              <p className={`text-lg font-semibold ${selectedAccount.canTrade ? 'text-green-400' : 'text-red-400'}`}>
                {selectedAccount.canTrade ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-4 bg-gray-800 rounded border border-gray-600">
              <h4 className="text-gray-400 text-sm font-medium">Account Visibility</h4>
              <p className={`text-lg font-semibold ${selectedAccount.isVisible ? 'text-green-400' : 'text-red-400'}`}>
                {selectedAccount.isVisible ? 'Visible' : 'Hidden'}
              </p>
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-gray-800 rounded border border-gray-600">
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
              <h3 className="text-lg font-semibold">Open Positions</h3>
              <button
                onClick={() => loadPositions(selectedAccount)}
                disabled={isLoadingPositions}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoadingPositions ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Refresh Status */}
            <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-400">
                  {lastRefreshTime && (
                    <span>Last refresh: {lastRefreshTime.toLocaleTimeString()}</span>
                  )}
                </div>
                <div className="text-gray-400">
                  {nextRefreshTime && (
                    <span>Next auto-refresh: {formatTimeDifference(nextRefreshTime)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              {isLoadingPositions && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading positions...</p>
                </div>
              )}

              {positionsError && (
                <div className="p-4 bg-red-900 border border-red-700 rounded text-red-200">
                  {positionsError}
                </div>
              )}

              {!isLoadingPositions && !positionsError && positions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">No open positions found</p>
                  <p className="text-gray-500 text-sm mt-2">This account has no active positions</p>
                </div>
              )}

              {!isLoadingPositions && !positionsError && positions.length > 0 && (
                <div className="space-y-3">
                  {positions.map((position) => (
                    <div key={position.id} className="p-4 bg-gray-700 rounded border border-gray-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm">Position ID:</span>
                          <p className="text-white font-mono">{position.id}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Contract:</span>
                          <p className="text-white font-mono">{position.contractId}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Type:</span>
                          <p className={`font-semibold ${position.type === 1 ? 'text-green-400' : 'text-red-400'}`}>
                            {getPositionTypeName(position.type)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Size:</span>
                          <p className="text-white font-semibold">{position.size}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Average Price:</span>
                          <p className="text-white font-semibold">{position.averagePrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Created:</span>
                          <p className="text-white text-sm">{formatTimestamp(position.creationTimestamp)}</p>
                        </div>
                      </div>
                      
                      {/* Close Position Button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to close this ${getPositionTypeName(position.type).toLowerCase()} position?\n\nContract: ${position.contractId}\nSize: ${position.size}\nPrice: ${position.averagePrice.toFixed(2)}`)) {
                              closePosition(position);
                            }
                          }}
                          disabled={closingPositionId === position.id}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                            closingPositionId === position.id
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {closingPositionId === position.id ? 'Closing...' : 'Close Position'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Accounts State */}
      {!isLoadingAccounts && !error && accounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-4">No accounts found</p>
          <p className="text-gray-500 text-sm mb-6">Make sure your credentials are configured correctly</p>
          <button
            onClick={loadAccounts}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry Loading Accounts
          </button>
        </div>
      )}
    </div>
  );
}; 