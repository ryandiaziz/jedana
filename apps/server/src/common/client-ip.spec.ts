import { getClientIp } from './client-ip';

describe('getClientIp', () => {
  it('returns valid IPv4 address from x-real-ip header', () => {
    const req = {
      headers: { 'x-real-ip': '203.0.113.9' },
      ip: '127.0.0.1',
    };
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  it('returns valid IPv6 address from x-real-ip header', () => {
    const req = {
      headers: { 'x-real-ip': '2001:db8::1' },
      ip: '127.0.0.1',
    };
    expect(getClientIp(req)).toBe('2001:db8::1');
  });

  it('returns first element if x-real-ip is an array with valid IP', () => {
    const req = {
      headers: { 'x-real-ip': ['203.0.113.25', '198.51.100.1'] },
      ip: '127.0.0.1',
    };
    expect(getClientIp(req)).toBe('203.0.113.25');
  });

  it('falls back to req.ip when x-real-ip header contains garbage', () => {
    const req = {
      headers: { 'x-real-ip': 'not-an-ip' },
      ip: '192.0.2.1',
    };
    expect(getClientIp(req)).toBe('192.0.2.1');
  });

  it('falls back to socket.remoteAddress when neither header nor req.ip are valid IPs', () => {
    const req = {
      headers: { 'x-real-ip': 'invalid-ip' },
      ip: 'also-invalid',
      socket: { remoteAddress: '198.51.100.5' },
    };
    expect(getClientIp(req)).toBe('198.51.100.5');
  });

  it('returns unknown when no header, ip, or socket address are present', () => {
    const req = {
      headers: {},
    };
    expect(getClientIp(req)).toBe('unknown');
  });
});
