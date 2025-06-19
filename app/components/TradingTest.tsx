"use client";

import { useEffect, useState } from 'react';
import {
  cancelOrder,
  getContracts,
  getOrderStatus,
  testLimitBuy,
  testLimitSell,
  testMarketBuy,
  testMarketSell,
  testStopBuy,
  testStopSell,
  type ContractInfo
} from '../actions/tradingActions';
import { colors } from '../colors';
import { AccountInfo, accountService } from '../services/accountService';
import { authService } from '../services/authService';

export default function TradingTest() {
  const [accountId, setAccountId] = useState<number>(0);
  const [contractId, setContractId] = useState<string>('');
  const [orderSize, setOrderSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [stopPrice, setStopPrice] = useState<number>(0);
  const [orderId, setOrderId] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [searchText, setSearchText] = useState<string>('NQ');
  const [useLiveData, setUseLiveData] = useState<boolean>(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  
  // Account discovery state
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Contract selection state
  const [customContractId, setCustomContractId] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Predefined common contracts
  const commonContracts = [
    { id: 'CON.F.US.MNQ.U25', name: 'MNQ', description: 'Micro E-mini Nasdaq-100 (Small)' },
    { id: 'CON.F.US.ENQ.U25', name: 'NQ', description: 'E-mini Nasdaq-100 (Full)' },
    { id: 'CON.F.US.EP.U25', name: 'ES', description: 'E-mini S&P 500 (Full)' },
    { id: 'CON.F.US.MES.U25', name: 'MES', description: 'Micro E-mini S&P 500 (Small)' },
    { id: 'CON.F.US.GCE.Q25', name: 'GC', description: 'Gold (Full)' },
    { id: 'CON.F.US.MGC.Q25', name: 'MGC', description: 'Micro Gold (Small)' },
    { id: 'CON.F.US.GMET.M25', name: 'MET', description: 'Micro Ethereum (Small)' },
    { id: 'CON.F.US.NGE.N25', name: 'NG', description: 'Natural Gas (Full)' },
    { id: 'CON.F.US.MNG.N25', name: 'MNG', description: 'Micro Natural Gas (Small)' },
    { id: 'CON.F.US.CLE.U25', name: 'CL', description: 'Crude Oil (Full)' },
    { id: 'CON.F.US.MCL.U25', name: 'MCL', description: 'Micro Crude Oil (Small)' },
    { id: 'CON.F.US.ZBE.U25', name: 'ZB', description: '30-Year Treasury Bond' },
    { id: 'CON.F.US.ZTE.U25', name: 'ZT', description: '2-Year Treasury Note' },
  ];

  const handleCopy = async (value: string, cellKey: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCell(cellKey);
      setTimeout(() => setCopiedCell(null), 1000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      // fallback: do nothing
    }
  };

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    setAccountError(null);
    
    try {
      console.log('Loading accounts...');
      
      // Get credentials from environment variables
      const username = process.env.NEXT_PUBLIC_USERNAME;
      const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
      
      if (!username || !apiKey) {
        throw new Error('Username and API key must be configured in environment variables');
      }
      
      // Get session token
      const sessionToken = await authService.getSessionToken(username, apiKey);
      
      // Search for accounts
      const foundAccounts = await accountService.searchAccounts(sessionToken, true);
      
      console.log(`Found ${foundAccounts.length} accounts`);
      setAccounts(foundAccounts);
      
      // Auto-select first account if available
      if (foundAccounts.length > 0) {
        setAccountId(foundAccounts[0].id);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAccountError(`Failed to load accounts: ${errorMessage}`);
      console.error('Account loading error:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAction = async (action: () => Promise<unknown>, actionName: string) => {
    setLoading(true);
    setResult('');
    
    try {
      console.log(`Executing ${actionName}...`);
      const response = await action();
      setResult(JSON.stringify(response, null, 2));
      console.log(`${actionName} result:`, response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`Error: ${errorMessage}`);
      console.error(`${actionName} error:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetContracts = async () => {
    await handleAction(async () => {
      const contracts = await getContracts(searchText, useLiveData);
      setContracts(contracts);
      return contracts;
    }, 'Get Contracts');
  };

  const handleMarketBuy = async () => {
    if (!accountId || !contractId) {
      setResult('Error: Account ID and Contract ID are required');
      return;
    }
    
    await handleAction(
      () => testMarketBuy(accountId, contractId, orderSize),
      'Market Buy'
    );
  };

  const handleMarketSell = async () => {
    if (!accountId || !contractId) {
      setResult('Error: Account ID and Contract ID are required');
      return;
    }
    
    await handleAction(
      () => testMarketSell(accountId, contractId, orderSize),
      'Market Sell'
    );
  };

  const handleLimitBuy = async () => {
    if (!accountId || !contractId || !limitPrice) {
      setResult('Error: Account ID, Contract ID, and Limit Price are required');
      return;
    }
    
    await handleAction(
      () => testLimitBuy(accountId, contractId, limitPrice, orderSize),
      'Limit Buy'
    );
  };

  const handleLimitSell = async () => {
    if (!accountId || !contractId || !limitPrice) {
      setResult('Error: Account ID, Contract ID, and Limit Price are required');
      return;
    }
    
    await handleAction(
      () => testLimitSell(accountId, contractId, limitPrice, orderSize),
      'Limit Sell'
    );
  };

  const handleStopBuy = async () => {
    if (!accountId || !contractId || !stopPrice) {
      setResult('Error: Account ID, Contract ID, and Stop Price are required');
      return;
    }
    
    await handleAction(
      () => testStopBuy(accountId, contractId, stopPrice, orderSize),
      'Stop Buy'
    );
  };

  const handleStopSell = async () => {
    if (!accountId || !contractId || !stopPrice) {
      setResult('Error: Account ID, Contract ID, and Stop Price are required');
      return;
    }
    
    await handleAction(
      () => testStopSell(accountId, contractId, stopPrice, orderSize),
      'Stop Sell'
    );
  };

  const handleGetOrderStatus = async () => {
    if (!orderId) {
      setResult('Error: Order ID is required');
      return;
    }
    
    await handleAction(
      () => getOrderStatus(orderId),
      'Get Order Status'
    );
  };

  const handleCancelOrder = async () => {
    if (!orderId) {
      setResult('Error: Order ID is required');
      return;
    }
    
    await handleAction(
      () => cancelOrder(orderId),
      'Cancel Order'
    );
  };

  // Helper function to check if trading is enabled for selected account
  const isTradingEnabled = () => {
    const selectedAccount = accounts.find(a => a.id === accountId);
    return selectedAccount?.canTrade ?? false;
  };

  return (
    <div style={{ backgroundColor: colors.darkprimary }} className="p-6 text-white rounded-lg max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.whightprimary }}>Trading Test Panel</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{ color: colors.whightprimary }}>
                Account ID
              </label>
              {!isLoadingAccounts && accounts.length > 0 && (
                <button
                  onClick={loadAccounts}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                  title="Refresh accounts"
                >
                  Refresh
                </button>
              )}
            </div>
            {isLoadingAccounts ? (
              <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading accounts...
              </div>
            ) : accountError ? (
              <div className="w-full px-3 py-2 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                {accountError}
                <button 
                  onClick={loadAccounts}
                  className="ml-2 text-blue-300 hover:text-blue-200 underline"
                >
                  Retry
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="w-full px-3 py-2 bg-yellow-900 border border-yellow-600 rounded text-yellow-200 text-sm">
                No accounts found
                <button 
                  onClick={loadAccounts}
                  className="ml-2 text-blue-300 hover:text-blue-200 underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <select
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.id} - {account.name} (${account.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            )}
            {accountId > 0 && accounts.length > 0 && (
              <div className="mt-1 text-xs text-gray-400">
                Selected: {accounts.find(a => a.id === accountId)?.name} - 
                Balance: ${accounts.find(a => a.id === accountId)?.balance.toFixed(2)}
                {accounts.find(a => a.id === accountId)?.canTrade ? 
                  <span className="ml-2 text-green-400">● Trading Enabled</span> : 
                  <span className="ml-2 text-red-400">● Trading Disabled</span>
                }
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium" style={{ color: colors.whightprimary }}>
                Contract ID
              </label>
              {contractId && (
                <button
                  onClick={() => {
                    setContractId('');
                    setCustomContractId('');
                    setShowCustomInput(false);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                  title="Clear selection"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={showCustomInput ? 'custom' : contractId}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setShowCustomInput(true);
                  setContractId('');
                } else {
                  setShowCustomInput(false);
                  setContractId(e.target.value);
                  setCustomContractId('');
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a contract or enter custom...</option>
              <optgroup label="Common Contracts">
                {commonContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.name} - {contract.description}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Contract">
                <option value="custom">Enter custom contract ID...</option>
              </optgroup>
            </select>
            {showCustomInput && (
              <input
                type="text"
                value={customContractId}
                onChange={(e) => {
                  setCustomContractId(e.target.value);
                  setContractId(e.target.value);
                }}
                placeholder="Enter custom contract ID (e.g., CON.F.US.CL.U25)"
                className="w-full px-3 py-2 mt-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {contractId && !showCustomInput && (
              <div className="mt-1 text-xs text-gray-400">
                Selected: {commonContracts.find(c => c.id === contractId)?.name || contractId}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.whightprimary }}>
              Order Size
            </label>
            <input
              type="number"
              value={orderSize}
              onChange={(e) => setOrderSize(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Order Size"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.whightprimary }}>
              Limit Price
            </label>
            <input
              type="number"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Limit Price"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.whightprimary }}>
              Stop Price
            </label>
            <input
              type="number"
              step="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Stop Price"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.whightprimary }}>
              Order ID (for status/cancel)
            </label>
            <input
              type="number"
              value={orderId}
              onChange={(e) => setOrderId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Order ID"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Contract Search */}
          <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
            <h3 className="text-sm font-medium mb-2" style={{ color: colors.whightprimary }}>Contract Search</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Search Text</label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., NQ, ES, CL"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useLiveData"
                  checked={useLiveData}
                  onChange={(e) => setUseLiveData(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="useLiveData" className="text-xs text-gray-400">
                  Use Live Data
                </label>
              </div>
              <button
                onClick={handleGetContracts}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Loading...' : 'Get Contracts'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleMarketBuy}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Market Buy'}
            </button>
            <button
              onClick={handleMarketSell}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Market Sell'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleLimitBuy}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Limit Buy'}
            </button>
            <button
              onClick={handleLimitSell}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Limit Sell'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStopBuy}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-green-400 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Stop Buy'}
            </button>
            <button
              onClick={handleStopSell}
              disabled={loading || !isTradingEnabled()}
              className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isTradingEnabled() ? "Trading not enabled for this account" : ""}
            >
              {loading ? 'Loading...' : 'Stop Sell'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGetOrderStatus}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Get Status'}
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Cancel Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {contracts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3" style={{ color: colors.whightprimary }}>Available Contracts</h3>
          <div className="max-h-40 overflow-y-auto border border-gray-700 rounded-md bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-white">ID</th>
                  <th className="px-3 py-2 text-left text-white">Name</th>
                  <th className="px-3 py-2 text-left text-white">Description</th>
                  <th className="px-3 py-2 text-left text-white">Tick Size</th>
                  <th className="px-3 py-2 text-left text-white">Tick Value</th>
                  <th className="px-3 py-2 text-left text-white">Active</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr 
                    key={contract.id} 
                    className="border-t border-gray-700 hover:bg-gray-700 cursor-pointer"
                  >
                    <td
                      className={`px-3 py-2 font-mono text-xs text-white ${copiedCell === contract.id + '-id' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(contract.id, contract.id + '-id')}
                    >
                      {contract.id}
                      {copiedCell === contract.id + '-id' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-white ${copiedCell === contract.id + '-name' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(contract.name, contract.id + '-name')}
                    >
                      {contract.name}
                      {copiedCell === contract.id + '-name' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-xs text-gray-300 ${copiedCell === contract.id + '-desc' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(contract.description, contract.id + '-desc')}
                    >
                      {contract.description}
                      {copiedCell === contract.id + '-desc' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-white ${copiedCell === contract.id + '-ticksize' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(String(contract.tickSize), contract.id + '-ticksize')}
                    >
                      {contract.tickSize}
                      {copiedCell === contract.id + '-ticksize' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-white ${copiedCell === contract.id + '-tickval' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(String(contract.tickValue), contract.id + '-tickval')}
                    >
                      ${contract.tickValue}
                      {copiedCell === contract.id + '-tickval' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 text-white ${copiedCell === contract.id + '-active' ? 'bg-green-700' : ''}`}
                      title="Click to copy"
                      onClick={() => handleCopy(contract.activeContract ? 'Yes' : 'No', contract.id + '-active')}
                    >
                      {contract.activeContract ? 'Yes' : 'No'}
                      {copiedCell === contract.id + '-active' && (
                        <span className="ml-2 text-green-300 text-xs">Copied!</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3" style={{ color: colors.whightprimary }}>Result</h3>
          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto text-sm text-white border border-gray-700">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
} 