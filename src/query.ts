import { AttributeSelector, ClassSelector, IdSelector } from './types/selectors'

export function query<Tag extends keyof SVGElementTagNameMap>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement?: HTMLElement
): SVGElementTagNameMap[Tag]

export function query<Tag extends keyof HTMLElementTagNameMap>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement?: HTMLElement
): HTMLElementTagNameMap[Tag]

export function query<
  Tag extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap
>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement: HTMLElement | SVGElement = document.body
) {
  return parentElement.querySelector(selector)
}

export function queryAll<Tag extends keyof SVGElementTagNameMap>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement?: HTMLElement
): NodeListOf<SVGElementTagNameMap[Tag]>

export function queryAll<Tag extends keyof HTMLElementTagNameMap>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement?: HTMLElement
): NodeListOf<HTMLElementTagNameMap[Tag]>

export function queryAll<
  Tag extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap
>(
  selector: Tag | AttributeSelector | ClassSelector | IdSelector,
  parentElement: HTMLElement | SVGElement = document.body
) {
  return parentElement.querySelectorAll(selector)
}
