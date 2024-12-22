export const isArray = (val: any) => {
  return Array.isArray(val)
}

export const isObject = (val: unknown) => {
  return val !== null && typeof val === "object"
}

export const hasChanged = (value: any, oldValue: any): boolean => {
  return !Object.is(value, oldValue)
}

export const isFunction = (val: unknown): val is Function => {
  return typeof val === "function"
}

export const isString = (val: unknown): val is string => {
  return typeof val == "string"
}

export const extend = Object.assign

const onRE = /^on[^a-z]/

export const isOn = (key: string) => onRE.test(key)

export * from "./shapeFlags"
export * from "./normalizeProp"
