/**
 * Custom hook for wallet connection
 * 
 * In production with actual MetaMask:
 * 
 * import { useAccount, useConnect, useDisconnect } from 'wagmi';
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

  // Check for existing connection on mount
  useEffect(() => {
    const wasConnected = localStorage.getItem(STORAGE_KEY);
    if (wasConnected === 'true') {
      const address = genlayer.getConnectedAddress();
      if (address) {
        setWallet({
          connected: true,
          address,
          chainId: genlayer.CHAIN_ID,
          balance: '10.5',
        });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);

    try {
      const address = await genlayer.connectWallet();
      
      setWallet({
        connected: true,
        address,
        chainId: genlayer.CHAIN_ID,
        balance: '10.5', // Simulated balance
      });

      localStorage.setItem(STORAGE_KEY, 'true');
      
      return address;
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

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

  return {
    wallet,
    connect,
    disconnect,
    isConnecting,
  };
}

export default useWallet;
