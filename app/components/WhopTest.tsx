"use client";

import { useEffect, useState } from 'react';
import { colors } from '../colors';

export default function WhopTest() {
  // const [experienceId, setExperienceId] = useState<string>('exp_XXXXXXXX');
  // const [message, setMessage] = useState<string>('Test message from Momentum Trading Bot');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [generalChatUrl, setGeneralChatUrl] = useState<string>('');
  const [degenChatUrl, setDegenChatUrl] = useState<string>('');

  useEffect(() => {

    if (process.env.NODE_ENV === 'development') {
      setGeneralChatUrl(process.env.NEXT_PUBLIC_WHOP_GENERAL_CHAT_URL || '');
      setDegenChatUrl(process.env.NEXT_PUBLIC_WHOP_DEGEN_CHAT_URL || '');

      console.log('General Chat URL:', generalChatUrl);
      console.log('Degen Chat URL:', degenChatUrl);
    } else {
      setGeneralChatUrl(process.env.WHOP_GENERAL_CHAT_URL || '');
      setDegenChatUrl(process.env.WHOP_DEGEN_CHAT_URL || '');

      console.log('General Chat URL:', generalChatUrl);
      console.log('Degen Chat URL:', degenChatUrl);
    }

    
  }, []);

  async function sendToGeneralChat(payload: object) {

    console.log('General Chat URL:', generalChatUrl);
    console.log('Degen Chat URL:', degenChatUrl);

    try {
      const res = await fetch(generalChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });   

      if (!res.ok) {
        console.log(res);
        throw new Error(`Webhook error: ${res.status}`);
      }

      return {
        status: 'ok',
        message: 'Message sent successfully'
      };

    } catch (error) {
      console.error('Error sending webhook:', error);
      throw error;
    }
  }
  async function sendToDegenChat(payload: object) {

    // Send to degen chat
    try {
      const res = await fetch(degenChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.log(res);
        throw new Error(`Webhook error: ${res.status}`);
      }

      return {
        status: 'ok',
        message: 'Message sent successfully'
      };

    } catch (error) {
      console.error('Error sending webhook:', error);
      throw error;
    }
  }

  async function sendTestMessage() {
    
    const payload = {
      content: `Hey chat, testing sending batch messages to both chats. You should see this in the general chat and the degen chat - dev`
    };

    // Send to general chat
    try {
      const res = await sendToGeneralChat(payload);
      const res2 = await sendToDegenChat(payload);

      console.log('General Chat Response:', res);
      console.log('Degen Chat Response:', res2);

      return {
        status: 'ok',
        message: 'All messages sent successfully',
      };

    } catch (error) {
      console.error('Error sending webhook:', error);
      throw error;
    }

  }
  const handleSendMessage = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('Sending Whop message...');
      const response = await sendTestMessage();
      setResult(JSON.stringify(response, null, 2));
      console.log('Whop message sent successfully:', response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`Error: ${errorMessage}`);
      console.error('Whop message error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 style={{ color: colors.whightprimary }} className="text-xl font-bold mb-4">
          Whop API Test Panel
        </h2>
        <p style={{ color: colors.whightprimary }} className="text-gray-400 mb-6">
          Test sending messages through the Whop API
        </p>

        <div className="space-y-4">
         

          {/* Send Button */}
          <div>
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className={`w-full px-6 py-3 font-medium rounded-lg transition-colors ${
                loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 style={{ color: colors.whightprimary }} className="text-lg font-semibold mb-3">
            Result
          </h3>
          <pre className="bg-gray-900 p-4 rounded text-sm text-green-400 overflow-x-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
} 