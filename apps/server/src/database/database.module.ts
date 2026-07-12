import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbProvider = {
  provide: 'DATABASE_POOL',
  useFactory: () => {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  },
};

@Global()
@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DatabaseModule {}
