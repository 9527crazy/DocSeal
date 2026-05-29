<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTemplate, getTemplates } from '@/api/template'
import type { TemplateDetail, TemplateItem, TemplateVariable } from '@/types/template'

const route = useRoute()
const router = useRouter()

const templateId = computed(() => {
  const raw = Number(route.params.templateId)
  return raw > 0 ? raw : 0
})

const templates = ref<TemplateItem[]>([])
const template = ref<TemplateDetail | null>(null)
const selectedTemplateId = ref<number>(0)
const loading = ref(false)
const exporting = ref(false)
const formData = ref<Record<string, string>>({})
const formRef = ref()
const previewRef = ref<HTMLElement>()

const isTemplateLocked = computed(() => templateId.value > 0)

/** 替换变量后的 HTML 预览内容 */
const renderedHtml = computed(() => {
  if (!template.value?.htmlContent) return ''
  let html = template.value.htmlContent
  for (const [key, value] of Object.entries(formData.value)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), value || `{{${key}}}`)
  }
  return html
})

onMounted(async () => {
  loading.value = true
  try {
    templates.value = await getTemplates()
    if (templateId.value > 0) {
      selectedTemplateId.value = templateId.value
      await loadTemplate(templateId.value)
    }
  } finally {
    loading.value = false
  }
})

watch(selectedTemplateId, async (newId) => {
  if (newId > 0) {
    await loadTemplate(newId)
  } else {
    template.value = null
    formData.value = {}
  }
})

async function loadTemplate(id: number) {
  loading.value = true
  try {
    template.value = await getTemplate(id)
    const data: Record<string, string> = {}
    for (const v of template.value.variables) {
      data[v.name] = ''
    }
    formData.value = data
  } finally {
    loading.value = false
  }
}

function inputType(variable: TemplateVariable): string {
  const typeMap: Record<TemplateVariable['type'], string> = {
    text: 'text', number: 'number', date: 'date', tel: 'text', email: 'text',
  }
  return typeMap[variable.type] || 'text'
}

function placeholder(variable: TemplateVariable): string {
  const map: Record<TemplateVariable['type'], string> = {
    text: '请输入文本', number: '请输入数字', date: '请选择日期', tel: '请输入手机号', email: '请输入邮箱',
  }
  return map[variable.type] || '请输入'
}

function buildRules(variable: TemplateVariable) {
  const rules: Array<Record<string, unknown>> = []
  if (variable.required) {
    rules.push({ required: true, message: `${variable.name} 为必填项`, trigger: 'blur' })
  }
  switch (variable.type) {
    case 'tel':
      rules.push({ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' })
      break
    case 'email':
      rules.push({ pattern: /^\S+@\S+\.\S+$/, message: '请输入正确的邮箱地址', trigger: 'blur' })
      break
  }
  return rules
}

function isDateType(variable: TemplateVariable): boolean {
  return variable.type === 'date'
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = { text: '文本', number: '数字', date: '日期', tel: '电话', email: '邮箱' }
  return labels[type] || type
}

async function handleExportPdf() {
  if (!previewRef.value) return
  // 校验表单
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      ElMessage.warning('请先填写所有必填项')
      return
    }
  }
  exporting.value = true
  try {
    const html2pdf = (await import('html2pdf.js')).default
    const filename = `合同_${template.value?.name || '文档'}.pdf`
    await html2pdf()
      .set({
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(previewRef.value)
      .save()
    ElMessage.success('PDF 已生成并下载')
  } catch (e) {
    ElMessage.error('PDF 生成失败')
    console.error(e)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div v-loading="loading" class="contract-generate-page">
    <div class="page-header">
      <div>
        <h2>生成合同</h2>
        <p>填写变量后实时预览，一键导出 PDF。</p>
      </div>
      <el-button @click="router.push('/template')">返回模版列表</el-button>
    </div>

    <!-- 模版选择 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <span class="card-title">选择模版</span>
      </template>
      <el-select
        v-model="selectedTemplateId"
        placeholder="请选择合同模版"
        :disabled="isTemplateLocked"
        style="width: 100%"
        size="large"
      >
        <el-option
          v-for="item in templates"
          :key="item.id"
          :label="`${item.name}（${item.variableCount} 个变量）`"
          :value="item.id"
        />
      </el-select>
    </el-card>

    <!-- 主体区域：左侧表单 + 右侧预览 -->
    <div v-if="template" class="main-area">
      <!-- 左侧：变量表单 -->
      <el-card shadow="never" class="form-panel">
        <template #header>
          <span class="card-title">填写变量</span>
          <span class="card-subtitle">共 {{ template.variables.length }} 个</span>
        </template>
        <el-alert
          v-for="warning in template.warnings"
          :key="warning"
          :title="warning"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom: 12px"
        />
        <el-form
          ref="formRef"
          :model="formData"
          label-position="top"
          class="variable-form"
        >
          <el-form-item
            v-for="variable in template.variables"
            :key="variable.name"
            :prop="variable.name"
            :label="variable.name"
            :required="variable.required"
            :rules="buildRules(variable)"
          >
            <el-date-picker
              v-if="isDateType(variable)"
              v-model="formData[variable.name]"
              type="date"
              :placeholder="placeholder(variable)"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
            <el-input
              v-else
              v-model="formData[variable.name]"
              :placeholder="placeholder(variable)"
              :type="inputType(variable) === 'number' ? 'number' : 'text'"
            />
            <div class="variable-hint">
              <el-tag size="small" type="info">{{ typeLabel(variable.type) }}</el-tag>
            </div>
          </el-form-item>
        </el-form>
        <div class="export-area">
          <el-button
            type="primary"
            size="large"
            :loading="exporting"
            @click="handleExportPdf"
          >
            生成 PDF
          </el-button>
        </div>
      </el-card>

      <!-- 右侧：实时预览 -->
      <el-card shadow="never" class="preview-panel">
        <template #header>
          <span class="card-title">合同预览</span>
        </template>
        <div
          v-if="template.htmlContent"
          ref="previewRef"
          class="preview-content"
          v-html="renderedHtml"
        />
        <el-empty v-else description="该模版暂不支持预览（仅 Word 模版支持）" />
      </el-card>
    </div>

    <el-empty
      v-if="!loading && !template && !isTemplateLocked"
      description="请从上方选择一个模版开始生成合同"
    />
  </div>
</template>

<style scoped>
.contract-generate-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-header h2 { color: #303133; font-size: 22px; margin-bottom: 6px; }
.page-header p { color: #606266; font-size: 14px; }
.section-card { width: 100%; }
.card-title { font-size: 16px; font-weight: 600; color: #303133; }
.card-subtitle { font-size: 13px; color: #909399; margin-left: 8px; }

.main-area {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.form-panel {
  width: 420px;
  flex-shrink: 0;
}
.preview-panel {
  flex: 1;
  min-width: 0;
}
.variable-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.variable-hint { margin-top: 4px; }
.export-area {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  margin-top: 8px;
}

.preview-content {
  padding: 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  overflow: auto;
  max-height: 80vh;
}
.preview-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.preview-content :deep(td),
.preview-content :deep(th) {
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
}
</style>
