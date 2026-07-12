import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [DatabaseModule, AuthModule, SyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
