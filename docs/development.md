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

## 4. 推荐扩展

第一阶段的移动端基础能力包括照片、相机、本地数据、通知和敏感凭证：

```powershell
cd apps/mobile
npx expo install expo-camera expo-image-picker expo-file-system expo-notifications expo-secure-store expo-sqlite @react-native-async-storage/async-storage
pnpm add @tanstack/react-query zustand
```

Expo 原生模块必须使用 `expo install`，由 Expo 根据 SDK 55 选择兼容版本。依赖安装后应提交更新过的 `pnpm-lock.yaml`，并运行 `pnpm --filter plantory lint` 和 TypeScript 检查。

### NativeWind v5

移动端样式使用 NativeWind v5 preview。它依赖 `react-native-css`、Tailwind CSS v4、PostCSS 和 Metro 配置；v5 仍是预览版本，不应在未验证的情况下升级到其他 preview 版本。`lightningcss` 固定为 `1.30.1`，避免 CSS 构建产物反序列化错误。

建议的数据职责：

- SQLite：植物、养护记录、成长记录、照片索引和待办等本地业务数据。
- SecureStore：登录令牌等敏感凭证，不保存业务列表。
- AsyncStorage：主题、日历展开状态等非敏感的本机 UI 偏好。
- Zustand：筛选、抽屉、临时表单等 UI 状态；需要跨启动保留的 UI 偏好通过 persist 接入 AsyncStorage。
- TanStack Query：远程 API 缓存、请求生命周期和失效刷新。

照片从相机或相册取得后，必须复制到持久目录，再把稳定 URI 写入业务记录；不能直接依赖相机返回的临时 URI。

发布阶段再加入 `expo-dev-client`、EAS Build/Update、错误监控和端到端测试。3D、社区、地图和 AI 识别不应阻塞植物记录主流程。

## 5. 架构边界

- `app/` 只负责路由和页面组合。
- `components/` 负责跨页面复用的视觉组件。
- 业务逻辑应逐步放入 `packages/domain`，避免页面直接操作数据库。
- API 请求应集中在 `packages/api-client`。
- 数据类型放入 `packages/types`，供手机端、后台和后端复用。
- 后端权限必须在服务端或数据库 RLS 边界校验，不能只依赖客户端隐藏按钮。

## 6. 产品数据边界

核心数据：植物、单株成长记录、养护操作、照片、待办。

辅助数据：花费、花盆和物资、库存、季节风险、天气。

未来数据：社区帖子、评论、点赞、关注、举报和审核记录。

## 7. 开发约定

- 植物始终以单株为记录单位。
- 位置是默认分组；用户可以创建额外自定义分组。
- 批量养护操作最终必须为每株植物生成独立记录。
- 移动端以游客优先和离线可用为基线：未连接后端时，植物、养护、成长、照片和待办等核心功能仍必须可用。
- 游客数据先保存在本地；登录不是核心功能的前置条件，登录后再执行本地数据迁移或同步到云端。
- 本地存储、业务 repository 和云端同步必须通过接口隔离，页面不能直接依赖后端是否在线。
- 所有照片记录应保存拍摄时间和关联植物。
- 3D 仅作为未来视觉层，不能成为核心记录流程的唯一入口。
