import { isArray } from "@vue/shared"
import { createDep, Dep } from "./dep"
import { ComputedRefImpl } from "./computed"
export type EffectScheduler = (...args: any[]) => any
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export function effect<T = any>(fn: () => T) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

export let activeEffect: ReactiveEffect | undefined
export class ReactiveEffect<T = any> {
  computed?: ComputedRefImpl<T>
  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}

  run() {
    activeEffect = this
    return this.fn()
  }
}
/**
 * 收集依赖
 * @param target
 * @param key
 */
export function track(target: object, key: unknown) {
  console.log("收集依赖", target, key)
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  trackEffects(dep)
}
export function trackEffects(dep: Dep) {
  dep.add(activeEffect!)
}
/**
 * 触发依赖
 * @param target
 * @param key
 * @param value
 */
export function trigger(target: object, key: unknown, newValue: unknown) {
  console.log("触发依赖", target, key, newValue)
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }

  const dep: Dep | undefined = depsMap.get(key)
  if (!dep) {
    return
  }
  triggerEffects(dep)
}

/**
 * 依次触发 dep 总保存的依赖
 * @param dep
 */
export function triggerEffects(dep: Dep) {
  const effects = isArray(dep) ? dep : [...dep]
  // 依次触发依赖
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect)
    }
    if (!effect.computed) {
      triggerEffect(effect)
    }
  }
}
/**
 * 触发指定依赖
 * @param effect
 */
export function triggerEffect(effect: ReactiveEffect) {
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}
