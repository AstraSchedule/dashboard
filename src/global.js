export function getAPISRV() {
  if (import.meta.env.DEV) {
    return 'http://localhost:9001'
  }
  return 'https://sys.getastra.cn'
}
