export function isArray(target: unknown) {
  return target && Object.prototype.toString.call(target) === '[object Array]';
}

export function isObject(target: unknown) {
  return target && Object.prototype.toString.call(target) === '[object Object]';
}
