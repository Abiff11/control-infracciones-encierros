import 'dotenv/config';

import { DataSource } from 'typeorm';

import { createDatabaseOptions } from './database.options';

const dataSource = new DataSource(createDatabaseOptions());

export default dataSource;
