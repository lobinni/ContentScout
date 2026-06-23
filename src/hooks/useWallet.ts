/**
 * Custom hook for MetaMask wallet connection
 * Real integration with GenLayer Bradbury network
 */

import { useState, useCallback, useEffect } from 'react';
import * as genlayer from '../lib/genlayer';
import { WalletState } from '../types';

const STORAGE_KEY = 'contentscout_wallet_connected';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    chainId: null,
    balance: '0',
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update balance
  const updateBalance = useCallback(async () => {
    try {
      const balance = await genlayer.getBalance();
      setWallet(prev => ({ ...prev, balance }));
    } catch (err) {
      console.error('Failed to get balance:', err);
    }
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const wasConnected = localStorage.getItem(STORAGE_KEY);
      
      if (wasConnected === 'true' && genlayer.isMetaMaskAvailable()) {
        try {
          // Check if still connected
          const accounts = await window.ethereum!.request({
            method: 'eth_accounts',
          }) as string[];

          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            const balance = await genlayer.getBalance();

            setWallet({
              connected: true,
              address,
              chainId: genlayer.CHAIN_ID,
              balance,
            });
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.error('Failed to restore connection:', err);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    checkConnection();
  }, []);

  // Periodically update balance
  useEffect(() => {
    if (!wallet.connected || !wallet.address) return;

    const interval = setInterval(() => {
      updateBalance();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, updateBalance]);

  /**
   * Connect wallet via MetaMask
   */
  const connect = useCallback(async (): Promise<string> => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!genlayer.isMetaMaskAvailable()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      const address = await genlayer.connectWallet();
      const balance = await genlayer.getBalance();

      setWallet({
        connected: true,
        address,
        chainId: genlayer.CHAIN_ID,
        balance,
      });

      localStorage.setItem(STORAGE_KEY, 'true');

      return address;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    genlayer.disconnectWallet();

    setWallet({
      connected: false,
      address: null,
      chainId: null,
      balance: '0',
    });

    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Check if MetaMask is available
   */
  const isMetaMaskAvailable = genlayer.isMetaMaskAvailable;

  return {
    wallet,
    connect,
    disconnect,
    isConnecting,
    error,
    isMetaMaskAvailable,
  };
}

export default useWallet;
