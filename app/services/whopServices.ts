// Backend Whop webhook services for server-side usage

async function sendToGeneralChat_WHOP(payload: object) {
  const generalChatUrl = process.env.NODE_ENV === 'production' ? process.env.WHOP_GENERAL_CHAT_URL : process.env.NEXT_PUBLIC_WHOP_GENERAL_CHAT_URL;
  
  if (!generalChatUrl) {
    throw new Error('WHOP_GENERAL_CHAT_URL environment variable not configured');
  }

  try {
    const res = await fetch(generalChatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });   

    if (!res.ok) {
      throw new Error(`Webhook error: ${res.status}`);
    }

    return {
      status: 'ok',
      message: 'Message sent successfully to general chat'
    };

  } catch (error) {
    console.error('Error sending to general chat:', error);
    throw error;
  }
}

async function sendToDegenChat_WHOP(payload: object) {
  const degenChatUrl = process.env.NODE_ENV === 'production' ? process.env.WHOP_DEGEN_CHAT_URL : process.env.NEXT_PUBLIC_WHOP_DEGEN_CHAT_URL;
  
  if (!degenChatUrl) {
    throw new Error('WHOP_DEGEN_CHAT_URL environment variable not configured');
  }

  try {
    const res = await fetch(degenChatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Webhook error: ${res.status}`);
    }

    return {
      status: 'ok',
      message: 'Message sent successfully to degen chat'
    };

  } catch (error) {
    console.error('Error sending to degen chat:', error);
    throw error;
  }
}

async function sendSignalsToWhopChats(payload: object) {
 
    try {

        const [generalResult, degenResult] = await Promise.all([
            sendToGeneralChat_WHOP(payload),
            sendToDegenChat_WHOP(payload)
        ]);

        return {
        status: 'ok',
        message: 'All messages sent successfully',
        generalChat: generalResult,
        degenChat: degenResult
        };

  } catch (error) {
    console.error('Error sending to both chats:', error);
    throw error;
  }
}

async function sendTestMessage() {
  const payload = {
    content: `Hey chat, testing sending batch messages to both chats. You should see this in the general chat and the degen chat - server`
  };

  return await sendSignalsToWhopChats(payload);
}

export {
  sendToGeneralChat_WHOP,
  sendToDegenChat_WHOP,
  sendSignalsToWhopChats,
  sendTestMessage
};
