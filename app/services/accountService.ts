// Account service for ProjectX TopStep API

export interface AccountInfo {
  id: number;
  name: string;
  balance: number;
  canTrade: boolean;
  isVisible: boolean;
}

export interface AccountSearchResponse {
  accounts: AccountInfo[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface AccountSearchRequest {
  onlyActiveAccounts: boolean;
}

export interface OpenOrder {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  updateTimestamp: string;
  status: number;
  type: number;
  side: number;
  size: number;
  limitPrice: number | null;
  stopPrice: number | null;
}

export interface OpenOrdersResponse {
  orders: OpenOrder[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface Position {
  id: number;
  accountId: number;
  contractId: string;
  creationTimestamp: string;
  type: number;
  size: number;
  averagePrice: number;
}

export interface PositionSearchResponse {
  positions: Position[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

class AccountService {
  private baseUrl = 'https://api.topstepx.com/api';

  // Search for accounts using the REST API
  async searchAccounts(sessionToken: string, onlyActiveAccounts: boolean = true): Promise<AccountInfo[]> {
    try {
      console.log('Searching for accounts...');

      const response = await fetch(`${this.baseUrl}/Account/search`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          onlyActiveAccounts: onlyActiveAccounts
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AccountSearchResponse = await response.json();
      
      console.log('Account search response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Account search failed');
      }

      console.log(`Found ${data.accounts.length} accounts`);
      return data.accounts;

    } catch (error) {
      console.error('Account search error:', error);
      throw error;
    }
  }

  // Get account details by ID
  async getAccountDetails(sessionToken: string, accountId: number): Promise<AccountInfo | null> {
    try {
      console.log(`Getting details for account ${accountId}...`);

      const response = await fetch(`${this.baseUrl}/Account/${accountId}`, {
        method: 'GET',
        headers: {
          'accept': 'text/plain',
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Account ${accountId} not found`);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to get account details');
      }

      return data.account;

    } catch (error) {
      console.error('Get account details error:', error);
      throw error;
    }
  }

  // Search for open orders
  async searchOpenOrders(sessionToken: string, accountId: number): Promise<OpenOrder[]> {
    try {
      console.log(`Searching for open orders on account ${accountId}...`);

      const response = await fetch(`${this.baseUrl}/Order/searchOpen`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          accountId: accountId
        })
      });

      if (!response.ok) {
        console.log('Open orders response:', response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenOrdersResponse = await response.json();
      
      
      console.log('Open orders response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to search open orders');
      }

      console.log(`Found ${data.orders.length} open orders`);
      return data.orders;

    } catch (error) {
      console.error('Search open orders error:', error);
      throw error;
    }
  }

  // Search for open positions
  async searchOpenPositions(sessionToken: string, accountId: number): Promise<Position[]> {
    try {
      console.log(`Searching for open positions on account ${accountId}...`);

      const response = await fetch(`${this.baseUrl}/Position/searchOpen`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          accountId: accountId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PositionSearchResponse = await response.json();
      
      console.log('Open positions response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to search open positions');
      }

      console.log(`Found ${data.positions.length} open positions`);
      return data.positions;

    } catch (error) {
      console.error('Search open positions error:', error);
      throw error;
    }
  }

  // Close a position
  async closePosition(sessionToken: string, accountId: number, contractId: string): Promise<boolean> {
    try {
      console.log(`Closing position for account ${accountId}, contract ${contractId}...`);

      const response = await fetch(`${this.baseUrl}/Position/closeContract`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          accountId: accountId,
          contractId: contractId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Close position response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to close position');
      }

      console.log(`Successfully closed position for contract ${contractId}`);
      return true;

    } catch (error) {
      console.error('Close position error:', error);
      throw error;
    }
  }

  // Open a long position (buy)
  async openLongPosition(sessionToken: string, accountId: number, contractId: string, size: number = 1): Promise<any> {
    try {
      console.log(`Opening LONG position for account ${accountId}, contract ${contractId}, size ${size}...`);

      const response = await fetch(`${this.baseUrl}/Order/place`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          accountId: accountId,
          contractId: contractId,
          type: 2, // Market order
          side: 0, // Bid (Buy)
          size: size,
          customTag: 'Auto Long Position'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Open long position response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to open long position');
      }

      console.log(`Successfully opened long position for contract ${contractId}, order ID: ${data.orderId}`);
      return data;

    } catch (error) {
      console.error('Open long position error:', error);
      throw error;
    }
  }

  // Open a short position (sell)
  async openShortPosition(sessionToken: string, accountId: number, contractId: string, size: number = 1): Promise<any> {
    try {
      console.log(`Opening SHORT position for account ${accountId}, contract ${contractId}, size ${size}...`);

      const response = await fetch(`${this.baseUrl}/Order/place`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          accountId: accountId,
          contractId: contractId,
          type: 2, // Market order
          side: 1, // Ask (Sell)
          size: size,
          customTag: 'Auto Short Position'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Open short position response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Failed to open short position');
      }

      console.log(`Successfully opened short position for contract ${contractId}, order ID: ${data.orderId}`);
      return data;

    } catch (error) {
      console.error('Open short position error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const accountService = new AccountService(); 