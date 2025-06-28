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
        
        // Check if ball passed the batter (missed swing) - this is a strike
        if (this.ball.position.z > 5 && this.ballInPlay) {
            this.callStrike(); // Ball passed the batter - it's a strike!
            this.ball.position.set(0, -100, 0); // Hide ball
            this.ballInPlay = false;
            if (!this.gameOver) {
                this.ballTimer = Date.now() + 1500; // Next ball in 1.5 seconds after a strike
            }
        }
        // Reset if ball goes too far in other directions or hits ground
        else if (this.ball.position.z < -70 || 
            Math.abs(this.ball.position.x) > 50 || this.ball.position.y < -1) {
            this.ball.position.set(0, -100, 0); // Hide ball
            this.ballInPlay = false;
            // Only set timer if not already set (to avoid overriding hit timer)
            if (Date.now() > this.ballTimer && !this.gameOver) {
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