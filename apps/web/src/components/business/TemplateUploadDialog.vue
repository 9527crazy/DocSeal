<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { UploadFile, UploadUserFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { uploadTemplate } from '@/api/template'
import type { TemplateDetail } from '@/types/template'

const visible = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  uploaded: [template: TemplateDetail]
}>()

const form = reactive({
  name: '',
  category: '',
})

const selectedFile = ref<File | null>(null)
const fileList = ref<UploadUserFile[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)

const allowedExtensions = ['.pdf', '.docx']
const maxSize = 10 * 1024 * 1024

function handleFileChange(uploadFile: UploadFile) {
  const rawFile = uploadFile.raw
  if (!rawFile) {
    return
  }

  const lowerName = rawFile.name.toLowerCase()
  const isAllowedType = allowedExtensions.some((extension) => lowerName.endsWith(extension))
  if (!isAllowedType) {
    ElMessage.error('仅支持 PDF 和 Word (.docx) 格式')
    fileList.value = []
    selectedFile.value = null
    return
  }

  if (rawFile.size > maxSize) {
    ElMessage.error('文件大小不能超过 10MB')
    fileList.value = []
    selectedFile.value = null
    return
  }

  selectedFile.value = rawFile
  if (!form.name) {
    form.name = rawFile.name.replace(/\.[^.]+$/, '')
  }
}

function handleFileRemove() {
  selectedFile.value = null
}

async function submitUpload() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择模版文件')
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    const template = await uploadTemplate(
      selectedFile.value,
      {
        name: form.name.trim() || undefined,
        category: form.category.trim() || undefined,
      },
      (percent) => {
        uploadProgress.value = percent
      },
    )
    ElMessage.success('模版上传成功')
    emit('uploaded', template)
    closeDialog()
  } finally {
    uploading.value = false
  }
}

function closeDialog() {
  visible.value = false
  selectedFile.value = null
  fileList.value = []
  uploadProgress.value = 0
  form.name = ''
  form.category = ''
}
</script>

<template>
  <el-dialog v-model="visible" title="上传模版" width="520px" @closed="closeDialog">
    <el-form label-position="top">
      <el-form-item label="模版文件" required>
        <el-upload
          v-model:file-list="fileList"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :limit="1"
          accept=".pdf,.docx"
          :disabled="uploading"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">点击或拖拽文件到此处</div>
          <template #tip>
            <div class="upload-tip">支持 PDF、Word (.docx)，最大 10MB</div>
          </template>
        </el-upload>
      </el-form-item>

      <el-form-item label="模版名称">
        <el-input v-model="form.name" placeholder="默认使用文件名" :disabled="uploading" />
      </el-form-item>

      <el-form-item label="分类">
        <el-input v-model="form.category" placeholder="例如：采购、销售、服务" :disabled="uploading" />
      </el-form-item>

      <el-progress v-if="uploading" :percentage="uploadProgress" />
    </el-form>

    <template #footer>
      <el-button :disabled="uploading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="uploading" @click="submitUpload">上传</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.upload-icon {
  color: #8c939d;
  font-size: 42px;
}

.upload-text {
  color: #606266;
  font-size: 14px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}
</style>
