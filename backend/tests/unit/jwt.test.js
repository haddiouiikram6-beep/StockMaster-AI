const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} = require('../../src/utils/jwt');

describe('JWT Utility', () => {
  const payload = { id: 1, email: 'user@example.com', role: 'employee' };

  it('should generate and verify an access token', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('should generate and verify a refresh token', () => {
    const token = generateRefreshToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
  });

  it('should throw an error on tampered access token', () => {
    const token = generateAccessToken(payload);
    const tampered = token.slice(0, -5) + 'abcde';

    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
