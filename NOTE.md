```js
- packages
  - @interactions 交互
    - useFocus
  - @internationalized 国际化差异
    - date model: year/month/day or day/month/year etc.
  - @vue-aria headless impl 无头组件实现
    - useButton
  - @vue-aria-components 无样式组件实现，基于无头组件 , 通过细粒度的组合来实现对样式的精准控制，供用户构建自己的组件
    - button component
  - @utils 工具
    - mergeProps
  - @components 采用内置theme的组件，基于无样式组件
    - button component

  - interactions 导出@interactions
  - internationalized 导出@internationalized
  - ...
```

theme?
  - 主题 提供多套主题，基于unocss，参考onu-ui，提供纯class ui库，支持tv api（或许需要编写一个unocss的tv库，后续支持）

dev示例采用storybook

plop构建开发模板

全局依赖更新脚步


// 继续拓展，可提供由nevUI全线支持的应用模板，例如管理系统、官网等
// 👆

包结构：

// hold on
@nev-ui/block -- 由nevUI组件支持，构建的代码块，比如一个完备的登陆验证表单

// 既然粒度足够细，就可以支持类似shadcn那样的拷贝引入方式，完全自定义！

// hold on
@nev-ui/pro -- 由细粒度组件组合而成，具有复杂功能的高阶组件预设

// DONE：基于Button的无样式组件实现
@nev-ui/vue -- 带有样式的ui组件（这些组件粒度最小，功能清晰且单一） // 应当给予组合复杂功能的文档示例
@nev-ui/button -- 带有样式的button组件（unocss提供样式定义）
<!-- maybe，未来可以提供其他样式方案，比如tailwind、scss？ -->

@nev-ui/vue-aria-components -- 无样式的ui组件
@nev-ui/aria-button -- 无样式的button组件(只有基础的dom结构+bem层级，如果有多层级的DOM，需要为每一层级的DOM都提供bem class，并给予透穿每层DOM的class和style的方式)

@nev-ui/vue-aria -- ui组件的逻辑hooks
@nev-ui/use-aria-button -- button的逻辑hooks
 - useButton -- button的逻辑hooks（使用useAriaButton。实现更多逻辑，比如处理loading、处理图标按钮、处理波纹等），提供data-xxx
 - useAriaButton -- 赋予button aria（仅仅处理aria逻辑，比如hover、press、focus等），提供aria-xxx

@nev-ui/interactions -- 统一交互事件
@nev-ui/use-hover -- hover事件的逻辑hooks

@nev-ui/preset -- ui组件的unocss预设
@nev-ui/preset-button -- button组件的unocss预设

@nev-ui/utilities -- 工具包
@nev-ui/shared -- 共享的工具包

@nev-ui/types -- nev-ui提供的所有类型标注
@nev-ui/types-button -- button类型标注
