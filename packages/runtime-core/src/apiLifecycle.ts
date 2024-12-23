import { LifecycleHooks } from "./component"
export function injectHook(type: LifecycleHooks, hook: Function, target: any) {
  if (target) {
    target[type] = hook
    return hook
  }
}

export const createHook = (lifecycle: LifecycleHooks) => {
  return (hook, target) => injectHook(lifecycle, hook, target)
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_CREATE)

export const onMounted = createHook(LifecycleHooks.MOUNTED)
