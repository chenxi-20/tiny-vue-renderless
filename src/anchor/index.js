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

import { addClass, removeClass } from '@opentiny/vue-renderless/common/deps/dom'


const setFixAnchor = ({ vm }) => {
  const { anchorRef } = vm.$refs
  if (anchorRef) {
    anchorRef.style.position = 'fixed'
    anchorRef.style.top = anchorRef.offsetTop
  }
}

const setMarkClass = ({ state, props }) => {
  const { scrollContainer } = state
  const { markClass } = props
  const activeContentEl = scrollContainer.querySelector(`${state.currentLink}`)
  if (markClass) {
    addClass(activeContentEl, markClass)
    setTimeout(() => {
      removeClass(activeContentEl, markClass)
    }, 1000)
  }
}

const setScrollContainer = ({ state, api, cb = null }) => {
  const currentContainer = api.getContainer()
  const { scrollContainer } = state
  if (scrollContainer !== currentContainer) {
    removeClass(scrollContainer, 'tiny-anchor-scroll-container')
    state.scrollContainer = currentContainer
    addClass(currentContainer, 'tiny-anchor-scroll-container')
    cb && cb()
  }
}

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

const getCurrentAnchor = ({ vm, state, link }) => {
  state.currentLink = link
  updateSkidPosition({ vm, state })
}

const addObserver = ({ props, state }) => {
  const { links } = props
  const { intersectionObserver } = state
  const observer = (list) => {
    list.forEach(item => {
      const link = item.link
      if (item.children) {
        observer(item.children)
      } else {
        const linkEl = document.querySelector(link)
        linkEl && intersectionObserver.observe(linkEl)
      }
    })
  }
  observer(links)

}

const setCurrentHash = (state) => {
  if (state.currentHash !== location.hash) {
    state.currentHash = location.hash
    return true
  }
  return false
}


export const getContainer = ({ props }) => () => props.containerId ? document.querySelector(props.containerId) : document.body

export const mounted = ({ vm, state, api }) => () => {
  setScrollContainer({ state, api })
  setFixAnchor({ vm })
  api.onItersectionObserver()
  setCurrentHash(state)
}

export const updated = ({ state, api }) => () => {
  const cb = api.onItersectionObserver
  setScrollContainer({ state, api, cb })
}

export const unmounted = ({ state }) => () => {
  const { intersectionObserver } = state
  intersectionObserver.disconnect()
}

export const onItersectionObserver = ({ vm, state, props }) => () => {

  state.intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(item => {
      const key = item.target.id
      state.observerLinks[key] = item
    })

    for (let item of Object.values(state.observerLinks)) {
      if (item.isIntersecting && item.intersectionRatio > 0) {
        const link = `#${item.target.id}`
        getCurrentAnchor({ vm, state, link })
        break
      }
    }
  })

  addObserver({ props, state })
}


export const linkClick = ({ state, vm, emit, props }) => (e, item) => {
  const { link, title } = item
  const emitLink = { link, title }
  emit('linkClick', e, emitLink)

  const isChangeHash = setCurrentHash(state)
  const { scrollContainer } = state
  state.currentLink = link
  updateSkidPosition({ vm, state })
  setMarkClass({ state, props })

  if (scrollContainer !== document.body && !isChangeHash) {
    const linkEl = scrollContainer.querySelector(item.link)
    const top = linkEl.offsetTop
    const param = { top, left: 0, behavior: 'smooth' }
    scrollContainer.scrollTo(param)
  }
}
