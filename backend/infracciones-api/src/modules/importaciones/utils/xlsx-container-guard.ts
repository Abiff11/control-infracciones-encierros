import { BadRequestException } from '@nestjs/common';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const MAX_ZIP_COMMENT_LENGTH = 65_535;
const EOCD_MIN_LENGTH = 22;

export interface XlsxContainerLimits {
  maxEntries: number;
  maxTotalUncompressedBytes: number;
  maxEntryUncompressedBytes: number;
  maxCompressionRatio: number;
}

function reject(message: string): never {
  throw new BadRequestException(message);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const start = Math.max(
    0,
    buffer.length - EOCD_MIN_LENGTH - MAX_ZIP_COMMENT_LENGTH,
  );

  for (let offset = buffer.length - EOCD_MIN_LENGTH; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  return reject('El archivo XLSX no contiene un directorio ZIP valido.');
}

export function assertSafeXlsxContainer(
  buffer: Buffer,
  limits: XlsxContainerLimits,
): void {
  if (buffer.length < EOCD_MIN_LENGTH) {
    reject('El archivo XLSX esta incompleto.');
  }

  const eocdOffset = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== totalEntries
  ) {
    reject('No se permiten archivos XLSX ZIP multipartes.');
  }

  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    reject('No se permiten archivos XLSX con formato ZIP64.');
  }

  if (totalEntries === 0 || totalEntries > limits.maxEntries) {
    reject(
      `El archivo XLSX excede el limite de ${limits.maxEntries} entradas internas.`,
    );
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (
    centralDirectoryOffset < 0 ||
    centralDirectoryEnd > eocdOffset ||
    centralDirectoryEnd > buffer.length
  ) {
    reject('El directorio ZIP del archivo XLSX es inconsistente.');
  }

  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    if (
      cursor + 46 > centralDirectoryEnd ||
      buffer.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_SIGNATURE
    ) {
      reject('El directorio ZIP del archivo XLSX esta corrupto.');
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);

    if ((flags & 0x0001) !== 0) {
      reject('No se permiten archivos XLSX cifrados.');
    }

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      reject('No se permiten entradas ZIP64 dentro del archivo XLSX.');
    }

    if (uncompressedSize > limits.maxEntryUncompressedBytes) {
      reject(
        'Una entrada interna del XLSX excede el tamaño descomprimido permitido.',
      );
    }

    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      reject('El XLSX excede el tamaño total descomprimido permitido.');
    }

    if (uncompressedSize > 1_048_576) {
      if (compressedSize === 0) {
        reject('El XLSX contiene una entrada con compresion invalida.');
      }

      const ratio = uncompressedSize / compressedSize;
      if (ratio > limits.maxCompressionRatio) {
        reject('El XLSX excede la relacion de compresion permitida.');
      }
    }

    const entryLength = 46 + fileNameLength + extraLength + commentLength;
    if (cursor + entryLength > centralDirectoryEnd) {
      reject('El directorio ZIP del archivo XLSX esta truncado.');
    }

    cursor += entryLength;
  }

  if (cursor !== centralDirectoryEnd) {
    reject('El directorio ZIP del archivo XLSX contiene datos inconsistentes.');
  }
}
