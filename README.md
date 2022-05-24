# 编译器可视化（LR算法）
使用前请先阅读[使用指南](https://github.com/hengxin/compilers-visualization-lr/wiki)

## 本地编译运行

1. 处理CDN依赖

   - 如果你的网络环境较好，可以流畅访问jsDelivr CDN，那你什么也不用做。

   - 如果你访问jsDelivr存在困难，则将`src/utils/pyodide.ts`文件中29-30行的内容改为31-32行注释的内容，即：

     ```typescript
     await loadScript("https://cdn.jsdelivr.net/pyodide/v0.20.0/full/pyodide.js");
     pyodide = await window.loadPyodide() as PyodideInterface;
     // 修改为
     await loadScript("/pyodide/pyodide.js");
     pyodide = await window.loadPyodide({ indexURL: "/pyodide" }) as PyodideInterface;
     ```

     然后访问[Pyodide Github Releases](https://github.com/pyodide/pyodide/releases)，选择合适版本的`pyodide-build-*.tar.bz2`（本项目开发时使用的是v0.20.0版本），解压后将下列文件复制到`/public/pyodide`文件夹。

     ```
     distutils.tar
     micropip-*.whl
     packages.json
     packaging-*.whl
     pyodide_py.tar
     pyodide.asm.data
     pyodide.asm.js
     pyodide.asm.wasm
     pyodide.js
     pyparsing-*.whl
     ```

     > 本项目依赖的Pyodide文档提供了从CDN引入的方式和NPM Package两种方式。NPM Package为实验性的，可能存在问题，因此从CDN引入。
     >
     > 此步骤实际上是将从CDN加载的文件手动下载到本地。鉴于部分网络环境访问jsDelivr存在困难，为此提供了一种简单粗暴解决方案。

2. 安装依赖、构建、预览

   ```
   npm install
   npm run build
   npm run preview
   ```

   访问`npm run preview`运行后给出的URL。

## 在线访问

[https://vc.gem-universe.net/](https://vc.gem-universe.net/)

**不保证随时可用！！！**

## 已知Bug

1. 火狐浏览器下，自动机面板内部滚动到最右侧时，预留的空白空间不显示。（不影响使用）
2. 窗口组件解除固定，从页面下方向上拖拽时，可能出现窗口跟不上鼠标指针的情况。（不影响使用）

## 感谢

- [Lark Parser](https://github.com/lark-parser/lark)：词法与文法的解析通过Lark进行；部分代码参考了Lark的实现。
- [Pyodide](https://pyodide.org/en/stable/)：为浏览器提供Python运行环境以使用Lark。
- [Vue.js](https://vuejs.org/)及其生态系统：本项目开发的基本框架。
- [Bootstrap Icons](https://icons.getbootstrap.com/)：使用了部分图标。
- [KaTeX](https://katex.org/)：使用了KaTex的数学字体。
