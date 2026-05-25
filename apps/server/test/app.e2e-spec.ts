import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from './../src/common/interceptors/response.interceptor';
import { TemplateController } from './../src/modules/template/template.controller';
import { TemplateService } from './../src/modules/template/template.service';

describe('TemplateController (e2e)', () => {
  let app: INestApplication<App>;
  const templateService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockRejectedValue(
      new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: '模版不存在',
      }),
    ),
    remove: jest.fn().mockRejectedValue(
      new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: '模版不存在',
      }),
    ),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [{ provide: TemplateService, useValue: templateService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  it('/api/templates (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/templates')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
      });
  });

  it('/api/templates/:id (GET) returns 404 for missing template', () => {
    return request(app.getHttpServer())
      .get('/api/templates/999999')
      .expect(404)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
  });

  it('/api/templates/:id (DELETE) returns 404 for missing template', () => {
    return request(app.getHttpServer())
      .delete('/api/templates/999999')
      .expect(404)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
