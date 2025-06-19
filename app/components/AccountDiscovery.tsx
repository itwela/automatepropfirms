"use client";

import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { accountService, AccountInfo, Position } from '../services/accountService';

export const AccountDiscovery: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [apiKey, setApiKey] = useState('S28aUTxGRKCVxzfEoKkXpAmZd1Z7WLJ50kOUC6UuPng=');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  
  // Position state
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Auto-attempt authentication and discovery on component mount
  useEffect(() => {
    autoDiscoverAccounts();
  }, []);

  const autoDiscoverAccounts = async () => {
    setIsLoading(true);
    setError(null);
    setLogs([]);
    setAccounts([]);
    
    try {
      addLog('Attempting automatic authentication...');
      
      // Try to get credentials from environment variables
      const envUsername = process.env.NEXT_PUBLIC_USERNAME;
      const envApiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
      
      if (envUsername && envApiKey) {
        addLog('Found credentials in environment variables');
        setUserName(envUsername);
        setApiKey(envApiKey);
        
        // Attempt authentication with environment credentials
        const sessionToken = await authService.getSessionToken(envUsername, envApiKey);
        setIsAuthenticated(true);
        
        addLog('Authentication successful, searching for accounts...');
        
        // Search for accounts using REST API
        const foundAccounts = await accountService.searchAccounts(sessionToken, true);
        
        addLog(`Found ${foundAccounts.length} active accounts`);
        
        setAccounts(foundAccounts);
        setIsLoading(false);
        return;
      } else {
        addLog('No environment credentials found, will prompt for manual input');
        setShowManualAuth(true);
        setIsLoading(false);
      }

    } catch (error) {
      addLog(`Auto-authentication failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsLoading(false);
      setIsAuthenticated(false);
      setShowManualAuth(true);
    }
  };

  const discoverAccounts = async () => {
    if (!userName.trim()) {
      setError('Please enter your username');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLogs([]);
    setAccounts([]);
    
    try {
      addLog('Starting manual authentication...');
      
      // First, authenticate to get session token
      const sessionToken = await authService.getSessionToken(userName, apiKey);
      setIsAuthenticated(true);
      
      addLog('Authentication successful, searching for accounts...');
      
      // Search for accounts using REST API
      const foundAccounts = await accountService.searchAccounts(sessionToken, true);
      
      addLog(`Found ${foundAccounts.length} active accounts`);
      
      setAccounts(foundAccounts);
      setIsLoading(false);

    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  };

  const clearAuth = () => {
    addLog('Clearing authentication...');
    authService.clearToken();
    setIsAuthenticated(false);
    setAccounts([]);
    setError(null);
    setLogs([]);
    setShowManualAuth(true);
    setSelectedAccount(null);
    setPositions([]);
    setPositionsError(null);
  };

  const retryAutoDiscovery = () => {
    setShowManualAuth(false);
    autoDiscoverAccounts();
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
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPositionsError(`Failed to load positions: ${errorMessage}`);
      addLog(`Error loading positions: ${errorMessage}`);
      console.error('Load positions error:', error);
    } finally {
      setIsLoadingPositions(false);
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
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD'
  //   }).format(amount);
  // };

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

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Account Discovery</h2>
      
      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 p-4 bg-blue-800 rounded text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Automatically discovering accounts...</p>
        </div>
      )}
      
      {/* Manual Authentication Form */}
      {showManualAuth && !isAuthenticated && !isLoading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400">
              Automatic discovery failed. Please enter your ProjectX TopStep credentials manually.
            </p>
            <button
              onClick={retryAutoDiscovery}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              Retry Auto
            </button>
          </div>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white"
              />
            </div>
          </div>
          
          <button
            onClick={discoverAccounts}
            disabled={isLoading || !userName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Discover Accounts'}
          </button>
        </div>
      )}

      {isAuthenticated && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-600">
              Authenticated
            </div>
            <div className="flex gap-2">
              <button
                onClick={retryAutoDiscovery}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Refresh
              </button>
              <button
                onClick={clearAuth}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm"
              >
                Clear Auth
              </button>
            </div>
          </div>
          <button
            onClick={discoverAccounts}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search Accounts Again'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-800 rounded">
          <h3 className="font-semibold mb-2">Error:</h3>
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Logs */}
      <div className="mb-6 bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Logs:</h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-400">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm font-mono text-gray-300">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-4">Found Accounts ({accounts.length}):</h3>
          
          {/* Selected Account View */}
          {selectedAccount && (
            <div className="mb-6 p-4 bg-blue-900 rounded border border-blue-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-blue-200">
                  Selected Account: {selectedAccount.id} - {selectedAccount.name}
                </h4>
                <button
                  onClick={clearSelectedAccount}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Back to All Accounts
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-gray-400">Balance:</span>
                  <span className="ml-2 text-white font-semibold">${selectedAccount.balance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Trading:</span>
                  <span className={`ml-2 font-semibold ${selectedAccount.canTrade ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedAccount.canTrade ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Visible:</span>
                  <span className={`ml-2 font-semibold ${selectedAccount.isVisible ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedAccount.isVisible ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Open Positions Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-md font-semibold text-blue-200">Open Positions</h5>
                  <button
                    onClick={() => loadPositions(selectedAccount)}
                    disabled={isLoadingPositions}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoadingPositions ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {isLoadingPositions && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Loading open positions...</p>
                  </div>
                )}

                {positionsError && (
                  <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                    {positionsError}
                  </div>
                )}

                {!isLoadingPositions && !positionsError && positions.length === 0 && (
                  <div className="p-3 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm">
                    No open positions found for this account.
                  </div>
                )}

                {!isLoadingPositions && !positionsError && positions.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {positions.map((position) => (
                      <div key={position.id} className="p-3 bg-gray-700 rounded border border-gray-600">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">Position ID:</span>
                            <span className="ml-2 text-white font-mono">{position.id}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Contract:</span>
                            <span className="ml-2 text-white font-mono">{position.contractId}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Type:</span>
                            <span className={`ml-2 font-semibold ${position.type === 1 ? 'text-green-400' : 'text-red-400'}`}>
                              {getPositionTypeName(position.type)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Size:</span>
                            <span className="ml-2 text-white">{position.size}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Average Price:</span>
                            <span className="ml-2 text-white">{position.averagePrice.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Created: {formatTimestamp(position.creationTimestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Accounts List */}
          {!selectedAccount && (
            <div className="space-y-3">
              {accounts
                .sort((a, b) => b.id - a.id)
                .map((account) => (
                <div 
                  key={account.id} 
                  className="p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">Account ID: {account.id}</span>
                      <span className="text-gray-400 ml-2">({account.name})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        Balance: ${account.balance.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Can Trade: {account.canTrade ? 'Yes' : 'No'}
                      </div>
                      <div className="text-sm text-gray-400">
                        Visible: {account.isVisible ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-400">
                    Click to view positions →
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!selectedAccount && (
            <div className="mt-4 p-3 bg-blue-800 rounded">
              <h4 className="font-semibold mb-2">Next Steps:</h4>
              <p className="text-sm">
                1. Click on an account above to view its positions<br/>
                2. Copy one of the Account IDs above<br/>
                3. Update your .env.local file with: NEXT_PUBLIC_ACCOUNT_ID=YOUR_ACCOUNT_ID<br/>
                4. Add your username: NEXT_PUBLIC_USERNAME=YOUR_USERNAME<br/>
                5. Restart the application
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 