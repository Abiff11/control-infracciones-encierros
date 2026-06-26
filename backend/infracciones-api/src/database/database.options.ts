import 'dotenv/config';

import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import { parseBooleanQuery } from '../common/utils/parse-boolean';

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USERNAME = 'infracciones_user';
const DEFAULT_DB_NAME = 'control_infracciones_db';
const DEFAULT_DB_SYNCHRONIZE = false;
const DEFAULT_DB_LOGGING = false;
const DEFAULT_DB_MAX_QUERY_EXECUTION_TIME = 500;
const DEFAULT_DB_POOL_MAX = 20;
const DEFAULT_DB_POOL_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_DB_POOL_CONNECTION_TIMEOUT_MS = 5_000;
const DEFAULT_DB_STATEMENT_TIMEOUT_MS = 15_000;
const DEFAULT_DB_QUERY_TIMEOUT_MS = 20_000;
const DEFAULT_CACHE_QUERY_ENABLED = false;
const DEFAULT_CACHE_QUERY_DURATION_MS = 30_000;

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

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsedValue = parseNumber(value, fallback);
  return parsedValue >= min ? parsedValue : fallback;
}

export function createDatabaseOptions(): DataSourceOptions {
  const queryCacheEnabled =
    parseBooleanQuery(process.env.CACHE_QUERY_ENABLED) ??
    DEFAULT_CACHE_QUERY_ENABLED;

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
    extra: {
      max: parsePositiveNumber(process.env.DB_POOL_MAX, DEFAULT_DB_POOL_MAX),
      idleTimeoutMillis: parsePositiveNumber(
        process.env.DB_POOL_IDLE_TIMEOUT_MS,
        DEFAULT_DB_POOL_IDLE_TIMEOUT_MS,
        1_000,
      ),
      connectionTimeoutMillis: parsePositiveNumber(
        process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
        DEFAULT_DB_POOL_CONNECTION_TIMEOUT_MS,
        500,
      ),
      statement_timeout: parsePositiveNumber(
        process.env.DB_STATEMENT_TIMEOUT_MS,
        DEFAULT_DB_STATEMENT_TIMEOUT_MS,
        1_000,
      ),
      query_timeout: parsePositiveNumber(
        process.env.DB_QUERY_TIMEOUT_MS,
        DEFAULT_DB_QUERY_TIMEOUT_MS,
        1_000,
      ),
    },
    cache: queryCacheEnabled
      ? {
          duration: parsePositiveNumber(
            process.env.CACHE_QUERY_DURATION_MS,
            DEFAULT_CACHE_QUERY_DURATION_MS,
            1_000,
          ),
        }
      : false,
  };
}
