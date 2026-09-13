import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createTutorClient } from './client.mjs';
import { TUTOR_ENDPOINT } from './config.js';

const AiContext = createContext(null);

export function AiProvider({ children }) {
  const clientRef = useRef(null);
  if (!clientRef.current) clientRef.current = createTutorClient({ endpoint: TUTOR_ENDPOINT });
  const client = clientRef.current;
  const [snapshot, setSnapshot] = useState(client.getSnapshot);

  useEffect(() => {
    setSnapshot(client.getSnapshot());
    const unsubscribe = client.subscribe(setSnapshot);
    return () => { unsubscribe(); client.stop(); };
  }, [client]);

  return <AiContext.Provider value={{ ...snapshot, ask: client.ask, generateLogicProblem: client.generateLogicProblem, stop: client.stop }}>
    {children}
  </AiContext.Provider>;
}

export function useAI() {
  const value = useContext(AiContext);
  if (!value) throw new Error('useAI must be used inside AiProvider.');
  return value;
}
