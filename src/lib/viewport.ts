/** iOS standalone PWA: 100dvh / fixed inset короче экрана на safe-area. Нужен 100vh. */

function isIOSStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function installViewportFix() {
  const root = document.documentElement
  const apply = () => {
    if (isIOSStandalone()) {
      root.style.setProperty('--app-height', '100vh')
      root.classList.add('ios-standalone')
    }
  }
  apply()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') apply()
  })
}
