# 第 2 周任务文档 - 模版管理

**周期**：第 2 周（第 1 期第 2 周）
**里程碑**：完成模版上传、变量识别、模版列表与详情页
**交付物**：可上传 PDF/Word 模版，自动识别变量，并在前端完成列表、详情、删除等基础管理流程

---

## 任务概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          第 2 周任务分解                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Day 1              Day 2               Day 3-4            Day 5        │
│  ────────────       ────────────         ────────────       ──────────── │
│  后端上传接口        变量识别服务          前端模版管理       联调与测试    │
│  ✦ Template 模块    ✦ PDF 文本提取        ✦ 上传入口         ✦ 接口联调   │
│  ✦ 文件校验         ✦ DOCX 文本提取       ✦ 列表页           ✦ 异常验证   │
│  ✦ 文件落盘         ✦ 类型推断            ✦ 详情页           ✦ E2E 验收   │
│  ✦ 数据入库         ✦ 变量入库            ✦ 删除确认         ✦ 文档更新   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Week 2 目标范围

### 包含

- PDF / Word `.docx` 模版上传
- 上传文件格式、大小、损坏文件基础校验
- 模版文件持久化到 `uploads/templates/`
- 模版元数据写入 `templates`
- 变量占位符 `{{变量名}}` 自动识别
- 变量去重、名称校验、类型推断、默认校验规则生成
- 变量定义写入 `template_variables`
- 模版列表、详情、删除接口
- 前端模版列表页、上传组件、详情页

### 不包含

- PDF 变量替换和合同生成
- Word 合同生成与转 PDF
- 合同预览渲染
- 印章功能
- 模版版本控制

---

## Day 1：后端 Template 模块与上传接口

### T2.1 Template 模块骨架

**优先级**：P0
**预计工时**：1 小时

**目标文件**：
```
apps/server/src/modules/template/
├── dto/
│   ├── create-template.dto.ts
│   └── template-response.dto.ts
├── entities/
│   ├── template.entity.ts
│   └── template-variable.entity.ts
├── template.controller.ts
├── template.module.ts
└── template.service.ts
```

**任务清单**：
- [ ] 创建 `TemplateModule`
- [ ] 将 `Template`、`TemplateVariable` 注册到 TypeORM
- [ ] 在 `AppModule` 中引入 `TemplateModule`
- [ ] 创建 `TemplateController` 和 `TemplateService`
- [ ] 补齐 DTO 与统一响应类型

**验收标准**：
- 服务可正常启动
- `GET /templates` 返回空列表或已有数据
- 不影响现有 `/health` 接口

---

### T2.2 文件上传能力

**优先级**：P0
**预计工时**：2 小时

**依赖建议**：
```bash
pnpm --filter server add multer
pnpm --filter server add -D @types/multer
```

**接口设计**：
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/templates` | 上传模版 |
| GET | `/templates` | 获取模版列表 |
| GET | `/templates/:id` | 获取模版详情 |
| DELETE | `/templates/:id` | 删除模版 |

**上传参数**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | PDF 或 `.docx` 文件 |
| name | string | 否 | 模版名称，默认取原文件名 |
| category | string | 否 | 模版分类 |

**文件校验规则**：
- [ ] 仅允许 `.pdf`、`.docx`
- [ ] MIME Type 与扩展名都需要校验
- [ ] 单文件大小不超过 `UPLOAD_MAX_SIZE`
- [ ] 文件名做安全处理，避免路径穿越
- [ ] 落盘文件名使用 `uuid + 原扩展名`

**推荐存储路径**：
```
apps/server/uploads/templates/{yyyy}/{mm}/{uuid}.pdf
apps/server/uploads/templates/{yyyy}/{mm}/{uuid}.docx
```

**验收标准**：
- 上传合法 PDF / DOCX 成功入库
- 不合法格式返回明确错误
- 超出大小限制返回明确错误
- 数据库存储相对路径，不存储绝对路径

---

## Day 2：变量识别与类型推断

### T2.3 变量识别服务

**优先级**：P0
**预计工时**：3 小时

**目标文件**：
```
apps/server/src/modules/template/
├── services/
│   ├── variable-extractor.service.ts
│   └── variable-inference.service.ts
└── types/
    └── template-variable.type.ts
```

**依赖建议**：
```bash
pnpm --filter server add pdf-parse mammoth
pnpm --filter server add -D @types/pdf-parse
```

**识别规则**：
```typescript
const VARIABLE_PATTERN = /\{\{([A-Za-z0-9_\u4e00-\u9fa5]{2,50})\}\}/g;
```

**任务清单**：
- [ ] PDF 使用 `pdf-parse` 提取文本
- [ ] DOCX 使用 `mammoth` 提取文本
- [ ] 使用正则提取 `{{变量名}}`
- [ ] 对变量名去重并保持首次出现顺序
- [ ] 校验变量名长度和字符集
- [ ] 未识别到变量时允许上传，但返回 warning
- [ ] 识别异常时回滚数据库记录并删除已落盘文件

**验收标准**：
- `{{甲方公司名称}}`、`{{合同金额}}`、`{{签订日期}}` 可被正确识别
- 重复变量只保留一份
- 非法变量名不写入变量表，并返回可读错误
- 损坏文件不会留下孤儿记录

---

### T2.4 变量类型推断与默认校验

**优先级**：P0
**预计工时**：2 小时

**变量类型**：
```typescript
type VariableType = 'text' | 'number' | 'date' | 'tel' | 'email';
```

**推断优先级**：
| 优先级 | 关键词 | 类型 |
|--------|--------|------|
| 1 | 日期、时间 | date |
| 2 | 金额、价格、费用、总价 | number |
| 3 | 数量、人数、天数 | number |
| 4 | 手机、电话、传真 | tel |
| 5 | 邮箱、email | email |
| 6 | 地址 | text |
| 7 | 其他 | text |

**默认校验规则**：
| 类型 | required | 规则 |
|------|----------|------|
| text | true | `maxLength: 200` |
| number | true | `min: 0`, `max: 999999999` |
| date | true | 无额外规则 |
| tel | false | `^1[3-9]\\d{9}$` |
| email | false | `^\\S+@\\S+\\.\\S+$` |

**任务清单**：
- [ ] 实现 `inferVariableType(name)`
- [ ] 实现 `getDefaultValidation(type)`
- [ ] 写入 `template_variables.validation_rules`
- [ ] 同步更新 `templates.variables` JSON 快照，便于列表轻量展示
- [ ] 为推断冲突记录 warning 日志

**验收标准**：
- `合同金额` 推断为 `number`
- `签订日期` 推断为 `date`
- `联系电话` 推断为 `tel`
- `电子邮箱` 推断为 `email`
- `公司地址` 推断为 `text`

---

## Day 3-4：前端模版管理页面

### T2.5 API 类型与请求封装

**优先级**：P0
**预计工时**：1 小时

**目标文件**：
```
apps/web/src/types/template.ts
apps/web/src/api/template.ts
```

**前端类型**：
```typescript
export type TemplateFileType = 'pdf' | 'docx';
export type TemplateVariableType = 'text' | 'number' | 'date' | 'tel' | 'email';

export interface TemplateVariable {
  id: number;
  name: string;
  type: TemplateVariableType;
  required: boolean;
  validationRules?: Record<string, unknown>;
  sortOrder: number;
}

export interface TemplateItem {
  id: number;
  name: string;
  originalName: string;
  fileType: TemplateFileType;
  category?: string;
  variableCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateItem {
  variables: TemplateVariable[];
  warnings?: string[];
}
```

**任务清单**：
- [ ] 给 `getTemplates`、`getTemplate`、`uploadTemplate`、`deleteTemplate` 增加类型
- [ ] 上传接口支持进度回调
- [ ] 统一处理后端响应中的 `data`

**验收标准**：
- 前端调用 API 无 TypeScript 错误
- 上传进度可被页面消费

---

### T2.6 模版列表与上传入口

**优先级**：P0
**预计工时**：4 小时

**目标文件**：
```
apps/web/src/views/template/index.vue
apps/web/src/components/business/TemplateUploadDialog.vue
```

**页面能力**：
- [ ] 展示模版表格：名称、类型、分类、变量数、创建时间、操作
- [ ] 支持空状态展示
- [ ] 支持上传弹窗
- [ ] 上传前做格式和大小校验
- [ ] 上传成功后刷新列表
- [ ] 上传后展示识别到的变量数量
- [ ] 支持删除模版前确认
- [ ] 支持跳转详情页

**交互约束**：
- 上传按钮使用 Element Plus `el-upload`
- 文件类型显示为清晰标签：PDF / Word
- 删除操作使用二次确认
- 加载、错误、空数据状态必须完整

**验收标准**：
- 用户可从列表页完成上传、查看、删除闭环
- 上传错误不导致页面卡死
- 删除后列表立即刷新

---

### T2.7 模版详情页

**优先级**：P1
**预计工时**：3 小时

**目标文件**：
```
apps/web/src/views/template/detail.vue
```

**页面能力**：
- [ ] 展示模版基础信息
- [ ] 展示变量列表：变量名、类型、是否必填、校验规则
- [ ] 展示上传识别 warning
- [ ] 提供“生成合同”入口，跳转 `/contract/generate/:templateId`
- [ ] 提供返回列表操作

**验收标准**：
- 详情页刷新后可独立加载数据
- 变量排序与后端识别顺序一致
- 模版不存在时展示错误状态

---

## Day 5：联调、测试与文档更新

### T2.8 后端测试

**优先级**：P0
**预计工时**：3 小时

**测试范围**：
- [ ] `VariableExtractorService` 单元测试
- [ ] `VariableInferenceService` 单元测试
- [ ] `TemplateService` 上传成功路径测试
- [ ] `TemplateController` 基础 e2e 测试

**测试用例**：
| 用例 | 预期 |
|------|------|
| PDF/DOCX 包含 3 个变量 | 返回 3 个变量 |
| 变量重复出现 | 去重后只返回 1 个 |
| 变量名非法 | 返回校验错误 |
| 文件格式不支持 | 返回 400 |
| 删除模版 | 删除数据库记录和本地文件 |

**验收标准**：
- `pnpm --filter server test` 通过
- `pnpm --filter server test:e2e` 通过或记录未覆盖原因

---

### T2.9 前端验证

**优先级**：P0
**预计工时**：2 小时

**验证范围**：
- [ ] `pnpm --filter web build`
- [ ] 列表页首屏无控制台错误
- [ ] 上传弹窗校验生效
- [ ] 上传成功后列表刷新
- [ ] 详情页变量展示正确
- [ ] 删除确认和取消流程正常

**验收标准**：
- 前端 build 通过
- 核心流程在浏览器中可手动验收

---

### T2.10 文档更新

**优先级**：P1
**预计工时**：1 小时

**任务清单**：
- [ ] 更新 `apps/server/README.md`，补充 Template API
- [ ] 更新 `apps/web/README.md`，补充页面与本地调试说明
- [ ] 如引入新环境变量，同步更新 `.env.example`
- [ ] 补充样例模版文件说明

---

## API 响应约定

### 模版列表

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "采购合同模版",
      "originalName": "采购合同.docx",
      "fileType": "docx",
      "category": "采购",
      "variableCount": 5,
      "createdAt": "2026-05-25T10:00:00.000Z",
      "updatedAt": "2026-05-25T10:00:00.000Z"
    }
  ],
  "message": ""
}
```

### 模版详情

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "采购合同模版",
    "originalName": "采购合同.docx",
    "fileType": "docx",
    "category": "采购",
    "variableCount": 3,
    "variables": [
      {
        "id": 1,
        "name": "甲方公司名称",
        "type": "text",
        "required": true,
        "validationRules": {
          "required": true,
          "maxLength": 200
        },
        "sortOrder": 0
      }
    ],
    "warnings": []
  },
  "message": ""
}
```

### 上传异常

```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_UNSUPPORTED_FILE_TYPE",
    "message": "仅支持 PDF 和 Word (.docx) 格式"
  }
}
```

---

## 数据一致性要求

- 上传文件成功但变量识别失败：删除文件，不写入数据库
- 数据库写入失败：删除已落盘文件
- 删除模版：删除 `templates`、级联删除 `template_variables`，同时删除本地文件
- 删除文件失败：记录错误日志，但接口返回应明确提示部分清理失败
- `templates.variables` 是快照字段，真实变量以 `template_variables` 为准

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| PDF 文本提取顺序不稳定 | 变量排序不准确 | 以首次匹配顺序为准，后续 W3 再处理坐标 |
| 扫描版 PDF 无文本层 | 无法识别变量 | Week 2 只提示未识别变量，不引入 OCR |
| Word 复杂格式提取失败 | 变量遗漏 | 使用 `mammoth` 提取纯文本，并保留原文件 |
| 文件删除失败 | 存储垃圾累积 | 记录日志，后续增加清理脚本 |
| 前后端响应结构不一致 | 页面解析失败 | Day 5 联调固定响应 DTO |

---

## Week 2 最终验收清单

- [ ] 可上传 PDF 模版
- [ ] 可上传 Word `.docx` 模版
- [ ] 系统可自动识别 `{{变量名}}`
- [ ] 变量类型推断符合技术细化文档
- [ ] 模版列表展示名称、类型、变量数、创建时间
- [ ] 模版详情展示变量定义
- [ ] 可删除模版并清理关联变量
- [ ] 上传、列表、详情、删除完整流程可在浏览器验收
- [ ] 后端测试通过
- [ ] 前端 build 通过
