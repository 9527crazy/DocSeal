<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import TemplateUploadDialog from '@/components/business/TemplateUploadDialog.vue'
import { deleteTemplate, getTemplates } from '@/api/template'
import type { TemplateItem } from '@/types/template'

const router = useRouter()
const templates = ref<TemplateItem[]>([])
const loading = ref(false)
const uploadDialogVisible = ref(false)

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await getTemplates()
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function fileTypeLabel(fileType: TemplateItem['fileType']) {
  return fileType === 'pdf' ? 'PDF' : 'Word'
}

function fileTypeTag(fileType: TemplateItem['fileType']) {
  return fileType === 'pdf' ? 'danger' : 'primary'
}

async function confirmDelete(template: TemplateItem) {
  await ElMessageBox.confirm(`确认删除「${template.name}」吗？`, '删除模版', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })

  await deleteTemplate(template.id)
  ElMessage.success('模版已删除')
  await loadTemplates()
}
</script>

<template>
  <div class="template-page">
    <div class="page-header">
      <div>
        <h2>模版管理</h2>
        <p>管理 PDF 和 Word 合同模版，查看系统识别出的变量。</p>
      </div>
      <el-button type="primary" @click="uploadDialogVisible = true">
        <el-icon><Upload /></el-icon>
        上传模版
      </el-button>
    </div>

    <el-table v-loading="loading" :data="templates" class="template-table" empty-text="暂无模版">
      <el-table-column prop="name" label="模版名称" min-width="180" />
      <el-table-column prop="originalName" label="原文件名" min-width="200" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }: { row: TemplateItem }">
          <el-tag :type="fileTypeTag(row.fileType)">{{ fileTypeLabel(row.fileType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="140">
        <template #default="{ row }: { row: TemplateItem }">
          {{ row.category || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="variableCount" label="变量数" width="100" />
      <el-table-column label="创建时间" width="190">
        <template #default="{ row }: { row: TemplateItem }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }: { row: TemplateItem }">
          <el-button link type="primary" @click="router.push(`/template/${row.id}`)">详情</el-button>
          <el-button link type="danger" @click="confirmDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <TemplateUploadDialog v-model="uploadDialogVisible" @uploaded="loadTemplates" />
  </div>
</template>

<style scoped>
.template-page {
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

.template-table {
  width: 100%;
}
</style>
