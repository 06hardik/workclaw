import { createContext, useContext, useEffect, useRef, useState } from "react";
import { connectWS, onWsMessage } from "../utils/api";

const WsContext = createContext(null);

export function WsProvider({ children }) {
  const [lastMessage, setLastMessage] = useState(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Set());

  useEffect(() => {
    const ws = connectWS();
    const handleOpen = () => setConnected(true);
    const handleClose = () => setConnected(false);
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("close", handleClose);
    if (ws.readyState === WebSocket.OPEN) setConnected(true);

    const remove = onWsMessage((data) => {
      setLastMessage(data);
      listenersRef.current.forEach((fn) => fn(data));
    });

    return () => {
      remove();
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("close", handleClose);
    };
  }, []);

  const subscribe = (fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  };

  return (
    <WsContext.Provider value={{ lastMessage, connected, subscribe }}>
      {children}
    </WsContext.Provider>
  );
}

export const useWs = () => useContext(WsContext);
