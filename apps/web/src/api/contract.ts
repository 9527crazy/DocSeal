import request from './index'

/** 合同状态 */
export type ContractStatus = 'pending' | 'generating' | 'completed' | 'failed'

/** 合同详情（含变量和模版信息） */
export interface ContractDetail {
  id: number
  templateId: number
  templateName: string
  variables: Record<string, string>
  status: ContractStatus
  outputPath?: string
  errorMessage?: string
  createdAt: string
}

/** 合同列表项（精简视图） */
export interface ContractListItem {
  id: number
  templateName: string
  status: string
  createdAt: string
}

/**
 * 生成合同
 * @param templateId 模版 ID
 * @param variables 变量键值对
 * @returns 创建的合同详情
 */
export function generateContract(templateId: number, variables: Record<string, string>) {
  return request.post<unknown, ContractDetail>('/contracts', { templateId, variables })
}

/**
 * 获取合同详情
 * @param id 合同 ID
 * @returns 合同详情
 */
export function getContract(id: number) {
  return request.get<unknown, ContractDetail>(`/contracts/${id}`)
}

/**
 * 获取合同列表
 * @param params 可选筛选参数
 * @returns 合同列表
 */
export function getContracts(params?: { templateId?: number; status?: string }) {
  return request.get<unknown, ContractListItem[]>('/contracts', { params })
}

/**
 * 下载合同 PDF 文件
 * @param id 合同 ID
 * @returns Blob 数据
 */
export function downloadContract(id: number) {
  return request.get(`/contracts/${id}/download`, {
    responseType: 'blob',
  })
}
