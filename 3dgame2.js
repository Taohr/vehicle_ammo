/*
 微信小游戏
 */
let THREE = require('./three/three')
require('./three/ammo')

export default class game3d {
  constructor() {
    this.init();
    this.initGraphics();
    this.initPhysics();
    this.start();
  }
  init() {
    // Heightfield parameters
    this.terrainWidthExtents = 100;
    this.terrainDepthExtents = 100;
    this.terrainWidth = 128;
    this.terrainDepth = 128;
    this.terrainHalfWidth = this.terrainWidth / 2;
    this.terrainHalfDepth = this.terrainDepth / 2;
    this.terrainMaxHeight = 8;
    this.terrainMinHeight = - 2;
    // Graphics variables
    this.clock = new THREE.Clock();
    // Physics variables
    this.dynamicObjects = [];
    this.transformAux1 = new Ammo.btTransform();
    this.heightData = null;
    this.ammoHeightData = null;
    this.time = 0;
    this.objectTimePeriod = 3;
    this.timeNextSpawn = this.time + this.objectTimePeriod;
    this.maxNumObjects = 30;
    this.heightData = this.generateHeight( this.terrainWidth, this.terrainDepth, this.terrainMinHeight, this.terrainMaxHeight );
  }

  initGraphics() {
    let renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
    });
    this.renderer = renderer;
    renderer.shadowMap.enabled = false;

    let camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    this.camera = camera;
    let scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color( 0xbfd1e5 );
    
    camera.position.y = this.heightData[ this.terrainHalfWidth + this.terrainHalfDepth * this.terrainWidth ] * ( this.terrainMaxHeight - this.terrainMinHeight ) + 5;
    camera.position.z = this.terrainDepthExtents / 1.2;
    camera.lookAt( 0, 0, 0 );

    var geometry = new THREE.PlaneBufferGeometry( this.terrainWidthExtents, this.terrainDepthExtents, this.terrainWidth - 1, this.terrainDepth - 1 );
    geometry.rotateX( - Math.PI / 2 );
    // var vertices = geometry.attributes.position.array;
    // for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
    //   // j + 1 because it is the y component that we modify
    //   vertices[ j + 1 ] = this.heightData[ i ];
    // }
    geometry.computeVertexNormals();
    var groundMaterial = new THREE.MeshPhongMaterial( { color: 0xC7C7C7 } );
    let terrainMesh = new THREE.Mesh( geometry, groundMaterial );
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add( terrainMesh );
    var textureLoader = new THREE.TextureLoader();
    let self = this;
    textureLoader.load( "textures/grid.png", function ( texture ) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(self.terrainWidth - 1, self.terrainDepth - 1 );
      groundMaterial.map = texture;
      groundMaterial.needsUpdate = true;
    });

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
    scene.add( light );
  }
  initPhysics() {
    // Physics configuration
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    let dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    let broadphase = new Ammo.btDbvtBroadphase();
    let solver = new Ammo.btSequentialImpulseConstraintSolver();
    let physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    this.physicsWorld = physicsWorld;
    physicsWorld.setGravity( new Ammo.btVector3( 0, - 6, 0 ) );
    // Create the terrain body
    var groundShape = this.createTerrainShape();
    var groundTransform = new Ammo.btTransform();
    groundTransform.setIdentity();
    // Shifts the terrain, since bullet re-centers it on its bounding box.
    groundTransform.setOrigin( new Ammo.btVector3( 0, ( this.terrainMaxHeight + this.terrainMinHeight ) / 2, 0 ) );
    var groundMass = 0;
    var groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
    var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
    var groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
    physicsWorld.addRigidBody( groundBody );
  }
  generateHeight( width, depth, minHeight, maxHeight ) {
    // Generates the height data (a sinus wave)
    var size = width * depth;
    var data = new Float32Array( size );
    var hRange = maxHeight - minHeight;
    var w2 = width / 2;
    var d2 = depth / 2;
    var phaseMult = 12;
    var p = 0;
    for ( var j = 0; j < depth; j ++ ) {
      for ( var i = 0; i < width; i ++ ) {
        var radius = Math.sqrt(
          Math.pow( ( i - w2 ) / w2, 2.0 ) +
            Math.pow( ( j - d2 ) / d2, 2.0 ) );
        var height = ( Math.sin( radius * phaseMult ) + 1 ) * 0.5 * hRange + minHeight;
        data[ p ] = height;
        p ++;
      }
    }
    return data;
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
    this.ammoHeightData = ammoHeightData;
    // // Copy the javascript height data array to the Ammo one.
    // var p = 0;
    // var p2 = 0;
    // for ( var j = 0; j < this.terrainDepth; j ++ ) {
    //   for ( var i = 0; i < this.terrainWidth; i ++ ) {
    //     // write 32-bit float data to memory
    //     Ammo.HEAPF32[ ammoHeightData + p2 >> 2 ] = this.heightData[ p ];
    //     p ++;
    //     // 4 bytes/float
    //     p2 += 4;
    //   }
    // }
    // Creates the heightfield physics shape
    var heightFieldShape = new Ammo.btHeightfieldTerrainShape(
      this.terrainWidth,
      this.terrainDepth,
      this.ammoHeightData,
      heightScale,
      this.terrainMinHeight,
      this.terrainMaxHeight,
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
  generateObject() {
    console.log("generate object");
    var numTypes = 4;
    var objectType = Math.ceil( Math.random() * numTypes );
    var threeObject = null;
    var shape = null;
    var objectSize = 3;
    var margin = 0.05;
    switch ( objectType ) {
      case 1:
        // Sphere
        var radius = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh( new THREE.SphereBufferGeometry( radius, 20, 20 ), this.createObjectMaterial() );
        shape = new Ammo.btSphereShape( radius );
        shape.setMargin( margin );
        break;
      case 2:
        // Box
        var sx = 1 + Math.random() * objectSize;
        var sy = 1 + Math.random() * objectSize;
        var sz = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh( new THREE.BoxBufferGeometry( sx, sy, sz, 1, 1, 1 ), this.createObjectMaterial() );
        shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
        shape.setMargin( margin );
        break;
      case 3:
        // Cylinder
        var radius = 1 + Math.random() * objectSize;
        var height = 1 + Math.random() * objectSize;
        threeObject = new THREE.Mesh( new THREE.CylinderBufferGeometry( radius, radius, height, 20, 1 ), this.createObjectMaterial() );
        shape = new Ammo.btCylinderShape( new Ammo.btVector3( radius, height * 0.5, radius ) );
        shape.setMargin( margin );
        break;
      default:
        // Cone
        var radius = 1 + Math.random() * objectSize;
        var height = 2 + Math.random() * objectSize;
        threeObject = new THREE.Mesh( new THREE.ConeBufferGeometry( radius, height, 20, 2 ), this.createObjectMaterial() );
        shape = new Ammo.btConeShape( radius, height );
        break;
    }
    threeObject.position.set( ( Math.random() - 0.5 ) * this.terrainWidth * 0.6, this.terrainMaxHeight + objectSize + 2, ( Math.random() - 0.5 ) * this.terrainDepth * 0.6 );
    var mass = objectSize * 5;
    var localInertia = new Ammo.btVector3( 0, 0, 0 );
    shape.calculateLocalInertia( mass, localInertia );
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    var pos = threeObject.position;
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    var motionState = new Ammo.btDefaultMotionState( transform );
    var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
    var body = new Ammo.btRigidBody( rbInfo );
    threeObject.userData.physicsBody = body;
    threeObject.receiveShadow = true;
    threeObject.castShadow = true;
    this.scene.add( threeObject );
    this.dynamicObjects.push( threeObject );
    this.physicsWorld.addRigidBody( body );
  }
  createObjectMaterial() {
    var c = Math.floor( Math.random() * ( 1 << 24 ) );
    return new THREE.MeshPhongMaterial( { color: c } );
  }
  start() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    window.requestAnimationFrame( this.loop.bind(this), canvas );
  }
  update() {
    var deltaTime = this.clock.getDelta() * 1000;//ms -> m
    if ( this.dynamicObjects.length < this.maxNumObjects && this.time > this.timeNextSpawn ) {
      this.generateObject();
      this.timeNextSpawn = this.time + this.objectTimePeriod;
    }
    this.updatePhysics( deltaTime );
    this.renderer.render( this.scene, this.camera );
    this.time += deltaTime;
  }
  loop() {
    this.update();
    this.renderer.render( this.scene, this.camera );
    window.requestAnimationFrame( this.loop.bind(this), canvas );
  }
  updatePhysics( deltaTime ) {
    this.physicsWorld.stepSimulation( deltaTime, 10 );
    // Update objects
    for ( var i = 0, il = this.dynamicObjects.length; i < il; i ++ ) {
      var objThree = this.dynamicObjects[ i ];
      var objPhys = objThree.userData.physicsBody;
      var ms = objPhys.getMotionState();
      if ( ms ) {
        ms.getWorldTransform( this.transformAux1 );
        var p = this.transformAux1.getOrigin();
        var q = this.transformAux1.getRotation();
        objThree.position.set( p.x(), p.y(), p.z() );
        objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
      }
    }
  }
}


