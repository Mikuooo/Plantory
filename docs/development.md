# Plantory 开发文档

## 1. 仓库结构

```text
Plantory/
├── apps/
│   └── mobile/          Expo 手机端
├── packages/            前后端共享包
├── services/            后端服务和定时任务
├── supabase/            数据库迁移和 Edge Functions（规划）
├── docs/                项目文档
├── package.json         根 workspace 脚本
├── pnpm-workspace.yaml
└── turbo.json
```

## 2. 手机端结构

```text
apps/mobile/
├── app/                 Expo Router 页面和路由
├── components/          可复用 UI 组件
├── constants/           主题和常量
├── hooks/               通用 Hooks
├── assets/              图片和应用资源
├── scripts/             工具脚本
├── app.json             Expo 配置
└── package.json
```

页面规划：

```text
app/
├── _layout.tsx
├── (tabs)/
│   ├── calendar.tsx
│   ├── plants.tsx
│   └── archive.tsx
├── plant/[id].tsx
├── record/new.tsx
└── drawer/
```

## 3. 本地开发

在仓库根目录执行：

```powershell
pnpm install
pnpm --filter plantory start
```

也可以进入手机端目录执行：

```powershell
cd apps/mobile
pnpm start
```

常用命令：

```powershell
pnpm --filter plantory android
pnpm --filter plantory ios
pnpm --filter plantory web
pnpm --filter plantory lint
```

## 4. 架构边界

- `app/` 只负责路由和页面组合。
- `components/` 负责跨页面复用的视觉组件。
- 业务逻辑应逐步放入 `packages/domain`，避免页面直接操作数据库。
- API 请求应集中在 `packages/api-client`。
- 数据类型放入 `packages/types`，供手机端、后台和后端复用。
- 后端权限必须在服务端或数据库 RLS 边界校验，不能只依赖客户端隐藏按钮。

## 5. 产品数据边界

核心数据：植物、单株成长记录、养护操作、照片、待办。

辅助数据：花费、花盆和物资、库存、季节风险、天气。

未来数据：社区帖子、评论、点赞、关注、举报和审核记录。

## 6. 开发约定

- 植物始终以单株为记录单位。
- 位置是默认分组；用户可以创建额外自定义分组。
- 批量养护操作最终必须为每株植物生成独立记录。
- 游客数据先保存在本地，登录后支持迁移到云端。
- 所有照片记录应保存拍摄时间和关联植物。
- 3D 仅作为未来视觉层，不能成为核心记录流程的唯一入口。
