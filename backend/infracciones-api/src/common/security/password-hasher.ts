import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

function isArgon2Hash(hash: string): boolean {
  return hash.startsWith('$argon2');
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    if (isArgon2Hash(passwordHash)) {
      return await argon2.verify(passwordHash, password);
    }

    if (isBcryptHash(passwordHash)) {
      return await bcrypt.compare(password, passwordHash);
    }

    return false;
  } catch {
    return false;
  }
}

export function passwordHashNeedsUpgrade(passwordHash: string): boolean {
  if (isBcryptHash(passwordHash)) {
    return true;
  }

  if (!isArgon2Hash(passwordHash)) {
    return true;
  }

  try {
    return argon2.needsRehash(passwordHash, ARGON2_OPTIONS);
  } catch {
    return true;
  }
}
