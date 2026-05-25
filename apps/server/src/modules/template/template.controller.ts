import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(file, dto);
  }

  @Get()
  findAll() {
    return this.templateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.templateService.remove(id);
  }
}
