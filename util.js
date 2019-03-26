
class Point {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }
}

/**
 * 触摸事件
 */
let Touch = {
  Start: 'touchstart',
  Move: 'touchmove',
  End: 'touchend',
  Cancel: 'touchcancel',
}

export {
  Point,
  Touch
}
