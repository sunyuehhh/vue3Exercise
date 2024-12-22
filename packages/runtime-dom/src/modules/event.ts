export function patchEvent(
  el: Element & { _vei?: Object },
  rawName: string,
  prevValue: any,
  nextValue: any
) {
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue
  } else {
    const name = parseName(rawName)
    if (nextValue) {
      // map里面找不到  nextValue有值  创建
      const invoker = (invokers[rawName] = createInvoker(nextValue))
      el.addEventListener(name, invoker)
    } else {
      // nextValue没有值  就删除
      el.removeEventListener(name, existingInvoker)
      invokers[rawName] = undefined
    }
  }
}

function parseName(name: string) {
  return name.slice(2).toLowerCase()
}

function createInvoker(initialValue) {
  const invoker = (e: Event) => {
    invoker.value && invoker.value()
  }

  invoker.value = initialValue
  return invoker
}
