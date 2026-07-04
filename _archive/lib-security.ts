// lib/security.ts
// Utilitários de segurança: sanitização, rate limiting, validação

import { NextRequest } from 'next/server';

/**
 * Sanitizar texto para evitar XSS
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizar HTML (remover tags perigosas)
 */
export function sanitizeHTML(html: string): string {
  // Remove scripts e event handlers
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove atributos perigosos
  cleaned = cleaned
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');

  return cleaned;
}

/**
 * Validar email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar senha (força)
 */
export interface PasswordStrength {
  isStrong: boolean;
  score: number; // 0-5
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Mínimo 8 caracteres');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Adicione letras minúsculas');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Adicione letras maiúsculas');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Adicione números');
  } else {
    score++;
  }

  if (!/[!@#$%^&*]/.test(password)) {
    feedback.push('Adicione caracteres especiais (!@#$%^&*)');
  } else {
    score++;
  }

  return {
    isStrong: score >= 4,
    score,
    feedback: feedback.slice(0, 2), // Mostrar apenas 2 principais
  };
}

/**
 * Gerar hash simples para rate limiting (sem crypto pesado)
 */
export function hashIdentifier(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Rate limiting em memória (simples, para dev)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Verificar se requisição é permitida
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const key = hashIdentifier(identifier);

    if (!this.requests.has(key)) {
      this.requests.set(key, [now]);
      return true;
    }

    const timestamps = this.requests.get(key)!;

    // Remover timestamps antigos
    const recentRequests = timestamps.filter((t) => now - t < this.windowMs);

    if (recentRequests.length < this.maxRequests) {
      recentRequests.push(now);
      this.requests.set(key, recentRequests);
      return true;
    }

    return false;
  }

  /**
   * Obter tentativas restantes
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const key = hashIdentifier(identifier);
    const timestamps = this.requests.get(key) || [];

    const recentRequests = timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Resetar limite para um identificador
   */
  reset(identifier: string): void {
    const key = hashIdentifier(identifier);
    this.requests.delete(key);
  }
}

/**
 * Middleware para rate limiting
 */
export function createRateLimitMiddleware(
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  const limiter = new RateLimiter(maxRequests, windowMs);

  return (request: NextRequest): NextRequest => {
    const ip = request.ip || 'unknown';

    if (!limiter.isAllowed(ip)) {
      return new NextRequest(request, {
        status: 429,
      });
    }

    return request;
  };
}

/**
 * Validar comprimento de string
 */
export function validateStringLength(
  text: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (text.length < min) {
    return { valid: false, error: `Mínimo ${min} caracteres` };
  }
  if (text.length > max) {
    return { valid: false, error: `Máximo ${max} caracteres` };
  }
  return { valid: true };
}

/**
 * Validar URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remover caracteres especiais perigosos
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Validar MIME type
 */
export function isValidMimeType(
  mimeType: string,
  allowed: string[]
): boolean {
  return allowed.includes(mimeType);
}

/**
 * Gerar token seguro (para email verification, password reset, etc)
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Verificar se usuário está rodando em localhost
 */
export function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('0.0.0.0')
  );
}

/**
 * Obter IP real do cliente (considerando proxies)
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

/**
 * Validar tamanho de payload
 */
export function validatePayloadSize(
  size: number,
  maxSize: number = 1024 * 1024 // 1MB default
): { valid: boolean; error?: string } {
  if (size > maxSize) {
    return {
      valid: false,
      error: `Payload muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
    };
  }
  return { valid: true };
}

/**
 * Detectar bots/scrapers por User-Agent
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
  ];
  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Prevenir CSRF com tokens
 */
export function generateCSRFToken(): string {
  return generateSecureToken(64);
}

/**
 * Validar CSRF token
 */
export function validateCSRFToken(
  token: string,
  storedToken: string
): boolean {
  return token === storedToken;
}

/**
 * Fazer hash de senha (simples, use bcrypt em produção!)
 */
export async function hashPassword(password: string): Promise<string> {
  // IMPORTANTE: Em produção, use bcrypt!
  // import bcrypt from 'bcrypt';
  // return await bcrypt.hash(password, 10);

  // Implementação básica (apenas para demo)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verificar senha contra hash (simples, use bcrypt em produção!)
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // IMPORTANTE: Em produção, use bcrypt!
  // import bcrypt from 'bcrypt';
  // return await bcrypt.compare(password, hash);

  const testHash = await hashPassword(password);
  return testHash === hash;
}

/**
 * Criar lista de segurança (whitelist/blacklist)
 */
export class SecurityList {
  private list: Set<string>;
  private isWhitelist: boolean;

  constructor(items: string[] = [], isWhitelist: boolean = true) {
    this.list = new Set(items);
    this.isWhitelist = isWhitelist;
  }

  add(item: string): void {
    this.list.add(item);
  }

  remove(item: string): void {
    this.list.delete(item);
  }

  isAllowed(item: string): boolean {
    if (this.isWhitelist) {
      return this.list.has(item);
    }
    return !this.list.has(item);
  }
}
