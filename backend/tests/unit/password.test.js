import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Utility', () => {
  it('should hash a password securely', async () => {
    const raw = 'SuperSecret123!';
    const hashed = await hashPassword(raw);

    expect(hashed).toBeDefined();
    expect(hashed).not.toEqual(raw);
    expect(hashed.startsWith('$2')).toBe(true);
  });

  it('should successfully verify matching password', async () => {
    const raw = 'SuperSecret123!';
    const hashed = await hashPassword(raw);
    const isValid = await comparePassword(raw, hashed);

    expect(isValid).toBe(true);
  });

  it('should reject non-matching password', async () => {
    const raw = 'SuperSecret123!';
    const wrong = 'WrongPassword456!';
    const hashed = await hashPassword(raw);
    const isValid = await comparePassword(wrong, hashed);

    expect(isValid).toBe(false);
  });
});
