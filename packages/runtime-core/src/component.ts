import { reactive } from "@vue/reactivity"
import { isObject } from "@vue/shared"
import { onBeforeMount, onMounted } from "./apiLifecycle"

export const enum LifecycleHooks {
  BEFORE_CREATE = "bc",
  CREATE = "c",
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
}

let uid = 0
export function createComponentInstance(vnode) {
  const type = vnode.type
  const instance = {
    uid: uid++,
    vnode,
    type,
    subTree: null,
    effect: null,
    update: null,
    render: null,
    isMounted: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
  }

  return instance
}

export function setupComponent(instance) {
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  finishComponentSetup(instance)
}

export function finishComponentSetup(instance) {
  const Component = instance.type
  instance.render = Component.render

  applyOptions(instance)
}

function applyOptions(instance) {
  const {
    data: dataOptions,
    beforeCreate,
    created,
    beforeMount,
    mounted,
  } = instance.type
  if (beforeCreate) {
    callHook(beforeCreate, instance.data)
  }
  if (dataOptions) {
    const data = dataOptions()
    if (isObject(data)) {
      instance.data = reactive(data)
    }
  }
  if (created) {
    callHook(created, instance.data)
  }

  function registerLifecycleHook(register: Function, hook?: Function) {
    register(hook?.bind(instance.data), instance)
  }

  registerLifecycleHook(onBeforeMount, beforeMount)
  registerLifecycleHook(onMounted, mounted)
}

function callHook(hook: Function, proxy) {
  hook.bind(proxy)()
}
