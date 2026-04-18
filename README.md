# yibubu

一个面向心智障碍群体与岗位辅导场景的静态网页应用原型，用来把门店后场任务拆成一步一步的动作，并在卡住时提供更简单的解释、参考图和求助支持。

## 当前包含

- 网页主项目：`index.html`、`app.js`、`styles.css`、`tasks.js`
- 静态资源：`assets/`
- 安卓打包工程：`android/`
- 打包辅助脚本：`tools/`

## 主要功能

- 多岗位任务入口：餐厅、零食店、仓库、洗车
- 多使用者切换，记录彼此独立
- 自定义任务创建
- 单步导航 + 语音朗读
- 参考图上传与本地保存
- 智能卡点提醒与步骤级帮助
- 高风险步骤确认
- 统计、复盘和进度分享

## 本地预览

直接用浏览器打开 `index.html` 就可以。

如果你想更稳定地本地预览，可以在项目目录启动一个静态服务器：

```powershell
cd "E:\git storeplace\tot\tot\yibubu"
python -m http.server 4173
```

然后访问 [http://localhost:4173](http://localhost:4173)。

## 开发说明

如果你需要恢复依赖：

```powershell
cd "E:\git storeplace\tot\tot\yibubu"
npm install
```

当前仓库不会提交这些可再生内容：

- `node_modules/`
- `web-dist/`
- `android/.gradle/`
- `android/app/build/`
- `android/build/`
- `android/local.properties`

## 安卓打包

这个项目已经接入 Capacitor Android，保留了继续打包 APK 的能力。

### 1. 安装依赖

```powershell
cd "E:\git storeplace\tot\tot\yibubu"
npm install
```

### 2. 准备 Android SDK

- 安装 Android Studio
- 安装可用的 Android SDK
- 如果系统已经配置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`，可以执行：

```powershell
npm run android:local-properties
```

- 如果自动生成失败，就参考 `android/local.properties.example` 手动创建 `android/local.properties`

### 3. 同步安卓工程

```powershell
npm run cap:sync
```

### 4. 构建调试 APK

```powershell
npm run android:apk
```

生成后的 APK 默认在：

`android/app/build/outputs/apk/debug/`

## 适合上传 GitHub 的仓库结构

这份仓库现在只保留一套主项目：

- 网页源码
- 资源文件
- Capacitor 安卓工程

历史重复项目、构建产物和依赖缓存已经从仓库目录中清理掉了，便于后续直接上传到 GitHub 并继续维护。
