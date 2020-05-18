interface List {
  index: number;
  level: number | null;
  ele: Element | null;
  children: List[];
}

interface Params {
  content: string;
  heading?: string[];
  selector?: string;
  scrollHistory?: boolean;
}

interface Generatoc {
  init: ({ content, heading, selector }: Params) => void;
  destroy: () => void;
  refresh: () => void;
}

let tocContent: string = ''
let tocHeader: string = ''
let tocSelector: string = '#toc'

let headingList: List[] = []
let headingNode: NodeListOf<Element>
let extendPageOffset: number = 100
let scrollHistoryConfig: boolean = false

// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ Utils ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

function last (arr: any[]) {
  return arr[arr.length - 1]
}

function praseH (h: string): number {
  return +h.substr(1)
}

function hasClass(elements: HTMLElement, className: string) {
  return !!elements.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"))
}

function addClass(elements: HTMLElement | null, className: string) {
  if(elements && !hasClass(elements, className)) {
    const trimedClass = elements.className.trim()
    elements.className = trimedClass ? trimedClass + " " + className : className
  }
}

function removeClass(elements: HTMLElement | null, className: string) {
  if(elements && hasClass(elements, className)) {
    elements.className = elements.className.replace(new RegExp("(\\s|^)" + className + "(\\s|$)" ), "")
  }
}

function elementOffset(ele: Element) {
  let result = {
    top: 0,
    left: 0
  }
  if (!ele.getClientRects().length) {
    return result
  }
  if (window.getComputedStyle(ele)['display'] === 'none') {
    return result
  }
  result = ele.getBoundingClientRect()
  let document = ele.ownerDocument!.documentElement
  return {
    top: result.top + window.pageYOffset - document.clientTop,
    left: result.left + window.pageXOffset - document.clientLeft
  }
}

function getScrollTop() {
  return window.pageYOffset 
      || document.documentElement.scrollTop  
      || document.body.scrollTop  
      || 0;
}

function lastBranches (k: List[]): List[] {
  if (k.length === 0) {
    return k
  }
  let lastNode: List = last(k)
  let lastArray = k
  while (lastNode.children.length !== 0) {
    lastArray = lastNode.children
    lastNode = last(lastNode.children)
  }
  return lastArray
}

function lastLeaf (k: List[]): List[] {
  let lastLeafNode: List[] = k
  while (lastLeafNode.length !== 0) {
    lastLeafNode = last(lastLeafNode).children
  }
  return lastLeafNode
}

function nestNode (times: number, node: Element, level: number, index: number): List {
  const template: List = {
    index,
    level: null,
    ele: null,
    children: []
  }
  if (times <= 0) {
    template.level = level
    template.ele = node
  } else {
    template.level = level - times
    template.children = [nestNode(--times, node, level, index)]
  }
  return template
}

function getLastHeadingParentOf (level: number, headings: List[], index: number): List {
  let tmp = last(headings)
  let parent = {
    index,
    level: null,
    ele: null,
    children: headings
  }
  while (tmp.level !== level) {
    parent = tmp
    tmp = last(tmp.children)
    if (typeof tmp === 'undefined') {
      break
    }
  }
  return parent
}

function createUl (): HTMLElement {
  return document.createElement('ul')
}

function createLi (content: string | null, index: number): Element {
  const li: Element = document.createElement('li')
  li.setAttribute('style', 'cursor: pointer;')
  const a: Element = document.createElement('a')
  a.setAttribute('data-toc-index', index.toString())
  a.innerHTML = content || ''
  li.appendChild(a)
  return li
}

function hideAllTocSubHeading (element: Element) {
  Array.prototype.forEach.call(element.children, (item: HTMLElement) => {
    removeClass(item.querySelector('li'), 'active')
    const eles = item.querySelectorAll('ul')
    if (eles) {
      Array.prototype.forEach.call(eles, (ele: HTMLElement) => {
        if (ele) {
          removeClass(ele.querySelector('li'), 'active')
          ele.style.transform = 'scaleY(0)'
          ele.style.maxHeight = '0px'
        }
      })
    }
  })
}

function throttle (fn: Function, interval: number = 500) {
  let timer: any = null;
  let firstTime: boolean = true;
  return function (this: any, ...args: any) {
      if (firstTime) {
          fn.apply(this, args);
          return firstTime = false;
      }
      if (timer) {
        // 定时器正在执行中，跳过
          return;
      }
      timer = setTimeout(() => {
          clearTimeout(timer);
          timer = null;
          fn.apply(this, args);
      }, interval);
  };
}

// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ Utils ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ Handle events ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

function handlePageChange () {
  const winScrollTop: number = getScrollTop()
  const docHeight: number = document.body.offsetHeight
  const winHeight: number = window.innerHeight
  const scrollHeight: number = document.body.scrollHeight
  let elem: HTMLElement | null
  let lastElem, lastElemOffset, currentElem

  // If scrolled to the bottom of the page
  if ((winScrollTop >= scrollHeight - winHeight - extendPageOffset) || (winHeight + winScrollTop > docHeight - extendPageOffset)) {
    // TODO
  }

  window.requestAnimationFrame(function() {
    let closestAnchorDistance: number | null = null

    // Stores the index of the closest anchor
    let closestAnchorIdx: number = 0

    let anchorText: string | null = null

    headingNode.forEach((hNode: Element, index: number) => {
      const distance = Math.abs(elementOffset(hNode.nextElementSibling ? hNode.nextElementSibling : hNode).top - winScrollTop)
      if (closestAnchorDistance == null || distance < closestAnchorDistance) {
        closestAnchorDistance = distance;
        closestAnchorIdx = index;
      } else {
          return false;
      }
    })
    anchorText = (<HTMLElement>headingNode[closestAnchorIdx]).innerText
    elem = <HTMLElement>document.querySelector('a[data-toc-index="' + closestAnchorIdx + '"]')!.parentNode!.parentNode
    if (elem) {
      triggerShow(elem)
    }
    addClass(elem.querySelector('li'), 'active')
    if(scrollHistoryConfig && window.location.hash !== "#" + anchorText) {
      window.location.replace("#" + anchorText);
    }
  })
}

function clickEvent (e: Event) {
  e.stopPropagation()
  const element = <HTMLElement>(e.target)
  // addClass(element.parentElement, 'active')
  const index = element.getAttribute('data-toc-index')
  headingNode[+index!].scrollIntoView({ behavior: 'smooth' })
}

function setScrollEvent (element: Element) {
  element.addEventListener('click', clickEvent)
}

function traceParentAndShow (ele: HTMLElement) {
  if (ele.id !== tocSelector.substr(1)) {
    Array.prototype.forEach.call(ele.children, (item: HTMLElement) => {
      if (item.tagName.toLowerCase() === 'ul') {
        item.style.transform = 'scaleY(1)'
        item.style.maxHeight = '200px'
      }
    })
    traceParentAndShow(ele.parentElement!)
  }
}

function showRealUlChildren (element: HTMLElement | Element): HTMLCollection | undefined {
  if (!element || !element.children || element.children.length === 0) {
    return undefined
  }
  if (element.children[0].tagName.toLowerCase() === 'ul') {
    Array.prototype.forEach.call(element.children, (ele: HTMLElement) => {
      if (ele.tagName.toLowerCase() === 'ul') {
        ele.style.transform = 'scaleY(1)'
        ele.style.maxHeight = '200px'
      }
    })
    return showRealUlChildren(element.children[0])
  }
  // (<HTMLElement>element).style.transform = 'scaleY(1)';
  // (<HTMLElement>element).style.height = 'auto'
}

function showEvent (e: Event) {
  e.stopPropagation()
  triggerShow(<HTMLElement>e.target)
}

function setShowEvent (element: HTMLElement) {
  element.addEventListener('click', showEvent)
}

// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ Handle events ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ Handle elements ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

function triggerShow (element: HTMLElement) {
  hideAllTocSubHeading(document.querySelector(tocSelector)!)
  showRealUlChildren(element.parentElement!.parentElement!.children[1])
  traceParentAndShow(element)
}

function constructElements (item: List) {
  const ul = createUl()
  if (item.ele) {
    const li = createLi(item.ele.textContent, item.index)
    setScrollEvent(li)
    setShowEvent(ul)
    ul.append(li)
  }
  if (item.children.length > 0) {
    item.children.forEach((subHead: List) => {
      ul.append(constructElements(subHead))
    })
  }
  return ul
}

function processNode (node: Element, preNode: Element | null, heading: List[], index: number) {
  const curHeadLevel: number = praseH(node.localName)
  const preHeadLevel: number = preNode ? praseH(preNode.localName) : 0

  const item: List = {
    index,
    level: curHeadLevel,
    ele: null,
    children: []
  }
  // If heading level same as previous, append it to previous parent node.
  // 如果层级相同, 找到前一 tag 的父节点 append 这节点
  if (curHeadLevel === preHeadLevel) {
    item.ele = node
    item.level = curHeadLevel
    lastBranches(heading).push(item)
  } else if (curHeadLevel > preHeadLevel) {
    // If current heading level is lower than previous heading level,
    // find the parent of the last leaf of heading node and append it.
    const distance: number = curHeadLevel - preHeadLevel
    lastLeaf(heading).push(
      nestNode(distance - 1, node, curHeadLevel, index)
    )
  } else {
    item.ele = node
    // Find parent node of the last same level and append it
    // 找到最后一个同一层级的父节点 append 上当前节点
    getLastHeadingParentOf(curHeadLevel, heading, index).children.push(item)
  }
}

function renderToc () {
  const tocElement: Element | null = document.querySelector(tocSelector)
  if (tocElement === null) {
    // eslint-disable-next-line no-console
    console.log('Toc element not found!')
    return
  }
  if (!headingList[0]) {
    return
  }
  headingList[0].index = -1
  Array.prototype.forEach.call(headingList[0].children, (item: List) => {
    tocElement!.appendChild(constructElements(item))
  })
  window.addEventListener("scroll" , throttle(handlePageChange), false);
}

// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ Handle elements ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

const generatoc: Generatoc = {
  init ({
    content,
    heading = ['h2', 'h3', 'h4', 'h5'],
    selector = '#toc',
    scrollHistory = false,
  }: Params) {
    tocSelector = selector
    tocHeader = heading.join(',')
    tocContent = content
    scrollHistoryConfig = scrollHistory
    const postCotent = document.querySelector(tocContent)
    if(!postCotent) {
      return
    }
    headingNode = postCotent.querySelectorAll(tocHeader)
    let previousNode: Element | null
    headingNode.forEach((hNode: Element, index: number) => {
      previousNode = index === 0 ? null : headingNode[index - 1]
      processNode(hNode, previousNode, headingList, index)
    })
    renderToc()
  },
  destroy () {
    const tocElement = document.querySelector(tocSelector)
    if (!tocElement) {
      return
    }
    tocElement.querySelectorAll('ul')
      .forEach((ulNode: Element) => {
        ulNode.removeEventListener('click', showEvent)
      })
    tocElement.querySelectorAll('li')
      .forEach((liNode: Element) => {
        liNode.removeEventListener('click', clickEvent)
      })
    headingList = []
    tocElement.innerHTML = ''
    window.removeEventListener("scroll" , handlePageChange);
  },
  refresh () {
    generatoc.destroy()
    generatoc.init({
      content: tocContent,
      heading: tocHeader.split(','),
      selector: tocSelector
    })
  }
}

export default generatoc
