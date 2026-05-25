import request from './index'
import type { TemplateDetail, TemplateItem, UploadTemplatePayload } from '@/types/template'

export function getTemplates() {
  return request.get<unknown, TemplateItem[]>('/templates')
}

export function getTemplate(id: number) {
  return request.get<unknown, TemplateDetail>(`/templates/${id}`)
}

export function uploadTemplate(
  file: File,
  payload: UploadTemplatePayload = {},
  onProgress?: (percent: number) => void,
) {
  const form = new FormData()
  form.append('file', file)
  if (payload.name) {
    form.append('name', payload.name)
  }
  if (payload.category) {
    form.append('category', payload.category)
  }

  return request.post<unknown, TemplateDetail>('/templates', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) {
        return
      }
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}

export function deleteTemplate(id: number) {
  return request.delete<unknown, { id: number }>(`/templates/${id}`)
}
