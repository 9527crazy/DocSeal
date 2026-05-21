import request from './index'

export function generateContract(templateId: number, variables: Record<string, unknown>) {
  return request.post('/contracts', { templateId, variables })
}

export function getContract(id: number) {
  return request.get(`/contracts/${id}`)
}

export function getContracts(params?: { templateId?: number; status?: string }) {
  return request.get('/contracts', { params })
}
