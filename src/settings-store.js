import { useSyncExternalStore } from 'react';

// Shared open/close state for the Settings sheet so the control bar,
// Contents entry and Book stay in sync without prop-drilling.
let open = false;
let trigger = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

export function openSettings(triggerEl) {
  if (open) return;
  trigger = triggerEl !== undefined ? triggerEl : typeof document !== 'undefined' ? document.activeElement : null;
  open = true;
  emit();
}

export function closeSettings() {
  if (!open) return;
  open = false;
  emit();
}

export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSettingsOpen() {
  return open;
}

export function useSettingsOpen() {
  return useSyncExternalStore(subscribeSettings, getSettingsOpen, getSettingsOpen);
}

export function settingsTrigger() {
  return trigger;
}
