/**
* Copyright (c) 2022 - present TinyVue Authors.
* Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
*
* Use of this source code is governed by an MIT-style license.
*
* THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
* BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
* A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
*
*/

import { addClass, removeClass, on, off } from '@opentiny/vue-renderless/common/deps/dom'

const setLinkList = ({ props, state }) => {
  JSON.stringify(props.links, (key, val) => {
    if (key === 'link' && typeof val === 'string') {
      state.linkList = [...state.linkList, val]
    }
    return val
  })
}

const setFixAnchor = ({ vm }) => {
  const { anchorRef } = vm.$refs
  if (anchorRef) {
    anchorRef.style.position = 'fixed'
    anchorRef.style.top = anchorRef.offsetTop
  }
}

// const setScrollContainer = (api) => {
//   const container = api.getContainer()
//   addClass(container, 'tiny-anchor-scroll-container')
// }

const updateSkidPosition = ({ vm, state }) => {
  const activeEl = document.querySelector(`a[href='${state.currentLink}']`)
  const { skidRef, maskRef, anchorRef } = vm.$refs

  if (!activeEl || !anchorRef) {
    return
  }

  const { offsetHeight, offsetWidth } = activeEl
  const { top: linkTitleClientTop, left: linkTitleClientLeft } = activeEl.getBoundingClientRect()
  const { top: anchorClientTop, left: anchorClientLeft } = anchorRef.getBoundingClientRect()

  const offsetTop = linkTitleClientTop - anchorClientTop
  const offsetLeft = linkTitleClientLeft - anchorClientLeft
  addClass(skidRef, 'tiny-anchor-orbit-skid--active')
  skidRef.style.top = `${offsetTop}px`
  skidRef.style.height = `${offsetHeight}px`
  if (maskRef) {
    maskRef.style.top = `${offsetTop}px`
    maskRef.style.height = `${offsetHeight}px`
    maskRef.style.maxWidth = `${offsetWidth + offsetLeft}px`
  }
}

const getCurrentAnchor = ({ vm, state, currentLink }) => {
  state.currentLink = currentLink.link
  updateSkidPosition({ vm, state })
}

const easeInFunc = ({ begin, t, x }) => begin + (t / 2) * x * x * x

const easeOutFunc = ({ begin, t, x }) => begin + t * (2 + x * x * x)

const easeInOutFunc = ({ curtime, begin, end, duration }) => {
  const t = (end - begin) / 2
  let x = curtime * 2 / duration
  if (x < 1) {
    return easeInFunc({ begin, t, x })
  } else {
    x -= 2
    return easeOutFunc({ begin, t, x })
  }
}

const scrollTo = ({ state, offsetTop, scrollTop, currentContainer }) => {
  const startTime = Date.now()
  const duration = 400
  const delay = state.delay + 20
  let timer = null

  const swipeFunc = () => {
    const endTime = Date.now()
    const time = endTime - startTime
    const curtime = time > duration ? duration : time
    const begin = scrollTop
    const end = offsetTop
    const swipeScrollTop = easeInOutFunc({ curtime, begin, end, duration })
    currentContainer.scrollTop = swipeScrollTop

    if (time < duration) {
      timer = setTimeout(() => {
        swipeFunc()
      }, 20)
    } else {
      timer = setTimeout(() => {
        state.isScrolling = false
        clearTimeout(timer)
        timer = null
      }, delay)
    }
  }
  swipeFunc()
}

const getOffsetTopBottom = ({ props, linkEl }) => {
  const { top: linkElTop, bottom: linkElBottom } = linkEl.getBoundingClientRect()
  const container = props.setContainer()
  if (!container || container === window.document) {
    return { top: linkElTop, bottom: linkElBottom }
  }

  const { top: containerTop } = container.getBoundingClientRect()
  const top = linkElTop - containerTop
  const bottom = linkElBottom - containerTop
  return { top, bottom }
}

export const getContainer = ({ props }) => () => props.setContainer() || window.document

export const setVisibleDivide = ({ props, state }) => () => {
  const container = props.setContainer()
  if (container && container !== window.document) {
    state.visibleDivide = container.clientHeight / 3
  } else {
    state.visibleDivide = document.documentElement.clientHeight / 3
  }
}

export const mounted = ({ vm, props, state, api }) => () => {
  state.scrollContainer = api.getContainer()
  setLinkList({ props, state })
  setFixAnchor({ vm })
  // setScrollContainer(api)
  state.scrollEvent = on(state.scrollContainer, 'scroll', api.debounceMouseScroll)
  api.debounceMouseScroll()
  api.setVisibleDivide()
}

export const updated = ({ state, api }) => () => {
  if (state.scrollEvent) {
    const currentContainer = api.getContainer()
    if (state.scrollContainer !== currentContainer) {
      state.scrollEvent = off(state.scrollContainer, 'scroll', api.debounceMouseScroll)
      state.scrollContainer = currentContainer
      state.scrollEvent = on(state.scrollContainer, 'scroll', api.debounceMouseScroll)
      api.debounceMouseScroll()
      api.setVisibleDivide()
    }
  }
}

export const unmounted = ({ state, api }) => () => {
  state.scrollEvent = off(state.scrollContainer, 'scroll', api.debounceMouseScroll)
}

export const debounceMouseScroll = ({ vm, state, props }) => () => {
  if (state.isScrolling) {
    state.isScrolling = false
    return
  }

  let currentLink = null
  const linkListPosition = []
  state.linkList.forEach(link => {
    const linkEl = document.querySelector(link)
    const { top, bottom } = getOffsetTopBottom({ props, linkEl })
    linkListPosition.push({
      link,
      top,
      bottom
    })
  })
  currentLink = linkListPosition[0]
  for (let i = 1; i < linkListPosition.length; i++) {
    if (linkListPosition[i].top <= state.visibleDivide && linkListPosition[i].bottom >= state.visibleDivide) {
      currentLink = linkListPosition[i]
    }
  }

  getCurrentAnchor({ vm, state, currentLink })
}

export const linkClick = ({ state, vm, props, api, emit }) => (e, item) => {
  emit('linkClick', e)
  if (state.isScrolling) {
    return
  }

  const container = props.setContainer()
  state.currentLink = item.link
  updateSkidPosition({ vm, state })

  if (container && container !== window.document) {
    const LinkEl = container.querySelector(item.link)
    LinkEl && api.handleScroll()
  } else {
    state.isScrolling = true
  }
}

export const handleScroll = ({ state, api }) => () => {
  const currentContainer = api.getContainer()
  if (state.currentLink) {
    state.isScrolling = true
    const activeContentEl = currentContainer.querySelector(`${state.currentLink}`)
    addClass(activeContentEl, 'is-current')
    setTimeout(() => {
      removeClass(activeContentEl, 'is-current')
    }, 1000)
    const scrollTop = currentContainer.scrollTop
    const { offsetTop } = activeContentEl
    scrollTo({ state, api, offsetTop, scrollTop, currentContainer })
  }
}
