import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'infracciones_user',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'control_infracciones_db',
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
};

export default new DataSource(dataSourceOptions);
export { dataSourceOptions };
