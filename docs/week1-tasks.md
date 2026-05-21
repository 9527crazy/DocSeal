# 第 1 周任务文档 - 项目搭建

**周期**：第 1 周（共 4 周）
**里程碑**：完成前后端框架搭建和数据库设计
**交付物**：可运行的前后端空项目 + 数据库 Schema

---

## 任务概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          第 1 周任务分解                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Day 1-2              Day 3-4               Day 5                      │
│  ────────────         ────────────           ────────────               │
│  后端项目搭建          前端项目搭建           数据库设计                  │
│  ✦ NestJS 初始化      ✦ Vue 3 初始化        ✦ Schema 设计              │
│  ✦ 目录结构           ✦ 目录结构             ✦ 迁移脚本                 │
│  ✦ 基础配置           ✦ 路由配置             ✦ 种子数据                 │
│  ✦ 接口规范           ✦ UI 框架集成          ✦ 联调验证                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Day 1-2：后端项目搭建

### T1.1 NestJS 项目初始化

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 使用 `@nestjs/cli` 创建新项目
- [ ] 配置 TypeScript（strict 模式）
- [ ] 配置 ESLint + Prettier
- [ ] 配置 `.gitignore`
- [ ] 验证项目可启动（`npm run start:dev`）

**验收标准**：
- 项目可正常启动，默认监听 3000 端口
- 无 TypeScript 编译错误
- ESLint 和 Prettier 规则生效

---

### T1.2 项目目录结构

**优先级**：P0
**预计工时**：1 小时

**目标结构**：
```
server/
├── src/
│   ├── common/              # 公共模块
│   │   ├── decorators/      # 自定义装饰器
│   │   ├── filters/         # 异常过滤器
│   │   ├── guards/          # 守卫
│   │   ├── interceptors/    # 拦截器
│   │   └── pipes/           # 管道
│   ├── config/              # 配置模块
│   ├── database/            # 数据库模块
│   │   ├── migrations/      # 迁移脚本
│   │   └── seeds/           # 种子数据
│   ├── modules/             # 业务模块
│   │   ├── template/        # 模版模块
│   │   ├── contract/        # 合同模块
│   │   └── stamp/           # 印章模块（第 2 期）
│   ├── app.module.ts
│   └── main.ts
├── uploads/                 # 上传文件存储
│   ├── templates/
│   ├── stamps/
│   └── contracts/
├── fonts/                   # 字体文件
├── .env.example
├── .env.local
├── package.json
└── tsconfig.json
```

**任务清单**：
- [ ] 创建上述目录结构
- [ ] 配置 `@Module` 装饰器的模块划分
- [ ] 配置静态文件服务（`uploads/` 目录）

---

### T1.3 基础配置模块

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 安装 `@nestjs/config`
- [ ] 创建 `.env.example` 配置模板
- [ ] 创建 `.env.local` 本地配置（加入 .gitignore）
- [ ] 实现配置验证（使用 Joi 或 class-validator）

**配置项**：
```bash
# 应用配置
APP_PORT=3000
APP_ENV=development

# 数据库配置
DB_PATH=./data/database.sqlite

# 文件上传配置
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# 印章加密（第 2 期）
# STAMP_MASTER_KEY=
# STAMP_KEY_SALT=
```

**验收标准**：
- 配置模块可正常注入到其他模块
- 缺少必填配置时启动报错

---

### T1.4 全局异常过滤器

**优先级**：P1
**预计工时**：1 小时

**任务清单**：
- [ ] 创建 `HttpExceptionFilter`
- [ ] 统一错误响应格式
- [ ] 区分开发/生产环境错误详情

**统一响应格式**：
```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "模版不存在"
  }
}
```

---

### T1.5 接口响应拦截器

**优先级**：P1
**预计工时**：1 小时

**任务清单**：
- [ ] 创建 `ResponseInterceptor`
- [ ] 自动包装成功响应为统一格式
- [ ] 添加请求日志记录

---

## Day 3-4：前端项目搭建

### T2.1 Vue 3 项目初始化

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 使用 Vite 创建 Vue 3 + TypeScript 项目
- [ ] 配置 ESLint + Prettier
- [ ] 配置路径别名（`@/`）
- [ ] 验证项目可启动（`npm run dev`）

**技术栈**：
- Vue 3.4+
- TypeScript 5.x
- Vite 5.x
- Vue Router 4
- Pinia

**验收标准**：
- 项目可正常启动，默认监听 5173 端口
- 热更新正常工作

---

### T2.2 项目目录结构

**优先级**：P0
**预计工时**：1 小时

**目标结构**：
```
client/
├── src/
│   ├── api/                 # API 请求封装
│   │   ├── index.ts         # axios 实例
│   │   ├── template.ts      # 模版相关接口
│   │   └── contract.ts      # 合同相关接口
│   ├── assets/              # 静态资源
│   │   ├── styles/          # 全局样式
│   │   └── images/          # 图片资源
│   ├── components/          # 公共组件
│   │   ├── common/          # 基础组件
│   │   └── business/        # 业务组件
│   ├── composables/         # 组合式函数
│   ├── layouts/             # 布局组件
│   ├── router/              # 路由配置
│   ├── stores/              # Pinia 状态管理
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   ├── views/               # 页面组件
│   │   ├── template/        # 模版管理页面
│   │   └── contract/        # 合同生成页面
│   ├── App.vue
│   └── main.ts
├── .env.development
├── .env.production
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

### T2.3 UI 框架集成

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 安装 Element Plus
- [ ] 配置按需引入（unplugin-vue-components）
- [ ] 配置中文语言包
- [ ] 安装图标库（@element-plus/icons-vue）
- [ ] 创建全局样式变量

**验收标准**：
- Element Plus 组件可正常使用
- 中文显示正常

---

### T2.4 路由配置

**优先级**：P0
**预计工时**：1 小时

**任务清单**：
- [ ] 安装 Vue Router 4
- [ ] 配置路由表
- [ ] 实现路由守卫（登录验证，第 3 期扩展）
- [ ] 配置路由懒加载

**路由规划**：
```typescript
const routes = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '', redirect: '/template' },
      { path: 'template', component: () => import('@/views/template/index.vue') },
      { path: 'template/:id', component: () => import('@/views/template/detail.vue') },
      { path: 'contract/generate/:templateId', component: () => import('@/views/contract/generate.vue') },
      { path: 'contract/preview/:id', component: () => import('@/views/contract/preview.vue') },
    ],
  },
];
```

---

### T2.5 API 请求封装

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 安装 Axios
- [ ] 创建 axios 实例，配置 baseURL
- [ ] 实现请求拦截器（添加 token，第 3 期扩展）
- [ ] 实现响应拦截器（统一错误处理）
- [ ] 封装 GET/POST/PUT/DELETE 方法
- [ ] 配置请求超时和重试

**封装示例**：
```typescript
// src/api/index.ts
import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    ElMessage.error(error.response?.data?.message || '请求失败');
    return Promise.reject(error);
  }
);

export default request;
```

---

### T2.6 布局组件

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 创建主布局（Header + Sidebar + Content）
- [ ] 实现响应式侧边栏
- [ ] 添加导航菜单
- [ ] 创建 404 页面

**布局结构**：
```
┌─────────────────────────────────────────┐
│  Header（Logo + 用户信息）              │
├──────────┬──────────────────────────────┤
│          │                              │
│  Sidebar │       Content                │
│  （菜单） │       （页面内容）           │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

---

## Day 5：数据库设计

### T3.1 SQLite 数据库配置

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 安装 `better-sqlite3` 和 `@nestjs/typeorm`（或 `drizzle-orm`）
- [ ] 创建数据库连接模块
- [ ] 配置数据库文件路径
- [ ] 实现数据库初始化和表创建

---

### T3.2 表结构设计

**优先级**：P0
**预计工时**：3 小时

**表结构**：

```sql
-- 模版表
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 模版名称
  original_name TEXT NOT NULL,           -- 原始文件名
  file_path TEXT NOT NULL,               -- 存储路径
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  variables TEXT NOT NULL DEFAULT '[]',  -- JSON 格式的变量定义
  category TEXT,                         -- 分类
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 变量定义表（可选，变量也可存在 templates.variables JSON 中）
CREATE TABLE template_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- 变量名
  type TEXT NOT NULL DEFAULT 'text',     -- 变量类型: text/number/date/tel/email
  required INTEGER NOT NULL DEFAULT 1,   -- 是否必填
  default_value TEXT,                    -- 默认值
  validation_rules TEXT,                 -- JSON 格式的校验规则
  sort_order INTEGER NOT NULL DEFAULT 0, -- 排序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- 合同记录表
CREATE TABLE contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  variables TEXT NOT NULL DEFAULT '{}',  -- JSON 格式的变量值
  output_path TEXT,                      -- 生成的合同路径
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- 印章表（第 2 期）
CREATE TABLE stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '公章' CHECK (type IN ('公章', '合同章', '财务章', '其他')),
  image_path TEXT NOT NULL,              -- 加密后的文件路径
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 印章加密信息表（第 2 期）
CREATE TABLE stamp_encryption_info (
  stamp_id INTEGER PRIMARY KEY,
  key_version INTEGER NOT NULL,
  encrypted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stamp_id) REFERENCES stamps(id) ON DELETE CASCADE
);

-- 密钥版本表（第 2 期）
CREATE TABLE encryption_key_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 100000,
  key_length INTEGER NOT NULL DEFAULT 32,
  digest TEXT NOT NULL DEFAULT 'sha512',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'revoked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deprecated_at DATETIME,
  revoked_at DATETIME,
  notes TEXT
);

-- 批量任务表（第 3 期）
CREATE TABLE batch_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial')),
  result_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);
```

**索引**：
```sql
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_contracts_template ON contracts(template_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_batch_tasks_status ON batch_tasks(status);
```

---

### T3.3 TypeORM Entity 定义

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 创建 `Template` Entity
- [ ] 创建 `TemplateVariable` Entity
- [ ] 创建 `Contract` Entity
- [ ] 配置 Entity 之间的关系
- [ ] 配置自动时间戳

**示例**：
```typescript
// src/modules/template/entities/template.entity.ts
@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_type' })
  fileType: 'pdf' | 'docx';

  @Column({ type: 'text', default: '[]' })
  variables: string; // JSON string

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TemplateVariable, (v) => v.template)
  variableEntities: TemplateVariable[];
}
```

---

### T3.4 数据库迁移脚本

**优先级**：P1
**预计工时**：1 小时

**任务清单**：
- [ ] 配置 TypeORM 迁移
- [ ] 创建初始迁移脚本
- [ ] 实现迁移自动执行

**验收标准**：
- `npm run migration:run` 可正常创建所有表
- `npm run migration:revert` 可正常回滚

---

### T3.5 种子数据（可选）

**优先级**：P2
**预计工时**：1 小时

**任务清单**：
- [ ] 创建示例模版数据
- [ ] 创建测试用 PDF/Word 模版文件
- [ ] 实现种子数据脚本

---

## 联调验证

### T4.1 前后端联调

**优先级**：P0
**预计工时**：2 小时

**任务清单**：
- [ ] 配置 Vite 代理（开发环境 API 转发）
- [ ] 创建健康检查接口 `GET /api/health`
- [ ] 前端调用健康检查接口验证连通性
- [ ] 验证跨域配置正常

**Vite 代理配置**：
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 依赖清单

### 后端依赖

```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/config": "^3.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/typeorm": "^10.x",
    "better-sqlite3": "^9.x",
    "class-transformer": "^0.5.x",
    "class-validator": "^0.14.x",
    "joi": "^17.x",
    "typeorm": "^0.3.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.x",
    "@types/better-sqlite3": "^7.x",
    "@types/node": "^20.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "@typescript-eslint/parser": "^6.x",
    "eslint": "^8.x",
    "eslint-config-prettier": "^9.x",
    "prettier": "^3.x",
    "typescript": "^5.x"
  }
}
```

### 前端依赖

```json
{
  "dependencies": {
    "@element-plus/icons-vue": "^2.x",
    "axios": "^1.x",
    "element-plus": "^2.x",
    "pinia": "^2.x",
    "vue": "^3.4.x",
    "vue-router": "^4.x"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.x",
    "typescript": "^5.x",
    "unplugin-auto-import": "^0.17.x",
    "unplugin-vue-components": "^0.26.x",
    "vite": "^5.x",
    "vue-tsc": "^1.x"
  }
}
```

---

## 验收检查表

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 后端项目可正常启动 | ☐ | `npm run start:dev` |
| 前端项目可正常启动 | ☐ | `npm run dev` |
| TypeScript 编译无错误 | ☐ | 前后端均通过 |
| ESLint 检查通过 | ☐ | `npm run lint` |
| 数据库表创建成功 | ☐ | 检查 sqlite 文件 |
| 前后端联调成功 | ☐ | 健康检查接口返回正常 |
| 环境变量配置完成 | ☐ | `.env.example` 文件齐全 |
| 目录结构符合规范 | ☐ | 参考上述目录结构 |

---

## 风险与注意事项

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Node.js 版本不一致 | 依赖安装失败 | 使用 nvm 管理版本，锁定 Node 18+ |
| better-sqlite3 编译失败 | 数据库无法使用 | 确保安装 build tools（Python, C++ 编译器） |
| Element Plus 按需引入配置复杂 | 组件无法正常使用 | 使用官方推荐的 unplugin 方案 |

---

## 下周计划（Week 2）

- 模版上传功能（PDF/Word）
- 变量自动识别
- 模版列表页面
