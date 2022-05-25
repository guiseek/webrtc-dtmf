/// <reference types="vite/client" />

type VKState = 'disabled' | 'enabled'

class VirtualKeyboardElement extends HTMLMenuElement {
  keyEvent: (button: HTMLButtonElement) => void
  keys: string[]
  state: VKState
  connectedCallback(): void
  disconnectedCallback(): void
}

interface HTMLElementTagNameMap {
  'menu[is="virtual-keyboard"]': VirtualKeyboardElement
}
interface HTMLElementEventMap {
  pressed: KeyboardEvent
}
