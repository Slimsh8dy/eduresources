import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createLocalAIClient } from './client.mjs';

const AiContext = createContext(null);

export function AiProvider({ children }) {
  const clientRef = useRef(null);
  if (!clientRef.current) clientRef.current = createLocalAIClient();
  const client = clientRef.current;
  const [snapshot, setSnapshot] = useState(client.getSnapshot);

  useEffect(() => {
    setSnapshot(client.getSnapshot());
    const unsubscribe = client.subscribe(setSnapshot);
    // stop(), rather than permanent dispose(), also supports StrictMode's effect replay.
    return () => { unsubscribe(); client.stop(); };
  }, [client]);

  return <AiContext.Provider value={{ ...snapshot, enable: client.enable, generate: client.generate,
    stop: client.stop, unload: client.unload, clearCache: client.clearCache }}>
    {children}
  </AiContext.Provider>;
}

export function useAI() {
  const value = useContext(AiContext);
  if (!value) throw new Error('useAI must be used inside AiProvider.');
  return value;
}
