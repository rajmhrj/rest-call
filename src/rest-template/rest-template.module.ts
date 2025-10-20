import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { RestTemplateService } from './services/rest-template.service.js';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
  ],
  providers: [RestTemplateService],
  exports: [RestTemplateService],
})
export class RestTemplateModule {}
