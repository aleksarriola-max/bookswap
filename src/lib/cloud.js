import { createClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudEnabled = Boolean(url && key);
export const supabase = cloudEnabled ? createClient(url, key) : null;
export const cloudCache = { books: [], requests: [], messages: [], wishlist: [] };
let identity = null;
let version = 0;
let refreshQueue = Promise.resolve();
const listeners = new Set();
const notify = () => { version++; listeners.forEach(listener => listener()); };
export const useStoreVersion = () => useSyncExternalStore(listener => {
  listeners.add(listener); return () => listeners.delete(listener);
}, () => version);
export const notifyStore = notify;
export const cloudUserId = () => identity;
export function clearCloudCache() {
  identity = null;
  Object.keys(cloudCache).forEach(key => { cloudCache[key] = []; });
  notify();
}
export function setCloudIdentity(id) {
  if (identity !== id) {
    Object.keys(cloudCache).forEach(key => { cloudCache[key] = []; });
    identity = id;
    notify();
  }
}

export async function refreshCloud() {
  const current = identity;
  if (!current) return;
  const run = async () => {
    if (identity !== current) return;
    const names = Object.keys(cloudCache);
    const results = await Promise.all(names.map(name => supabase.from(name).select('data')));
    const failure = results.find(result => result.error);
    if (failure) throw failure.error;
    if (identity !== current) return;
    names.forEach((name, i) => {
      cloudCache[name] = results[i].data.map(row => row.data).sort((a, b) =>
        name === 'messages' ? a.sentAt - b.sentAt : b.createdAt - a.createdAt);
    });
    notify();
  };
  refreshQueue = refreshQueue.catch(() => {}).then(run);
  return refreshQueue;
}

export function reportError(error) {
  window.dispatchEvent(new CustomEvent('bookswap-error', { detail: error.message || 'Couldn’t save. Please try again.' }));
}

// UI actions await writes; failed writes leave the form and cached data intact.
export async function runAction(action) {
  try { return await action(); }
  catch (error) { reportError(error); return null; }
}

export async function cloudAction(action, args) {
  const { data, error } = await supabase.rpc('bookswap_action', { action, args });
  if (error) throw error;
  try { await refreshCloud(); }
  catch { reportError(new Error('Saved, but the latest data couldn’t load. Refresh to see it.')); }
  return data;
}

export async function uploadCover(dataUrl) {
  if (!dataUrl?.startsWith('data:')) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error('Choose a cover image smaller than 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Use a JPG, PNG, or WebP cover.');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[blob.type];
  const path = `${identity}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('book-covers').upload(path, blob);
  if (error) throw error;
  return supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl;
}
