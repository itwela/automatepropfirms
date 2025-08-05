"use client";

import {useState } from 'react';
import { colors } from '../colors';

interface AccountData {
  accountIds: number[];
  accountId: number;
}

export default function RouteTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [accountData, setAccountData] = useState<AccountData | null>(null);

  const fetchRouteData = async (): Promise<AccountData> => {
    try {
      const response = await fetch('/api/testroute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AccountData = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching route data:', error);
      throw error;
    }
  };

  const handleFetchData = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('Fetching route data...');
      const response = await fetchRouteData();
      setAccountData(response);
      setResult(JSON.stringify(response, null, 2));
      console.log('Route data fetched successfully:', response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`Error: ${errorMessage}`);
      console.error('Route fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 style={{ color: colors.whightprimary }} className="text-xl font-bold mb-4">
          Route API Test Panel
        </h2>
        <p style={{ color: colors.whightprimary }} className="text-gray-400 mb-6">
          Test fetching data from the route.ts API endpoint
        </p>

        <div className="space-y-4">
          {/* Fetch Button */}
          <div>
            <button
              onClick={handleFetchData}
              disabled={loading}
              className={`w-full px-6 py-3 font-medium rounded-lg transition-colors ${
                loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading ? 'Fetching...' : 'Fetch Route Data'}
            </button>
          </div>
        </div>
      </div>

             {/* Account Data Display */}
       {accountData && (
         <div className="bg-gray-800 rounded-lg p-6">
           <h3 style={{ color: colors.whightprimary }} className="text-lg font-semibold mb-3">
             Account Data
           </h3>
                        <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">Account IDs:</span>
                 <span style={{ color: colors.whightprimary }} className="text-blue-400">
                   {accountData.accountIds.join(', ')}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">Primary Account ID:</span>
                 <span style={{ color: colors.whightprimary }} className="text-green-400">
                   {accountData.accountId}
                 </span>
               </div>
             </div>
           
           {/* Type Information */}
           <div className="mt-4 pt-4 border-t border-gray-600">
             <h4 style={{ color: colors.whightprimary }} className="text-md font-semibold mb-2">
               Type Information
             </h4>
             <div className="space-y-2 text-sm">
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">accountIds type:</span>
                 <span style={{ color: colors.whightprimary }} className="text-yellow-400">
                   Array of numbers
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">accountId type:</span>
                 <span style={{ color: colors.whightprimary }} className="text-yellow-400">
                   number
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">accountIds length:</span>
                 <span style={{ color: colors.whightprimary }} className="text-purple-400">
                   {accountData.accountIds.length}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span style={{ color: colors.whightprimary }} className="font-medium">TypeScript Interface:</span>
                 <span style={{ color: colors.whightprimary }} className="text-purple-400">
                   AccountData
                 </span>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Result Display */}
      {result && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 style={{ color: colors.whightprimary }} className="text-lg font-semibold mb-3">
            Raw Response
          </h3>
          <pre className="bg-gray-900 p-4 rounded text-sm text-green-400 overflow-x-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
} 