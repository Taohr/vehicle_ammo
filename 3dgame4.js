/*
 html,赛车
 */

class game3d {
  constructor(container) {
    this.container = container;
    this.init();
  }
  init() {
    // Heightfield parameters
    this.terrainWidthExtents = 300;
    this.terrainDepthExtents = 300;
    this.terrainWidth = 128;
    this.terrainDepth = 128;
    this.terrainHalfWidth = this.terrainWidth / 2;
    this.terrainHalfDepth = this.terrainDepth / 2;
    // Graphics variables
    this.clock = new THREE.Clock();

    // bullet内置宏
    this.DISABLE_DEACTIVATION = 4;
    this.TRANSFORM_AUX = new Ammo.btTransform();
    this.ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

    // 车辆系统辅助
    // 车辆系统用syncList保存事件列表,不再使用rigidBodies变量.存放用于绘制和同步物理场景的方法
    this.syncList = []; 
    // Control variables
    this.dir = 0;
    this.dir_real = 0;
    this.drift = false;
    this.controlling = false;
    // Physics variables
    this.dynamicObjects = [];
    this.transformAux1 = new Ammo.btTransform();
    this.time = 0;
    this.objectTimePeriod = 1;
    this.timeNextSpawn = this.time + this.objectTimePeriod;
    this.maxNumObjects = 30;
  }

  load(progress, complete) {
    this.queue = new createjs.LoadQueue(true);
    if (progress) {
      this.queue.on("progress", progress, this);
    }
    if (complete) {
      this.queue.on("complete", complete, this);
    }
    this.queue.load();
  }

  ready() {
    this.initGraphics();
    this.initPhysics();
    this.generateCar();
    this.bindKeyHandler();
    this.start();
  }

  initGraphics() {
    // renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,//不抗锯齿,但会高效
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.container.appendChild(this.renderer.domElement);

    // scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xbfd1e5 );

    // camera
    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    this.camera.position.y = 20;
    this.camera.position.z = this.terrainDepthExtents / 10;
    this.camera.lookAt( 0, 0, 0 );

    // ground
    var geometry = new THREE.PlaneBufferGeometry( this.terrainWidthExtents, this.terrainDepthExtents, this.terrainWidth - 1, this.terrainDepth - 1 );
    geometry.rotateX( - Math.PI / 2 );
    geometry.computeVertexNormals();
    var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xC7C7C7 } );
    let terrainMesh = new THREE.Mesh( geometry, groundMaterial );
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    this.scene.add( terrainMesh );
    var textureLoader = new THREE.TextureLoader();
    let alias = this;
    textureLoader.load( "textures/grid.png", function ( texture ) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(alias.terrainWidth - 1, alias.terrainDepth - 1 );
      groundMaterial.map = texture;
      groundMaterial.needsUpdate = true;
    });

    // light
    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 100, 100, 50 );
    light.castShadow = true;
    var dLight = 200;
    var sLight = dLight * 0.25;
    light.shadow.camera.left = - sLight;
    light.shadow.camera.right = sLight;
    light.shadow.camera.top = sLight;
    light.shadow.camera.bottom = - sLight;
    light.shadow.camera.near = dLight / 30;
    light.shadow.camera.far = dLight;
    light.shadow.mapSize.x = 1024 * 2;
    light.shadow.mapSize.y = 1024 * 2;
    this.scene.add( light );
  }

  initPhysics() {
    // Physics configuration
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    let dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    let broadphase = new Ammo.btDbvtBroadphase();
    let solver = new Ammo.btSequentialImpulseConstraintSolver();
    // Physics world
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    this.physicsWorld.setGravity( new Ammo.btVector3( 0, -9.8, 0 ) );
    // Create the terrain body
    var groundShape = this.createTerrainShape();
    var groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    // Shifts the terrain, since bullet re-centers it on its bounding box.
    groundTransform.setOrigin( new Ammo.btVector3( 0, 0, 0 ) );
    var groundMass = 0;
    var groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
    var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
    var groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
    this.physicsWorld.addRigidBody( groundBody );
  }
  createTerrainShape() {
    // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
    var heightScale = 1;
    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    var upAxis = 1;
    // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    var hdt = "PHY_FLOAT";
    // Set this to your needs (inverts the triangles)
    var flipQuadEdges = false;
    // Creates height data buffer in Ammo heap
    let ammoHeightData = Ammo._malloc( 4 * this.terrainWidth * this.terrainDepth );
    // Creates the heightfield physics shape
    var heightFieldShape = new Ammo.btHeightfieldTerrainShape(
      this.terrainWidth,
      this.terrainDepth,
      ammoHeightData,
      heightScale,
      0,
      0,
      upAxis,
      hdt,
      flipQuadEdges
    );
    // Set horizontal scale
    var scaleX = this.terrainWidthExtents / ( this.terrainWidth - 1 );
    var scaleZ = this.terrainDepthExtents / ( this.terrainDepth - 1 );
    heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );
    heightFieldShape.setMargin( 0.05 );
    return heightFieldShape;
  }
  generateCar() {
    // Box
    let sx = 2;
    let sy = 1;
    let sz = 4;
    let margin = 0.05;
    let objectSize = 3;
    this.car = new THREE.Mesh( new THREE.BoxBufferGeometry( sx, sy, sz, 4, 4, 4 ), this.createObjectMaterial() );
    let shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
    shape.setMargin( margin );
    this.car.position.set( 0, sy/2, 0);
    let mass = objectSize * 5;
    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    shape.calculateLocalInertia( mass, localInertia );
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    let pos = this.car.position;
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    let motionState = new Ammo.btDefaultMotionState( transform );
    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );
    this.car.userData.physicsBody = body;
    this.car.receiveShadow = true;
    this.car.castShadow = true;
    this.scene.add( this.car );
    this.dynamicObjects.push( this.car );
    this.physicsWorld.addRigidBody( body );
    this.createBox();
  }
  createBox(pos, quat, w, l, h, mass, friction) {
    var material = this.createObjectMaterial();
    var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    var geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));
    if(!mass) mass = 0;
    if(!friction) friction = 1;
    var mesh = new THREE.Mesh(shape, material);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    scene.add( mesh );
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(mass, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
    body.setFriction(friction);

    physicsWorld.addRigidBody(body);
    if (mass > 0) {
      body.setActivationState(this.DISABLE_DEACTIVATION);
      // 同步物理场景和绘图空间
      function sync(dt) {
        var ms = body.getMotionState();
        if (ms) {
          ms.getWorldTransform(this.TRANSFORM_AUX);
          var p = this.TRANSFORM_AUX.getOrigin();
          var q = this.TRANSFORM_AUX.getRotation();
          mesh.position.set(p.x(), p.y(), p.z());
          mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
      }
      syncList.push(sync);
    }
  }
  createObjectMaterial() {
    var c = Math.floor( Math.random() * ( 1 << 24 ) );
    return new THREE.MeshPhongMaterial( { color: c } );
  }
  bindKeyHandler() {
    let alias = this;
    this.lastKey = '';
    function pressA() {
      alias.lastKey = 'a';
    }
    function pressD() {
      alias.lastKey=  'd';
    }
    key('a', pressA);
    key('d', pressD);
  }
  start() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    window.requestAnimationFrame( this.loop.bind(this));
  }
  update() {
    var deltaTime = this.clock.getDelta();
    this.updateControl();
    // this.updateCamera();
    this.updatePhysics( deltaTime );
    // TWEEN.update();
    this.renderer.render( this.scene, this.camera );
    this.time += deltaTime;
  }
  loop() {
    this.update();
    this.renderer.render( this.scene, this.camera );
    window.requestAnimationFrame( this.loop.bind(this) );
  }
  updatePhysics( deltaTime ) {
    this.physicsWorld.stepSimulation( deltaTime, 10 );
    // Update objects
    for ( var i = 0, il = this.dynamicObjects.length; i < il; i ++ ) {
      var objThree = this.dynamicObjects[ i ];
      var objPhys = objThree.userData.physicsBody;

      // var ms = objPhys.getMotionState();
      // if ( ms ) {
      //   ms.getWorldTransform( this.transformAux1 );
      //   var p = this.transformAux1.getOrigin();
      //   var q = this.transformAux1.getRotation();
      //   objThree.position.set( p.x(), p.y(), p.z() );
      //   objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
      // }

      var transform = objPhys.getCenterOfMassTransform();
      var p = transform.getOrigin();
      var q = transform.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
  updateControl() {
    if (this.controlling) {
      return;
    }
    let key_a = key.isPressed("A");
    let key_d = key.isPressed("D");
    let key_j = key.isPressed("J");

    this.dir = 0;
    this.drift = false;

    if (key_a && !key_d) {
      this.dir = -1;
    } else if (!key_a && key_d) {
      this.dir = 1;
    } else if (key_a && key_d) {
      if (this.lastKey == 'a') {
        this.dir = -1;
      } else if (this.lastKey == 'd') {
        this.dir = 1;
      }
    } else {
      this.lastKey = '';
    }
    if (key_j) {
      this.drift = true;
    }

    if (this.dir == 0 && this.drift == false) {
      return;
    }
    let dir_step = Math.PI / 2 / 5;
    let dir_scale = this.drift ? 2 : 1;
    let dir_real = (this.dir * dir_step * dir_scale);
    this.dir_real += dir_real;
    let physicsBody = this.car.userData.physicsBody;
    let transform = physicsBody.getCenterOfMassTransform();
    let quaternion = new Ammo.btQuaternion( 0, 1, 0, this.dir_real );
    transform.setRotation( quaternion );
    console.log('dir = ' + this.dir_real.toFixed(4));

    // let q = this.car.quaternion;
    // console.log(q.x.toFixed(2), q.y.toFixed(2), q.z.toFixed(2), q.w.toFixed(2));
    // let r = this.car.rotation;
    // console.log(r.x.toFixed(2), r.y.toFixed(2), r.z.toFixed(2));

  }
  updateCamera() {
    let pos = this.car.position;
    let rot = this.car.rotation.y;
    // position
    this.car.position.x += Math.sin(rot) * -0.1;
    this.car.position.z += Math.cos(rot) * -0.1;
    this.car.position.set(pos.x, pos.y, pos.z);

    // camera
    this.camera.rotation.y = rot;
    this.camera.position.x = this.car.position.x + Math.sin(rot) * 20;
    this.camera.position.z = this.car.position.z + Math.cos(rot) * 20;
  }

  vector(p) {
    return new THREE.Vector3().copy(p);
  };

}


