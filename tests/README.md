# Archon 项目测试指南

## 测试架构

本项目采用多层次测试策略：

| 层级 | 工具 | 范围 | 运行方式 |
|------|------|------|----------|
| 单元测试 | Bun Test | 纯函数、工具模块 | `bun run test` |
| 类型检查 | TypeScript | 全项目类型 | `bun run type-check` |
| 代码规范 | ESLint | 全项目代码风格 | `bun run lint` |
| E2E 测试 | Playwright | Web UI 交互 + API | `npx playwright test` |
| 综合验证 | validate 脚本 | 以上全部 | `bun run validate` |

## 目录结构

```
tests/
├── README.md                          # 本文件
├── changes/                           # 按变更组织的测试
│   └── webui-workflow-opencode-features/  # 本次变更测试
│       └── CHANGE.md                  # 变更说明文档
├── e2e/                               # Playwright E2E 测试
│   ├── workflow-builder.spec.ts       # 工作流构建器 UI 测试
│   └── workflow-api.spec.ts           # 工作流 API 测试
└── reports/                           # 测试报告输出
    └── html/                          # Playwright HTML 报告
```

## 快速开始

### 运行所有单元测试
```bash
bun run test
```

### 运行前端包单元测试
```bash
cd packages/web && bun test
```

### 运行 E2E 测试

**前提条件：**
1. 安装 Playwright 浏览器：
   ```bash
   npx playwright install chromium
   ```

2. 启动开发服务器（两个终端）：
   ```bash
   # 终端 1：后端
   bun run dev:server
   
   # 终端 2：前端（如需 UI 测试）
   bun run dev:web
   ```

**运行 E2E 测试：**
```bash
# 运行所有 E2E 测试
npx playwright test

# 仅运行 API 测试（需要后端运行）
npx playwright test tests/e2e/workflow-api.spec.ts

# 仅运行 UI 测试（需要前后端都运行）
npx playwright test tests/e2e/workflow-builder.spec.ts

# 带详细输出
npx playwright test --reporter=list

# 生成 HTML 报告
npx playwright test --reporter=html
npx playwright show-report tests/reports/html
```

### 运行综合验证
```bash
bun run validate
```

## 编写新测试

### 单元测试（Bun Test）

```typescript
import { describe, test, expect } from 'bun:test';
import { myFunction } from '@/lib/my-module';

describe('myFunction', () => {
  test('should handle normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### E2E 测试（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

## 测试约定

1. **文件命名**：单元测试与源文件同目录，后缀 `.test.ts`；E2E 测试放在 `tests/e2e/`
2. **测试隔离**：每个测试用例独立，不依赖其他用例的状态
3. **Mock 注意**：Bun 的 `mock.module()` 是进程全局的，不同测试文件不能 mock 同一模块
4. **运行方式**：永远使用 `bun run test`（per-package 隔离），不要用 `bun test`（根目录）
