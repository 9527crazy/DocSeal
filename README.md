# DocSeal

基于固定模版快速生成合同，支持变量自动填充和电子印章叠加，避免打印-盖章-扫描的高成本流程。

## 功能特性

- **模版管理**：上传 PDF/Word 模版，自动识别变量占位符
- **变量填充**：根据变量类型动态生成表单，支持校验
- **合同预览**：实时预览填充结果，支持缩放翻页
- **印章叠加**：上传印章图片，自动叠加到合同指定位置
- **批量生成**：支持 Excel 导入，批量生成并打包下载
- **安全存储**：印章 AES-256-GCM 加密，支持密钥轮换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite |
| 后端 | Node.js + NestJS |
| 数据库 | SQLite (better-sqlite3) |
| PDF 处理 | pdf-lib + pdfjs-dist |
| Word 处理 | docxtemplater + LibreOffice |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- LibreOffice（处理 Word 模版）

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/docseal.git
cd docseal

# 安装依赖
pnpm install

# 安装 LibreOffice（macOS）
brew install --cask libreoffice

# 安装 LibreOffice（Linux）
sudo apt-get install libreoffice
```

### 配置

```bash
# 复制环境变量模版
cp .env.example .env

# 编辑配置
vim .env
```

环境变量说明：

```env
# 服务端口
PORT=3000

# 数据库路径
DATABASE_PATH=./data/app.db

# 印章加密主密钥（至少32字符）
STAMP_MASTER_KEY=your-secure-master-key-at-least-32-chars

# 密钥盐值
STAMP_KEY_SALT=your-random-salt-value

# 上传文件大小限制（字节）
MAX_FILE_SIZE=10485760
```

### 运行

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 生产模式
pnpm start:prod
```

访问 http://localhost:3000

## 项目结构

```
docseal/
├── apps/
│   ├── web/                    # 前端 Vue 3 应用
│   │   ├── src/
│   │   │   ├── components/     # 通用组件
│   │   │   ├── views/          # 页面组件
│   │   │   ├── stores/         # Pinia 状态管理
│   │   │   ├── api/            # API 请求
│   │   │   └── utils/          # 工具函数
│   │   └── package.json
│   │
│   └── server/                 # 后端 NestJS 应用
│       ├── src/
│       │   ├── modules/        # 业务模块
│       │   │   ├── template/   # 模版管理
│       │   │   ├── contract/   # 合同生成
│       │   │   ├── stamp/      # 印章管理
│       │   │   └── batch/      # 批量生成
│       │   ├── common/         # 公共模块
│       │   │   ├── guards/     # 认证守卫
│       │   │   ├── filters/    # 异常过滤器
│       │   │   └── interceptors/ # 拦截器
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   └── shared/                 # 前后端共享代码
│       └── types/              # TypeScript 类型定义
│
├── data/                       # 数据目录
│   ├── templates/              # 模版文件
│   ├── stamps/                 # 印章文件（加密）
│   ├── contracts/              # 生成的合同
│   └── app.db                  # SQLite 数据库
│
├── docs/                       # 文档
│   ├── requirements.md         # 需求文档
│   ├── technical-detail.md     # 技术细化文档
│   └── phased-plan.md          # 分期规划
│
├── .env.example                # 环境变量模版
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 使用说明

### 1. 上传模版

1. 进入「模版管理」页面
2. 点击「上传模版」，选择 PDF 或 Word 文件
3. 系统自动识别变量占位符（格式：`{{变量名}}`）
4. 确认变量定义，保存模版

### 2. 生成合同

1. 进入「合同生成」页面
2. 选择模版
3. 填写变量值
4. 点击「预览」查看效果
5. 点击「导出」下载 PDF

### 3. 添加印章

1. 进入「印章管理」页面
2. 上传印章图片（PNG/JPG/SVG）
3. 生成合同时选择印章
4. 调整印章位置和大小
5. 导出带印章的合同

### 4. 批量生成

1. 进入「批量生成」页面
2. 选择模版
3. 下载 Excel 模版并填写数据
4. 上传 Excel 文件
5. 预览数据，确认无误后批量生成
6. 打包下载所有合同

## 开发指南

### 变量语法

使用 Handlebars 语法定义变量：

```
甲方：{{甲方公司名称}}
合同金额：人民币 {{合同金额}} 元整
签订日期：{{签订日期}}
```

### 变量类型推断

系统根据变量名关键词自动推断类型：

| 关键词 | 类型 | 示例 |
|--------|------|------|
| 日期、时间 | date | 签订日期 |
| 金额、价格 | number | 合同金额 |
| 手机、电话 | tel | 联系电话 |
| 邮箱 | email | 电子邮箱 |
| 其他 | text | 公司名称 |

### API 文档

启动服务后访问 http://localhost:3000/api 查看 Swagger 文档

### 数据库迁移

```bash
# 运行迁移
pnpm migration:run

# 回滚迁移
pnpm migration:revert
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 传统部署

```bash
# 构建
pnpm build

# 启动
NODE_ENV=production node dist/main.js
```

## 常见问题

**Q: Word 模版转换失败？**
A: 确保已安装 LibreOffice，且版本 >= 7.3

**Q: PDF 变量位置偏移？**
A: 复杂排版的 PDF 可能存在坐标偏差，建议使用 Word 模版

**Q: 印章解密失败？**
A: 检查 `STAMP_MASTER_KEY` 环境变量是否正确配置

## 许可证

MIT License
