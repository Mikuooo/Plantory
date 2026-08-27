# Plantory 植迹文档

Plantory（中文名：植迹）是一款以植物成长和养护记录为核心的移动 App。花费、资产、库存和季节风险是辅助能力，社区功能作为后续扩展。

## 文档索引

- [开发文档](./development.md)：项目结构、启动命令、开发约定和扩展边界
- [核心信念](./core-beliefs.md)：稳定的产品与工程不变量
- [质量评分](./quality.md)：自动化门禁、缺口和升级条件
- [测试与证据](./testing.md)：确定性检查与 Android 真机验收
- [设计文档](./design-docs/index.md)：跨层技术决策
- [执行计划](./exec-plans/README.md)：长周期任务状态与证据
- [架构地图](../ARCHITECTURE.md)：已实现运行时和依赖方向

## 当前状态

- Monorepo 已初始化
- 手机端位于 `apps/mobile`
- 手机端使用 Expo + React Native + TypeScript + Expo Router
- `apps/admin`、共享业务包和后端服务尚未创建
- 3D 植物空间尚未实现

## 产品主导航

1. 日历：养护、成长、操作记录和待办
2. 植物：单株档案、位置和自定义分组、批量操作
3. 归档：所有历史记录和筛选检索

设置、资产、花费、天气风险和账号入口放在侧边栏。
