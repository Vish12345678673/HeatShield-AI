import { useEffect, useState } from "react";

export interface Account {
  name: string;
  email: string;
  passHash: string;
  phone?: string;
  city?: string;
  country?: string;
  org?: string;
  createdAt: number;
}

export interface Session {
  email: string;
  name: string;
  loginAt: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  country?: string;
  org?: string;
}

const USERS_KEY = "hsai_users";
const SESSION_LOCAL = "hsai_session";
const AUTH_EVENT = "hsai-auth-changed";

export const DEMO_EMAIL = "demo@heatshield.ai";
export const DEMO_PASSWORD = "demo1234";

/* Demo-grade hash (not for production secrets). */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a_${(h >>> 0).toString(16)}_${input.length}`;
}

function readUsers(): Account[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: Account[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const DEMO_NAME = "Vishwa";

export function ensureDemoUser(): void {
  const users = readUsers();
  const existing = users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    // Keep the stored demo profile in sync with the current demo identity.
    if (existing.name !== DEMO_NAME) {
      existing.name = DEMO_NAME;
      writeUsers(users);
    }
    return;
  }
  users.push({
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    passHash: hash(DEMO_PASSWORD),
    city: "Las Vegas",
    country: "United States",
    createdAt: Date.now(),
  });
  writeUsers(users);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const capped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"] as const;
  return { score: capped, label: labels[capped]! };
}

export function register(input: RegisterInput): Session {
  ensureDemoUser();
  const email = input.email.trim().toLowerCase();
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }
  const account: Account = {
    name: input.name.trim(),
    email,
    passHash: hash(input.password),
    createdAt: Date.now(),
  };
  if (input.phone) account.phone = input.phone;
  if (input.city) account.city = input.city;
  if (input.country) account.country = input.country;
  if (input.org) account.org = input.org;
  users.push(account);
  writeUsers(users);
  return { email, name: account.name, loginAt: Date.now() };
}

export function login(email: string, password: string, remember: boolean): Session {
  ensureDemoUser();
  const normalized = email.trim().toLowerCase();
  const account = readUsers().find((u) => u.email === normalized);
  if (!account || account.passHash !== hash(password)) {
    throw new Error("Invalid email or password.");
  }
  const session: Session = { email: account.email, name: account.name, loginAt: Date.now() };
  const payload = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(SESSION_LOCAL, payload);
    sessionStorage.removeItem(SESSION_LOCAL);
  } else {
    sessionStorage.setItem(SESSION_LOCAL, payload);
    localStorage.removeItem(SESSION_LOCAL);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
  return session;
}

export function logout(): void {
  localStorage.removeItem(SESSION_LOCAL);
  sessionStorage.removeItem(SESSION_LOCAL);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_LOCAL) ?? localStorage.getItem(SESSION_LOCAL);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    // Demo sessions always surface the current demo identity.
    if (session.email === DEMO_EMAIL) session.name = DEMO_NAME;
    return session;
  } catch {
    return null;
  }
}

export function useAuth(): { user: Session | null; ready: boolean } {
  const [user, setUser] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getSession());
    sync();
    setReady(true);
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  return { user, ready };
}

