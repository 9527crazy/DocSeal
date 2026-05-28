<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { downloadContract, getContract } from '@/api/contract'
import type { ContractDetail } from '@/api/contract'

const route = useRoute()
const router = useRouter()

/** 合同 ID */
const contractId = computed(() => Number(route.params.id))

/** 合同详情 */
const contract = ref<ContractDetail | null>(null)
/** 加载状态 */
const loading = ref(false)
/** 下载中状态 */
const downloading = ref(false)
/** PDF 预览 Blob URL */
const pdfUrl = ref('')

/** 轮询定时器 */
let pollTimer: ReturnType<typeof setInterval> | null = null

/** 是否需要轮询（pending 或 generating 状态） */
const shouldPoll = computed(() => {
  const status = contract.value?.status
  return status === 'pending' || status === 'generating'
})

onMounted(() => {
  loadContract()
})

onBeforeUnmount(() => {
  stopPolling()
  revokePdfUrl()
})

/**
 * 加载合同详情
 */
async function loadContract() {
  loading.value = true
  try {
    contract.value = await getContract(contractId.value)

    // 根据状态决定是否开始轮询和加载 PDF
    if (shouldPoll.value) {
      startPolling()
    } else if (contract.value.status === 'completed') {
      await loadPdfPreview()
    }
  } finally {
    loading.value = false
  }
}

/**
 * 开始轮询（等待 pending/generating → completed/failed）
 */
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      contract.value = await getContract(contractId.value)

      if (!shouldPoll.value) {
        stopPolling()
        if (contract.value.status === 'completed') {
          await loadPdfPreview()
        }
      }
    } catch {
      // 静默处理轮询中的错误，不停止轮询
    }
  }, 2000)
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/**
 * 加载 PDF 预览（通过下载接口获取 Blob 并生成本地 URL）
 */
async function loadPdfPreview() {
  try {
    const blob = await downloadContract(contractId.value) as unknown as Blob
    revokePdfUrl()
    pdfUrl.value = URL.createObjectURL(blob)
  } catch {
    ElMessage.error('PDF 预览加载失败')
  }
}

/**
 * 释放旧的 Blob URL，防止内存泄漏
 */
function revokePdfUrl() {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
  }
}

/**
 * 下载合同文件
 */
async function handleDownload() {
  downloading.value = true
  try {
    const blob = await downloadContract(contractId.value) as unknown as Blob
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 生成文件名：合同_{模版名}_{ID}.pdf
    const fileName = `合同_${contract.value?.templateName || '未知'}_${contractId.value}.pdf`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } finally {
    downloading.value = false
  }
}

/**
 * 格式化日期
 */
function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

/**
 * 状态对应的标签类型
 */
function statusTagType(status: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    pending: 'info',
    generating: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[status] || 'info'
}

/**
 * 状态中文标签
 */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '等待中',
    generating: '生成中',
    completed: '已完成',
    failed: '生成失败',
  }
  return map[status] || status
}

/**
 * 状态图标
 */
function statusIcon(status: string): string {
  const map: Record<string, string> = {
    pending: 'Clock',
    generating: 'Loading',
    completed: 'CircleCheck',
    failed: 'CircleClose',
  }
  return map[status] || 'InfoFilled'
}
</script>

<template>
  <div v-loading="loading" class="contract-preview-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>合同预览</h2>
        <p>查看合同生成状态和预览 PDF 文档。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/template')">返回模版列表</el-button>
        <el-button
          v-if="contract?.templateId"
          @click="router.push(`/contract/generate/${contract.templateId}`)"
        >
          再次生成
        </el-button>
      </div>
    </div>

    <!-- 未找到合同 -->
    <el-empty v-if="!loading && !contract" description="合同不存在或加载失败">
      <el-button type="primary" @click="router.push('/template')">返回模版列表</el-button>
    </el-empty>

    <template v-if="contract">
      <!-- 合同基础信息 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <span class="card-title">合同信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="合同 ID">{{ contract.id }}</el-descriptions-item>
          <el-descriptions-item label="使用模版">{{ contract.templateName }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(contract.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="生成状态">
            <el-tag :type="statusTagType(contract.status)">
              <el-icon style="vertical-align: middle; margin-right: 4px">
                <component :is="statusIcon(contract.status)" />
              </el-icon>
              {{ statusLabel(contract.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 变量填写详情 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <span class="card-title">变量数据</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item
            v-for="(value, key) in contract.variables"
            :key="key"
            :label="String(key)"
          >
            {{ value || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 状态提示区 -->
      <!-- 等待中 -->
      <el-card v-if="contract.status === 'pending'" shadow="never" class="status-card status-pending">
        <div class="status-content">
          <el-icon class="status-icon spinning"><Loading /></el-icon>
          <div>
            <h3>合同等待生成中</h3>
            <p>您的合同正在排队等待处理，请耐心等候...</p>
          </div>
        </div>
      </el-card>

      <!-- 生成中 -->
      <el-card v-if="contract.status === 'generating'" shadow="never" class="status-card status-generating">
        <div class="status-content">
          <el-icon class="status-icon spinning"><Loading /></el-icon>
          <div>
            <h3>合同正在生成中</h3>
            <p>系统正在处理您的合同，请勿关闭页面...</p>
          </div>
        </div>
      </el-card>

      <!-- 生成失败 -->
      <el-card v-if="contract.status === 'failed'" shadow="never" class="status-card status-failed">
        <div class="status-content">
          <el-icon class="status-icon"><CircleClose /></el-icon>
          <div>
            <h3>合同生成失败</h3>
            <p>{{ contract.errorMessage || '未知错误，请稍后重试或联系管理员。' }}</p>
            <el-button
              type="primary"
              style="margin-top: 12px"
              @click="router.push(`/contract/generate/${contract.templateId}`)"
            >
              重新生成
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 生成成功 - PDF 预览 & 下载 -->
      <el-card v-if="contract.status === 'completed'" shadow="never" class="section-card">
        <template #header>
          <div class="preview-header">
            <span class="card-title">合同预览</span>
            <el-button
              type="primary"
              :loading="downloading"
              @click="handleDownload"
            >
              <el-icon><Download /></el-icon>
              下载合同
            </el-button>
          </div>
        </template>
        <div v-if="pdfUrl" class="pdf-container">
          <iframe
            :src="pdfUrl"
            class="pdf-iframe"
            title="合同 PDF 预览"
          />
        </div>
        <el-empty v-else description="PDF 预览加载中...">
          <el-icon class="spinning" :size="32" color="#409eff"><Loading /></el-icon>
        </el-empty>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.contract-preview-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.page-header h2 {
  color: #303133;
  font-size: 22px;
  margin-bottom: 6px;
}

.page-header p {
  color: #606266;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.section-card {
  width: 100%;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 状态卡片通用样式 */
.status-card {
  width: 100%;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.status-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.status-content h3 {
  color: #303133;
  font-size: 18px;
  margin-bottom: 8px;
}

.status-content p {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

/* 状态颜色 */
.status-pending .status-icon {
  color: #909399;
}

.status-generating .status-icon {
  color: #e6a23c;
}

.status-failed .status-icon {
  color: #f56c6c;
}

/* 旋转动画 */
.spinning {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* PDF 预览容器 */
.pdf-container {
  width: 100%;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 800px;
  border: none;
}
</style>
