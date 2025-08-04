"use client";

import { motion } from "framer-motion";
import { colors } from "./colors";
import TradingTest from "./components/TradingTest";
import WhopTest from "./components/WhopTest";
import { Dashboard } from "./components/Dashboard";
import { useState, useEffect } from "react";
import { authService } from "./services/authService";

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trading' | 'whop'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Load authentication and account ID on component mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const username = process.env.NEXT_PUBLIC_USERNAME;
        const apiKey = process.env.NEXT_PUBLIC_PROJECTX_TOPSTEP_API_KEY;
        // Only used for REST, not for SignalR anymore
        if (username && apiKey) {
          await authService.getSessionToken(username, apiKey);
        }
      } catch (error) {
        console.error('Failed to load authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accessPassword = process.env.NEXT_PUBLIC_ACCESS_PASSWORD;
    
    if (password === accessPassword) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ backgroundColor: colors.darkprimary }} className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p style={{ color: colors.whightprimary }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Password protection screen
  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: colors.darkprimary }} className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1 
            style={{ color: colors.whightprimary }} 
            className="text-3xl font-bold mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Coming Soon
          </motion.h1>
          
          <motion.p 
            style={{ color: colors.whightprimary }} 
            className="text-gray-400 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            This application is currently in development and will be available soon.
          </motion.p>

          <motion.form 
            onSubmit={handlePasswordSubmit}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access password"
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                style={{ backgroundColor: colors.darkprimary }}
              />
            </div>
            
            {passwordError && (
              <motion.p 
                className="text-red-400 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {passwordError}
              </motion.p>
            )}
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Access Application
            </button>
          </motion.form>

          <motion.p 
            style={{ color: colors.whightprimary }} 
            className="text-xs mt-8 text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Built by Twezo x Caveman Creative © {currentYear}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: colors.darkprimary }} className="min-h-screen">
      {/* Header */}
      <header className="p-6 border-b border-gray-700">
        <motion.h1 
          style={{ color: colors.whightprimary }} 
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Momentum Prop Firm Automation
        </motion.h1>
        <motion.p 
          style={{ color: colors.whightprimary }} 
          className="text-gray-400 mt-2"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Made To Extract As Much Wealth As Possible From The Market
        </motion.p>
      </header>

      {/* Navigation Tabs */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'trading'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Trading Test
          </button>
          <button
            onClick={() => setActiveTab('whop')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'whop'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Whop Test
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'trading' && <TradingTest />}
        {activeTab === 'whop' && <WhopTest />}
      </main>

      {/* Footer */}
      <motion.footer 
        style={{ color: colors.whightprimary }} 
        className="p-6 text-center text-sm border-t border-gray-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Built by Twezo x Caveman Creative © {currentYear}
      </motion.footer>
    </div>
  );
}
