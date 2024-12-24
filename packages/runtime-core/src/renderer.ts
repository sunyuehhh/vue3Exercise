import { ShapeFlags, isString } from "@vue/shared"
import { Fragment, isSameVNodeType, Text } from "./vnode"
import { createComponentInstance, setupComponent } from "./component"
import { ReactiveEffect, queuePreFlushCb } from "@vue/reactivity"
import { normalizeVNode, renderComponentRoot } from "./componentRenderUtils"
export const EMPTY_OBJ = {}
export interface RendererOptions {
  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
  setElementText(node: Element, text: string): void
  insert(el, parent: Element, anchor?): void
  createElement(type: string): void
  remove(el: Element): void
  createText(text: string): void
  setText(node: any, text: string): void
  createComment(text: string): void
}

export function createRenderer(options: RendererOptions) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options: RendererOptions): any {
  const {
    insert: hostInsert,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    remove: hostRemove,
    createText: hostCreateText,
    setText: hostSetText,
    createComment: hostCreateComment,
  } = options
  const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      mountComponent(newVNode, container, anchor)
    }
  }

  const mountComponent = (initialVNode, container, anchor) => {
    initialVNode.component = createComponentInstance(initialVNode)
    const instance = initialVNode.component

    // 绑定render函数
    setupComponent(instance)

    // 渲染组件
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    const componentUpdateFn = () => {
      console.log("执行", instance)
      if (!instance.isMounted) {
        const { bm, m } = instance
        if (bm) {
          bm()
        }
        const subTree = (instance.subTree = renderComponentRoot(instance))
        patch(null, subTree, container, anchor)

        if (m) {
          m()
        }

        initialVNode.el = subTree.el

        instance.isMounted = true
      } else {
        let { next, vnode } = instance
        if (!next) {
          next = vnode
        }

        const nextTree = renderComponentRoot(instance)
        const prevTree = instance.subTree
        instance.subTree = nextTree
        patch(prevTree, nextTree, container, anchor)
        next.el = nextTree.el
      }
    }

    const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))

    const update = (instance.update = () => effect.run())

    update()
  }

  const processComment = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载
      newVNode.el = hostCreateComment(newVNode.children)
      hostInsert(newVNode.el, container, anchor)
    } else {
      newVNode.el = oldVNode.el
    }
  }
  const processText = (oldVNode, newVNode, container, anchor) => {
    console.log(oldVNode, newVNode, "oldVNode, newVNode")
    if (oldVNode == null) {
      newVNode.el = hostCreateText(newVNode.children)
      hostInsert(newVNode.el, container, anchor)
    } else {
      const el = (newVNode.el = oldVNode.el!)
      if (newVNode.children !== oldVNode.children) {
        hostSetText(el, newVNode.children)
      }
    }
  }
  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      mountElement(newVNode, container, anchor)
    } else {
      // TODO:更新操作
      patchElement(oldVNode, newVNode)
    }
  }

  const mountElement = (vnode, container, anchor) => {
    // 1.创建 element
    // 2.设置文本
    // 3.设置  props
    // 4.插入
    const { type, props, shapeFlag } = vnode
    const el = (vnode.el = hostCreateElement(type))
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, anchor)
    }

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    hostInsert(el, container, anchor)
  }
  const patchElement = (oldVNode, newVNode) => {
    const el = (newVNode.el = oldVNode.el)

    const oldProps = oldVNode.props || EMPTY_OBJ
    const newProps = newVNode.props || EMPTY_OBJ

    patchChildren(oldVNode, newVNode, el, null)

    patchProps(el, newVNode, oldProps, newProps)
  }

  const mountChildren = (children, container, anchor) => {
    if (isString(children)) {
      children = children.split("")
    }

    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]))
      patch(null, child, container, anchor)
    }
  }

  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    console.log(oldVNode, newVNode, "patchChildren")
    const c1 = oldVNode && oldVNode.children
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
    const c2 = newVNode && newVNode.children

    const { shapeFlag } = newVNode

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO:卸载就子节点
      }

      if (c2 !== c1) {
        // 挂载新子节点的文本
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新节点不是text  旧节点是array
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新节点是array
          // TODO:diff运算
          patchKeyChildren(c1, c2, container, anchor)
        } else {
          // 新节点也不是array
          // TODO:卸载
        }
      } else {
        // 旧节点不是array
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 旧节点是text
          // 新节点不是text
          // 删除旧节点text
          hostSetElementText(container, "")
        }

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 新节点是array
          //TODO: 单独新子节点的挂载
        }
      }
    }
  }

  const patchKeyChildren = (
    oldChildren,
    newChildren,
    container,
    parentAnchor
  ) => {
    let i = 0
    const newChildrenLength = newChildren.length
    let oldChildrenEnd = oldChildren.length - 1
    let newChildrenEnd = newChildren.length - 1

    // 1.自前向后
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[i]
      const newVNode = normalizeVNode(newChildren[i])

      console.log(isSameVNodeType(oldVNode, newVNode), "*********")

      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        break
      }
      i++
    }

    // 2.自后向前
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[oldChildrenEnd]
      const newVNode = newChildren[newChildrenEnd]
      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        break
      }
      oldChildrenEnd--
      newChildrenEnd--
    }

    // 3.common    sequence+mount
    // (a b)
    // (a b) c
    // 新节点多余旧节点时的一个diff比对
    if (i > oldChildrenEnd) {
      if (i <= newChildrenEnd) {
        // 新节点多余旧节点

        // 找新节点插入锚点的位置
        const nextPos = newChildrenEnd + 1
        const anchor =
          nextPos < newChildrenLength ? newChildren[nextPos] : parentAnchor

        while (i <= newChildrenEnd) {
          patch(null, normalizeVNode(newChildren[i]), container, anchor)
          i++
        }
      }
    }

    // 4.common  sequence+unmount
  }

  const patchProps = (el: Element, vnode, oldProps, newProps) => {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const next = newProps[key]
        const prev = oldProps[key]
        if (next !== prev) {
          hostPatchProp(el, key, prev, next)
        }
      }

      if (oldProps !== EMPTY_OBJ) {
        for (let key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode == newVNode) {
      return
    }
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      unmount(oldVNode)
      oldVNode = null
    }
    const { type, shapeFlag } = newVNode
    switch (type) {
      case Text:
        processText(oldVNode, newVNode, container, anchor)
        break
      case Comment:
        processComment(oldVNode, newVNode, container, anchor)
        break
      case Fragment:
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(oldVNode, newVNode, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(oldVNode, newVNode, container, anchor)
        }
    }
  }

  const unmount = (vnode) => {
    hostRemove(vnode.el)
  }
  const render = (vnode, container) => {
    if (vnode === null) {
      // 卸载
      unmount(container._vnode)
    } else {
      patch(container._vnode || null, vnode, container)
    }

    container._vnode = vnode
  }
  return {
    render,
  }
}
