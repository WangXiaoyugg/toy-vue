export class ToyVue {
  constructor(options) {
    this.template = document.querySelector(options.el)
    this.data = reactive(options.data)
    for (let name in options.methods) {
      this[name] = () => {
        options.methods[name].apply(this.data)
      }
    }
    this.traverse(this.template)
  }
  traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
        let name = RegExp.$1.trim()
        effect(() => node.textContent = this.data[name])
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (let attribute of node.attributes) {
        if (attribute.name === 'v-model') {
          let name = attribute.value;
          effect(() => node.value = this.data[name])
          node.addEventListener('input', event => {
            this.data[name] = node.value
          })
        }

        if (attribute.name.match(/^v-bind:([\s\S]+)$/)) {
          let attrName = RegExp.$1;
          let name = attribute.value;
          effect(() => node.setAttribute(attrName, this.data[name]))
        }
        if (attribute.name.match(/^v-on:([\s\S]+)$/)) {
          let eventName = RegExp.$1;
          let fnName = attribute.value;
          node.addEventListener(eventName, this[fnName])
        }
      }
    }

    if (node.childNodes && node.childNodes.length) {
      for (let child of node.childNodes) {
        this.traverse(child)
      }
    }
  }
}

let effects = new Map;
let currentEffect = null
function effect(fn) {
  currentEffect = fn
  fn()
  currentEffect = null
}

function reactive(obj) {
  const observed = new Proxy(obj, {
    get(obj, key) {
      if (currentEffect) {
        if (!effects.has(obj)) {
          effects.set(obj, new Map)
        }
        if (!effects.get(obj).has(key)) {
          effects.get(obj).set(key, new Array)
        }
        effects.get(obj).get(key).push(currentEffect)
      }
      return obj[key]
    },
    set(obj, key, value) {
      obj[key] = value;
      if (effects.has(obj) && effects.get(obj).has(key)) {
        for (let effect of effects.get(obj).get(key)) {
          effect()
        }
      }
      return value
    }
  })
  return observed;
}



