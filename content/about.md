# 关于本站

这是一个**个人导航站**，用来集中管理我平时常用的网址与资源。

- 内容以 YAML 维护：`config/user/pages/bookmarks.yml`
- 站点信息（标题、主题、导航、社交链接）：`config/user/site.yml`
- 修改后推送到 `main`，GitHub Actions 会自动构建并发布到 GitHub Pages

## 怎么加/改链接

1. 打开 `config/user/pages/bookmarks.yml`
2. 在 `categories`（或更深的 `groups`）下加一条：

```yaml
      - name: '站点名称'
        url: 'https://example.com/'
        icon: 'fas fa-globe'
        description: '一句话说明'
```

3. 提交并推送，1~2 分钟后刷新线上页面即可看到。

## 本站由 MeNav 生成

[MeNav](https://github.com/rbetree/menav) 是一个「一键部署的个人导航站生成器」：

- **构建期**：用 Node.js 作为静态站点生成器，把配置与内容渲染为 `dist/`
- **运行时**：输出一份轻量的浏览器 runtime，负责页面交互与增强
- 适合想要「可自托管、可版本管理」的导航页/起始页，用 YAML + Markdown 管内容

## 本地预览

```bash
npm install
npm run dev
```

- `npm run dev`：本地开发预览
- `npm run build`：生成生产构建（输出到 `dist/`）