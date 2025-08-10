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
  
  // Multi-client state
  const [clients, setClients] = useState<Array<{
    id: string;
    name: string;
    username: string;
    isAuthenticated: boolean;
    tokenExpiry: Date | null;
    timeUntilExpiry: number;
  }>>([]);
  const [selectedClient, setSelectedClient] = useState<string>('master');
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  const addLog = (message: string) => {
    console.log(`[Dashboard] ${message}`);
  };

  const loadClients = async () => {
    setIsLoadingClients(true);
    
    // Minimum 1 second loading duration for client loading
    const minLoadingTime = 1000; // 1 second
    const startTime = Date.now();
    
    try {
      addLog('Loading client sessions...');
      
      // Get all configured clients from environment variables
      const clientConfigs = [
        {
          id: 'master',
          name: 'Twezo',
          username: process.env.NEXT_PUBLIC_USERNAME,
          apiKey: process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY,
        },
        {
          id: 'client-1',
          name: 'Kris',
          username: process.env.NEXT_PUBLIC_KRIS_USERNAME,
          apiKey: process.env.NEXT_PUBLIC_KRIS_API_KEY,
        },
        // Add more clients here as needed
        // {
        //   id: 'client-2', 
        //   name: 'Client 2',
        //   username: process.env.NEXT_PUBLIC_CLIENT2_USERNAME,
        //   apiKey: process.env.NEXT_PUBLIC_CLIENT2_API_KEY,
        // },
      ];

      const clientSessions = clientConfigs
        .filter(config => config.username && config.apiKey)
        .map(config => ({
          id: config.id,
          name: config.name,
          username: config.username!,
          isAuthenticated: authService.isTokenValid(config.id),
          tokenExpiry: authService.getTokenExpiry(config.id),
          timeUntilExpiry: authService.getTimeUntilExpiry(config.id),
        }));

      setClients(clientSessions);
      addLog(`Found ${clientSessions.length} configured clients`);
      
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      // Ensure loading state lasts at least 1 second
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        setTimeout(() => {
          setIsLoadingClients(false);
        }, remainingTime);
      } else {
        setIsLoadingClients(false);
      }
    }
  };

  // Load clients and accounts on component mount
  useEffect(() => {
    loadClients();
  }, []);

  // Load accounts when selected client changes
  useEffect(() => {
    if (selectedClient) {
      // Clear previous client's data when switching
      clearSelectedAccount();
      setAccounts([]);
      setError(null);
      
      // Set loading state immediately
      setIsLoadingAccounts(true);
      
      // Minimum 1 second loading duration for smooth transitions
      const minLoadingTime = 1000; // 1 second
      const startTime = Date.now();
      
      const loadAccountsWithMinDuration = async () => {
        try {
          await loadAccounts();
        } finally {
          // Ensure loading state lasts at least 1 second
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
          
          if (remainingTime > 0) {
            setTimeout(() => {
              setIsLoadingAccounts(false);
            }, remainingTime);
          } else {
            setIsLoadingAccounts(false);
          }
        }
      };
      
      // Start loading after small delay
      const timer = setTimeout(() => {
        loadAccountsWithMinDuration();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedClient]);

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
    // Note: Loading state is managed by the caller for minimum duration
    setError(null);
    
    try {
      addLog(`Loading accounts for client: ${selectedClient}`);
      
      // Get credentials for selected client from environment
      let clientUsername: string;
      let clientApiKey: string;
      
      switch (selectedClient) {
        case 'master':
          clientUsername = process.env.NEXT_PUBLIC_USERNAME || '';
          clientApiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY || '';
          break;
        case 'client-1':
          clientUsername = process.env.NEXT_PUBLIC_KRIS_USERNAME || '';
          clientApiKey = process.env.NEXT_PUBLIC_KRIS_API_KEY || '';
          break;
        case 'client-2':
          clientUsername = process.env.NEXT_PUBLIC_CLIENT2_USERNAME || '';
          clientApiKey = process.env.NEXT_PUBLIC_CLIENT2_API_KEY || '';
          break;
        default:
          throw new Error(`Unknown client: ${selectedClient}`);
      }
      
      if (!clientUsername || !clientApiKey) {
        throw new Error(`Credentials not configured for client: ${selectedClient}`);
      }
      
      setUserName(clientUsername);
      setApiKey('***'); // Don't store API key in state for security
      
      // Get session token for selected client
      const sessionToken = await authService.getSessionToken(clientUsername, clientApiKey, selectedClient);
      
      // Search for accounts
      const foundAccounts = await accountService.searchAccounts(sessionToken, true);
      
      addLog(`Found ${foundAccounts.length} accounts for client ${selectedClient}`);
      setAccounts(foundAccounts);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load accounts: ${errorMessage}`);
      addLog(`Error loading accounts: ${errorMessage}`);
    }
    // Note: Loading state is managed by the caller for minimum duration
  };

  const loadPositions = async (account: AccountInfo) => {
    // Note: Loading state is managed by the caller for minimum duration
    setPositionsError(null);
    setPositions([]);
    
    try {
      addLog(`Loading positions for account ${account.id} (client: ${selectedClient})...`);

      // Get session token for selected client
      const sessionToken = await authService.getCurrentToken(selectedClient);
      if (!sessionToken) {
        throw new Error(`No valid session token for client: ${selectedClient}`);
      }
      
      // Search for open positions
      const foundPositions = await accountService.searchOpenPositions(sessionToken, account.id);
      
      addLog(`Found ${foundPositions.length} open positions for account ${account.id}`);
      setPositions(foundPositions);
      setLastRefreshTime(new Date());
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPositionsError(`Failed to load positions: ${errorMessage}`);
      addLog(`Error loading positions: ${errorMessage}`);
    }
    // Note: Loading state is managed by the caller for minimum duration
  };

  const closePosition = async (position: Position) => {
    if (!selectedAccount) return;
    
    setClosingPositionId(position.id);
    
    try {
      addLog(`Closing position ${position.id} for contract ${position.contractId} (client: ${selectedClient})...`);

      // Get session token for selected client
      const sessionToken = await authService.getCurrentToken(selectedClient);
      if (!sessionToken) {
        throw new Error(`No valid session token for client: ${selectedClient}`);
      }
      
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
    
    // Minimum 1 second loading duration for positions
    const minLoadingTime = 1000; // 1 second
    const startTime = Date.now();
    
    const loadPositionsWithMinDuration = async () => {
      try {
        await loadPositions(account);
      } finally {
        // Ensure loading state lasts at least 1 second
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        if (remainingTime > 0) {
          setTimeout(() => {
            setIsLoadingPositions(false);
          }, remainingTime);
        } else {
          setIsLoadingPositions(false);
        }
      }
    };
    
    loadPositionsWithMinDuration();
  };

  const clearSelectedAccount = () => {
    setSelectedAccount(null);
    setPositions([]);
    setPositionsError(null);
    setLastRefreshTime(null);
    setNextRefreshTime(null);
    setClosingPositionId(null);
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

  // Log username and api key to console soi can build
  useEffect(() => {
    console.log('username', userName);
    console.log('apiKey', apiKey);
  }, [userName, apiKey]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Trading Dashboard</h2>
      
      {/* Client Selection */}
      {!isLoadingClients && clients.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Select Client</h3>
            <button
              onClick={loadClients}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Refresh Sessions
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div 
                key={client.id} 
                className={`p-4 rounded border transition-colors cursor-pointer ${
                  selectedClient === client.id
                    ? 'bg-blue-900 border-blue-600'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                }`}
                onClick={() => {
                  if (selectedClient !== client.id) {
                    // Show loading state immediately when switching
                    setIsLoadingAccounts(true);
                    setSelectedClient(client.id);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-lg">{client.name}</h4>
                    <p className="text-gray-400 text-sm">{client.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedClient === client.id && isLoadingAccounts && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    )}
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      client.isAuthenticated 
                        ? 'bg-green-900 text-green-300' 
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {client.isAuthenticated ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {client.isAuthenticated ? (
                    <div>
                      <div>Expires: {client.tokenExpiry?.toLocaleTimeString()}</div>
                      <div>Time left: {Math.floor(client.timeUntilExpiry / (1000 * 60))}m</div>
                    </div>
                  ) : (
                    <div>Not authenticated</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client Loading State */}
      {isLoadingClients && (
        <div className="mb-6 p-4 bg-blue-800 rounded text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading client sessions...</p>
        </div>
      )}

      {/* Account Loading State */}
      {isLoadingAccounts && (
        <div className="mb-6 p-4 bg-blue-800 rounded text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading accounts for {clients.find(c => c.id === selectedClient)?.name || 'selected client'}...</p>
        </div>
      )}
      
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
          <h3 className="text-lg font-semibold mb-4">
            Select an Account - {clients.find(c => c.id === selectedClient)?.name || selectedClient}
          </h3>
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

      {/* No Account Selected Message */}
      {!selectedAccount && accounts.length > 0 && (
        <div className="mb-6 p-6 bg-gray-800 rounded border border-gray-600 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Select an Account to View Dashboard
          </h3>
          <p className="text-gray-400 text-sm">
            Click on any account above to view its trading dashboard and positions
          </p>
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
              <p className="text-blue-300">
                Trading Dashboard - {clients.find(c => c.id === selectedClient)?.name || selectedClient}
              </p>
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
                onClick={() => {
                  if (selectedAccount) {
                    // Minimum 1 second loading duration for manual refresh
                    const minLoadingTime = 1000; // 1 second
                    const startTime = Date.now();
                    
                    const loadPositionsWithMinDuration = async () => {
                      try {
                        await loadPositions(selectedAccount);
                      } finally {
                        // Ensure loading state lasts at least 1 second
                        const elapsedTime = Date.now() - startTime;
                        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                        
                        if (remainingTime > 0) {
                          setTimeout(() => {
                            setIsLoadingPositions(false);
                          }, remainingTime);
                        } else {
                          setIsLoadingPositions(false);
                        }
                      }
                    };
                    
                    loadPositionsWithMinDuration();
                  }
                }}
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