# 一步步

一个本地优先的门店工作步骤辅助工具，用来把后场任务拆成清晰、可朗读、可求助的一步一步流程。

当前仓库以 GitHub Pages / PWA 发布为主。所有用户数据默认保存在当前设备的浏览器本地存储中，不依赖后端服务。

## 当前包含

- Web 主项目：`index.html`、`app.js`、`styles.css`、`tasks.js`
- 平台能力封装：`scripts/platform.js`
- PWA 配置：`manifest.json`、`sw.js`
- 静态资源：`assets/`

## 主要功能

- 多岗位任务入口：餐厅、零食、仓库、洗车
- 多使用者切换，联系人、统计、自定义任务按使用者隔离
- 单步任务导航、语音朗读、计时和安全提醒
- 图片与视频参考资料本地保存
- 遇到问题时提供简化说明、求助话术和联系人拨号
- 自定义任务、分类、步骤编辑
- 统计记录、成就、进度摘要分享
- 带教包导出与导入，便于把本地配置同步到另一台设备
- 完整备份与恢复，支持导出全部本地资料和已保存媒体
- PWA 新版本提示，用户确认后再刷新到新版

## 本地预览

直接打开 `index.html` 可以预览。为了让 Service Worker、分享链接和离线缓存表现更接近线上环境，建议启动一个静态服务器：

```powershell
cd "E:\git storeplace\tot\tot\yibubu\totdaretoodo.github.io"
npm start
```

然后访问：

```text
http://localhost:4173
```

## 检查

```powershell
npm test
```

当前检查会验证核心脚本是否能被 Node.js 正常解析：

- `scripts/platform.js`
- `tasks.js`
- `app.js`

## 发布说明

当前仓库按 Web/PWA 维护，可以直接部署到 GitHub Pages。仓库内暂不包含 Android / Capacitor 工程目录，因此不再保留会直接失败的 Android 打包脚本。

如后续重新需要 APK 打包，建议单独恢复完整 `android/` 工程和对应构建脚本，再把 README 与 `package.json` 同步更新。

## 数据与隐私

- 用户、联系人、任务、统计、偏好设置保存在本地浏览器中
- 参考图片和新上传的视频保存在本地 IndexedDB 中
- 完整备份会把本地资料和可持久化媒体打包成 JSON 文件，恢复时会全量替换当前浏览器中的本应用数据
- 分享进度、带教包和完整备份都由用户手动导出或发送，不会自动上传到服务器
- 拨打电话使用系统拨号能力
