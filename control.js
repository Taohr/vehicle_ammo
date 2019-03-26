
import {
  Touch as t,
  Point as p,
} from 'util'

export default class Control {
  constructor() {
    this.hasTouchBind = false//有没有触摸的响应
    this.enabled = false
    this.point = null//触摸点
    this.setupTouchHandler()
    this.controlTouchCallback = function (type) { }//触摸回调
  }

  /**
   * 点击
   */
  setupTouchHandler() {
    if (!this.hasTouchBind) {
      this.hasTouchBind = true
      this.touchHandler = this.touchEventHandler.bind(this)
      canvas.addEventListener(t.Start, this.touchHandler)
      canvas.addEventListener(t.End, this.touchHandler)
      canvas.addEventListener(t.Cancel, this.touchHandler)
    }
  }

  touchEventHandler(e) {
    if (!this.enabled) {
      return
    }
    e.preventDefault()
    let touch = e.changedTouches[0]
    let x = touch.clientX
    let y = touch.clientY
    this.point = new p(x, y)
    if (e.type == t.Start) {
      this.controlTouchCallback(t.Start, this.point)
    } else if (e.type == t.End) {
      this.controlTouchCallback(t.End, this.point)
    } else if (e.type == t.Cancel) {
      this.controlTouchCallback(t.End, this.point)
    }
  }

  update() {
    // update here
  }

}

