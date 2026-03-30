const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const finalScoreText = document.getElementById("finalScoreText");
const restartButton = document.getElementById("restartButton");

const world = {
    width: canvas.width,
    height: canvas.height,
    margin: 28,
};

const keyState = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
};

const player = {
    radius: 12,
    speed: 285,
    x: world.width * 0.28,
    y: world.height * 0.5,
    vx: 0,
    vy: 0,
};

const snake = {
    headSpeed: 130,
    maxSpeed: 320,
    acceleration: 7,
    turnRate: 0.08,
    segmentSpacing: 18,
    baseSegments: 16,
    headRadius: 19,
    bodyRadius: 14,
    pulse: 0,
    scoreRate: 14,
    retargetTimer: 0,
    aimOffsetX: 0,
    aimOffsetY: 0,
    x: world.width * 0.74,
    y: world.height * 0.5,
    headingX: -1,
    headingY: 0,
    currentSpeed: 130,
    segments: [],
};

const state = {
    score: 0,
    gameOver: false,
    lastTimestamp: 0,
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
    return start + (end - start) * amount;
}

function initializeSnake() {
    snake.x = world.width * 0.74;
    snake.y = world.height * 0.5;
    snake.headingX = -1;
    snake.headingY = 0;
    snake.currentSpeed = snake.headSpeed;
    snake.retargetTimer = 0;
    snake.aimOffsetX = 0;
    snake.aimOffsetY = 0;
    snake.segments = [];

    for (let index = 0; index < snake.baseSegments; index += 1) {
        snake.segments.push({
            x: snake.x + index * snake.segmentSpacing,
            y: snake.y,
        });
    }
}

function resetGame() {
    state.score = 0;
    state.gameOver = false;
    state.lastTimestamp = 0;
    player.x = world.width * 0.28;
    player.y = world.height * 0.5;
    player.vx = 0;
    player.vy = 0;
    initializeSnake();
    scoreValue.textContent = "0";
    gameOverOverlay.classList.add("hidden");
}

function retargetSnake(distanceToPlayer) {
    const pressure = 1 - clamp(distanceToPlayer / 560, 0, 1);
    const maxOffset = 140 - pressure * 90;
    const orbitRadius = 30 + Math.random() * maxOffset;
    const orbitAngle = Math.random() * Math.PI * 2;
    const directChance = 0.18 + pressure * 0.52;

    if (Math.random() < directChance) {
        snake.aimOffsetX = 0;
        snake.aimOffsetY = 0;
    } else {
        snake.aimOffsetX = Math.cos(orbitAngle) * orbitRadius;
        snake.aimOffsetY = Math.sin(orbitAngle) * orbitRadius;
    }

    snake.retargetTimer = 0.35 + Math.random() * 0.75 - pressure * 0.22;
}

function updatePlayer(deltaTime) {
    let moveX = 0;
    let moveY = 0;

    if (keyState.ArrowUp) {
        moveY -= 1;
    }
    if (keyState.ArrowDown) {
        moveY += 1;
    }
    if (keyState.ArrowLeft) {
        moveX -= 1;
    }
    if (keyState.ArrowRight) {
        moveX += 1;
    }

    if (moveX !== 0 || moveY !== 0) {
        const length = Math.hypot(moveX, moveY);
        player.vx = (moveX / length) * player.speed;
        player.vy = (moveY / length) * player.speed;
    } else {
        player.vx = lerp(player.vx, 0, 0.14);
        player.vy = lerp(player.vy, 0, 0.14);
    }

    player.x += player.vx * deltaTime;
    player.y += player.vy * deltaTime;

    player.x = clamp(player.x, world.margin + player.radius, world.width - world.margin - player.radius);
    player.y = clamp(player.y, world.margin + player.radius, world.height - world.margin - player.radius);
}

function updateSnake(deltaTime) {
    const playerDeltaX = player.x - snake.x;
    const playerDeltaY = player.y - snake.y;
    const directDistanceToPlayer = Math.hypot(playerDeltaX, playerDeltaY) || 1;

    snake.retargetTimer -= deltaTime;
    if (snake.retargetTimer <= 0) {
        retargetSnake(directDistanceToPlayer);
    }

    const targetX = player.x + snake.aimOffsetX;
    const targetY = player.y + snake.aimOffsetY;
    const toPlayerX = targetX - snake.x;
    const toPlayerY = targetY - snake.y;
    const chaseDistance = Math.hypot(toPlayerX, toPlayerY) || 1;
    const targetHeadingX = toPlayerX / chaseDistance;
    const targetHeadingY = toPlayerY / chaseDistance;

    snake.headingX = lerp(snake.headingX, targetHeadingX, snake.turnRate);
    snake.headingY = lerp(snake.headingY, targetHeadingY, snake.turnRate);

    const headingLength = Math.hypot(snake.headingX, snake.headingY) || 1;
    snake.headingX /= headingLength;
    snake.headingY /= headingLength;

    const pressure = 1 - clamp(directDistanceToPlayer / 520, 0, 1);
    const desiredSpeed = snake.headSpeed + pressure * (snake.maxSpeed - snake.headSpeed);
    snake.currentSpeed = lerp(snake.currentSpeed, desiredSpeed, snake.acceleration * deltaTime);

    snake.segments[0].x = snake.x;
    snake.segments[0].y = snake.y;
    snake.x += snake.headingX * snake.currentSpeed * deltaTime;
    snake.y += snake.headingY * snake.currentSpeed * deltaTime;

    snake.x = clamp(snake.x, world.margin, world.width - world.margin);
    snake.y = clamp(snake.y, world.margin, world.height - world.margin);
    snake.segments[0].x = snake.x;
    snake.segments[0].y = snake.y;

    for (let index = 1; index < snake.segments.length; index += 1) {
        const previous = snake.segments[index - 1];
        const segment = snake.segments[index];
        const dx = previous.x - segment.x;
        const dy = previous.y - segment.y;
        const distance = Math.hypot(dx, dy) || 1;
        const stretch = distance - snake.segmentSpacing;

        segment.x += (dx / distance) * stretch * 0.85;
        segment.y += (dy / distance) * stretch * 0.85;
    }

    snake.pulse += deltaTime * 5;
}

function updateScore(deltaTime) {
    state.score += deltaTime * snake.scoreRate;
    scoreValue.textContent = Math.floor(state.score).toString();
}

function addScore(points) {
    state.score += points;
    scoreValue.textContent = Math.floor(state.score).toString();
}

function checkGameOver() {
    const head = snake.segments[0];
    const dx = head.x - player.x;
    const dy = head.y - player.y;
    const combinedRadius = snake.headRadius + player.radius - 2;

    if (Math.hypot(dx, dy) <= combinedRadius) {
        state.gameOver = true;
        finalScoreText.textContent = `Final score: ${Math.floor(state.score)}`;
        gameOverOverlay.classList.remove("hidden");
    }
}

function drawArena() {
    context.clearRect(0, 0, world.width, world.height);

    const fieldGradient = context.createLinearGradient(0, 0, world.width, world.height);
    fieldGradient.addColorStop(0, "rgba(7, 17, 20, 0.98)");
    fieldGradient.addColorStop(1, "rgba(2, 6, 7, 1)");
    context.fillStyle = fieldGradient;
    context.fillRect(0, 0, world.width, world.height);

    context.save();
    context.strokeStyle = "rgba(81, 255, 122, 0.06)";
    context.lineWidth = 1;
    for (let x = 0; x <= world.width; x += 32) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, world.height);
        context.stroke();
    }
    for (let y = 0; y <= world.height; y += 32) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(world.width, y);
        context.stroke();
    }
    context.restore();

    context.strokeStyle = "rgba(81, 255, 122, 0.1)";
    context.lineWidth = 2;
    context.strokeRect(world.margin / 2, world.margin / 2, world.width - world.margin, world.height - world.margin);
}

function drawSnake() {
    for (let index = snake.segments.length - 1; index >= 0; index -= 1) {
        const segment = snake.segments[index];
        const ratio = 1 - index / snake.segments.length;
        const radius = snake.bodyRadius + ratio * 5;
        const glow = 10 + ratio * 16 + Math.sin(snake.pulse + index * 0.35) * 2;

        context.save();
        context.shadowBlur = glow;
        context.shadowColor = "rgba(81, 255, 122, 0.7)";
        context.fillStyle = index === 0 ? "#7dff98" : `rgba(${Math.round(48 + ratio * 70)}, 255, ${Math.round(74 + ratio * 50)}, 0.92)`;
        context.beginPath();
        context.arc(segment.x, segment.y, index === 0 ? snake.headRadius : radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    const head = snake.segments[0];
    const perpendicularX = -snake.headingY;
    const perpendicularY = snake.headingX;

    context.fillStyle = "#021205";
    context.beginPath();
    context.arc(head.x + perpendicularX * 7, head.y + perpendicularY * 7, 2.7, 0, Math.PI * 2);
    context.arc(head.x - perpendicularX * 7, head.y - perpendicularY * 7, 2.7, 0, Math.PI * 2);
    context.fill();
}

function drawPlayer() {
    context.save();
    context.translate(player.x, player.y);
    context.shadowBlur = 20;
    context.shadowColor = "rgba(255, 133, 116, 0.45)";

    context.fillStyle = "#edf6f0";
    context.beginPath();
    context.arc(0, -14, 8, 0, Math.PI * 2);
    context.fill();

    context.lineCap = "round";
    context.strokeStyle = "#edf6f0";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, -4);
    context.lineTo(0, 18);
    context.moveTo(-12, 4);
    context.lineTo(12, 4);
    context.moveTo(0, 18);
    context.lineTo(-10, 32);
    context.moveTo(0, 18);
    context.lineTo(10, 32);
    context.stroke();

    context.strokeStyle = "#ff8574";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, -14, 10, Math.PI * 0.15, Math.PI * 0.85);
    context.stroke();
    context.restore();
}

function render() {
    drawArena();
    drawSnake();
    drawPlayer();
}

function loop(timestamp) {
    if (state.lastTimestamp === 0) {
        state.lastTimestamp = timestamp;
    }

    const deltaTime = Math.min((timestamp - state.lastTimestamp) / 1000, 0.033);
    state.lastTimestamp = timestamp;

    if (!state.gameOver) {
        updatePlayer(deltaTime);
        updateSnake(deltaTime);
        updateScore(deltaTime);
        checkGameOver();
    }

    render();
    window.requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        if (!event.repeat && !state.gameOver) {
            addScore(3000);
        }
        event.preventDefault();
        return;
    }

    if (event.key in keyState) {
        keyState[event.key] = true;
        event.preventDefault();
    }
});

window.addEventListener("keyup", (event) => {
    if (event.key in keyState) {
        keyState[event.key] = false;
        event.preventDefault();
    }
});

restartButton.addEventListener("click", resetGame);

resetGame();
window.requestAnimationFrame(loop);