import { isArray, isObject } from "@vue/shared"
import { createVNode, isVNode, VNode } from "./vnode"
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
  let l = arguments.length
  if (l == 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // 第二个参数是vNode的格式
        return createVNode(type, null, [propsOrChildren])
      }
      // 如果是对象
      return createVNode(type, propsOrChildren)
    } else {
      // 如果是数组的话
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    // 如果不是两个参数
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l == 3 && isVNode(children)) {
      children = [children]
    }

    return createVNode(type, propsOrChildren, children)
  }
}
