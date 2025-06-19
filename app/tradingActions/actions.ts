
import { authService } from '../services/authService';

// Types for trading operations
export interface PlaceOrderRequest {
  accountId: number;
  contractId: string;
  type: OrderType;
  side: OrderSide;
  size: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  trailPrice?: number | null;
  customTag?: string | null;
  linkedOrderId?: number | null;
}

export interface PlaceOrderResponse {
  orderId: number;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export enum OrderType {
  Limit = 1,
  Market = 2,
  Stop = 4,
  TrailingStop = 5,
  JoinBid = 6,
  JoinAsk = 7
}

export enum OrderSide {
  Bid = 0, // Buy
  Ask = 1  // Sell
}

export interface ContractInfo {
  id: string;
  name: string;
  symbol: string;
  exchange: string;
  tickSize: number;
  pointValue: number;
  marginRequirement: number;
}

export interface GetContractsResponse {
  contracts: ContractInfo[];
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

// Place an order
export async function placeOrder(orderRequest: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  try {
    console.log('Placing order:', orderRequest);
    
    // Get session token inline
    const username = process.env.NEXT_PUBLIC_USERNAME;
    const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
    
    if (!username || !apiKey) {
      throw new Error('Username and API key must be configured');
    }
    
    const sessionToken = await authService.getSessionToken(username, apiKey);
    
    const response = await fetch('https://api.topstepx.com/api/Order/place', {
      method: 'POST',
      headers: {
        'accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify(orderRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PlaceOrderResponse = await response.json();
    
    console.log('Order placement response:', data);

    if (!data.success || data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Order placement failed');
    }

    console.log(`Order placed successfully with ID: ${data.orderId}`);
    return data;

  } catch (error) {
    console.error('Order placement error:', error);
    throw error;
  }
}

// Get available contracts
export async function getContracts(): Promise<ContractInfo[]> {
  try {
    console.log('Fetching available contracts...');
    
    // Get session token inline
    const username = process.env.NEXT_PUBLIC_USERNAME;
    const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
    
    if (!username || !apiKey) {
      throw new Error('Username and API key must be configured');
    }
    
    const sessionToken = await authService.getSessionToken(username, apiKey);
    
    const response = await fetch('https://api.topstepx.com/api/Contract/search', {
      method: 'POST',
      headers: {
        'accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        // Add any search parameters if needed
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GetContractsResponse = await response.json();
    
    console.log('Contracts response:', data);

    if (!data.success || data.errorCode !== 0) {
      throw new Error(data.errorMessage || 'Failed to fetch contracts');
    }

    console.log(`Found ${data.contracts.length} contracts`);
    return data.contracts;

  } catch (error) {
    console.error('Get contracts error:', error);
    throw error;
  }
}

// Test market order (buy)
export async function testMarketBuy(accountId: number, contractId: string, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Market,
    side: OrderSide.Bid, // Buy
    size,
    customTag: 'Test Market Buy'
  };

  return placeOrder(orderRequest);
}

// Test market order (sell)
export async function testMarketSell(accountId: number, contractId: string, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Market,
    side: OrderSide.Ask, // Sell
    size,
    customTag: 'Test Market Sell'
  };

  return placeOrder(orderRequest);
}

// Test limit order (buy)
export async function testLimitBuy(accountId: number, contractId: string, limitPrice: number, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Limit,
    side: OrderSide.Bid, // Buy
    size,
    limitPrice,
    customTag: 'Test Limit Buy'
  };

  return placeOrder(orderRequest);
}

// Test limit order (sell)
export async function testLimitSell(accountId: number, contractId: string, limitPrice: number, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Limit,
    side: OrderSide.Ask, // Sell
    size,
    limitPrice,
    customTag: 'Test Limit Sell'
  };

  return placeOrder(orderRequest);
}

// Test stop order (buy)
export async function testStopBuy(accountId: number, contractId: string, stopPrice: number, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Stop,
    side: OrderSide.Bid, // Buy
    size,
    stopPrice,
    customTag: 'Test Stop Buy'
  };

  return placeOrder(orderRequest);
}

// Test stop order (sell)
export async function testStopSell(accountId: number, contractId: string, stopPrice: number, size: number = 1): Promise<PlaceOrderResponse> {
  const orderRequest: PlaceOrderRequest = {
    accountId,
    contractId,
    type: OrderType.Stop,
    side: OrderSide.Ask, // Sell
    size,
    stopPrice,
    customTag: 'Test Stop Sell'
  };

  return placeOrder(orderRequest);
}

// Get order status
export async function getOrderStatus(orderId: number): Promise<any> {
  try {
    console.log(`Getting status for order ${orderId}...`);
    
    // Get session token inline
    const username = process.env.NEXT_PUBLIC_USERNAME;
    const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
    
    if (!username || !apiKey) {
      throw new Error('Username and API key must be configured');
    }
    
    const sessionToken = await authService.getSessionToken(username, apiKey);
    
    const response = await fetch(`https://api.topstepx.com/api/Order/${orderId}`, {
      method: 'GET',
      headers: {
        'accept': 'text/plain',
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Order status response:', data);
    return data;

  } catch (error) {
    console.error('Get order status error:', error);
    throw error;
  }
}

// Cancel order
export async function cancelOrder(orderId: number): Promise<any> {
  try {
    console.log(`Cancelling order ${orderId}...`);
    
    // Get session token inline
    const username = process.env.NEXT_PUBLIC_USERNAME;
    const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
    
    if (!username || !apiKey) {
      throw new Error('Username and API key must be configured');
    }
    
    const sessionToken = await authService.getSessionToken(username, apiKey);
    
    const response = await fetch('https://api.topstepx.com/api/Order/cancel', {
      method: 'POST',
      headers: {
        'accept': 'text/plain',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        orderId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Cancel order response:', data);
    return data;

  } catch (error) {
    console.error('Cancel order error:', error);
    throw error;
  }
} 