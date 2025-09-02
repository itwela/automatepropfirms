import { NextResponse } from 'next/server';
import { 
  sendToNQPremiumChat_WHOP,
} from '../../services/whopServices';

export async function POST(request: Request) {
  try {

    // incoming payload from tradingview for signal
    const { 
        text, 
        direction, 
        comment, 
        timeframe, 
        time_Of_Message, 
        symbol ,
        price
    } = await request.json();
// Validate required fields
    if (!text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Text is required' 
      }, { status: 400 });
    }

    // Create message based on direction
    let messageContent = '';
    
    if (direction === 'buy') {
        messageContent = `🟢 **BUY SIGNAL** 🟢\n\n📊 **${symbol}** - ${timeframe}\n💰 **Direction:** LONG\n📝 **Comment:** ${comment}\n⏰ **Time:** ${time_Of_Message}\n📈 **Price:** ${price || 'Market'}\n\n${text}`;
    } else if (direction === 'sell') {
        messageContent = `🔴 **SELL SIGNAL** 🔴\n\n📊 **${symbol}** - ${timeframe}\n💰 **Direction:** SHORT\n📝 **Comment:** ${comment}\n⏰ **Time:** ${time_Of_Message}\n📉 **Price:** ${price || 'Market'}\n\n${text}`;
    } else {
        messageContent = `📊 **TRADING SIGNAL** 📊\n\n📊 **${symbol}** - ${timeframe}\n💰 **Direction:** ${direction.toUpperCase()}\n📝 **Comment:** ${comment}\n⏰ **Time:** ${time_Of_Message}\n💲 **Price:** ${price || 'Market'}\n\n${text}`;
    }

    const payload = { content: messageContent };
    let result;

    console.log('📤 Sending trading signal message to NQ Premium Chat');
    result = await sendToNQPremiumChat_WHOP(payload);

    console.log('✅ Message sent successfully:', result);

    return NextResponse.json({ 
      success: true, 
      message: 'Trading signal message sent successfully',
      direction: direction,
      symbol: symbol,
      result: result
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
