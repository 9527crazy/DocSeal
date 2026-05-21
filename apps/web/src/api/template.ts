import request from './index'

export function getTemplates() {
  return request.get('/templates')
}

export function getTemplate(id: number) {
  return request.get(`/templates/${id}`)
}

export function uploadTemplate(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/templates', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteTemplate(id: number) {
  return request.delete(`/templates/${id}`)
}
