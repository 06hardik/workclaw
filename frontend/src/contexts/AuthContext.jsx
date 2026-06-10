import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wc_token'));
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch profile if token exists
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token]);

  const fetchProfile = async (jwt) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    }
  };

  const loginWithMetaMask = async () => {
    setIsConnecting(true);
    try {
      if (!window.ethereum) throw new Error("Please install MetaMask to login");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 1. Get Nonce
      const nonceRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/nonce?address=${address}`);
      const nonceData = await nonceRes.json();
      if (!nonceData.nonce) throw new Error("Failed to get nonce");

      // 2. Sign Message
      const message = `Welcome to WorkClaw!\n\nClick to sign in and accept the WorkClaw Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${address}\n\nNonce:\n${nonceData.nonce}`;
      const signature = await signer.signMessage(message);

      // 3. Verify Signature
      const verifyRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature })
      });
      const verifyData = await verifyRes.json();
      
      if (verifyData.success) {
        setToken(verifyData.token);
        setUser(verifyData.user);
        localStorage.setItem('wc_token', verifyData.token);
        return { success: true };
      } else {
        throw new Error(verifyData.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wc_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isConnecting, loginWithMetaMask, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
