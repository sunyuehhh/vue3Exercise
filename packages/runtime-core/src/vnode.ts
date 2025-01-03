import {
  isString,
  ShapeFlags,
  isArray,
  isFunction,
  isObject,
} from "@vue/shared"

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")
export const Comment = Symbol("Comment")

export interface VNode {
  __v_isVNode: true
  type: any
  props: any
  children: any
  shapeFlag: number
  key: any
}
export function createVNode(type, props, children?): VNode {
  if (props) {
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
  }

  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0
  return createBaseVNode(type, props, children, shapeFlag)
}

export function createBaseVNode(type, props, children, shapeFlag) {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    shapeFlag,
  } as VNode
  normalizeChildren(vnode, children)
  return vnode
}

export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0

  const { shapeFlag } = vnode
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children == "object") {
  } else if (isFunction(children)) {
  } else {
    // children就是字符串
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  vnode.children = children
  vnode.shapeFlag |= type
}
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isRef == true : false
}

export function isSameVNodeType(n1: VNode, n2: VNode) {
  return n1.type === n2.type && n1?.props?.key === n2?.props?.key
}
