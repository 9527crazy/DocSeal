<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTemplate, getTemplates } from '@/api/template'
import { generateContract } from '@/api/contract'
import type { TemplateDetail, TemplateItem, TemplateVariable } from '@/types/template'

const route = useRoute()
const router = useRouter()

/** 模版 ID（从路由参数读取，0 表示未选择） */
const templateId = computed(() => {
  const raw = Number(route.params.templateId)
  return raw > 0 ? raw : 0
})

/** 全部模版列表（用于下拉选择） */
const templates = ref<TemplateItem[]>([])
/** 当前选中的模版详情 */
const template = ref<TemplateDetail | null>(null)
/** 当前选中的模版 ID（下拉绑定） */
const selectedTemplateId = ref<number>(0)
/** 页面加载状态 */
const loading = ref(false)
/** 提交状态 */
const submitting = ref(false)
/** 变量表单值 */
const formData = ref<Record<string, string>>({})
/** 表单引用 */
const formRef = ref()

/** 是否通过 URL 指定了模版（不可切换） */
const isTemplateLocked = computed(() => templateId.value > 0)

onMounted(async () => {
  loading.value = true
  try {
    // 加载模版列表，用于下拉选择
    templates.value = await getTemplates()

    // 如果 URL 带了有效的模版 ID，直接加载该模版
    if (templateId.value > 0) {
      selectedTemplateId.value = templateId.value
      await loadTemplate(templateId.value)
    }
  } finally {
    loading.value = false
  }
})

/** 监听下拉选择变化 */
watch(selectedTemplateId, async (newId) => {
  if (newId > 0) {
    await loadTemplate(newId)
  } else {
    template.value = null
    formData.value = {}
  }
})

/**
 * 加载模版详情并初始化表单
 */
async function loadTemplate(id: number) {
  loading.value = true
  try {
    template.value = await getTemplate(id)
    // 初始化表单数据
    const data: Record<string, string> = {}
    for (const v of template.value.variables) {
      data[v.name] = ''
    }
    formData.value = data
  } finally {
    loading.value = false
  }
}

/**
 * 根据变量类型返回表单组件类型
 */
function inputType(variable: TemplateVariable): string {
  const typeMap: Record<TemplateVariable['type'], string> = {
    text: 'text',
    number: 'number',
    date: 'date',
    tel: 'text',
    email: 'text',
  }
  return typeMap[variable.type] || 'text'
}

/**
 * 根据变量类型返回输入占位符
 */
function placeholder(variable: TemplateVariable): string {
  const map: Record<TemplateVariable['type'], string> = {
    text: '请输入文本',
    number: '请输入数字',
    date: '请选择日期',
    tel: '请输入手机号',
    email: '请输入邮箱',
  }
  return map[variable.type] || '请输入'
}

/**
 * 生成动态校验规则
 */
function buildRules(variable: TemplateVariable) {
  const rules: Array<{
    required?: boolean
    message: string
    trigger: string
    validator?: (rule: unknown, value: string, callback: (error?: Error) => void) => void
    pattern?: RegExp
  }> = []

  // 必填校验
  if (variable.required) {
    rules.push({
      required: true,
      message: `${variable.name} 为必填项`,
      trigger: 'blur',
    })
  }

  // 按类型添加格式校验
  switch (variable.type) {
    case 'tel':
      rules.push({
        pattern: /^1[3-9]\d{9}$/,
        message: '请输入正确的手机号码',
        trigger: 'blur',
      })
      break
    case 'email':
      rules.push({
        pattern: /^\S+@\S+\.\S+$/,
        message: '请输入正确的邮箱地址',
        trigger: 'blur',
      })
      break
    case 'number':
      rules.push({
        validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
          if (value === '' || value === undefined) {
            callback()
            return
          }
          const num = Number(value)
          if (isNaN(num)) {
            callback(new Error('请输入有效的数字'))
            return
          }
          // 校验 validationRules 中的 min / max
          const rules = variable.validationRules
          if (rules) {
            if (rules.min !== undefined && num < Number(rules.min)) {
              callback(new Error(`数值不能小于 ${rules.min}`))
              return
            }
            if (rules.max !== undefined && num > Number(rules.max)) {
              callback(new Error(`数值不能大于 ${rules.max}`))
              return
            }
          }
          callback()
        },
        trigger: 'blur',
        message: '',
      })
      break
  }

  return rules
}

/**
 * 是否为日期类型
 */
function isDateType(variable: TemplateVariable): boolean {
  return variable.type === 'date'
}

/**
 * 变量类型中文标签
 */
function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    tel: '电话',
    email: '邮箱',
  }
  return labels[type] || type
}

/**
 * 提交表单生成合同
 */
async function handleSubmit() {
  if (!template.value) {
    return
  }

  // 触发表单校验
  try {
    await formRef.value?.validate()
  } catch {
    ElMessage.warning('请检查表单填写是否完整')
    return
  }

  submitting.value = true
  try {
    // 过滤空值（非必填可为空）
    const variables: Record<string, string> = {}
    for (const [key, value] of Object.entries(formData.value)) {
      variables[key] = value ?? ''
    }

    const contract = await generateContract(template.value.id, variables)
    ElMessage.success('合同生成请求已提交')
    router.push(`/contract/preview/${contract.id}`)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-loading="loading" class="contract-generate-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>生成合同</h2>
        <p>选择模版并填写变量，一键生成合同文档。</p>
      </div>
      <el-button @click="router.push('/template')">返回模版列表</el-button>
    </div>

    <!-- 模版选择区 -->
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
          :label="`${item.name}（${item.fileType === 'pdf' ? 'PDF' : 'Word'}，${item.variableCount} 个变量）`"
          :value="item.id"
        />
      </el-select>
      <div v-if="isTemplateLocked && template" class="template-info">
        <el-tag :type="template.fileType === 'pdf' ? 'danger' : 'primary'" size="small">
          {{ template.fileType === 'pdf' ? 'PDF' : 'Word' }}
        </el-tag>
        <span class="template-info-text">{{ template.name }}</span>
      </div>
    </el-card>

    <!-- 变量填写表单 -->
    <el-card v-if="template" shadow="never" class="section-card">
      <template #header>
        <span class="card-title">填写变量</span>
        <span class="card-subtitle">共 {{ template.variables.length }} 个变量</span>
      </template>

      <!-- 模版警告 -->
      <el-alert
        v-for="warning in template.warnings"
        :key="warning"
        :title="warning"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <el-form
        ref="formRef"
        :model="formData"
        label-position="top"
        label-width="120px"
        class="variable-form"
      >
        <el-form-item
          v-for="variable in template.variables"
          :key="variable.name"
          :prop="variable.name"
          :label="variable.name"
          :required="variable.required"
          :rules="buildRules(variable)"
          class="variable-form-item"
        >
          <!-- 日期类型使用 el-date-picker -->
          <el-date-picker
            v-if="isDateType(variable)"
            v-model="formData[variable.name]"
            type="date"
            :placeholder="placeholder(variable)"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
          <!-- 数字类型 -->
          <el-input
            v-else-if="inputType(variable) === 'number'"
            v-model="formData[variable.name]"
            type="number"
            :placeholder="placeholder(variable)"
            :min="variable.validationRules?.min as number | undefined"
            :max="variable.validationRules?.max as number | undefined"
          />
          <!-- 其他类型使用 el-input -->
          <el-input
            v-else
            v-model="formData[variable.name]"
            :placeholder="placeholder(variable)"
            :maxlength="variable.validationRules?.maxLength as number | undefined"
            show-word-limit
          />

          <!-- 变量类型标签 -->
          <div class="variable-hint">
            <el-tag size="small" type="info">{{ typeLabel(variable.type) }}</el-tag>
            <span v-if="variable.validationRules?.pattern" class="validation-hint">
              格式：{{ variable.validationRules.patternMessage || variable.validationRules.pattern }}
            </span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && !template && !isTemplateLocked"
      description="请从上方选择一个模版开始生成合同"
    />

    <!-- 提交按钮 -->
    <div v-if="template" class="submit-area">
      <el-button
        type="primary"
        size="large"
        :loading="submitting"
        @click="handleSubmit"
      >
        生成合同
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.contract-generate-page {
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

.section-card {
  width: 100%;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-subtitle {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
}

.template-info {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-info-text {
  color: #606266;
  font-size: 14px;
}

.variable-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 0 24px;
}

.variable-form-item {
  margin-bottom: 4px;
}

.variable-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.validation-hint {
  color: #909399;
  font-size: 12px;
}

.submit-area {
  display: flex;
  justify-content: flex-end;
  padding: 8px 0;
}
</style>
