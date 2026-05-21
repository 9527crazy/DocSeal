import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DB_PATH', './data/app.db'),
        entities: [__dirname + '/../modules/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: config.get('APP_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
