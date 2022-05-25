import { queryAll } from '../query'

export class VirtualKeyboardElement extends HTMLMenuElement {
  static get observedAttributes() {
    return ['state']
  }

  keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
  
  keyEvent = (button: HTMLButtonElement) => {
    this.dispatchEvent(
      new KeyboardEvent('pressed', {
        bubbles: true,
        composed: true,
        key: button.value,
      })
    )
  }

  private _state: VKState = 'disabled'
  set state(value) {
    this._state = value
  }
  get state() {
    return this._state
  }

  private addKey(key: string) {
    const li = document.createElement('li')
    const em = document.createElement('em')
    const button = document.createElement('button')
    em.textContent = key
    button.value = key

    button.appendChild(em)
    li.appendChild(button)

    return { li, button }
  }

  connectedCallback() {
    this.keys.forEach((key) => {
      const { li, button } = this.addKey(key)

      this.appendChild(li)

      button.onclick = () => {
        this.keyEvent(button)
      }
    })

    this.checkOnStateChange(this.state)
  }

  attributeChangedCallback(
    name: keyof this,
    oldValue: VKState,
    newValue: VKState
  ) {
    if (name === 'state' && newValue !== oldValue) {
      this.checkOnStateChange(newValue)
    }
  }

  checkOnStateChange(value: VKState) {
    const buttons = queryAll('button', this)
    buttons.forEach((button) => {
      button.disabled = value === 'disabled'
    })
  }

  disconnectedCallback() {
    queryAll('button').forEach((button) => {
      button.removeEventListener('click', () => {
        this.keyEvent(button)
      })
    })
  }
}

const tagName = 'virtual-keyboard'
const element = VirtualKeyboardElement
const options = { extends: 'menu' }

customElements.define(tagName, element, options)
