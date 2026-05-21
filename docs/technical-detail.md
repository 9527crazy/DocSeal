# 合同模版生成工具 - 技术细化文档

## 1. 变量识别机制

### 1.1 变量语法规范

采用 Handlebars 语法，使用双花括号 `{{}}` 包裹变量名：

```
{{变量名}}
```

#### 语法规则
- 变量名只能包含：中文、英文、数字、下划线
- 变量名长度限制：2-50 个字符
- 区分大小写
- 不允许嵌套：`{{a{{b}}}}` 无效

#### 示例
```
甲方：{{甲方公司名称}}
合同金额：人民币 {{合同金额}} 元整
签订日期：{{签订日期}}
有效期：{{开始日期}} 至 {{结束日期}}
```

### 1.2 变量识别流程

```
┌─────────────────────────────────────────────────────────┐
│                    变量识别流程                          │
├─────────────────────────────────────────────────────────┤
│  1. 读取模版文件内容                                    │
│  2. 使用正则 /\{\{([^}]+)\}\}/g 提取所有变量            │
│  3. 去重处理                                            │
│  4. 校验变量名格式                                      │
│  5. 生成变量列表                                        │
│  6. 为每个变量推断类型（基于变量名关键词）              │
└─────────────────────────────────────────────────────────┘
```

### 1.3 变量类型自动推断

根据变量名中的关键词自动推断类型，**采用优先级匹配机制**：

| 优先级 | 关键词 | 推断类型 | 示例 | 说明 |
|--------|--------|----------|------|------|
| 1 | 日期、时间 | date | 签订日期、开始日期 | 最高优先级 |
| 2 | 金额、价格、费用、总价 | number | 合同金额、单价 | 数值类优先 |
| 3 | 数量、人数、天数 | number | 服务天数、人数 | 数值类次之 |
| 4 | 手机、电话、传真 | tel | 联系电话 | 格式敏感 |
| 5 | 邮箱、email | email | 电子邮箱 | 格式敏感 |
| 6 | 地址 | text | 公司地址 | 文本类 |
| 7 | 其他 | text | 公司名称、联系人 | 默认类型 |

**冲突处理规则**：

```typescript
// 变量类型推断函数（带优先级）
function inferVariableType(variableName: string): VariableType {
  const rules: Array<{ keywords: string[]; type: VariableType; priority: number }> = [
    { keywords: ['日期', '时间'], type: 'date', priority: 1 },
    { keywords: ['金额', '价格', '费用', '总价'], type: 'number', priority: 2 },
    { keywords: ['数量', '人数', '天数'], type: 'number', priority: 3 },
    { keywords: ['手机', '电话', '传真'], type: 'tel', priority: 4 },
    { keywords: ['邮箱', 'email'], type: 'email', priority: 5 },
    { keywords: ['地址'], type: 'text', priority: 6 },
  ];

  // 收集所有匹配的规则
  const matches = rules.filter(rule =>
    rule.keywords.some(keyword => variableName.includes(keyword))
  );

  if (matches.length === 0) {
    return 'text'; // 默认类型
  }

  if (matches.length === 1) {
    return matches[0].type;
  }

  // 多个匹配时，按优先级排序，取最高优先级
  matches.sort((a, b) => a.priority - b.priority);

  // 记录冲突日志（便于调试）
  logger.warn(`变量 "${variableName}" 类型推断冲突: ${matches.map(m => m.type).join(' vs ')}, 选择 ${matches[0].type}`);

  return matches[0].type;
}

// 示例：电话费金额
// 匹配: ["电话" -> tel (优先级4), "金额" -> number (优先级2)]
// 结果: number（优先级2更高）

### 1.4 变量校验规则

```typescript
interface VariableValidation {
  required: boolean;      // 是否必填，默认 true
  minLength?: number;     // 文本最小长度
  maxLength?: number;     // 文本最大长度
  min?: number;           // 数字最小值
  max?: number;           // 数字最大值
  pattern?: string;       // 正则校验
  patternMessage?: string; // 校验失败提示
}

// 各类型的默认校验规则
const defaultValidation = {
  text: { required: true, maxLength: 200 },
  number: { required: true, min: 0, max: 999999999 },
  date: { required: true },
  tel: { required: false, pattern: '^1[3-9]\\d{9}$', patternMessage: '请输入正确的手机号' },
  email: { required: false, pattern: '^\\S+@\\S+\\.\\S+$', patternMessage: '请输入正确的邮箱' }
};
```

## 2. 错误处理机制

### 2.1 模版上传阶段

| 错误场景 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 文件格式不支持 | 拒绝上传 | "仅支持 PDF 和 Word (.docx) 格式" |
| 文件过大（>10MB）| 拒绝上传 | "文件大小不能超过 10MB" |
| PDF 文件损坏 | 拒绝上传 | "PDF 文件已损坏，请检查后重新上传" |
| Word 文件损坏 | 拒绝上传 | "Word 文件已损坏，请检查后重新上传" |
| 未识别到变量 | 警告提示 | "未识别到变量占位符，请确认模版中包含 {{变量名}} 格式的变量" |

### 2.2 变量填写阶段

| 错误场景 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 必填变量为空 | 阻止提交 | "{变量名} 为必填项" |
| 数字格式错误 | 阻止提交 | "{变量名} 请输入有效的数字" |
| 数字超出范围 | 阻止提交 | "{变量名} 请输入 {min} 到 {max} 之间的数字" |
| 日期格式错误 | 阻止提交 | "{变量名} 请选择有效的日期" |
| 手机号格式错误 | 阻止提交 | "请输入正确的手机号码" |
| 邮箱格式错误 | 阻止提交 | "请输入正确的邮箱地址" |
| 文本超出长度 | 阻止提交 | "{变量名} 长度不能超过 {maxLength} 个字符" |

### 2.3 印章处理阶段

| 错误场景 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 图片格式不支持 | 拒绝上传 | "仅支持 PNG、JPG、SVG 格式" |
| 图片分辨率过低 | 警告提示 | "印章图片分辨率较低（当前 {width}x{height}），建议使用 300x300 以上分辨率，可能导致印章模糊" |
| 图片文件过大（>5MB）| 拒绝上传 | "印章图片大小不能超过 5MB" |
| 图片损坏 | 拒绝上传 | "图片文件已损坏，请检查后重新上传" |

### 2.4 合同生成阶段

| 错误场景 | 处理方式 | 用户提示 |
|----------|----------|----------|
| 模版文件丢失 | 报错提示 | "模版文件不存在，请重新上传模版" |
| 生成超时（>30s）| 报错提示 | "合同生成超时，请稍后重试" |
| 磁盘空间不足 | 报错提示 | "服务器存储空间不足，请联系管理员" |
| 印章叠加失败 | 报错提示 | "印章叠加失败，请检查印章图片是否有效" |

### 2.5 错误处理流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      错误处理流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户操作 → 输入校验 ─┬─ 通过 → 业务处理 ─┬─ 成功 → 返回结果│
│                       │                   │                 │
│                       ↓                   ↓                 │
│                    校验失败             处理失败             │
│                       │                   │                 │
│                       ↓                   ↓                 │
│                  显示字段错误          显示全局错误          │
│                  高亮错误字段          记录错误日志          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3. 批量生成功能

### 3.1 输入方式

支持三种批量输入方式：

#### 方式一：Excel 导入（推荐）

**操作流程**：
1. 下载模版 Excel（系统根据变量自动生成表头）
2. 用户填写 Excel 数据
3. 上传 Excel 文件
4. 系统解析并预览数据
5. 确认后批量生成

**Excel 模版格式**：

| 甲方公司名称 | 合同金额 | 签订日期 | 联系人 |
|-------------|---------|---------|--------|
| XX科技有限公司 | 10000 | 2024-01-15 | 张三 |
| YY网络公司 | 25000 | 2024-01-16 | 李四 |

**校验规则**：
- 表头必须与变量名完全匹配
- 每行数据独立校验，错误行标红提示
- 支持跳过错误行继续生成

#### 方式二：手动逐条添加

**操作流程**：
1. 填写第一组变量值
2. 点击"添加下一条"
3. 继续填写（可基于上一条数据修改）
4. 重复直到所有数据添加完成
5. 点击"批量生成"

**交互优化**：
- 支持复制上一条数据
- 支持删除某条数据
- 显示已添加条数

#### 方式三：JSON/CSV 导入

**JSON 格式**：
```json
[
  {
    "甲方公司名称": "XX科技有限公司",
    "合同金额": 10000,
    "签订日期": "2024-01-15"
  },
  {
    "甲方公司名称": "YY网络公司",
    "合同金额": 25000,
    "签订日期": "2024-01-16"
  }
]
```

**CSV 格式**：
```csv
甲方公司名称,合同金额,签订日期
XX科技有限公司,10000,2024-01-15
YY网络公司,25000,2024-01-16
```

### 3.2 批量生成流程

```
┌─────────────────────────────────────────────────────────────┐
│                    批量生成流程                              │
├─────────────────────────────────────────────────────────────┤
│  选择模版 → 选择输入方式 → 导入/填写数据 → 数据预览         │
│      ↓                                                      │
│  数据校验 ─┬─ 全部通过 → 确认生成                           │
│            │                                                 │
│            └─ 部分失败 → 显示错误详情 → 跳过/修正/取消       │
│      ↓                                                      │
│  批量生成（显示进度条）→ 打包下载 / 逐个下载                │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 批量生成约束

| 约束项 | 限制值 | 说明 |
|--------|--------|------|
| 单次最大条数 | 100 | 超出需分批处理 |
| 并发生成数 | 5 | 同时生成的合同数 |
| 超时时间 | 5 分钟 | 单批次最大生成时间 |
| 结果保留时间 | 7 天 | 生成文件的保存时间 |

### 3.4 批量生成结果

**成功场景**：
- 生成完成后显示成功/失败统计
- 提供打包下载（ZIP 格式）
- 文件命名：`{序号}_{甲方公司名称}_{签订日期}.pdf`

**部分失败场景**：
- 显示失败列表及失败原因
- 支持重新生成失败的合同
- 成功的合同仍可下载

## 4. 印章位置配置

### 4.1 位置定义

采用相对坐标系（百分比）：

```typescript
interface StampPosition {
  page: number;        // 页码，-1 表示最后一页
  x: number;           // 水平位置（0-100%）
  y: number;           // 垂直位置（0-100%）
  width: number;       // 印章宽度（px）
  height: number;      // 印章高度（px）
  opacity: number;     // 透明度（0-100）
  rotation: number;    // 旋转角度（0-360）
}
```

### 4.2 预设位置

```
┌─────────────────────────────────────┐
│                                     │
│   左上(5,5)      右上(95,5)         │
│                                     │
│                                     │
│                                     │
│                                     │
│   左下(5,95)     右下(95,95)        │
│                                     │
└─────────────────────────────────────┘
```

常用预设：
- 页脚右下角：`{ x: 80, y: 85, page: -1 }`
- 页脚左下角：`{ x: 15, y: 85, page: -1 }`
- 页面正中：`{ x: 50, y: 50, page: -1 }`

### 4.3 可视化调整

- 拖拽调整位置
- 滚轮缩放大小
- 实时预览效果
- 支持撤销/重做

## 5. 模版处理技术链

### 5.1 双轨处理架构

PDF 和 Word 模版采用不同的处理路径，最终都输出为 PDF：

```
┌─────────────────────────────────────────────────────────────┐
│                    模版处理双轨架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   PDF 模版 ──→ PDF 直接处理 ──→ 变量替换 ──→ 最终 PDF       │
│                                                             │
│   Word 模版 ──→ Word 解析 ──→ 变量替换 ──→ Word 转 PDF      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 PDF 模版处理链

**技术栈**：pdf-lib + pdfjs-dist

**处理流程**：

```
┌─────────────────────────────────────────────────────────────┐
│                    PDF 模版处理流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. 使用 pdfjs-dist 加载 PDF 文件                           │
│  2. 提取所有文本内容，识别 {{变量}} 占位符                   │
│  3. 记录每个变量的位置坐标（页码、x、y、宽、高）            │
│  4. 使用 pdf-lib 加载原始 PDF                               │
│  5. 对每个变量位置：                                        │
│     a. 用白色矩形覆盖原始占位符文本                         │
│     b. 在相同位置写入变量值                                 │
│  6. 保存为新的 PDF 文件                                     │
└─────────────────────────────────────────────────────────────┘
```

**关键代码**：

```typescript
// PDF 变量替换
async function replacePdfVariables(
  templatePath: string,
  variables: Record<string, string>,
  outputPath: string
): Promise<void> {
  // 1. 加载并解析 PDF
  const pdfDoc = await PDFDocument.load(await fs.readFile(templatePath));
  const pages = pdfDoc.getPages();

  // 2. 提取变量位置（使用 pdfjs-dist）
  const variablePositions = await extractVariablePositions(templatePath);

  // 3. 替换变量
  for (const pos of variablePositions) {
    const page = pages[pos.pageIndex];
    const value = variables[pos.variableName] || '';

    // 绘制白色背景覆盖原文本
    page.drawRectangle({
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      color: rgb(1, 1, 1), // 白色
    });

    // 写入新文本
    page.drawText(value, {
      x: pos.x,
      y: pos.y,
      size: pos.fontSize,
      font: await pdfDoc.embedFont(StandardFonts.Helvetica),
    });
  }

  // 4. 保存
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
}
```

**局限性**：
- 中文字体需要嵌入（使用 pdf-lib 的 font embedding）
- 复杂排版（表格、图片混排）可能位置偏移
- 原始 PDF 的字体、大小需要预先提取

**坐标系一致性问题**：

pdfjs-dist 和 pdf-lib 的坐标系存在差异：

| 属性 | pdfjs-dist | pdf-lib |
|------|------------|---------|
| 原点位置 | 左上角 | 左下角 |
| Y轴方向 | 向下为正 | 向上为正 |
| 坐标单位 | 点 (1/72 inch) | 点 (1/72 inch) |

**坐标转换函数**：

```typescript
// 坐标系转换
function convertCoordinates(
  pdfjsPos: { x: number; y: number; width: number; height: number },
  pageHeight: number
): { x: number; y: number; width: number; height: number } {
  // pdfjs-dist: 原点左上角，Y向下
  // pdf-lib: 原点左下角，Y向上
  return {
    x: pdfjsPos.x,
    y: pageHeight - pdfjsPos.y - pdfjsPos.height, // 转换Y坐标
    width: pdfjsPos.width,
    height: pdfjsPos.height,
  };
}
```

**适用范围限制**：

| PDF 特征 | 支持情况 | 说明 |
|----------|----------|------|
| 标准文字 PDF | ✅ 完全支持 | 坐标提取准确 |
| 扫描件 PDF | ❌ 不支持 | 无文字层，无法提取坐标 |
| 旋转页面 | ⚠️ 部分支持 | 需要额外处理旋转矩阵 |
| 缩放页面 | ⚠️ 部分支持 | 需要计算缩放比例 |
| 表格内文字 | ⚠️ 可能偏移 | 表格线可能干扰坐标 |
| 图片混排 | ⚠️ 可能偏移 | 图片占用空间计算复杂 |

**降级策略**：

```typescript
// PDF 模版质量检测
async function detectPdfQuality(templatePath: string): Promise<{
  canProcess: boolean;
  issues: string[];
  recommendation: 'pdf' | 'word' | 'manual';
}> {
  const issues: string[] = [];
  let canProcess = true;

  // 1. 检查是否为扫描件
  const isScanned = await checkIfScanned(templatePath);
  if (isScanned) {
    issues.push('PDF 为扫描件，无法自动识别文字位置');
    canProcess = false;
  }

  // 2. 检查页面旋转
  const hasRotation = await checkPageRotation(templatePath);
  if (hasRotation) {
    issues.push('PDF 包含旋转页面，可能导致位置偏移');
  }

  // 3. 检查坐标提取准确性
  const coordinateAccuracy = await validateCoordinateExtraction(templatePath);
  if (coordinateAccuracy < 0.8) {
    issues.push('坐标提取准确度较低，建议使用 Word 模版');
  }

  // 4. 给出建议
  let recommendation: 'pdf' | 'word' | 'manual';
  if (!canProcess) {
    recommendation = 'word'; // 建议转为 Word 模版
  } else if (issues.length > 0) {
    recommendation = 'word'; // 有问题时建议 Word
  } else {
    recommendation = 'pdf'; // 无问题时使用 PDF
  }

  return { canProcess, issues, recommendation };
}

// 降级处理：PDF 转 Word 后再处理
async function fallbackToWordProcessing(
  pdfTemplatePath: string,
  variables: Record<string, string>,
  outputPath: string
): Promise<void> {
  // 1. 使用 LibreOffice 将 PDF 转为 Word（OCR 识别）
  const tempDocxPath = pdfTemplatePath.replace('.pdf', '_temp.docx');
  await execAsync(`soffice --headless --convert-to docx ${pdfTemplatePath}`);

  // 2. 按 Word 模版流程处理
  await replaceWordVariablesAndConvert(tempDocxPath, variables, outputPath);

  // 3. 清理临时文件
  await fs.unlink(tempDocxPath);
}
```

**用户提示**：

上传 PDF 模版时，系统自动检测质量并给出建议：

```
┌─────────────────────────────────────────────────────────────┐
│                     模版质量检测报告                         │
├─────────────────────────────────────────────────────────────┤
│  ✅ 文字层识别：正常                                        │
│  ⚠️ 页面旋转：检测到第2页旋转90°                           │
│  ❌ 坐标准确度：72%（低于80%阈值）                          │
│                                                             │
│  建议：使用 Word 格式模版以获得更准确的效果                 │
│                                                             │
│  [继续使用PDF]  [转换为Word模版]  [取消]                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Word 模版处理链

**技术栈**：docxtemplater + LibreOffice (soffice)

**处理流程**：

```
┌─────────────────────────────────────────────────────────────┐
│                   Word 模版处理流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. 使用 docxtemplater 加载 .docx 文件                      │
│  2. 解析模版中的 {{变量}} 占位符                             │
│  3. 用变量值替换占位符                                      │
│  4. 生成替换后的 .docx 文件                                 │
│  5. 使用 LibreOffice 将 .docx 转换为 PDF                    │
│  6. 清理临时 .docx 文件                                     │
└─────────────────────────────────────────────────────────────┘
```

**关键代码**：

```typescript
// Word 变量替换 + 转 PDF
async function replaceWordVariablesAndConvert(
  templatePath: string,
  variables: Record<string, string>,
  outputPath: string
): Promise<void> {
  // 1. 加载 Word 模版
  const content = await fs.readFile(templatePath, 'binary');
  const doc = new Docxtemplater(content, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // 2. 替换变量
  doc.setData(variables);
  doc.render();

  // 3. 生成临时 Word 文件
  const tempDocxPath = outputPath.replace('.pdf', '_temp.docx');
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  await fs.writeFile(tempDocxPath, buf);

  // 4. 使用 LibreOffice 转换为 PDF
  await execAsync(
    `soffice --headless --convert-to pdf --outdir ${path.dirname(outputPath)} ${tempDocxPath}`
  );

  // 5. 重命名并清理
  const convertedPath = tempDocxPath.replace('.docx', '.pdf');
  await fs.rename(convertedPath, outputPath);
  await fs.unlink(tempDocxPath);
}
```

**依赖要求**：
- 服务器需安装 LibreOffice（用于 Word 转 PDF）
- Linux: `apt-get install libreoffice`
- macOS: `brew install --cask libreoffice`

**LibreOffice 运维问题**：

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 版本差异 | 不同版本转换结果可能不同 | 锁定版本号，使用容器化部署 |
| 冷启动耗时 | 首次调用 2-3 秒 | 预热机制 + 进程池 |
| 内存占用 | 单进程约 200-500MB | 限制并发数，及时回收 |
| 崩溃风险 | 处理异常文件可能崩溃 | 超时机制 + 自动重启 |

**容器化部署方案**：

```dockerfile
# Dockerfile
FROM ubuntu:22.04

# 锁定 LibreOffice 版本
RUN apt-get update && \
    apt-get install -y \
    libreoffice-writer=4:7.3.7-0ubuntu0.22.04.3 \
    libreoffice-core=4:7.3.7-0ubuntu0.22.04.3 \
    && rm -rf /var/lib/apt/lists/*

# 预热 LibreOffice（减少冷启动）
RUN echo "test" > /tmp/test.txt && \
    soffice --headless --convert-to pdf /tmp/test.txt && \
    rm -f /tmp/test.txt /tmp/test.pdf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD soffice --version || exit 1
```

**进程池管理**：

```typescript
// LibreOffice 进程池
interface PoolWorker {
  process: ChildProcess;
  busy: boolean;
}

class LibreOfficePool {
  private pool: PoolWorker[] = [];
  private maxPoolSize = 3;
  private warmupCount = 1;
  private waitQueue: Array<{ resolve: (worker: PoolWorker) => void; reject: (error: Error) => void }> = [];

  async initialize(): Promise<void> {
    // 预热指定数量的 LibreOffice 进程
    for (let i = 0; i < this.warmupCount; i++) {
      await this.createProcess();
    }
    logger.info(`LibreOffice pool warmed up with ${this.warmupCount} processes`);
  }

  private async createProcess(): Promise<void> {
    const process = spawn('soffice', ['--headless', '--norestore', '--accept=socket,host=localhost,port=2002;urp;']);

    // 监听进程退出，自动从池中移除
    process.on('exit', (code) => {
      logger.warn(`LibreOffice process exited with code ${code}`);
      this.pool = this.pool.filter(w => w.process !== process);
    });

    this.pool.push({ process, busy: false });
  }

  async convert(docxPath: string, outputPath: string): Promise<void> {
    const worker = await this.acquireWorker();
    try {
      await this.doConvert(worker, docxPath, outputPath);
    } finally {
      this.releaseWorker(worker);
    }
  }

  private async acquireWorker(): Promise<PoolWorker> {
    // 查找空闲进程
    let worker = this.pool.find(w => !w.busy);

    if (!worker) {
      if (this.pool.length < this.maxPoolSize) {
        await this.createProcess();
        worker = this.pool[this.pool.length - 1];
      } else {
        // 等待进程释放
        worker = await this.waitForWorker();
      }
    }

    worker.busy = true;
    return worker;
  }

  // 等待空闲进程释放
  private async waitForWorker(): Promise<PoolWorker> {
    return new Promise((resolve, reject) => {
      // 设置超时，避免无限等待
      const timeout = setTimeout(() => {
        // 从等待队列中移除
        const index = this.waitQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error('Timeout waiting for available LibreOffice process'));
      }, 30000); // 30秒超时

      this.waitQueue.push({
        resolve: (worker: PoolWorker) => {
          clearTimeout(timeout);
          resolve(worker);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  private releaseWorker(worker: PoolWorker): void {
    worker.busy = false;

    // 如果有等待的请求，唤醒第一个
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      if (waiter) {
        worker.busy = true;
        waiter.resolve(worker);
      }
    }
  }

  private async doConvert(worker: PoolWorker, docxPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', path.dirname(outputPath),
        docxPath
      ];

      const process = spawn('soffice', args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // 重命名输出文件
          const fileName = path.basename(docxPath, path.extname(docxPath)) + '.pdf';
          const convertedPath = path.join(path.dirname(outputPath), fileName);
          if (convertedPath !== outputPath) {
            fs.rename(convertedPath, outputPath).then(resolve).catch(reject);
          } else {
            resolve();
          }
        } else {
          reject(new Error(`LibreOffice conversion failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start LibreOffice: ${error.message}`));
      });
    });
  }

  // 销毁进程池
  async destroy(): Promise<void> {
    for (const worker of this.pool) {
      worker.process.kill();
    }
    this.pool = [];

    // 拒绝所有等待的请求
    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('Process pool is being destroyed'));
    }
    this.waitQueue = [];
  }
}

// 使用进程池
const loPool = new LibreOfficePool();
await loPool.initialize(); // 应用启动时预热

async function convertWithPool(docxPath: string, outputPath: string): Promise<void> {
  const timeout = 10000; // 10秒超时
  const convertPromise = loPool.convert(docxPath, outputPath);

  await Promise.race([
    convertPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LibreOffice conversion timeout')), timeout)
    ),
  ]);
}
```

**性能指标调整**：

由于 LibreOffice 冷启动问题，需要调整需求文档中的性能指标：

| 场景 | 原指标 | 调整后指标 | 说明 |
|------|--------|------------|------|
| PDF 模版生成 | < 3s | < 3s | 保持不变 |
| Word 模版生成（首次） | < 3s | < 8s | 含 LibreOffice 冷启动 |
| Word 模版生成（后续） | < 3s | < 5s | 进程池已预热 |
| 批量生成（单个） | < 3s | < 5s | 平均耗时 |

### 5.4 中文字体支持

**问题**：PDF 直接处理时，中文字体可能无法正确显示

**解决方案**：

```typescript
// 字体配置
const FONT_CONFIG = {
  // 内置字体（仅支持英文）
  builtin: ['Helvetica', 'TimesRoman', 'Courier'],

  // 中文字体（需要嵌入）
  chinese: {
    'SimSun': './fonts/simsun.ttf',      // 宋体
    'SimHei': './fonts/simhei.ttf',      // 黑体
    'KaiTi': './fonts/kaiti.ttf',        // 楷体
  },

  // 默认字体
  default: 'SimSun',
};

// 嵌入字体
async function embedChineseFont(pdfDoc: PDFDocument, fontPath: string) {
  const fontBytes = await fs.readFile(fontPath);
  return await pdfDoc.embedFont(fontBytes);
}
```

**字体文件管理**：
- 字体文件存放在 `./fonts/` 目录
- 首次使用时自动下载（从 CDN 或内置）
- 支持用户上传自定义字体

### 5.5 处理链对比

| 特性 | PDF 直接处理 | Word 转 PDF |
|------|-------------|-------------|
| 处理速度 | 快（<1s） | 慢（2-5s） |
| 中文支持 | 需嵌入字体 | 原生支持 |
| 排版保真度 | 中等 | 高 |
| 依赖项 | 无 | LibreOffice |
| 复杂模版支持 | 较弱 | 强 |
| 服务器资源 | 低 | 高 |

### 5.6 混合处理策略

```typescript
// 根据模版类型选择处理链
async function generateContract(
  template: Template,
  variables: Record<string, string>,
  outputPath: string
): Promise<void> {
  switch (template.fileType) {
    case 'pdf':
      await replacePdfVariables(template.filePath, variables, outputPath);
      break;
    case 'docx':
      await replaceWordVariablesAndConvert(template.filePath, variables, outputPath);
      break;
    default:
      throw new Error(`Unsupported template type: ${template.fileType}`);
  }
}
```

## 6. 印章加密存储

### 6.1 加密方案

**加密算法**：AES-256-GCM

- 对称加密，适合大文件加密
- GCM 模式提供认证加密（AEAD），防篡改
- 性能优于非对称加密

**加密流程**：

```
┌─────────────────────────────────────────────────────────────┐
│                    印章加密存储流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. 用户上传印章图片                                        │
│  2. 生成随机 12 字节 IV (Initialization Vector)             │
│  3. 使用 AES-256-GCM 加密图片数据                           │
│  4. 生成 16 字节 Auth Tag（用于完整性校验）                 │
│  5. 存储格式: [IV (12字节)] + [Auth Tag (16字节)] + [密文]   │
│  6. 将加密后的数据写入文件                                  │
└─────────────────────────────────────────────────────────────┘
```

**实现代码**：

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// 加密印章图片
async function encryptStampImage(
  imageBuffer: Buffer,
  encryptionKey: Buffer
): Promise<Buffer> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(imageBuffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // 格式: IV + AuthTag + 密文
  return Buffer.concat([iv, authTag, encrypted]);
}

// 解密印章图片
async function decryptStampImage(
  encryptedBuffer: Buffer,
  encryptionKey: Buffer
): Promise<Buffer> {
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}
```

### 6.2 密钥管理策略

**方案选择**：环境变量 + 密钥派生

不使用硬编码密钥，通过环境变量配置主密钥，使用 PBKDF2 派生加密密钥：

```typescript
// 密钥配置
const KEY_CONFIG = {
  // 主密钥（从环境变量读取）
  masterKey: process.env.STAMP_MASTER_KEY,

  // 密钥派生参数
  salt: process.env.STAMP_KEY_SALT || 'default-salt-change-in-production',
  iterations: 100000,
  keyLength: 32, // 256 bits
  digest: 'sha512',
};

// 从主密钥派生加密密钥
function deriveEncryptionKey(): Buffer {
  if (!KEY_CONFIG.masterKey) {
    throw new Error('STAMP_MASTER_KEY environment variable is not set');
  }

  return crypto.pbkdf2Sync(
    KEY_CONFIG.masterKey,
    KEY_CONFIG.salt,
    KEY_CONFIG.iterations,
    KEY_CONFIG.keyLength,
    KEY_CONFIG.digest
  );
}
```

**环境变量配置**：

```bash
# .env 文件
STAMP_MASTER_KEY=your-secure-master-key-at-least-32-chars
STAMP_KEY_SALT=your-random-salt-value
```

**密钥轮换支持**：

**密钥版本存储方案**：

使用数据库存储密钥版本历史，而非仅依赖环境变量：

```sql
-- 密钥版本表
CREATE TABLE encryption_key_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  salt TEXT NOT NULL,                    -- 该版本的 salt
  iterations INTEGER NOT NULL DEFAULT 100000,
  key_length INTEGER NOT NULL DEFAULT 32,
  digest TEXT NOT NULL DEFAULT 'sha512',
  status TEXT NOT NULL DEFAULT 'active', -- active / deprecated / revoked
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deprecated_at DATETIME,
  revoked_at DATETIME,
  notes TEXT                             -- 轮换原因说明
);

-- 印章加密记录表（记录每个印章使用的密钥版本）
CREATE TABLE stamp_encryption_info (
  stamp_id INTEGER PRIMARY KEY,
  key_version INTEGER NOT NULL,
  encrypted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stamp_id) REFERENCES stamps(id),
  FOREIGN KEY (key_version) REFERENCES encryption_key_versions(version)
);
```

**密钥版本管理服务**：

```typescript
// 密钥版本管理
interface KeyVersion {
  version: number;
  salt: string;
  iterations: number;
  keyLength: number;
  digest: string;
  status: 'active' | 'deprecated' | 'revoked';
  createdAt: Date;
  deprecatedAt?: Date;
  revokedAt?: Date;
}

class KeyVersionManager {
  // 获取当前活跃版本
  async getActiveVersion(): Promise<KeyVersion> {
    const result = await db.query(
      'SELECT * FROM encryption_key_versions WHERE status = $1 ORDER BY version DESC LIMIT 1',
      ['active']
    );
    if (!result) {
      throw new Error('No active key version found');
    }
    return result;
  }

  // 获取指定版本（用于解密历史数据）
  async getVersion(version: number): Promise<KeyVersion> {
    const result = await db.query(
      'SELECT * FROM encryption_key_versions WHERE version = $1',
      [version]
    );
    if (!result) {
      throw new Error(`Key version ${version} not found`);
    }
    return result;
  }

  // 创建新版本（密钥轮换）
  async createNewVersion(notes?: string): Promise<KeyVersion> {
    const currentVersion = await this.getActiveVersion();

    // 将当前版本标记为 deprecated
    await db.query(
      'UPDATE encryption_key_versions SET status = $1, deprecated_at = $2 WHERE version = $3',
      ['deprecated', new Date(), currentVersion.version]
    );

    // 生成新 salt
    const newSalt = crypto.randomBytes(32).toString('hex');

    // 创建新版本
    const newVersion = await db.query(
      `INSERT INTO encryption_key_versions (version, salt, iterations, key_length, digest, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        currentVersion.version + 1,
        newSalt,
        100000,
        32,
        'sha512',
        'active',
        notes || `Key rotation at ${new Date().toISOString()}`
      ]
    );

    return newVersion;
  }

  // 撤销版本（紧急情况，如密钥泄露）
  async revokeVersion(version: number, reason: string): Promise<void> {
    await db.query(
      'UPDATE encryption_key_versions SET status = $1, revoked_at = $2, notes = $3 WHERE version = $4',
      ['revoked', new Date(), reason, version]
    );
  }

  // 派生指定版本的加密密钥
  async deriveKeyForVersion(version: number): Promise<Buffer> {
    const keyVersion = await this.getVersion(version);
    const masterKey = process.env.STAMP_MASTER_KEY;

    if (!masterKey) {
      throw new Error('STAMP_MASTER_KEY environment variable is not set');
    }

    return crypto.pbkdf2Sync(
      masterKey,
      keyVersion.salt,
      keyVersion.iterations,
      keyVersion.keyLength,
      keyVersion.digest
    );
  }
}

const keyManager = new KeyVersionManager();
```

**加密时记录版本**：

```typescript
// 加密印章时记录使用的密钥版本
async function encryptStampWithVersion(
  imageBuffer: Buffer,
  stampId: number
): Promise<Buffer> {
  // 1. 获取当前活跃版本
  const activeVersion = await keyManager.getActiveVersion();

  // 2. 派生密钥
  const encryptionKey = await keyManager.deriveKeyForVersion(activeVersion.version);

  // 3. 加密
  const encrypted = await encryptStampImage(imageBuffer, encryptionKey);

  // 4. 记录加密信息
  await db.query(
    'INSERT INTO stamp_encryption_info (stamp_id, key_version) VALUES ($1, $2) ON CONFLICT (stamp_id) DO UPDATE SET key_version = $2',
    [stampId, activeVersion.version]
  );

  return encrypted;
}

// 解密时使用对应版本
async function decryptStampWithVersion(
  encryptedBuffer: Buffer,
  stampId: number
): Promise<Buffer> {
  // 1. 获取该印章使用的密钥版本
  const encInfo = await db.query(
    'SELECT key_version FROM stamp_encryption_info WHERE stamp_id = $1',
    [stampId]
  );

  if (!encInfo) {
    throw new Error(`Encryption info not found for stamp ${stampId}`);
  }

  // 2. 检查版本状态
  const keyVersion = await keyManager.getVersion(encInfo.key_version);
  if (keyVersion.status === 'revoked') {
    throw new Error(`Key version ${encInfo.key_version} has been revoked. Stamp needs re-encryption.`);
  }

  // 3. 派生对应版本的密钥并解密
  const encryptionKey = await keyManager.deriveKeyForVersion(encInfo.key_version);
  return decryptStampImage(encryptedBuffer, encryptionKey);
}
```

**密钥轮换流程**：

```
┌─────────────────────────────────────────────────────────────┐
│                      密钥轮换流程                           │
├─────────────────────────────────────────────────────────────┤
│  1. 管理员触发密钥轮换                                      │
│  2. 系统生成新 salt，创建新版本记录                         │
│  3. 旧版本标记为 deprecated（仍可用于解密）                 │
│  4. 新印章使用新版本加密                                    │
│  5. 可选：批量重新加密旧印章（后台任务）                    │
│  6. 确认所有印章已迁移后，可撤销旧版本                      │
└─────────────────────────────────────────────────────────────┘
```

**批量重新加密（后台任务）**：

```typescript
// 后台任务：重新加密所有印章
async function reEncryptAllStamps(): Promise<void> {
  const activeVersion = await keyManager.getActiveVersion();
  const stamps = await db.query('SELECT * FROM stamps');

  for (const stamp of stamps) {
    try {
      // 获取当前加密信息
      const encInfo = await db.query(
        'SELECT key_version FROM stamp_encryption_info WHERE stamp_id = $1',
        [stamp.id]
      );

      // 如果已是最新版本，跳过
      if (encInfo?.key_version === activeVersion.version) {
        continue;
      }

      // 解密（使用旧版本）
      const encryptedData = await fs.readFile(stamp.image_path);
      const decrypted = await decryptStampWithVersion(encryptedData, stamp.id);

      // 重新加密（使用新版本）
      const newEncrypted = await encryptStampImage(decrypted, await keyManager.deriveKeyForVersion(activeVersion.version));

      // 写入新文件
      await fs.writeFile(stamp.image_path, newEncrypted);

      // 更新版本记录
      await db.query(
        'UPDATE stamp_encryption_info SET key_version = $1, encrypted_at = $2 WHERE stamp_id = $3',
        [activeVersion.version, new Date(), stamp.id]
      );

      logger.info(`Stamp ${stamp.id} re-encrypted with version ${activeVersion.version}`);
    } catch (error) {
      logger.error(`Failed to re-encrypt stamp ${stamp.id}:`, error);
    }
  }
}
```

### 6.3 密钥安全要求

| 要求 | 说明 |
|------|------|
| 主密钥长度 | 至少 32 字符 |
| 主密钥复杂度 | 包含大小写字母、数字、特殊字符 |
| 密钥存储 | 仅存储在环境变量或密钥管理服务，不写入代码或数据库 |
| 密钥轮换 | 建议每 90 天轮换一次 |
| 访问控制 | 仅应用服务账号可读取密钥 |

### 6.4 文件存储结构

```
uploads/
├── templates/          # 模版文件（不加密）
│   ├── 1_template.pdf
│   └── 2_template.docx
├── stamps/             # 印章文件（加密存储）
│   ├── 1_stamp.enc     # 加密后的印章
│   └── 2_stamp.enc
└── contracts/          # 生成的合同（不加密）
    ├── 1_contract.pdf
    └── 2_contract.pdf
```

### 6.5 印章使用时解密

```typescript
// 使用印章时临时解密（使用版本化密钥）
async function getStampForOverlay(stampId: number): Promise<Buffer> {
  // 1. 从数据库获取印章记录
  const stamp = await db.stamps.findById(stampId);

  // 2. 读取加密文件
  const encryptedData = await fs.readFile(stamp.imagePath);

  // 3. 使用版本化密钥解密
  const imageData = await decryptStampWithVersion(encryptedData, stampId);

  // 4. 返回解密后的图片数据（不写入磁盘）
  return imageData;
}

// 合同生成时叠加印章
async function addStampToContract(
  contractPath: string,
  stampId: number,
  position: StampPosition
): Promise<void> {
  // 1. 解密印章图片
  const stampImage = await getStampForOverlay(stampId);

  // 2. 叠加到 PDF（使用内存中的数据，不落盘）
  const pdfDoc = await PDFDocument.load(await fs.readFile(contractPath));
  const stampImageEmbed = await pdfDoc.embedPng(stampImage);

  // ... 叠加逻辑
}
```

## 7. 数据库设计

### 7.1 表结构

```sql
-- 模版表
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- pdf / docx
  variables TEXT NOT NULL,   -- JSON 格式的变量定义
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 印章表
CREATE TABLE stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 公章 / 合同章 / 财务章
  image_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 合同记录表
CREATE TABLE contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  variables TEXT NOT NULL,      -- JSON 格式的变量值
  stamp_id INTEGER,
  stamp_position TEXT,          -- JSON 格式的印章位置
  output_path TEXT,
  status TEXT DEFAULT 'pending', -- pending / generating / completed / failed
  error_message TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (stamp_id) REFERENCES stamps(id)
);

-- 批量任务表
CREATE TABLE batch_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending / processing / completed / partial
  result_path TEXT,                -- ZIP 打包路径
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

### 7.2 索引

```sql
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_contracts_template ON contracts(template_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_batch_tasks_status ON batch_tasks(status);
```
