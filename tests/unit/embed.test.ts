import { expect, it } from 'vitest';
import { isEmbeddable } from '../../src/shared/embed.ts';

const ORIGIN = 'https://arcade.example.com';
const check = (headers: Record<string, string>) => isEmbeddable(new Headers(headers), ORIGIN);

it('allows pages without framing headers', () => {
  expect(check({})).toBe(true);
});

it('blocks X-Frame-Options DENY and SAMEORIGIN', () => {
  expect(check({ 'x-frame-options': 'DENY' })).toBe(false);
  expect(check({ 'x-frame-options': 'sameorigin' })).toBe(false);
  expect(check({ 'x-frame-options': 'ALLOWALL' })).toBe(true);
});

it('reads CSP frame-ancestors', () => {
  expect(check({ 'content-security-policy': "default-src 'self'; frame-ancestors 'self'" })).toBe(false);
  expect(check({ 'content-security-policy': "frame-ancestors 'none'" })).toBe(false);
  expect(check({ 'content-security-policy': 'frame-ancestors *' })).toBe(true);
  expect(check({ 'content-security-policy': "frame-ancestors 'self' https://arcade.example.com" })).toBe(true);
  expect(check({ 'content-security-policy': 'frame-ancestors https://*.example.com' })).toBe(true);
  expect(check({ 'content-security-policy': 'frame-ancestors https:' })).toBe(true);
  expect(check({ 'content-security-policy': 'frame-ancestors https://itch.io' })).toBe(false);
});

it('lets frame-ancestors override X-Frame-Options', () => {
  expect(check({ 'x-frame-options': 'DENY', 'content-security-policy': 'frame-ancestors *' })).toBe(true);
});

it('ignores CSP without frame-ancestors', () => {
  expect(check({ 'content-security-policy': "default-src 'self'" })).toBe(true);
});
