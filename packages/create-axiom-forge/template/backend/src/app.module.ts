import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication.module';

@Module({
  imports: [AuthenticationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // ponytail: registered here (not only in main.ts) so it also applies to
    // Nest apps built via TestingModule.createNestApplication() in E2E specs.
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
