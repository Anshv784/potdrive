"use client";

import type { Inbox } from "@potdrive/sdk/share";

// The X25519 inbox private key never leaves this browser. Losing it means losing access to
// files shared with you later (files you uploaded yourself are unaffected).
const key = (address: string) => `potdrive.inbox.${address}`;

export function loadInbox(address: string): Inbox | null {
  try {
    const raw = localStorage.getItem(key(address));
    return raw ? (JSON.parse(raw) as Inbox) : null;
  } catch {
    return null;
  }
}

export function saveInbox(address: string, inbox: Inbox) {
  try {
    localStorage.setItem(key(address), JSON.stringify(inbox));
  } catch {}
}
