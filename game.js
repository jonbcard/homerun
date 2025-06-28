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
        this.ballSpeed = 60;
        this.ballTimer = Date.now() + 500; // First ball in 0.5 seconds
        this.ballInterval = 3000; // 3 seconds between balls
        this.currentPitch = null;
        this.pitchTypes = ['fastball', 'slider', 'changeup'];
        
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
        // Grass field
        const fieldGeometry = new THREE.PlaneGeometry(200, 200);
        const grassTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
            <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                <rect width="64" height="64" fill="#2E7D32"/>
                <g stroke="#4CAF50" stroke-width="0.5" opacity="0.7">
                    <path d="M0,10 Q10,5 20,10 T40,10 T60,10 L64,10"/>
                    <path d="M0,25 Q15,20 30,25 T64,25"/>
                    <path d="M0,40 Q20,35 40,40 T64,40"/>
                    <path d="M0,55 Q25,50 50,55 L64,55"/>
                </g>
            </svg>
        `));
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(20, 20);
        
        const fieldMaterial = new THREE.MeshLambertMaterial({ map: grassTexture });
        this.field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        this.field.rotation.x = -Math.PI / 2;
        this.field.receiveShadow = true;
        this.scene.add(this.field);
        
        // Home plate
        const plateGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.4);
        const plateMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const homePlate = new THREE.Mesh(plateGeometry, plateMaterial);
        homePlate.position.set(0, 0.01, 0);
        this.scene.add(homePlate);
        
        // Pitcher's mound
        const moundGeometry = new THREE.CylinderGeometry(3, 4, 0.5, 16);
        const moundMaterial = new THREE.MeshLambertMaterial({ color: 0x8D6E63 });
        const pitchersMound = new THREE.Mesh(moundGeometry, moundMaterial);
        pitchersMound.position.set(0, 0.25, -60.5);
        pitchersMound.receiveShadow = true;
        this.scene.add(pitchersMound);
        
        // Backstop
        const backstopGeometry = new THREE.PlaneGeometry(20, 10);
        const backstopMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const backstop = new THREE.Mesh(backstopGeometry, backstopMaterial);
        backstop.position.set(0, 5, 15);
        this.scene.add(backstop);
    }
    
    createBat() {
        const batGroup = new THREE.Group();
        
        // Bat handle
        const handleGeometry = new THREE.CylinderGeometry(0.0075, 0.01, 0.1, 8);
        // Wood texture for handle
        const woodTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
            <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="wood" patternUnits="userSpaceOnUse" width="8" height="64">
                        <rect width="8" height="64" fill="#8B4513"/>
                        <rect x="0" y="0" width="8" height="2" fill="#A0522D"/>
                        <rect x="0" y="8" width="8" height="1" fill="#A0522D"/>
                        <rect x="0" y="16" width="8" height="2" fill="#CD853F"/>
                        <rect x="0" y="24" width="8" height="1" fill="#A0522D"/>
                        <rect x="0" y="32" width="8" height="3" fill="#DEB887"/>
                        <rect x="0" y="40" width="8" height="1" fill="#A0522D"/>
                        <rect x="0" y="48" width="8" height="2" fill="#CD853F"/>
                        <rect x="0" y="56" width="8" height="1" fill="#A0522D"/>
                    </pattern>
                </defs>
                <rect width="64" height="64" fill="url(#wood)"/>
            </svg>
        `));
        woodTexture.wrapS = THREE.RepeatWrapping;
        woodTexture.wrapT = THREE.RepeatWrapping;
        woodTexture.repeat.set(1, 4);
        const handleMaterial = new THREE.MeshLambertMaterial({ map: woodTexture });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.05;
        batGroup.add(handle);
        
        // Bat barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.0075, 0.175, 8);
        // Lighter wood texture for barrel
        const lightWoodTexture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(`
            <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="lightwood" patternUnits="userSpaceOnUse" width="8" height="64">
                        <rect width="8" height="64" fill="#DEB887"/>
                        <rect x="0" y="0" width="8" height="2" fill="#D2691E"/>
                        <rect x="0" y="8" width="8" height="1" fill="#CD853F"/>
                        <rect x="0" y="16" width="8" height="2" fill="#F4A460"/>
                        <rect x="0" y="24" width="8" height="1" fill="#D2691E"/>
                        <rect x="0" y="32" width="8" height="3" fill="#F5DEB3"/>
                        <rect x="0" y="40" width="8" height="1" fill="#CD853F"/>
                        <rect x="0" y="48" width="8" height="2" fill="#F4A460"/>
                        <rect x="0" y="56" width="8" height="1" fill="#D2691E"/>
                    </pattern>
                </defs>
                <rect width="64" height="64" fill="url(#lightwood)"/>
            </svg>
        `));
        lightWoodTexture.wrapS = THREE.RepeatWrapping;
        lightWoodTexture.wrapT = THREE.RepeatWrapping;
        lightWoodTexture.repeat.set(1, 6);
        const barrelMaterial = new THREE.MeshLambertMaterial({ map: lightWoodTexture });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.y = 0.0875;
        batGroup.add(barrel);
        
        // Grip tape
        const gripGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
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
        const ballGeometry = new THREE.SphereGeometry(0.3, 16, 16); // Much larger ball for visibility
        const ballMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        
        // Baseball stitching (scaled to match ball size)
        const stitchingGeometry = new THREE.TorusGeometry(0.3, 0.01, 4, 8);
        const stitchingMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const stitching1 = new THREE.Mesh(stitchingGeometry, stitchingMaterial);
        const stitching2 = new THREE.Mesh(stitchingGeometry, stitchingMaterial);
        stitching2.rotation.y = Math.PI / 2;
        
        this.ball.add(stitching1);
        this.ball.add(stitching2);
        
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
        
        this.ball.position.set(startX, startY, -30);
        
        // Set initial velocity based on pitch type
        this.ball.velocity = this.getPitchVelocity(this.currentPitch);
        this.ball.pitchType = this.currentPitch;
        this.ball.pitchFrame = 0; // Track frames for curve calculation
        
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
        
        // Calculate hit direction based on bat and ball positions
        const batPosition = this.bat.position.clone();
        const ballPosition = this.ball.position.clone();
        
        // Calculate the direction from bat to where the ball should go
        const hitDirection = new THREE.Vector3();
        hitDirection.x = ballPosition.x - batPosition.x; // Left/right based on contact point
        hitDirection.y = 0.5; // Always hit upward
        hitDirection.z = -1; // Always hit away from pitcher
        
        // Normalize and scale the hit direction
        hitDirection.normalize();
        
        // Determine hit strength based on how centered the contact was
        const contactDistance = batPosition.distanceTo(ballPosition);
        const maxDistance = 0.8; // Max hit detection distance
        const hitStrength = (maxDistance - contactDistance) / maxDistance; // Better contact = stronger hit
        
        // Calculate final velocity
        const baseSpeed = 2.0 + hitStrength * 2.0; // Speed varies from 2 to 4 based on contact
        this.ball.velocity.x = hitDirection.x * baseSpeed;
        this.ball.velocity.y = hitDirection.y * baseSpeed * (0.8 + hitStrength * 0.7); // Height varies with contact quality
        this.ball.velocity.z = hitDirection.z * baseSpeed;
        
        // Add some spin effect based on bat position
        if (batPosition.x > ballPosition.x) {
            // Bat is to the right of ball - adds right spin
            this.ball.velocity.x += 0.3;
        } else if (batPosition.x < ballPosition.x) {
            // Bat is to the left of ball - adds left spin  
            this.ball.velocity.x -= 0.3;
        }
        
        console.log('Ball hit! Direction:', hitDirection, 'Strength:', hitStrength, 'New velocity:', this.ball.velocity);
        
        // Keep ball in play to show the hit trajectory
        this.ballInPlay = true;
        
        // Reset ball timer for after the hit ball finishes its flight
        this.ballTimer = Date.now() + 800; // Next ball in 0.8 seconds
        this.ballSpeed = Math.min(this.ballSpeed + 2, 100);
        document.getElementById('ballSpeed').textContent = this.ballSpeed;
    }
    
    updateBall() {
        if (!this.ballInPlay) return;
        
        // Apply pitch-specific physics
        this.applyPitchPhysics();
        
        // Update ball position
        this.ball.position.x += this.ball.velocity.x;
        this.ball.position.y += this.ball.velocity.y;
        this.ball.position.z += this.ball.velocity.z;
        
        // Apply gravity (varies by pitch type)
        let gravityEffect = 0.0002;
        if (this.ball.pitchType === 'changeup') {
            gravityEffect = 0.0001; // Less drop for changeup
        }
        this.ball.velocity.y -= gravityEffect;
        
        // Ball rotation varies by pitch
        if (this.ball.pitchType === 'slider') {
            this.ball.rotation.x += 0.25;
            this.ball.rotation.y += 0.4; // Moderate side spin
        } else {
            this.ball.rotation.x += 0.3;
            this.ball.rotation.y += 0.2;
        }
        
        // Increment pitch frame counter
        this.ball.pitchFrame++;
        
        // Reset if ball goes too far in any direction or hits ground
        if (this.ball.position.z > 50 || this.ball.position.z < -70 || 
            Math.abs(this.ball.position.x) > 50 || this.ball.position.y < -1) {
            this.ball.position.set(0, -100, 0); // Hide ball
            this.ballInPlay = false;
            // Only set timer if not already set (to avoid overriding hit timer)
            if (Date.now() > this.ballTimer) {
                this.ballTimer = Date.now() + 200; // Next ball in 0.2 seconds
            }
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