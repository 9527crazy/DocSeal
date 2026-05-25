<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTemplate } from '@/api/template'
import type { TemplateDetail, TemplateVariable } from '@/types/template'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const template = ref<TemplateDetail | null>(null)

const templateId = computed(() => Number(route.params.id))

onMounted(() => {
  loadTemplate()
})

async function loadTemplate() {
  loading.value = true
  try {
    template.value = await getTemplate(templateId.value)
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function typeLabel(type: TemplateVariable['type']) {
  const labels: Record<TemplateVariable['type'], string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    tel: '电话',
    email: '邮箱',
  }
  return labels[type]
}

function validationText(variable: TemplateVariable) {
  if (!variable.validationRules) {
    return '-'
  }

  return Object.entries(variable.validationRules)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('；')
}
</script>

<template>
  <div v-loading="loading" class="template-detail-page">
    <el-empty v-if="!loading && !template" description="模版不存在或加载失败">
      <el-button type="primary" @click="router.push('/template')">返回列表</el-button>
    </el-empty>

    <template v-else-if="template">
      <div class="page-header">
        <div>
          <h2>{{ template.name }}</h2>
          <p>{{ template.originalName }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="router.push('/template')">返回列表</el-button>
          <el-button type="primary" @click="router.push(`/contract/generate/${template.id}`)">
            生成合同
          </el-button>
        </div>
      </div>

      <el-alert
        v-for="warning in template.warnings"
        :key="warning"
        :title="warning"
        type="warning"
        show-icon
        :closable="false"
      />

      <el-descriptions title="基础信息" :column="3" border>
        <el-descriptions-item label="文件类型">
          <el-tag :type="template.fileType === 'pdf' ? 'danger' : 'primary'">
            {{ template.fileType === 'pdf' ? 'PDF' : 'Word' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="分类">{{ template.category || '-' }}</el-descriptions-item>
        <el-descriptions-item label="变量数">{{ template.variableCount }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(template.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDate(template.updatedAt) }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-title">变量定义</div>
      <el-table :data="template.variables" empty-text="未识别到变量">
        <el-table-column prop="sortOrder" label="#" width="70">
          <template #default="{ row }: { row: TemplateVariable }">
            {{ row.sortOrder + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="变量名" min-width="180" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }: { row: TemplateVariable }">
            <el-tag>{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="必填" width="100">
          <template #default="{ row }: { row: TemplateVariable }">
            <el-tag :type="row.required ? 'success' : 'info'">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="校验规则" min-width="260">
          <template #default="{ row }: { row: TemplateVariable }">
            {{ validationText(row) }}
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.template-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
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

.section-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}
</style>
