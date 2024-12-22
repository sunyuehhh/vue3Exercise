import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "@rollup/plugin-typescript"
export default [
  {
    // 入口文件
    input: "packages/vue/src/index.ts",
    output: [
      {
        sourcemap: true,
        file: "./packages/vue/dist/vue.js",
        format: "iife",
        name: "Vue",
      },
    ],
    // 插件
    plugins: [
      typescript({
        // sourcemap: true,
      }),
      resolve(),
      commonjs(),
    ],
  },
]
