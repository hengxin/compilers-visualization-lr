# 编译器可视化（LR算法）
使用前请先阅读[使用指南](https://github.com/hengxin/compilers-visualization-lr/wiki)

## 本地运行

```
npm install
npm run dev
```

## 已知Bug

1. 火狐浏览器下，自动机面板内部滚动到最右侧时，预留的空白空间不显示。（不影响使用）
2. 窗口组件解除固定，从页面下方向上拖拽时，可能出现窗口跟不上鼠标指针的情况。（不影响使用）

## 感谢

- [Lark Parser](https://github.com/lark-parser/lark)：词法与文法的解析通过Lark进行；部分代码参考了Lark的实现。
- [Pyodide](https://pyodide.org/en/stable/)：为浏览器提供Python运行环境以使用Lark。
- [Vue.js](https://vuejs.org/)及其生态系统：本项目开发的基本框架。
- [Bootstrap Icons](https://icons.getbootstrap.com/)：使用了部分图标。
