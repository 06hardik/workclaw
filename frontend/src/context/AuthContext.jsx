import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { signIn } from "../utils/wallet";
import { getMe, logout as apiLogout } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const savedWallet = localStorage.getItem("wc_wallet");
    const savedSession = localStorage.getItem("wc_session");
    if (!savedWallet || !savedSession) { setLoading(false); return; }
    try {
      const { user } = await getMe();
      setUser(user);
      setWallet(savedWallet);
    } catch {
      localStorage.removeItem("wc_wallet");
      localStorage.removeItem("wc_session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (wallet && accounts.length > 0 && accounts[0].toLowerCase() !== wallet.toLowerCase()) {
          logout();
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, [wallet]);

  const login = async () => {
    const { address, user } = await signIn();
    setUser(user);
    setWallet(address);
    return { address, user };
  };

  const logout = async () => {
    await apiLogout().catch(() => {});
    localStorage.removeItem("wc_wallet");
    localStorage.removeItem("wc_session");
    setUser(null);
    setWallet(null);
  };

  const refreshUser = async () => {
    if (!wallet) return;
    const { user } = await getMe();
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, wallet, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
