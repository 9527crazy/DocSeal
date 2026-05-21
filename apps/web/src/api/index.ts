import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.success === false) {
      ElMessage.error(data.error?.message || '请求失败')
      return Promise.reject(new Error(data.error?.message))
    }
    return data.data
  },
  (error) => {
    const message = error.response?.data?.error?.message || error.message || '网络错误'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

export default request
