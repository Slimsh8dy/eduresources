import React from 'react';
import {readSaved, writeSaved} from './state.mjs';

const getStorage = () => { try { return window.localStorage; } catch { return null; } };

export function useDeviceSave(key, initial, validate) {
  const [state, setState] = React.useState(() => ({...readSaved(getStorage(), key, initial, validate), edited: false}));
  React.useEffect(() => {
    if (!state.edited || state.status === 'corrupt') return;
    const status = writeSaved(getStorage(), key, state.data);
    setState(current => current.data === state.data ? {...current, status, edited: false} : current);
  }, [key, state.data, state.edited, state.status]);
  const setData = React.useCallback(update => setState(current => ({...current, data: typeof update === 'function' ? update(current.data) : update, edited: true})), []);
  const retry = () => setState(current => ({...current, status: 'ready', edited: true}));
  return [state.data, setData, state.status, retry];
}

export function SaveStatus({status, retry}) {
  const messages = {
    saved: 'Saved on this device',
    ready: 'Ready to save on this device',
    unavailable: 'Device saving unavailable — keep this tab open and export important work.',
    corrupt: 'Previous saved work could not be read. Your current work is held in this tab.',
  };
  return <div className={`learn-save ${status}`}>
    <span role="status">{messages[status]}</span>
    {status === 'unavailable' && <button type="button" onClick={retry}>Retry saving</button>}
    {status === 'corrupt' && <button type="button" onClick={retry}>Replace unreadable save with current work</button>}
    <small>Browser storage stays on this device; clearing browser data removes it.</small>
  </div>;
}

export function SourceLinks({sources}) {
  if (!sources?.length) return null;
  return <div className="learn-sources">Sources: {sources.map((source, index) => <React.Fragment key={source.url}>{index > 0 && '; '}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></React.Fragment>)}</div>;
}
