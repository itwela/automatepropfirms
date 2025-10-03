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

    // Format time for better readability
    const formatTime = (timeString: string) => {
      try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
          return timeString; // Return original if can't parse
        }
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch {
        return timeString; // Return original if error
      }
    };

    const formattedTime = formatTime(time_Of_Message);

    // Create message based on comment type
    let messageContent = '';
    
    if (comment === 'go_long') {
        messageContent = `🟢 BUY SIGNAL - GO LONG 🟢\n\nSymbol: ${symbol}\nTimeframe: ${timeframe}\nAction: GO LONG\nDirection: BUY\nTime: ${formattedTime}\nPrice: ${price || 'Market'}\n\n${text}`;
    } else if (comment === 'go_short') {
        messageContent = `🔴 SELL SIGNAL - GO SHORT 🔴\n\nSymbol: ${symbol}\nTimeframe: ${timeframe}\nAction: GO SHORT\nDirection: SELL\nTime: ${formattedTime}\nPrice: ${price || 'Market'}\n\n${text}`;
    } else if (comment === 'exit_long') {
        messageContent = `❌ EXIT SIGNAL - CLOSE LONG 🔴\n\nSymbol: ${symbol}\nTimeframe: ${timeframe}\nAction: EXIT LONG\nDirection: SELL\nTime: ${formattedTime}\nPrice: ${price || 'Market'}\n\n${text}`;
    } else if (comment === 'exit_short') {
        messageContent = `❌ EXIT SIGNAL - CLOSE SHORT 🟢\n\nSymbol: ${symbol}\nTimeframe: ${timeframe}\nAction: EXIT SHORT\nDirection: BUY\nTime: ${formattedTime}\nPrice: ${price || 'Market'}\n\n${text}`;
    } else {
        // Fallback for unknown comment types
        messageContent = `📊 TRADING SIGNAL 📊\n\nSymbol: ${symbol}\nTimeframe: ${timeframe}\nComment: ${comment}\nDirection: ${direction?.toUpperCase() || 'UNKNOWN'}\nTime: ${formattedTime}\nPrice: ${price || 'Market'}\n\n${text}`;
    }

    const payload = { content: messageContent };

    console.log('📤 Sending trading signal message to NQ Premium Chat');
    const result = await sendToNQPremiumChat_WHOP(payload);

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
