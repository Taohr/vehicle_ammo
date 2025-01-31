    // 检测浏览器是否支持webgl
    if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
        document.getElementById('container').innerHTML = '';
    }

    // 全局变量

    // 绘图相关变量
    var container, stats;
    var camera, controls, scene, renderer;
    var textureLoader;
    var clock = new THREE.Clock();
    var terrainMesh;
    var vehicle;

    // 物理引擎相关变量
    var gravityConstant = -9.8;
    var collisionConfiguration;
    var dispatcher;
    var broadphase;
    var solver;
    var physicsWorld;
    var rigidBodies = [];
    var margin = 0.05;
    var transformAux1 = new Ammo.btTransform();

    //
    var time = 0;

    // 鼠标输入相关
    var mouseCoords = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var ballMaterial = new THREE.MeshPhongMaterial( { color: 0x202020 } );

    // bullet内置宏
    var DISABLE_DEACTIVATION = 4;
    var TRANSFORM_AUX = new Ammo.btTransform();
    var ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

    // 车辆系统辅助
    var speedometer;
    var syncList = []; // 车辆系统用syncList保存事件列表,不再使用rigidBodies变量.存放用于绘制和同步物理场景的方法

    // 键盘相关
    var actions = {
        'acceleration': false,
        'braking': false,
        'left': false,
        'right': false
    };
    var keysActions = {
        "KeyW":'acceleration',
        "KeyS":'braking',
        "KeyA":'left',
        "KeyD":'right'
    };

    var maxNumObjectss = 30;

    // // - 主程序
    // init();
    // animate();


    // -函数定义
    function init() {
        initGraphics();

        initPhysics();

        initInput();

        createObjects();

    }

    function initGraphics() {
        // three.js基本场景配置
        container = document.getElementById('container');
        container.innerHTML = "";

        camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
        camera.position.x = -7;
        camera.position.y = 10;//5
        camera.position.z = 8;

        controls = new THREE.OrbitControls(camera);
        controls.target.y = 2;

//        renderer = new THREE.WebGLRenderer();
        renderer = new THREE.WebGLRenderer({antialias:true});
        renderer.setClearColor( 0xbfd1e5 );
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;

        textureLoader = new THREE.TextureLoader();

        // 场景
        scene = new THREE.Scene();

        // 环境光
        var ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        // 线性光
        var light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(-10, 10, 5);
        light.castShadow = true;
        var d = 10;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;

        light.shadow.camera.near = 2;
        light.shadow.camera.far = 2;

        light.shadow.mapSize.x = 1024;
        light.shadow.mapSize.y = 1024;

        scene.add(light);

        container.appendChild(renderer.domElement);

        // 显示帧数
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = 'absolute';
        container.appendChild(stats.domElement);

        // // 添加窗口大小变化监听
        // window.addEventListener('resize', onWindowResize, false);

        // 速度表初始化
        speedometer = document.getElementById( 'speedometer' );
    }

    // function onWindowResize() {
    //     camera.aspect = window.innerWidth / window.innerHeight;
    //     camera.updateProjectionMatrix();

    //     renderer.setSize( window.innerWidth, window.innerHeight );

    // }

    function initPhysics() {
        // bullet基本场景配置
        collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        broadphase = new Ammo.btDbvtBroadphase();
        solver = new Ammo.btSequentialImpulseConstraintSolver();
        physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
    }

    function createObjects() {
//        var pos = new THREE.Vector3();
//        var quat = new THREE.Quaternion();
//
//        // 创建地面
//        pos.set(0, -0.5, 0);
//        quat.set(0, 0, 0, 1);
//        var ground = createParallellepiped(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({color: 0xffffff}));
//        ground.castShadow = true;       // 开启投影
//        ground.receiveShadow = true;    // 接受阴影(可以在表面上显示阴影)
//        textureLoader.load("./textures/grid.png", function (texture) {
//            texture.wrapS = THREE.RepeatWrapping;
//            texture.wrapT = THREE.RepeatWrapping;
//            texture.repeat.set(40, 40);
//            ground.material.map = texture;
//            ground.material.needsUpdate = texture;
//        });

        // 生成30个随机物体
//        for (var i = 0; i < maxNumObjectss; i++) {
//            pos.set(Math.random(), 2 *i, Math.random());
//            quat.set(0, 0, 0, 1);
//
//            createRondomObject(pos, quat, Math.ceil(Math.random() * 3));
//        }

        createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);
        var quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);
        var size = .75;
        var nw = 8;
        var nh = 6;
        for (var j = 0; j < nw; j++)
            for (var i = 0; i < nh; i++)
                createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10);
        createVehicle(new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
    }

    // 生成随机形状的物体
    function createRondomObject(pos, quat, objectSize) {
        var numTypes = 4;
        var objectType = Math.ceil( Math.random() * numTypes );

        var threeObject = null;
        var shape = null;

//        var objectSize = 3;

        switch (objectType) {
            case 1:
                // Sphere
                var radius = 1 + Math.random() * objectSize;
                threeObject = new THREE.Mesh( new THREE.SphereGeometry( radius, 20, 20 ), createRendomColorObjectMeatrial() );
                shape = new Ammo.btSphereShape( radius );
                shape.setMargin( margin );
                break;
            case 2:
                // Box
                var sx = 1 + Math.random() * objectSize;
                var sy = 1 + Math.random() * objectSize;
                var sz = 1 + Math.random() * objectSize;
                threeObject = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), createRendomColorObjectMeatrial() );
                shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
                shape.setMargin( margin );
                break;
            case 3:
                // Cylinder
                var radius = 1 + Math.random() * objectSize;
                var height = 1 + Math.random() * objectSize;
                threeObject = new THREE.Mesh( new THREE.CylinderGeometry( radius, radius, height, 20, 1 ), createRendomColorObjectMeatrial() );
                shape = new Ammo.btCylinderShape( new Ammo.btVector3( radius, height * 0.5, radius ) );
                shape.setMargin(margin);
                break;
            default:
                // Cone
                var radius = 1 + Math.random() * objectSize;
                var height = 2 + Math.random() * objectSize;
                threeObject = new THREE.Mesh( new THREE.CylinderGeometry( 0, radius, height, 20, 2 ), createRendomColorObjectMeatrial() );
                shape = new Ammo.btConeShape( radius, height );
                break;
        }

        var mass = objectSize * 5; // 体积越大质量越大

        createRigidBody(threeObject, shape, mass, pos, quat);

    }

    // 生成随机颜色材质
    function createRendomColorObjectMeatrial() {
        var color = Math.floor(Math.random() * (1 << 24));
        return new THREE.MeshPhongMaterial({color: color});
    }

    function createParallellepiped(sx, sy, sz, mass, pos, quat, material) {
        var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
        var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
        shape.setMargin(margin);

        createRigidBody(threeObject, shape, mass, pos, quat);

        return threeObject;
    }

    function createRigidBody(threeObject, physicsShape, mass, pos, quat) {
        threeObject.position.copy(pos);
        threeObject.quaternion.copy(quat);

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        var motionState = new Ammo.btDefaultMotionState(transform);

        var localInertia = new Ammo.btVector3(0, 0, 0);
        physicsShape.calculateLocalInertia(mass, localInertia);

        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
        var body = new Ammo.btRigidBody(rbInfo);

        threeObject.userData.physicsBody = body;

        scene.add(threeObject);

        if (mass > 0) {
            rigidBodies.push(threeObject);

            // Disable deactivation
            // 防止物体弹力过快消失

            // Ammo.DISABLE_DEACTIVATION = 4
            body.setActivationState(4);
        }

        physicsWorld.addRigidBody(body);

        return body;
    }

    function animate() {
        requestAnimationFrame(animate);

        render();

        stats.update();

    }

    function render() {
        var deltaTime = clock.getDelta();

        updatePhysics(deltaTime);

        controls.update(deltaTime);

        updateCamera();

        renderer.render(scene, camera);

        time += deltaTime;
    }

    function updatePhysics(deltaTime) {
//        physicsWorld.stepSimulation(deltaTime);
//
        // 更新物体位置
        for (var i = 0, iL = rigidBodies.length; i <iL; i++ ){
            var objThree = rigidBodies[i];
            var objPhys = objThree.userData.physicsBody;
            var ms = objPhys.getMotionState();
            if (ms) {
                ms.getWorldTransform(transformAux1);
                var p = transformAux1.getOrigin();
                var q = transformAux1.getRotation();
                objThree.position.set(p.x(), p.y(), p.z());
                objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }
        for (var i = 0; i < syncList.length; i++)
            syncList[i](deltaTime);
        physicsWorld.stepSimulation( deltaTime, 10 );
    }

    function updateCamera() {
        tm = vehicle.getChassisWorldTransform();
        p = tm.getOrigin();
        pos = new THREE.Vector3(p.x(), p.y(), p.z());

        forward = vehicle.getForwardVector();
        backward = new THREE.Vector3(forward.x(), forward.y(), forward.z()).multiplyScalar(-20).add(pos);
        x = backward.x;
        y = camera.position.y;
        z = backward.z;

        camera.position.set(x,y,z);
        camera.lookAt(pos);
    }

    function initInput() {
        window.addEventListener( 'touchstart', function( event ) {
          actions['acceleration'] = true;
          actions['left'] = true;
        }, false );
        window.addEventListener( 'touchend', function( event ) {
          actions['acceleration'] = false;
          actions['left'] = false;
        }, false );
        window.addEventListener( 'mousedown', function( event ) {

            // mouseCoords.set(
            //         ( event.clientX / window.innerWidth ) * 2 - 1,
            //         - ( event.clientY / window.innerHeight ) * 2 + 1
            // );

            // raycaster.setFromCamera( mouseCoords, camera );

            // // Creates a ball and throws it
            // var ballMass = 35;
            // var ballRadius = 0.4;

            // var ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), ballMaterial );
            // ball.castShadow = true;
            // ball.receiveShadow = true;
            // var ballShape = new Ammo.btSphereShape( ballRadius );
            // ballShape.setMargin( margin );
            // var pos = new THREE.Vector3();
            // var quat = new THREE.Quaternion();
            // pos.copy( raycaster.ray.direction );
            // pos.add( raycaster.ray.origin );
            // quat.set( 0, 0, 0, 1 );
            // var ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );

            // pos.copy( raycaster.ray.direction );
            // pos.multiplyScalar( 24 );
            // ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );

        }, false );

        window.addEventListener( 'keydown', function (e) {
            if(keysActions[e.code]) {
                actions[keysActions[e.code]] = true;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });

        window.addEventListener( 'keyup', function (e) {
            if(keysActions[e.code]) {
                actions[keysActions[e.code]] = false;
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        })

    }

    /**
     * 车辆系统相关函数部分
     */
    function createBox(pos, quat, w, l, h, mass, friction) {
        var material = createRendomColorObjectMeatrial();
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
            body.setActivationState(DISABLE_DEACTIVATION);
            // 同步物理场景和绘图空间
            function sync(dt) {
                var ms = body.getMotionState();
                if (ms) {
                    ms.getWorldTransform(TRANSFORM_AUX);
                    var p = TRANSFORM_AUX.getOrigin();
                    var q = TRANSFORM_AUX.getRotation();
                    mesh.position.set(p.x(), p.y(), p.z());
                    mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
                }
            }
            syncList.push(sync);
        }
    }

    // 绘制车轮
    function createWheelMesh(radius, width) {
        var t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
        t.rotateZ(Math.PI / 2);
        var mesh = new THREE.Mesh(t, createRendomColorObjectMeatrial());
        mesh.add(new THREE.Mesh(new THREE.BoxGeometry(width * 1.5, radius * 1.75, radius*.25, 1, 1, 1), createRendomColorObjectMeatrial()));
        scene.add(mesh);
        return mesh;
    }

    // 绘制底盘
    function createChassisMesh(w, l, h) {
        var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
        var mesh = new THREE.Mesh(shape, createRendomColorObjectMeatrial());
        scene.add(mesh);
        return mesh;
    }

    function createVehicle(pos, quat) {
        // 车辆常量
        var chassisWidth = 1.8;
        var chassisHeight = .6;
        var chassisLength = 4;
        var massVehicle = 800;
        var wheelAxisPositionBack = -1;
        var wheelRadiusBack = .4;
        var wheelWidthBack = .3;
        var wheelHalfTrackBack = 1;
        var wheelAxisHeightBack = .3;
        var wheelAxisFrontPosition = 1.7;
        var wheelHalfTrackFront = 1;
        var wheelAxisHeightFront = .3;
        var wheelRadiusFront = .35;
        var wheelWidthFront = .2;
        var friction = 1000;
        var suspensionStiffness = 20.0; // 悬挂刚性
        var suspensionDamping = 2.3;    // 悬挂阻尼
        var suspensionCompression = 4.4;// 悬挂压缩
        var suspensionRestLength = 0.6; // 悬挂能恢复的长度
        var rollInfluence = 0.2;
        var steeringIncrement = .04;
        var steeringClamp = .5;
        var maxEngineForce = 2000;
        var maxBreakingForce = 100;

        // 底盘
        var geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * .5, chassisHeight * .5, chassisLength * .5));
        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        var motionState = new Ammo.btDefaultMotionState(transform);
        var localInertia = new Ammo.btVector3(0, 0, 0);
        geometry.calculateLocalInertia(massVehicle, localInertia);
        var body = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(massVehicle, motionState, geometry, localInertia));
        body.setActivationState(DISABLE_DEACTIVATION);
        physicsWorld.addRigidBody(body);
        var chassisMesh = createChassisMesh(chassisWidth, chassisHeight, chassisLength);

        // Raycast Vehicle
        var engineForce = 0;
        var vehicleSteering = 0;
        var breakingForce = 0;
        var tuning = new Ammo.btVehicleTuning(); // 保存车辆参数配置
        var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
        vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
        vehicleBody = body;
        vehicle.setCoordinateSystem(0, 1, 2);
        physicsWorld.addAction(vehicle);

        // 车轮
        var FRONT_LEFT = 0;
        var FRONT_RIGHT = 1;
        var BACK_LEFT = 2;
        var BACK_RIGHT = 3;

        var wheelMeshes = [];
        var wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
        var wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

        function addWheel(isFront, pos, radius, width, index) {
            var wheelInfo = vehicle.addWheel(
                    pos,
                    wheelDirectionCS0,
                    wheelAxleCS,
                    suspensionRestLength,
                    radius,
                    tuning,
                    isFront
            );
            wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
            wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
            wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
            wheelInfo.set_m_frictionSlip(friction);
            wheelInfo.set_m_rollInfluence(rollInfluence);
            wheelMeshes[index] = createWheelMesh(radius, width);
        }

        addWheel(true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
        addWheel(true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
        addWheel(false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
        addWheel(false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

        // 将键盘输入,物理和绘制同步
        function sync(dt) {
            var speed = vehicle.getCurrentSpeedKmHour();
            speedometer.innerHTML = (speed < 0 ? '(R) ' : '') + Math.abs(speed).toFixed(1) + ' km/h';
            breakingForce = 0;
            engineForce = 0;
            if (actions.acceleration) {
                if (speed < -1)
                    breakingForce = maxBreakingForce;
                else engineForce = maxEngineForce;
            }
            if (actions.braking) {
                if (speed > 1)
                    breakingForce = maxBreakingForce;
                else engineForce = -maxEngineForce / 2;
            }
            if (actions.left) {
                if (vehicleSteering < steeringClamp)
                    vehicleSteering += steeringIncrement;
            }
            else {
                if (actions.right) {
                    if (vehicleSteering > -steeringClamp)
                        vehicleSteering -= steeringIncrement;
                }
                else {
                    if (vehicleSteering < -steeringIncrement)
                        vehicleSteering += steeringIncrement;
                    else {
                        if (vehicleSteering > steeringIncrement)
                            vehicleSteering -= steeringIncrement;
                        else {
                            vehicleSteering = 0;
                        }
                    }
                }
            }

            vehicle.applyEngineForce(engineForce, BACK_LEFT);
            vehicle.applyEngineForce(engineForce, BACK_RIGHT);
            vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
            vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
            vehicle.setBrake(breakingForce, BACK_LEFT);
            vehicle.setBrake(breakingForce, BACK_RIGHT);
            vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
            vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);
            var tm, p, q, i;
            var n = vehicle.getNumWheels();
            for (i = 0; i < n; i++) {
                vehicle.updateWheelTransform(i, true);
                tm = vehicle.getWheelTransformWS(i);
                p = tm.getOrigin();
                q = tm.getRotation();
                wheelMeshes[i].position.set(p.x(), p.y(), p.z());
                wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
            }

            // console.log(vehicle);

            tm = vehicle.getChassisWorldTransform();
            // vehicle.getChassisWorldTransform();
            p = tm.getOrigin();
            q = tm.getRotation();
            chassisMesh.position.set(p.x(), p.y(), p.z());
            chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }

        syncList.push(sync);
    }