"use client";

import type { SessionStore } from "@potdrive/sdk/upload";

// What this browser remembers about uploads. The chain and the registry are the
// source of truth; this keeps private keys and lets files show up before the
// registry is read.

export interface LocalFile {
  root: string;
  name: string;
  mime: string;
  size: number;
  storedBytes: number;
  blocks: number;
  key?: string;
  owner: string;
  createdAt: number;
  expiresAt?: number;
}

const FILES = "potdrive.files";
const SESSIONS = "potdrive.sessions";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function localFiles(owner?: string): LocalFile[] {
  return read<LocalFile>(FILES)
    .filter((f) => !owner || f.owner === owner)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveLocalFile(f: LocalFile) {
  write(FILES, [f, ...read<LocalFile>(FILES).filter((x) => x.root !== f.root)]);
}

export function forgetLocalFile(root: string) {
  write(
    FILES,
    read<LocalFile>(FILES).filter((x) => x.root !== root),
  );
}

export function keyFor(root: string): string | undefined {
  return read<LocalFile>(FILES).find((f) => f.root === root)?.key;
}

export interface PendingSession {
  mnemonic: string;
  owner: string;
  root: string;
  createdAt: number;
}

export const sessionStore: SessionStore = {
  save(s) {
    write(SESSIONS, [...read<PendingSession>(SESSIONS).filter((x) => x.root !== s.root), s]);
  },
  clear(root) {
    write(
      SESSIONS,
      read<PendingSession>(SESSIONS).filter((x) => x.root !== root),
    );
  },
};

export function pendingSessions(owner?: string): PendingSession[] {
  return read<PendingSession>(SESSIONS).filter((s) => !owner || s.owner === owner);
}
