import * as bcrypt from 'bcryptjs';

import {
  hashPassword,
  passwordHashCanBeSafelyUpgraded,
  passwordHashNeedsUpgrade,
  verifyPassword,
} from './password-hasher';

describe('password-hasher', () => {
  const password = 'frase de acceso suficientemente larga';

  it('genera hashes Argon2id y valida la contraseña correcta', async () => {
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    expect(passwordHashNeedsUpgrade(hash)).toBe(false);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword(password);

    await expect(verifyPassword(hash, 'otra contraseña distinta')).resolves.toBe(
      false,
    );
  });

  it('acepta bcrypt heredado y lo marca para actualización', async () => {
    const legacyHash = await bcrypt.hash(password, 10);

    await expect(verifyPassword(legacyHash, password)).resolves.toBe(true);
    expect(passwordHashNeedsUpgrade(legacyHash)).toBe(true);
    expect(passwordHashCanBeSafelyUpgraded(legacyHash, password)).toBe(true);
  });

  it('no rehashea automaticamente bcrypt cuando la entrada excede 72 bytes', async () => {
    const longPassword = 'a'.repeat(80);
    const legacyHash = await bcrypt.hash(longPassword, 10);

    await expect(verifyPassword(legacyHash, longPassword)).resolves.toBe(true);
    expect(passwordHashCanBeSafelyUpgraded(legacyHash, longPassword)).toBe(
      false,
    );
  });

  it('rechaza formatos de hash desconocidos sin lanzar errores', async () => {
    await expect(verifyPassword('hash-no-soportado', password)).resolves.toBe(
      false,
    );
    expect(passwordHashNeedsUpgrade('hash-no-soportado')).toBe(true);
  });
});
