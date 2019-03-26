let THREE = require('./three/three')
// import './three/three.js'

import {
  Touch as t,
} from 'util'
import Control from 'control'

export default class game3d {
  constructor() {
    // 场景
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // webGL渲染器
    this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true 
    });
    this.renderer.shadowMapEnabled = true;  
    
    this.light = new THREE.AmbientLight(0xffffff);
    this.scene.add(this.light);

    this.setupControl();

    this.initVariables();

    this.start();
  }
  start() {
    // 在场景中添加雾的效果；样式上使用和背景一样的颜色
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene.add(this.createCube());
    this.scene.add(this.createGround());
    this.camera.position.z = 20;
    this.camera.position.y = 5;
    window.requestAnimationFrame(this.loop.bind(this), canvas);
  }
  createCube() {
    var geometry = new THREE.CubeGeometry(2, 1, 4);
    // 加载纹理贴图
    var texture = new THREE.TextureLoader().load("images/metal.jpg");
    var material = new THREE.MeshBasicMaterial({ map: texture, color: 0xFF0000 });
    let cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.position.y = 0.51;
    this.cube = cube;
    return cube;
  }
  createGround() {
    var geometry = new THREE.CubeGeometry(2000, 0.1, 2000);
    var texture = new THREE.TextureLoader().load("images/metal.jpg");
    var material = new THREE.MeshBasicMaterial({ map: texture});
    let cube = new THREE.Mesh(geometry, material);
    return cube;
  }
  setupControl() {
    this.control = new Control();
    this.control.controlTouchCallback = this.controlTouchCallback.bind(this);
    this.control.enabled = true;
  }
  controlTouchCallback(type, point) {
    let x = point.x;
    let y = point.y;
    if (y < canvas.height - 100) {
      return;
    }
    var left = false;
    var right = false;
    var dir = 0;
    var drift = false;

    if (type == t.Start) {
      if (x < canvas.width / 3) {
        left = true;
      } else if (x < canvas.width / 3 * 2) {
        right = true;
      } else {
        drift = true;
      }
    } else if (type == t.End) {
      if (x < canvas.width / 3) {
        left = false;
      } else if (x < canvas.width / 3 * 2) {
        right = false;
      } else {
        drift = false;
      }
    }
    if (left) {
      dir = 1;
    }
    if (right) {
      dir = -1;
    }
    this.dir = dir;
    this.drift = drift;
  }
  initVariables() {
    this.dir = 0;//转弯
    this.drift = false;//漂移
  }
  update() {
    this.control.update();

    // cube.rotation
    this.drift = 0;
    let dir_step = 0.02;
    let dir_scale = this.drift ? 2 : 1;
    var dir_real = this.cube.rotation.y;
    dir_real += (this.dir * dir_step * dir_scale);
    this.cube.rotation.y = dir_real;

    let pos = this.cube.position;
    let rot = this.cube.rotation.y;
    // cube.position
    this.cube.position.x += Math.sin(rot) * -0.1;
    this.cube.position.z += Math.cos(rot) * -0.1;
    // this.cube.position.set(pos.x, pos.y, pos.z);

    // camera
    this.camera.rotation.y = rot;
    this.camera.position.x = this.cube.position.x + Math.sin(rot) * 20;
    this.camera.position.z = this.cube.position.z + Math.cos(rot) * 20;
  }
  loop() {
    this.update();
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(this.loop.bind(this), canvas);
  }
}

