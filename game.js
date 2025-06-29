class BaseballGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.bat = null;
        this.ball = null;
        this.field = null;
        
        this.mouse = { x: 0, y: 0 };
        this.ballInPlay = false;
        this.score = 0;
        this.strikes = 0; // Track strike count
        this.gameOver = false; // Track if game is over
        this.ballSpeed = 60;
        this.ballTimer = Date.now() + 500; // First ball in 0.5 seconds
        this.ballInterval = 3000; // 3 seconds between balls
        this.currentPitch = null;
        this.pitchTypes = ['fastball', 'slider', 'changeup'];
        
        // Initialize speech synthesis
        this.synth = window.speechSynthesis;
        
        this.init();
        this.createField();
        this.createBat();
        this.createBall();
        this.setupControls();
        this.animate();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 300);
        
        // Camera setup (batter's perspective)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.7, 0); // Eye level at home plate
        this.camera.lookAt(0, 1.5, -60); // Looking toward pitcher's mound
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createField() {
        // Create realistic baseball stadium skybox
        this.createStadiumSkybox();
        
        // Enhanced grass field with realistic baseball field dimensions
        const fieldGeometry = new THREE.PlaneGeometry(300, 300);
        
        // Create more realistic grass texture
        const grassCanvas = document.createElement('canvas');
        grassCanvas.width = 256;
        grassCanvas.height = 256;
        const ctx = grassCanvas.getContext('2d');
        
        // Base grass color with variations
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, '#2E7D32');
        gradient.addColorStop(0.5, '#388E3C');
        gradient.addColorStop(1, '#1B5E20');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Add grass blade details
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const length = 2 + Math.random() * 4;
            const width = 0.5 + Math.random() * 1;
            
            ctx.strokeStyle = `rgba(46, 125, 50, ${0.3 + Math.random() * 0.4})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 2, y - length);
            ctx.stroke();
        }
        
        const grassTexture = new THREE.CanvasTexture(grassCanvas);
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(50, 50);
        
        const fieldMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });
        this.field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.field.rotation.x = -Math.PI / 2;
        this.field.receiveShadow = true;
        this.scene.add(this.field);
        
        // Create dirt infield with proper baseball field shape
        this.createInfield();
        
        // Create foul lines
        this.createFoulLines();
        
        // Enhanced home plate
        const plateGeometry = new THREE.BoxGeometry(0.43, 0.02, 0.43);
        const plateMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
        const homePlate = new THREE.Mesh(plateGeometry, plateMaterial);
        homePlate.position.set(0, 0.01, 0);
        this.scene.add(homePlate);
        
        // Batter's boxes
        this.createBattersBoxes();
        
        // Enhanced pitcher's mound with proper MLB dimensions
        const moundGeometry = new THREE.CylinderGeometry(2.7, 3.0, 0.25, 32);
        const moundMaterial = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
        const pitchersMound = new THREE.Mesh(moundGeometry, moundMaterial);
        pitchersMound.position.set(0, 0.125, -18.44); // 60 feet 6 inches from home plate
        pitchersMound.receiveShadow = true;
        this.scene.add(pitchersMound);
        
        // Pitcher's rubber
        const rubberGeometry = new THREE.BoxGeometry(0.61, 0.03, 0.15);
        const rubberMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const pitchersRubber = new THREE.Mesh(rubberGeometry, rubberMaterial);
        pitchersRubber.position.set(0, 0.265, -18.44);
        this.scene.add(pitchersRubber);
        
        // Create stadium elements
        this.createStadiumElements();
        
        // Enhanced backstop with netting
        this.createBackstop();
    }
    
    createStadiumSkybox() {
        // Create a realistic baseball stadium skybox using canvas-generated textures
        const skyboxGeometry = new THREE.SphereGeometry(400, 32, 32);
        
        // Create stadium panorama texture
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Sky gradient (top portion)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, 400);
        skyGradient.addColorStop(0, '#87CEEB'); // Sky blue
        skyGradient.addColorStop(0.3, '#B0E0E6'); // Powder blue
        skyGradient.addColorStop(0.7, '#F0F8FF'); // Alice blue
        skyGradient.addColorStop(1, '#ffffff'); // White at horizon
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, 2048, 400);
        
        // Stadium stands (middle portion)
        const standsGradient = ctx.createLinearGradient(0, 400, 0, 700);
        standsGradient.addColorStop(0, '#8B4513'); // Saddle brown
        standsGradient.addColorStop(0.2, '#A0522D'); // Sienna  
        standsGradient.addColorStop(0.5, '#CD853F'); // Peru
        standsGradient.addColorStop(0.8, '#DEB887'); // Burlywood
        standsGradient.addColorStop(1, '#F5DEB3'); // Wheat
        ctx.fillStyle = standsGradient;
        ctx.fillRect(0, 400, 2048, 300);
        
        // Add stadium structure details
        for (let i = 0; i < 20; i++) {
            const x = (i / 20) * 2048;
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, 400);
            ctx.lineTo(x, 700);
            ctx.stroke();
            
            // Add seating sections
            for (let j = 0; j < 15; j++) {
                const y = 420 + j * 18;
                ctx.fillStyle = j % 2 === 0 ? '#B8860B' : '#DAA520';
                ctx.fillRect(x, y, 2048/20, 8);
            }
        }
        
        // Ground/field area (bottom portion)
        const fieldGradient = ctx.createLinearGradient(0, 700, 0, 1024);
        fieldGradient.addColorStop(0, '#228B22'); // Forest green
        fieldGradient.addColorStop(0.5, '#32CD32'); // Lime green
        fieldGradient.addColorStop(1, '#7CFC00'); // Lawn green
        ctx.fillStyle = fieldGradient;
        ctx.fillRect(0, 700, 2048, 324);
        
        // Add some stadium lights
        for (let i = 0; i < 8; i++) {
            const x = (i / 8) * 2048 + 128;
            const y = 350;
            ctx.fillStyle = '#FFFACD';
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Light glow effect
            const lightGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
            lightGradient.addColorStop(0, 'rgba(255, 250, 205, 0.8)');
            lightGradient.addColorStop(1, 'rgba(255, 250, 205, 0)');
            ctx.fillStyle = lightGradient;
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const skyboxTexture = new THREE.CanvasTexture(canvas);
        const skyboxMaterial = new THREE.MeshBasicMaterial({ 
            map: skyboxTexture,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
    }
    
    createInfield() {
        // Create dirt infield in proper baseball diamond shape
        const infieldShape = new THREE.Shape();
        
        // Start at home plate and create diamond shape
        infieldShape.moveTo(0, 0);
        infieldShape.lineTo(-27.43, -27.43); // First base (90 feet)
        infieldShape.lineTo(0, -54.86); // Second base
        infieldShape.lineTo(27.43, -27.43); // Third base
        infieldShape.closePath();
        
        const infieldGeometry = new THREE.ShapeGeometry(infieldShape);
        const infieldMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C }); // Tan dirt color
        const infield = new THREE.Mesh(infieldGeometry, infieldMaterial);
        infield.rotation.x = -Math.PI / 2;
        infield.position.y = 0.005; // Slightly above grass
        infield.receiveShadow = true;
        this.scene.add(infield);
        
        // Add pitcher's mound dirt area
        const moundDirtGeometry = new THREE.CircleGeometry(5, 32);
        const moundDirt = new THREE.Mesh(moundDirtGeometry, infieldMaterial);
        moundDirt.rotation.x = -Math.PI / 2;
        moundDirt.position.set(0, 0.005, -18.44);
        moundDirt.receiveShadow = true;
        this.scene.add(moundDirt);
    }
    
    createFoulLines() {
        // First base foul line
        const lineGeometry = new THREE.BoxGeometry(0.1, 0.01, 130);
        const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        const firstBaseLine = new THREE.Mesh(lineGeometry, lineMaterial);
        firstBaseLine.position.set(45, 0.006, -65);
        firstBaseLine.rotation.y = Math.PI / 4;
        this.scene.add(firstBaseLine);
        
        // Third base foul line
        const thirdBaseLine = new THREE.Mesh(lineGeometry, lineMaterial);
        thirdBaseLine.position.set(-45, 0.006, -65);
        thirdBaseLine.rotation.y = -Math.PI / 4;
        this.scene.add(thirdBaseLine);
    }
    
    createBattersBoxes() {
        const boxGeometry = new THREE.BoxGeometry(1.22, 0.01, 1.83); // MLB regulation size
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
        
        // Left batter's box
        const leftBox = new THREE.Mesh(boxGeometry, boxMaterial);
        leftBox.position.set(-0.15, 0.005, 0);
        this.scene.add(leftBox);
        
        // Right batter's box  
        const rightBox = new THREE.Mesh(boxGeometry, boxMaterial);
        rightBox.position.set(0.15, 0.005, 0);
        this.scene.add(rightBox);
    }
    
    createStadiumElements() {
        // Create outfield wall
        const wallHeight = 3.66; // 12 feet (Green Monster height)
        const wallGeometry = new THREE.BoxGeometry(150, wallHeight, 0.5);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const outfieldWall = new THREE.Mesh(wallGeometry, wallMaterial);
        outfieldWall.position.set(0, wallHeight / 2, -120);
        outfieldWall.receiveShadow = true;
        this.scene.add(outfieldWall);
        
        // Add foul pole markers
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 15, 8);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 }); // Gold
        
        const leftFoulPole = new THREE.Mesh(poleGeometry, poleMaterial);
        leftFoulPole.position.set(-95, 7.5, -95);
        this.scene.add(leftFoulPole);
        
        const rightFoulPole = new THREE.Mesh(poleGeometry, poleMaterial);
        rightFoulPole.position.set(95, 7.5, -95);
        this.scene.add(rightFoulPole);
        
        // Create dugouts
        this.createDugouts();
        
        // Add stadium seating sections visible from home plate
        this.createVisibleSeating();
    }
    
    createDugouts() {
        const dugoutGeometry = new THREE.BoxGeometry(15, 2, 3);
        const dugoutMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // First base dugout
        const firstBaseDugout = new THREE.Mesh(dugoutGeometry, dugoutMaterial);
        firstBaseDugout.position.set(20, 0, 15);
        this.scene.add(firstBaseDugout);
        
        // Third base dugout
        const thirdBaseDugout = new THREE.Mesh(dugoutGeometry, dugoutMaterial);
        thirdBaseDugout.position.set(-20, 0, 15);
        this.scene.add(thirdBaseDugout);
    }
    
    createVisibleSeating() {
        // Create seating sections behind home plate and down the foul lines
        const seatGeometry = new THREE.BoxGeometry(50, 20, 5);
        const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Behind home plate seating
        const homeSeating = new THREE.Mesh(seatGeometry, seatMaterial);
        homeSeating.position.set(0, 10, 35);
        this.scene.add(homeSeating);
        
        // Upper deck behind home plate
        const upperSeating = new THREE.Mesh(seatGeometry, seatMaterial);
        upperSeating.position.set(0, 25, 40);
        this.scene.add(upperSeating);
        
        // First base side seating
        const firstBaseSeating = new THREE.Mesh(seatGeometry, seatMaterial);
        firstBaseSeating.position.set(40, 10, 20);
        firstBaseSeating.rotation.y = -Math.PI / 6;
        this.scene.add(firstBaseSeating);
        
        // Third base side seating  
        const thirdBaseSeating = new THREE.Mesh(seatGeometry, seatMaterial);
        thirdBaseSeating.position.set(-40, 10, 20);
        thirdBaseSeating.rotation.y = Math.PI / 6;
        this.scene.add(thirdBaseSeating);
    }
    
    createBackstop() {
        // Main backstop structure
        const backstopGeometry = new THREE.BoxGeometry(30, 12, 0.2);
        const backstopMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x444444,
            transparent: true,
            opacity: 0.7
        });
        const backstop = new THREE.Mesh(backstopGeometry, backstopMaterial);
        backstop.position.set(0, 6, 18);
        this.scene.add(backstop);
        
        // Create netting effect
        const nettingGeometry = new THREE.PlaneGeometry(30, 12);
        
        // Create netting texture
        const nettingCanvas = document.createElement('canvas');
        nettingCanvas.width = 256;
        nettingCanvas.height = 256;
        const nettingCtx = nettingCanvas.getContext('2d');
        
        // Transparent background
        nettingCtx.fillStyle = 'rgba(0,0,0,0)';
        nettingCtx.fillRect(0, 0, 256, 256);
        
        // Draw diamond mesh pattern
        nettingCtx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
        nettingCtx.lineWidth = 1;
        
        const spacing = 8;
        for (let i = 0; i < 256; i += spacing) {
            for (let j = 0; j < 256; j += spacing) {
                nettingCtx.beginPath();
                nettingCtx.moveTo(i, j);
                nettingCtx.lineTo(i + spacing/2, j + spacing/2);
                nettingCtx.lineTo(i, j + spacing);
                nettingCtx.lineTo(i - spacing/2, j + spacing/2);
                nettingCtx.closePath();
                nettingCtx.stroke();
            }
        }
        
        const nettingTexture = new THREE.CanvasTexture(nettingCanvas);
        nettingTexture.repeat.set(4, 4);
        nettingTexture.wrapS = THREE.RepeatWrapping;
        nettingTexture.wrapT = THREE.RepeatWrapping;
        
        const nettingMaterial = new THREE.MeshBasicMaterial({ 
            map: nettingTexture,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const netting = new THREE.Mesh(nettingGeometry, nettingMaterial);
        netting.position.set(0, 6, 18.1);
        this.scene.add(netting);
    }
    
    createBat() {
        const batGroup = new THREE.Group();
        
        // Create realistic wood grain texture for handle
        const handleCanvas = document.createElement('canvas');
        handleCanvas.width = 64;
        handleCanvas.height = 256;
        const handleCtx = handleCanvas.getContext('2d');
        
        // Base wood color (darker for handle)
        handleCtx.fillStyle = '#8B4513';
        handleCtx.fillRect(0, 0, 64, 256);
        
        // Add wood grain lines
        for (let i = 0; i < 20; i++) {
            const y = (i / 20) * 256;
            const variance = Math.sin(i * 0.5) * 8;
            handleCtx.strokeStyle = `rgba(139, 69, 19, ${0.3 + Math.random() * 0.4})`;
            handleCtx.lineWidth = 1 + Math.random() * 2;
            handleCtx.beginPath();
            handleCtx.moveTo(0, y);
            handleCtx.quadraticCurveTo(32 + variance, y + 5, 64, y);
            handleCtx.stroke();
        }
        
        // Add darker grain details
        for (let i = 0; i < 15; i++) {
            const y = Math.random() * 256;
            handleCtx.strokeStyle = `rgba(101, 67, 33, ${0.5 + Math.random() * 0.3})`;
            handleCtx.lineWidth = 0.5 + Math.random();
            handleCtx.beginPath();
            handleCtx.moveTo(0, y);
            handleCtx.lineTo(64, y + (Math.random() - 0.5) * 4);
            handleCtx.stroke();
        }
        
        const handleTexture = new THREE.CanvasTexture(handleCanvas);
        handleTexture.wrapS = THREE.RepeatWrapping;
        handleTexture.wrapT = THREE.RepeatWrapping;
        
        // Bat handle
        const handleGeometry = new THREE.CylinderGeometry(0.0075, 0.01, 0.1, 16);
        const handleMaterial = new THREE.MeshLambertMaterial({ map: handleTexture });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.05;
        batGroup.add(handle);
        
        // Create realistic wood grain texture for barrel
        const barrelCanvas = document.createElement('canvas');
        barrelCanvas.width = 64;
        barrelCanvas.height = 256;
        const barrelCtx = barrelCanvas.getContext('2d');
        
        // Base wood color (lighter for barrel)
        barrelCtx.fillStyle = '#DEB887';
        barrelCtx.fillRect(0, 0, 64, 256);
        
        // Add wood grain lines
        for (let i = 0; i < 25; i++) {
            const y = (i / 25) * 256;
            const variance = Math.sin(i * 0.3) * 6;
            barrelCtx.strokeStyle = `rgba(210, 180, 140, ${0.2 + Math.random() * 0.3})`;
            barrelCtx.lineWidth = 0.5 + Math.random() * 1.5;
            barrelCtx.beginPath();
            barrelCtx.moveTo(0, y);
            barrelCtx.quadraticCurveTo(32 + variance, y + 3, 64, y);
            barrelCtx.stroke();
        }
        
        // Add lighter grain highlights
        for (let i = 0; i < 12; i++) {
            const y = Math.random() * 256;
            barrelCtx.strokeStyle = `rgba(245, 222, 179, ${0.4 + Math.random() * 0.3})`;
            barrelCtx.lineWidth = 0.3 + Math.random() * 0.7;
            barrelCtx.beginPath();
            barrelCtx.moveTo(0, y);
            barrelCtx.lineTo(64, y + (Math.random() - 0.5) * 2);
            barrelCtx.stroke();
        }
        
        // Add some darker knots
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * 64;
            const y = Math.random() * 256;
            barrelCtx.fillStyle = `rgba(160, 82, 45, ${0.3 + Math.random() * 0.2})`;
            barrelCtx.beginPath();
            barrelCtx.ellipse(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2, 0, 0, Math.PI * 2);
            barrelCtx.fill();
        }
        
        const barrelTexture = new THREE.CanvasTexture(barrelCanvas);
        barrelTexture.wrapS = THREE.RepeatWrapping;
        barrelTexture.wrapT = THREE.RepeatWrapping;
        
        // Bat barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.0075, 0.175, 16);
        const barrelMaterial = new THREE.MeshLambertMaterial({ map: barrelTexture });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.y = 0.0875;
        batGroup.add(barrel);
        
        // Add rounded cap to the top of the barrel
        const capGeometry = new THREE.SphereGeometry(0.015, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMaterial = new THREE.MeshLambertMaterial({ map: barrelTexture });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.175; // Position at top of barrel
        batGroup.add(cap);
        
        // Create grip tape texture
        const gripCanvas = document.createElement('canvas');
        gripCanvas.width = 32;
        gripCanvas.height = 32;
        const gripCtx = gripCanvas.getContext('2d');
        
        // Base black color
        gripCtx.fillStyle = '#1a1a1a';
        gripCtx.fillRect(0, 0, 32, 32);
        
        // Add grip texture pattern
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if ((i + j) % 2 === 0) {
                    gripCtx.fillStyle = '#0a0a0a';
                    gripCtx.fillRect(i * 4, j * 4, 4, 4);
                }
            }
        }
        
        const gripTexture = new THREE.CanvasTexture(gripCanvas);
        gripTexture.wrapS = THREE.RepeatWrapping;
        gripTexture.wrapT = THREE.RepeatWrapping;
        
        // Grip tape
        const gripGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.05, 16);
        const gripMaterial = new THREE.MeshLambertMaterial({ map: gripTexture });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.y = -0.075;
        batGroup.add(grip);
        
        this.bat = batGroup;
        this.bat.position.set(-0.5, 1.2, -0.2);
        this.bat.rotation.z = Math.PI / 6;
        this.bat.castShadow = true;
        this.scene.add(this.bat);
    }
    
    createBall() {
        const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        
        // Create a canvas-based baseball texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw baseball base color
        ctx.fillStyle = '#f8f5f0';
        ctx.fillRect(0, 0, 512, 512);
        
        // Draw the classic baseball stitching pattern
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 4;
        
        // Left curved seam
        ctx.beginPath();
        ctx.bezierCurveTo(128, 50, 50, 200, 100, 350);
        ctx.bezierCurveTo(150, 450, 250, 500, 384, 462);
        ctx.stroke();
        
        // Right curved seam
        ctx.beginPath();
        ctx.bezierCurveTo(384, 50, 462, 200, 412, 350);
        ctx.bezierCurveTo(362, 450, 262, 500, 128, 462);
        ctx.stroke();
        
        // Add individual stitches along the seams
        ctx.strokeStyle = '#aa0000';
        ctx.lineWidth = 2;
        
        // Left seam stitches
        for (let i = 0; i < 15; i++) {
            const t = i / 14;
            const x1 = 128 + (100 - 128) * t + (384 - 100) * t * t;
            const y1 = 50 + (350 - 50) * t + (462 - 350) * t * t;
            
            ctx.beginPath();
            ctx.moveTo(x1 - 8, y1 - 4);
            ctx.lineTo(x1 + 8, y1 + 4);
            ctx.stroke();
        }
        
        // Right seam stitches
        for (let i = 0; i < 15; i++) {
            const t = i / 14;
            const x1 = 384 + (412 - 384) * t + (128 - 412) * t * t;
            const y1 = 50 + (350 - 50) * t + (462 - 350) * t * t;
            
            ctx.beginPath();
            ctx.moveTo(x1 - 8, y1 - 4);
            ctx.lineTo(x1 + 8, y1 + 4);
            ctx.stroke();
        }
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        const ballMaterial = new THREE.MeshLambertMaterial({ 
            map: texture
        });
        
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        
        // Don't start with a ball - wait for timer
        this.ball.position.set(0, -100, 0); // Hide ball initially
        this.ball.castShadow = true;
        this.scene.add(this.ball);
    }
    
    resetBall() {
        // Select random pitch type
        this.currentPitch = this.pitchTypes[Math.floor(Math.random() * this.pitchTypes.length)];
        
        // Start ball at pitcher's mound with varied positions based on pitch
        let startX = (Math.random() - 0.5) * 2;
        let startY = 1.5 + (Math.random() - 0.5) * 0.5;
        
        // Adjust starting position based on pitch type
        if (this.currentPitch === 'slider') {
            startX += (Math.random() > 0.5 ? 0.3 : -0.3); // Start slightly off center
        }
        
        this.ball.position.set(startX, startY, -18.44);
        
        // Set initial velocity based on pitch type
        this.ball.velocity = this.getPitchVelocity(this.currentPitch);
        this.ball.pitchType = this.currentPitch;
        this.ball.pitchFrame = 0; // Track frames for curve calculation
        
        // Clear any hit-related properties for new ball
        this.ball.hitType = null;
        this.ball.hitQuality = null;
        this.ball.backspin = null;
        this.ball.topspin = null;
        
        this.ballInPlay = true;
        console.log('Throwing', this.currentPitch, 'at:', this.ball.position, 'velocity:', this.ball.velocity);
        
        // Update UI with pitch type
        document.getElementById('ballSpeed').textContent = this.currentPitch.toUpperCase();
    }
    
    getPitchVelocity(pitchType) {
        const baseSpeed = 0.5;
        let velocity = {
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.005,
            z: baseSpeed
        };
        
        switch(pitchType) {
            case 'fastball':
                velocity.z = baseSpeed * 1.3; // Faster
                velocity.y *= 0.5; // Less vertical movement
                break;
                
                
            case 'slider':
                velocity.z = baseSpeed * 1.1; // Slightly faster
                velocity.x = (Math.random() > 0.5 ? 0.008 : -0.008); // Subtle lateral slide
                velocity.y *= 0.5; // Moderate vertical movement
                break;
                
            case 'changeup':
                velocity.z = baseSpeed * 0.6; // Much slower
                velocity.y += 0.005; // Slight upward movement initially
                break;
        }
        
        return velocity;
    }
    
    setupControls() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Move bat with mouse
            this.bat.position.x = this.mouse.x * 1.5;
            this.bat.position.y = 1.2 + this.mouse.y * 0.5;
        });
        
        // No click handler needed - bat contact is automatic
    }
    
    
    checkCollision() {
        const batPosition = this.bat.position.clone();
        const ballPosition = this.ball.position.clone();
        const distance = batPosition.distanceTo(ballPosition);
        
        // Check if ball is in hitting zone and close enough (adjusted for larger ball)
        if (distance < 0.8 && this.ballInPlay && 
            Math.abs(ballPosition.z - batPosition.z) < 0.5) {
            
            this.hitBall();
        }
    }
    
    hitBall() {
        this.score++;
        document.getElementById('score').textContent = this.score;
        
        // Get exact positions
        const batPosition = this.bat.position.clone();
        const ballPosition = this.ball.position.clone();
        
        // Calculate contact point relative to bat center and orientation
        const contactPoint = ballPosition.clone().sub(batPosition);
        
        // Determine where on the bat the ball made contact
        // Bat is angled, so we need to consider its rotation
        const batAngle = this.bat.rotation.z; // Current bat angle
        
        // Transform contact point to bat's local coordinate system
        const localContact = new THREE.Vector3(
            contactPoint.x * Math.cos(-batAngle) - contactPoint.y * Math.sin(-batAngle),
            contactPoint.x * Math.sin(-batAngle) + contactPoint.y * Math.cos(-batAngle),
            contactPoint.z
        );
        
        // Determine hit type based on contact location on bat
        const contactHeight = localContact.y; // How high/low on bat
        const contactSide = localContact.x;    // How far left/right of bat center
        const contactTiming = Math.abs(localContact.z); // How early/late the contact
        
        // Calculate base hit direction
        let hitDirection = new THREE.Vector3();
        
        // Horizontal direction based on contact timing and bat angle
        if (contactTiming < 0.1) {
            // Perfect timing - hit straight ahead with slight pull
            hitDirection.x = contactSide * 2.0 + (Math.random() - 0.5) * 0.3;
        } else {
            // Late/early contact affects direction more dramatically
            const timingFactor = contactTiming * 10;
            hitDirection.x = contactSide * 3.0 + timingFactor * (contactTiming > 0 ? 1 : -1);
        }
        
        // Vertical direction based on contact height on bat
        if (contactHeight > 0.05) {
            // Hit high on bat = ground ball or line drive
            hitDirection.y = 0.2 + Math.random() * 0.3;
        } else if (contactHeight < -0.05) {
            // Hit low on bat = pop fly
            hitDirection.y = 0.8 + Math.random() * 0.5;
        } else {
            // Sweet spot = line drive
            hitDirection.y = 0.4 + Math.random() * 0.2;
        }
        
        // Always hit away from pitcher, but with some variation
        hitDirection.z = -1.0 + Math.random() * 0.2;
        
        // Calculate hit quality based on multiple factors
        const sweetSpotDistance = Math.abs(contactHeight); // Distance from bat's sweet spot
        const timingQuality = Math.max(0, 1 - contactTiming * 5); // Better timing = higher quality
        const solidContact = Math.max(0, 1 - Math.abs(contactSide) * 2); // Center contact is better
        
        const hitQuality = (timingQuality * 0.4 + solidContact * 0.4 + (1 - sweetSpotDistance * 10) * 0.2);
        const clampedQuality = Math.max(0.1, Math.min(1.0, hitQuality));
        
        // Determine hit type and adjust accordingly
        let hitType = 'line_drive';
        if (hitDirection.y > 0.7) {
            hitType = 'pop_fly';
        } else if (hitDirection.y < 0.3) {
            hitType = 'ground_ball';
        }
        
        // Base speed varies significantly with hit quality and type
        let baseSpeed;
        switch(hitType) {
            case 'pop_fly':
                baseSpeed = 1.5 + clampedQuality * 1.0; // Pop flies are slower
                hitDirection.y *= 1.5; // More upward trajectory
                break;
            case 'ground_ball':
                baseSpeed = 2.5 + clampedQuality * 1.5; // Ground balls can be fast
                hitDirection.y *= 0.5; // Keep it low
                break;
            case 'line_drive':
            default:
                baseSpeed = 2.0 + clampedQuality * 2.5; // Line drives can be very fast
                break;
        }
        
        // Apply realistic physics - normalize then scale
        hitDirection.normalize();
        
        // Set final velocity with some randomness for realism
        const speedVariation = 0.8 + Math.random() * 0.4; // ±20% speed variation
        this.ball.velocity.x = hitDirection.x * baseSpeed * speedVariation;
        this.ball.velocity.y = hitDirection.y * baseSpeed * speedVariation;
        this.ball.velocity.z = hitDirection.z * baseSpeed * speedVariation;
        
        // Add spin effects based on contact
        const spinFactor = clampedQuality * 0.3;
        
        // Side spin based on bat angle and contact point
        if (hitDirection.x > 0) {
            this.ball.velocity.x += spinFactor; // Hook/slice right
        } else {
            this.ball.velocity.x -= spinFactor; // Hook/slice left
        }
        
        // Backspin/topspin based on contact height
        if (hitType === 'line_drive') {
            // Line drives get backspin (helps carry)
            this.ball.backspin = 0.01 * clampedQuality;
        } else if (hitType === 'ground_ball') {
            // Ground balls get topspin
            this.ball.topspin = 0.008 * clampedQuality;
        }
        
        // Store hit information for physics updates
        this.ball.hitType = hitType;
        this.ball.hitQuality = clampedQuality;
        
        console.log(`${hitType.toUpperCase()} hit!`, {
            quality: clampedQuality.toFixed(2),
            contact: { height: contactHeight.toFixed(3), side: contactSide.toFixed(3), timing: contactTiming.toFixed(3) },
            velocity: {
                x: this.ball.velocity.x.toFixed(2),
                y: this.ball.velocity.y.toFixed(2), 
                z: this.ball.velocity.z.toFixed(2)
            }
        });
        
        // Keep ball in play to show the hit trajectory
        this.ballInPlay = true;
        
        // Reset ball timer for after the hit ball finishes its flight
        this.ballTimer = Date.now() + 1200; // Longer delay to watch the hit
        this.ballSpeed = Math.min(this.ballSpeed + 2, 100);
        document.getElementById('ballSpeed').textContent = this.ballSpeed;
    }
    
    callStrike() {
        this.strikes++;
        console.log(`Strike ${this.strikes}!`);
        
        // Use speech synthesis to call the strike
        if (this.synth) {
            const utterance = new SpeechSynthesisUtterance(`Strike ${this.strikes}!`);
            utterance.volume = 0.8;
            utterance.rate = 1.2;
            utterance.pitch = 1.0;
            this.synth.speak(utterance);
        }
        
        // Update UI to show strike count
        const strikeDisplay = document.getElementById('ballSpeed');
        strikeDisplay.textContent = `STRIKES: ${this.strikes}`;
        strikeDisplay.style.color = this.strikes >= 2 ? '#ff4444' : '#ffffff';
        
        // Check if player is out
        if (this.strikes >= 3) {
            this.endGame();
        }
    }
    
    endGame() {
        this.gameOver = true;
        this.ballInPlay = false;
        
        // Hide the ball
        this.ball.position.set(0, -100, 0);
        
        // Final "You're out!" announcement
        if (this.synth) {
            const utterance = new SpeechSynthesisUtterance("You're out!");
            utterance.volume = 1.0;
            utterance.rate = 1.0;
            utterance.pitch = 0.8;
            this.synth.speak(utterance);
        }
        
        // Show game over screen
        this.showGameOverScreen();
    }
    
    showGameOverScreen() {
        // Create game over overlay
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'gameOver';
        gameOverDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;
        
        gameOverDiv.innerHTML = `
            <h1 style="font-size: 4em; margin: 0; color: #ff4444; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">STRIKE 3!</h1>
            <h2 style="font-size: 3em; margin: 20px 0; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">YOU'RE OUT!</h2>
            <div style="font-size: 2em; margin: 20px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; border: 2px solid #444;">
                Final Score: <span style="color: #44ff44; font-weight: bold;">${this.score}</span>
            </div>
            <button id="restartGame" style="
                font-size: 1.5em;
                padding: 15px 30px;
                background: #44aa44;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                margin-top: 30px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            ">Play Again</button>
        `;
        
        document.body.appendChild(gameOverDiv);
        
        // Add restart functionality
        document.getElementById('restartGame').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.restartGame();
        });
    }
    
    restartGame() {
        // Reset game state
        this.score = 0;
        this.strikes = 0;
        this.gameOver = false;
        this.ballInPlay = false;
        this.ballSpeed = 60;
        this.ballTimer = Date.now() + 500;
        
        // Update UI
        document.getElementById('score').textContent = this.score;
        document.getElementById('ballSpeed').textContent = this.ballSpeed;
        document.getElementById('ballSpeed').style.color = '#ffffff';
        
        // Hide ball initially
        this.ball.position.set(0, -100, 0);
        
        console.log('Game restarted!');
    }
    
    updateBall() {
        if (!this.ballInPlay || this.gameOver) return;
        
        // Check if ball has been hit (has hitType) or is still a pitch
        if (this.ball.hitType) {
            // Ball has been hit - apply hit ball physics
            this.applyHitBallPhysics();
        } else {
            // Ball is still being pitched - apply pitch physics
            this.applyPitchPhysics();
        }
        
        // Update ball position
        this.ball.position.x += this.ball.velocity.x;
        this.ball.position.y += this.ball.velocity.y;
        this.ball.position.z += this.ball.velocity.z;
        
        // Apply gravity based on ball state
        let gravityEffect;
        if (this.ball.hitType) {
            // Hit ball physics
            gravityEffect = 0.0015; // Stronger gravity for hit balls
            
            // Apply spin effects
            if (this.ball.backspin) {
                // Backspin reduces gravity effect (ball carries further)
                gravityEffect *= (1 - this.ball.backspin * 50);
                this.ball.backspin *= 0.995; // Spin decays over time
            }
            if (this.ball.topspin) {
                // Topspin increases gravity effect (ball drops faster)
                gravityEffect *= (1 + this.ball.topspin * 30);
                this.ball.topspin *= 0.995; // Spin decays over time
            }
            
            // Air resistance for hit balls
            const airResistance = 0.999;
            this.ball.velocity.x *= airResistance;
            this.ball.velocity.z *= airResistance;
        } else {
            // Pitched ball gravity
            gravityEffect = 0.0002;
            if (this.ball.pitchType === 'changeup') {
                gravityEffect = 0.0001; // Less drop for changeup
            }
        }
        
        this.ball.velocity.y -= gravityEffect;
        
        // Ball rotation
        if (this.ball.hitType) {
            // Hit ball rotation based on velocity and spin
            const rotationSpeed = Math.sqrt(
                this.ball.velocity.x * this.ball.velocity.x + 
                this.ball.velocity.z * this.ball.velocity.z
            ) * 0.1;
            this.ball.rotation.x += rotationSpeed;
            this.ball.rotation.y += rotationSpeed * 0.5;
            
            // Add spin-based rotation effects
            if (this.ball.backspin) {
                this.ball.rotation.x += this.ball.backspin * 10;
            }
            if (this.ball.topspin) {
                this.ball.rotation.x -= this.ball.topspin * 10;
            }
        } else {
            // Pitched ball rotation
            if (this.ball.pitchType === 'slider') {
                this.ball.rotation.x += 0.25;
                this.ball.rotation.y += 0.4; // Moderate side spin
            } else {
                this.ball.rotation.x += 0.3;
                this.ball.rotation.y += 0.2;
            }
        }
        
        // Increment frame counter
        if (this.ball.pitchFrame !== undefined) {
            this.ball.pitchFrame++;
        }
        
        // Ball boundary checks
        if (this.ball.hitType) {
            // Hit ball - larger boundaries, check for ground contact
            if (this.ball.position.y <= 0 && this.ball.velocity.y < 0) {
                // Ball hit the ground
                if (this.ball.hitType === 'ground_ball') {
                    // Ground balls bounce and roll
                    this.ball.position.y = 0;
                    this.ball.velocity.y = -this.ball.velocity.y * 0.3; // Small bounce
                    this.ball.velocity.x *= 0.8; // Friction
                    this.ball.velocity.z *= 0.8; // Friction
                    
                    // Stop bouncing when velocity is very low
                    if (Math.abs(this.ball.velocity.y) < 0.05) {
                        this.ball.velocity.y = 0;
                    }
                } else {
                    // Pop flies and line drives that hit ground
                    this.ball.position.y = 0;
                    this.ball.velocity.y = 0;
                    this.ball.velocity.x *= 0.5;
                    this.ball.velocity.z *= 0.5;
                }
            }
            
            // Remove ball if it goes too far or stops moving
            if (this.ball.position.z < -200 || 
                Math.abs(this.ball.position.x) > 150 || 
                this.ball.position.y > 100 ||
                (this.ball.position.y <= 0 && 
                 Math.abs(this.ball.velocity.x) < 0.1 && 
                 Math.abs(this.ball.velocity.z) < 0.1)) {
                this.ball.position.set(0, -100, 0); // Hide ball
                this.ballInPlay = false;
                if (Date.now() > this.ballTimer && !this.gameOver) {
                    this.ballTimer = Date.now() + 500; // Next ball
                }
            }
        } else {
            // Pitched ball - original boundary checks
            if (this.ball.position.z > 5 && this.ballInPlay) {
                this.callStrike(); // Ball passed the batter - it's a strike!
                this.ball.position.set(0, -100, 0); // Hide ball
                this.ballInPlay = false;
                if (!this.gameOver) {
                    this.ballTimer = Date.now() + 1500; // Next ball in 1.5 seconds after a strike
                }
            }
            else if (this.ball.position.z < -70 || 
                Math.abs(this.ball.position.x) > 50 || this.ball.position.y < -1) {
                this.ball.position.set(0, -100, 0); // Hide ball
                this.ballInPlay = false;
                if (Date.now() > this.ballTimer && !this.gameOver) {
                    this.ballTimer = Date.now() + 200; // Next ball in 0.2 seconds
                }
            }
        }
    }
    
    applyHitBallPhysics() {
        // Additional physics for hit balls can be added here
        // This is where we could add wind effects, air density, etc.
        
        // Slight trajectory adjustments based on hit quality
        if (this.ball.hitQuality && this.ball.hitQuality < 0.5) {
            // Poor contact creates more erratic flight
            const wobble = 0.001 * (0.5 - this.ball.hitQuality);
            this.ball.velocity.x += (Math.random() - 0.5) * wobble;
            this.ball.velocity.y += (Math.random() - 0.5) * wobble * 0.5;
        }
    }
    
    applyPitchPhysics() {
        const frame = this.ball.pitchFrame;
        const pitchType = this.ball.pitchType;
        
        switch(pitchType) {
            case 'slider':
                // Slider slides more in the last third of its path (reduced intensity)
                if (frame > 18) {
                    const slideIntensity = (frame - 18) * 0.0001; // Half the intensity
                    this.ball.velocity.x += this.ball.velocity.x > 0 ? slideIntensity : -slideIntensity;
                }
                break;
                
            case 'changeup':
                // Changeup drops suddenly near the plate
                if (frame > 20 && this.ball.position.z > -10) {
                    this.ball.velocity.y -= 0.0008; // Sudden drop
                }
                break;
                
            case 'fastball':
                // Fastball stays straight but can have slight rise
                if (frame < 10) {
                    this.ball.velocity.y += 0.0001; // Slight rise early
                }
                break;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Don't throw new balls if game is over
        if (this.gameOver) {
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        // Continuous ball throwing - throw new ball when current ball is halfway to plate
        if (!this.ballInPlay && Date.now() > this.ballTimer) {
            console.log('Throwing new ball!');
            this.resetBall();
        } else if (this.ballInPlay && this.ball.position.z > -15) {
            // When ball is halfway to home plate, schedule next ball immediately
            if (Date.now() > this.ballTimer) {
                this.ballTimer = Date.now() + 100; // Next ball in just 0.1 seconds
            }
        }
        
        this.updateBall();
        this.checkCollision(); // Check for collision every frame
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new BaseballGame();
});