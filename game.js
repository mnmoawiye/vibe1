const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameStarted = false;
let gameTime = 60;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;

// Game objects
const player = {
    x: 100,
    y: 450,
    width: 40,
    height: 80,
    speed: 5,
    sprintSpeed: 8,
    jumping: false,
    jumpForce: 15,
    velocityY: 0,
    power: 100,
    powerRechargeRate: 1,
    powerUsage: 10,
    direction: 1,
    charge: 0,
    maxCharge: 100,
    chargeRate: 2
};

const basketball = {
    x: 150,
    y: 450,
    radius: 15,
    velocityX: 0,
    velocityY: 0,
    inAir: false,
    rotation: 0,
    rotationSpeed: 0.1,
    lastShotTime: 0
};

const court = {
    floor: {
        y: 500,
        height: 100
    },
    lines: [
        { x: 0, y: 500, width: 1000, height: 2 },
        { x: 500, y: 500, width: 2, height: 100 }
    ],
    threePointLine: {
        x: 100,
        y: 300,
        radius: 200,
        startAngle: Math.PI,
        endAngle: 2 * Math.PI
    }
};

const hoop = {
    x: 800,
    y: 350,
    width: 60,
    height: 10,
    backboard: {
        x: 800,
        y: 300,
        width: 10,
        height: 100
    },
    pole: {
        x: 800,
        y: 400,
        width: 5,
        height: 200
    },
    net: {
        segments: 8,
        height: 20
    }
};

// Controls
const keys = {
    left: false,
    right: false,
    up: false,
    space: false,
    shift: false
};

// Event listeners
document.addEventListener('keydown', (e) => {
    if (!gameStarted) return;
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'ArrowUp' && !player.jumping) {
        keys.up = true;
        player.jumping = true;
        player.velocityY = -player.jumpForce;
    }
    if (e.key === ' ') {
        keys.space = true;
        if (!basketball.inAir && player.power >= player.powerUsage) {
            player.charge = Math.min(player.charge + player.chargeRate, player.maxCharge);
        }
    }
    if (e.key === 'Shift') keys.shift = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'ArrowUp') keys.up = false;
    if (e.key === ' ') {
        keys.space = false;
        if (player.charge > 0) {
            shootBasketball();
        }
    }
    if (e.key === 'Shift') keys.shift = false;
});

document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';
    gameStarted = true;
    startGame();
});

// Game loop
function gameLoop() {
    if (!gameStarted) return;
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update game time
    if (gameTime > 0) {
        gameTime -= 1/60;
        document.getElementById('time').textContent = Math.ceil(gameTime);
    } else {
        endGame();
    }

    // Player movement
    const currentSpeed = keys.shift ? player.sprintSpeed : player.speed;
    if (keys.left) {
        player.x -= currentSpeed;
        player.direction = -1;
    }
    if (keys.right) {
        player.x += currentSpeed;
        player.direction = 1;
    }

    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Power recharge
    if (player.power < 100) {
        player.power += player.powerRechargeRate;
        document.getElementById('power').textContent = Math.round(player.power);
    }

    // Charge shot
    if (keys.space && !basketball.inAir && player.power >= player.powerUsage) {
        player.charge = Math.min(player.charge + player.chargeRate, player.maxCharge);
    }

    // Jump physics
    if (player.jumping) {
        player.y += player.velocityY;
        player.velocityY += 0.8; // Gravity

        // Ground collision
        if (player.y > 450) {
            player.y = 450;
            player.jumping = false;
            player.velocityY = 0;
        }
    }

    // Update basketball position to follow player when not in air
    if (!basketball.inAir) {
        basketball.x = player.x + (player.width/2) + (20 * player.direction);
        basketball.y = player.y;
    }

    // Basketball physics
    if (basketball.inAir) {
        basketball.x += basketball.velocityX;
        basketball.y += basketball.velocityY;
        basketball.velocityY += 0.8; // Gravity
        basketball.rotation += basketball.rotationSpeed;

        // Check if ball has been in air for more than 5 seconds
        if (Date.now() - basketball.lastShotTime > 5000) {
            resetBasketball();
        }

        // Ground collision
        if (basketball.y > 450) {
            basketball.y = 450;
            basketball.velocityY = -basketball.velocityY * 0.6; // Bounce
            basketball.velocityX *= 0.8; // Friction
            
            if (Math.abs(basketball.velocityY) < 2) {
                basketball.inAir = false;
                basketball.velocityY = 0;
                basketball.velocityX = 0;
                setTimeout(resetBasketball, 500);
            }
        }

        // Backboard collision
        if (basketball.x > hoop.backboard.x && basketball.x < hoop.backboard.x + hoop.backboard.width &&
            basketball.y > hoop.backboard.y && basketball.y < hoop.backboard.y + hoop.backboard.height) {
            basketball.velocityX = -basketball.velocityX * 0.8;
        }

        // Hoop collision and scoring
        if (basketball.x > hoop.x && basketball.x < hoop.x + hoop.width &&
            basketball.y > hoop.y && basketball.y < hoop.y + hoop.height) {
            const distance = Math.sqrt(Math.pow(basketball.x - 500, 2) + Math.pow(basketball.y - 500, 2));
            const points = distance > 200 ? 3 : 2;
            score += points;
            document.getElementById('score').textContent = score;
            setTimeout(resetBasketball, 500);
        }

        // Out of bounds
        if (basketball.x < 0 || basketball.x > canvas.width) {
            resetBasketball();
        }
    }
}

function shootBasketball() {
    if (player.power >= player.powerUsage) {
        basketball.inAir = true;
        basketball.lastShotTime = Date.now(); // Record when the shot was taken
        const power = player.charge / 100;
        
        // Calculate shooting position relative to player's current position
        const shootX = player.x + (player.width/2) + (20 * player.direction);
        const shootY = player.y;
        
        // Set ball position to shooting position
        basketball.x = shootX;
        basketball.y = shootY;
        
        // Apply shooting force
        basketball.velocityX = 12 * power * player.direction;
        basketball.velocityY = -18 * power;
        
        // If player is jumping, add their vertical velocity to the shot
        if (player.jumping) {
            basketball.velocityY += player.velocityY;
        }
        
        player.power -= player.powerUsage;
        player.charge = 0;
        document.getElementById('power').textContent = Math.round(player.power);
    }
}

function resetBasketball() {
    basketball.inAir = false;
    basketball.velocityX = 0;
    basketball.velocityY = 0;
    basketball.rotation = 0;
    basketball.x = player.x + (player.width/2) + (20 * player.direction);
    basketball.y = player.y;
    basketball.lastShotTime = 0;
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw court
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, court.floor.y, canvas.width, court.floor.height);
    
    // Draw court lines
    ctx.fillStyle = '#ffffff';
    court.lines.forEach(line => {
        ctx.fillRect(line.x, line.y, line.width, line.height);
    });

    // Draw three-point line
    ctx.beginPath();
    ctx.arc(court.threePointLine.x, court.threePointLine.y, 
            court.threePointLine.radius, 
            court.threePointLine.startAngle, 
            court.threePointLine.endAngle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw player
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y);
    ctx.scale(player.direction, 1);
    
    // Draw body
    ctx.fillStyle = '#ff4500';
    ctx.fillRect(-player.width/2, 0, player.width, player.height);
    
    // Draw head
    ctx.beginPath();
    ctx.arc(0, 20, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c00';
    ctx.fill();
    
    // Draw power bar
    ctx.fillStyle = '#333';
    ctx.fillRect(-player.width/2, -10, player.width, 5);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-player.width/2, -10, (player.width * player.power) / 100, 5);
    
    // Draw charge meter
    if (player.charge > 0) {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(-player.width/2, -20, (player.width * player.charge) / player.maxCharge, 3);
    }
    
    ctx.restore();

    // Draw basketball
    ctx.save();
    ctx.translate(basketball.x, basketball.y);
    ctx.rotate(basketball.rotation);
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(0, 0, basketball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8c00';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw ball lines
    ctx.beginPath();
    ctx.moveTo(-basketball.radius, 0);
    ctx.lineTo(basketball.radius, 0);
    ctx.moveTo(0, -basketball.radius);
    ctx.lineTo(0, basketball.radius);
    ctx.stroke();
    
    ctx.restore();

    // Draw hoop
    // Draw pole
    ctx.fillStyle = '#fff';
    ctx.fillRect(hoop.pole.x, hoop.pole.y, hoop.pole.width, hoop.pole.height);
    
    // Draw backboard with shadow
    ctx.fillStyle = '#ddd';
    ctx.fillRect(hoop.backboard.x - 2, hoop.backboard.y - 2, 
                 hoop.backboard.width + 4, hoop.backboard.height + 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(hoop.backboard.x, hoop.backboard.y, 
                 hoop.backboard.width, hoop.backboard.height);
    
    // Draw rim with better visibility
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(hoop.x - 2, hoop.y - 2, hoop.width + 4, hoop.height + 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(hoop.x, hoop.y, hoop.width, hoop.height);
    
    // Draw net with better visibility
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    for (let i = 0; i < hoop.net.segments; i++) {
        ctx.beginPath();
        ctx.moveTo(hoop.x, hoop.y + i * (hoop.net.height / hoop.net.segments));
        ctx.lineTo(hoop.x + hoop.width, hoop.y + i * (hoop.net.height / hoop.net.segments));
        ctx.stroke();
    }
}

function startGame() {
    gameTime = 60;
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('time').textContent = gameTime;
    gameLoop();
}

function endGame() {
    gameStarted = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('startScreen').innerHTML = `
        <h1>Game Over</h1>
        <p>Final Score: ${score}</p>
        <p>High Score: ${highScore}</p>
        <button id="startButton">Play Again</button>
    `;
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('startScreen').style.display = 'none';
        gameStarted = true;
        startGame();
    });
} 