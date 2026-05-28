import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import {
  ContractListItemResponseDto,
  ContractResponseDto,
} from './dto/contract-response.dto';

/**
 * Controller exposing contract-related HTTP endpoints.
 *
 * Routes:
 *   POST   /contracts              → Create a new contract
 *   GET    /contracts              → List all contracts
 *   GET    /contracts/:id          → Get contract details
 *   GET    /contracts/:id/download → Download the generated PDF
 */
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  /**
   * POST /contracts
   *
   * Create a new contract from a template. The service validates the template,
   * fills variables, generates the PDF, and returns the contract details.
   */
  @Post()
  async create(@Body() dto: CreateContractDto): Promise<ContractResponseDto> {
    return this.contractService.create(dto);
  }

  /**
   * GET /contracts
   *
   * Retrieve a list of all contracts, optionally filtered by template ID or status.
   */
  @Get()
  async findAll(
    @Query('templateId') templateId?: string,
    @Query('status') status?: string,
  ): Promise<ContractListItemResponseDto[]> {
    const filters: { templateId?: number; status?: string } = {};

    if (templateId) {
      const parsed = parseInt(templateId, 10);
      if (!isNaN(parsed)) {
        filters.templateId = parsed;
      }
    }
    if (status) {
      filters.status = status;
    }

    return this.contractService.findAll(filters);
  }

  /**
   * GET /contracts/:id
   *
   * Retrieve full details for a single contract by its ID.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContractResponseDto> {
    return this.contractService.findOne(id);
  }

  /**
   * GET /contracts/:id/download
   *
   * Download the generated PDF file for a completed contract.
   */
  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = await this.contractService.getOutputPath(id);
    const filename = `contract-${id}.pdf`;

    res.download(filePath, filename, (err) => {
      if (err) {
        // If headers have already been sent, we cannot change the response
        if (!res.headersSent) {
          res.status(500).json({
            error: 'DOWNLOAD_FAILED',
            message: '文件下载失败',
          });
        }
      }
    });
  }
}
