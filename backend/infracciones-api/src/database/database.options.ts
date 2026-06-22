import 'dotenv/config';

import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import { parseBooleanQuery } from '../common/utils/parse-boolean';

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USERNAME = 'infracciones_user';
const DEFAULT_DB_PASSWORD = '';
const DEFAULT_DB_NAME = 'control_infracciones_db';
const DEFAULT_DB_SYNCHRONIZE = false;
const DEFAULT_DB_LOGGING = false;
const DEFAULT_DB_MAX_QUERY_EXECUTION_TIME = 500;

function parseString(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function parseRequiredString(value: string | undefined, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} es obligatorio para conectar a la base de datos.`);
  }

  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function createDatabaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: parseString(process.env.DB_HOST, DEFAULT_DB_HOST),
    port: parseNumber(process.env.DB_PORT, DEFAULT_DB_PORT),
    username: parseString(process.env.DB_USERNAME, DEFAULT_DB_USERNAME),
    password: parseRequiredString(process.env.DB_PASSWORD, 'DB_PASSWORD'),
    database: parseString(process.env.DB_DATABASE, DEFAULT_DB_NAME),
    entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    subscribers: [],
    synchronize:
      parseBooleanQuery(process.env.DB_SYNCHRONIZE) ?? DEFAULT_DB_SYNCHRONIZE,
    logging: parseBooleanQuery(process.env.DB_LOGGING) ?? DEFAULT_DB_LOGGING,
    maxQueryExecutionTime: parseNumber(
      process.env.DB_MAX_QUERY_EXECUTION_TIME,
      DEFAULT_DB_MAX_QUERY_EXECUTION_TIME,
    ),
    dropSchema: false,
  };
}
