// =============================================
// STATS & CONFIGURATION (grouped for easy changes/debug)
// =============================================

// ── PLAYER STATS ────────────────────────────────────────────────
// Persistent across runs (saved in registry)
const PLAYER_BASE = {
    name: 'Monkey',
    spriteKey: 'dude',
    spriteFrame: 5,
    spriteScale: 2.0
};

let playerStats = {
    level: 1,
    xp: 0,
    xpMax: 100,
    baseAttack: 25,
    projectileTravelSpeed: 201.6,
    fireRate: 0.5,
    projectilesCount: 1
};

// ── CASTLE STATS ────────────────────────────────────────────────
// Reset every run
let castleStats = {
    health: 100,
    maxHealth: 100,
    timeLeft: 60,
    gameState: 'playing'
};

// ── ENEMY STATS ─────────────────────────────────────────────────
const ENEMY_BASE = {
    health: 100,
    speed: 52.5,
    damage: 10,          // per second to castle
    tint: 0xff4444,
    scale: 2.0
};

let enemyStats = {
    multiplier: 1
};

// ── OTHER GAME VARIABLES ────────────────────────────────────────
let player, enemies, stars, stopLine;
let statsText, healthBg, healthBar, healthText, timerText;
let spawnTimer, shootTimer, gameTimer, enemyLevelTimer, xpGrowthTimer;
let xpMultiplier = 1;
let selectedPortraitIndex = 0;

// =============================================
// HELPER FUNCTIONS (stats management)
// =============================================

function loadPlayerStats(scene) {
    const saved = scene.registry.get('playerStats') || {};
    playerStats.level               = saved.level               ?? 1;
    playerStats.xp                  = saved.xp                  ?? 0;
    playerStats.xpMax               = saved.xpMax               ?? 100;
    playerStats.baseAttack          = saved.baseAttack          ?? 25;
    playerStats.projectileTravelSpeed = saved.projectileTravelSpeed ?? 201.6;
    playerStats.fireRate            = saved.fireRate            ?? 0.5;
    playerStats.projectilesCount    = saved.projectilesCount    ?? 1;
}

function savePlayerStats(scene) {
    scene.registry.set('playerStats', { ...playerStats });
}

function resetCastleAndEnemyStats() {
    castleStats.health    = 100;
    castleStats.timeLeft  = 60;
    castleStats.gameState = 'playing';

    enemyStats.multiplier = 1;
    xpMultiplier          = 1;
}

function updateStatsDisplay() {
    statsText.setText(
        `Level: ${playerStats.level}   XP: ${playerStats.xp}/${playerStats.xpMax}\n` +
        `Att: ${Math.round(playerStats.baseAttack)}     AttS: ${playerStats.fireRate.toFixed(2)}\n` +
        `Proj: ${playerStats.projectilesCount}     ProjS: ${Math.round(playerStats.projectileTravelSpeed)}`
    );
}

function levelUp(scene) {
    if (playerStats.level >= 10) return;

    playerStats.level++;
    playerStats.xp = 0;
    playerStats.xpMax += 100;

    if (playerStats.level % 5 === 0) {
        playerStats.projectilesCount++;
    }

    playerStats.baseAttack *= 1.1;
    playerStats.projectileTravelSpeed *= 1.05;
    playerStats.fireRate *= 1.1;

    if (shootTimer) shootTimer.delay = 1000 / playerStats.fireRate;

    updateStatsDisplay();
    savePlayerStats(scene);

    // Update overlay level text if it exists
    if (scene.monkeyLevelText) {
        scene.monkeyLevelText.setText(`Lv ${playerStats.level}`);
    }
}

// =============================================
// GAME FUNCTIONS
// =============================================

function autoShootAtNearest() {
    if (castleStats.gameState !== 'playing' || !player || !player.active) return;

    const targets = [];
    enemies.children.iterate(enemy => {
        if (enemy.active && enemy.x > player.x + 20) {
            targets.push(enemy);
        }
    });

    const attacking = targets.filter(e => e.isAttacking);
    const normal = targets.filter(e => !e.isAttacking);

    const priorityTargets = [...attacking, ...normal]
        .sort((a, b) => {
            if (a.isAttacking !== b.isAttacking) return a.isAttacking ? -1 : 1;
            const da = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
            const db = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
            return da - db;
        });

    const shootCount = Math.min(playerStats.projectilesCount, priorityTargets.length);

    for (let i = 0; i < shootCount; i++) {
        shootAtTarget(priorityTargets[i]);
    }
}

function shootAtTarget(target) {
    const star = stars.create(player.x + 50, player.y, 'star');
    star.setTint(0xffff00);
    star.setScale(1.47);
    star.body.setSize(48, 48);

    const distance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const speed = playerStats.projectileTravelSpeed;
    const leadFactor = 1.15;
    const timeToImpact = (distance / speed) * leadFactor;

    const predictedX = target.x + (target.body.velocity.x * timeToImpact);
    const predictedY = target.y + (target.body.velocity.y * timeToImpact);

    const angle = Phaser.Math.Angle.Between(player.x, player.y, predictedX, predictedY);
    star.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
}

function hitEnemy(star, enemy, scene) {
    star.destroy();
    enemy.health -= playerStats.baseAttack;

    if (enemy.health < enemy.maxHealth) {
        enemy.setTint(0xffaa00);
    }

    if (enemy.health <= 0) {
        if (enemy.damageTimer) enemy.damageTimer.remove();
        enemy.destroy();
        if (playerStats.level < 10) {
            playerStats.xp += Math.round(50 * xpMultiplier);
            if (playerStats.xp >= playerStats.xpMax) {
                levelUp(scene);
            }
        }
        updateStatsDisplay();
    }
}

function onEnemyReachStopLine(objA, objB) {
    const enemy = objA.health !== undefined ? objA : objB;
    if (!enemy || !enemy.active || enemy.isAttacking) return;

    enemy.setVelocityX(0);
    enemy.setVelocityY(0);
    enemy.setTint(0x880000);
    enemy.isAttacking = true;

    enemy.damageTimer = this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (castleStats.gameState !== 'playing' || !enemy.active) {
                if (enemy.damageTimer) enemy.damageTimer.remove();
                return;
            }
            castleStats.health -= ENEMY_BASE.damage;
            updateHealthBar();

            if (castleStats.health <= 0) {
                endGame.call(this, 'lose');
            }
        },
        loop: true
    });
}

function updateTimer() {
    if (castleStats.gameState !== 'playing') return;

    castleStats.timeLeft--;
    timerText.setText(`Time: ${castleStats.timeLeft}`);

    if (castleStats.timeLeft <= 0) {
        if (castleStats.health > 0) {
            endGame.call(this, 'win');
        }
    }
}

function updateHealthBar() {
    const percent = Math.max(0, castleStats.health / castleStats.maxHealth);
    healthBar.clear();
    healthBar.fillStyle(0xff4444, 1);
    healthBar.fillRect(0, 0, 200 * percent, 20);
    healthText.setText(`Castle Health: ${castleStats.health}`);
}

function spawnEnemyCastle() {
    const randomY = Phaser.Math.Between(100, 500);
    const enemy = enemies.create(850, randomY, 'enemy');
    enemy.setScale(ENEMY_BASE.scale);
    enemy.setVelocityX(-ENEMY_BASE.speed * enemyStats.multiplier);
    enemy.setVelocityY(0);
    enemy.body.setBounce(0);
    enemy.setTint(ENEMY_BASE.tint);
    enemy.health = ENEMY_BASE.health * enemyStats.multiplier;
    enemy.maxHealth = enemy.health;
}

function increaseEnemyLevel() {
    enemyStats.multiplier *= 1.2;
}

function increaseXPMultiplier() {
    xpMultiplier += 0.25;
}

function endGame(result) {
    castleStats.gameState = result;

    spawnTimer?.remove();
    shootTimer?.remove();
    gameTimer?.remove();
    enemyLevelTimer?.remove();
    xpGrowthTimer?.remove();
    this.physics.pause();

    let message = result === 'win' 
        ? 'VICTORY!\nCastle Defended!'
        : 'GAME OVER\nCastle Destroyed!';

    this.add.text(400, 300, message, {
        fontSize: '48px',
        fill: result === 'win' ? '#00ff00' : '#ff0000',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
    }).setOrigin(0.5);

    this.add.text(400, 420, 'RESTART', {
        fontSize: '36px',
        fill: '#ffffff',
        backgroundColor: '#444444',
        padding: { left: 40, right: 40, top: 12, bottom: 12 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
        this.scene.restart();
    });
}

// =============================================
// SCENE CLASSES
// =============================================

class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.load.image('castle', 'assets/castle-bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('enemy', 'assets/bomb.png');
        this.load.image('star', 'assets/star.png');
    }

    create() {
        this.anims.create({
            key: 'idle_right',
            frames: [ { key: 'dude', frame: 5 } ],
            frameRate: 0,
            repeat: -1
        });

        this.scene.start('Castle');
    }
}

class Castle extends Phaser.Scene {
    constructor() {
        super('Castle');
    }

    create() {
        resetCastleAndEnemyStats();

        loadPlayerStats(this);

        const bg = this.add.image(400, 300, 'castle');
        bg.setDisplaySize(800, 600);

        healthBg = this.add.rectangle(150, 440, 200, 20, 0x444444)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x000000);

        healthBar = this.add.graphics();
        healthBar.fillStyle(0xff4444, 1);
        healthBar.fillRect(0, 0, 200, 20);
        healthBar.setPosition(50, 430);

        healthText = this.add.text(150, 405, `Castle Health: ${castleStats.health}`, {
            fontSize: '18px',
            fill: '#eeeeee',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        timerText = this.add.text(400, 40, `Time: ${castleStats.timeLeft}`, {
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(400, 570, 'Castle Defense RPG', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        player = this.physics.add.sprite(150, 260, PLAYER_BASE.spriteKey);
        player.setScale(PLAYER_BASE.spriteScale);
        player.body.setSize(24, 40);
        player.body.setOffset(4, 4);
        player.body.immovable = true;
        player.setFlipX(false);
        player.anims.play('idle_right');

        enemies = this.physics.add.group();
        stars = this.physics.add.group();

        stopLine = this.add.rectangle(267, 300, 40, 600, 0xff0000, 0);
        this.physics.add.existing(stopLine);
        stopLine.body.immovable = true;
        stopLine.body.allowGravity = false;

        this.physics.add.collider(enemies, stopLine, onEnemyReachStopLine, null, this);
        this.physics.add.overlap(stars, enemies, (star, enemy) => hitEnemy(star, enemy, this), null, this);

        statsText = this.add.text(20, 20, '', {
            fontSize: '18px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { left: 12, right: 12, top: 10, bottom: 10 }
        });

        updateStatsDisplay.call(this);
        updateHealthBar.call(this);

        spawnTimer = this.time.addEvent({
            delay: 3300,
            callback: spawnEnemyCastle,
            callbackScope: this,
            loop: true
        });

        shootTimer = this.time.addEvent({
            delay: 1000 / playerStats.fireRate,
            callback: autoShootAtNearest,
            callbackScope: this,
            loop: true
        });

        gameTimer = this.time.addEvent({
            delay: 1000,
            callback: updateTimer,
            callbackScope: this,
            loop: true
        });

        enemyLevelTimer = this.time.addEvent({
            delay: 15000,
            callback: increaseEnemyLevel,
            callbackScope: this,
            loop: true
        });

        xpGrowthTimer = this.time.addEvent({
            delay: 30000,
            callback: increaseXPMultiplier,
            callbackScope: this,
            loop: true
        });

        this.createTrainingOverlay();
    }

    createTrainingOverlay() {
        const w = 680;
        const h = 480;
        const x = 400;
        const y = 300;

        this.trainingOverlayContainer = this.add.container(x, y).setDepth(10);

        const overlayBg = this.add.rectangle(0, 0, w, h, 0x334466)
            .setAlpha(0.92)
            .setStrokeStyle(4, 0x88ccff);
        this.trainingOverlayContainer.add(overlayBg);

        const title = this.add.text(0, -h/2 + 35, 'CHOOSE CHARACTER', {
            fontSize: '38px',
            fill: '#aaffaa',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        this.trainingOverlayContainer.add(title);

        const portraitScale = 2.0;
        const slotWidth = 110;
        const slotHeight = 140;
        const spacingX = 125;
        const spacingY = 150;
        const startX = - (3 * spacingX / 2);
        const startY = -90;

        this.portraitFrames = [];

        for (let i = 0; i < 8; i++) {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const px = startX + col * spacingX;
            const py = startY + row * spacingY;

            const slotContainer = this.add.container(px, py);

            const frame = this.add.rectangle(0, 0, slotWidth, slotHeight, 0x223355);
            const border = this.add.rectangle(0, 0, slotWidth + 8, slotHeight + 8, 0x000000, 0)
                .setStrokeStyle(4, (i === selectedPortraitIndex) ? 0xffff66 : 0x667799);
            
            this.portraitFrames.push(border);

            slotContainer.add([frame, border]);

            if (i === 0) {
                const sprite = this.add.sprite(0, -15, PLAYER_BASE.spriteKey)
                    .setScale(portraitScale)
                    .setFrame(PLAYER_BASE.spriteFrame)
                    .setFlipX(false);

                const nameText = this.add.text(0, 35, PLAYER_BASE.name, {
                    fontSize: '20px',
                    fill: '#ffff99',
                    stroke: '#000000',
                    strokeThickness: 5
                }).setOrigin(0.5);

                this.monkeyLevelText = this.add.text(0, 60, `Lv ${playerStats.level}`, {
                    fontSize: '18px',
                    fill: '#ccffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5);

                slotContainer.add([sprite, nameText, this.monkeyLevelText]);
            } else {
                this.add.text(0, 0, '?', {
                    fontSize: '52px',
                    fill: '#8888cc',
                    stroke: '#333366',
                    strokeThickness: 6
                }).setOrigin(0.5).setAlpha(0.7);
            }

            const hitArea = this.add.rectangle(0, 0, slotWidth, slotHeight, 0xffffff, 0)
                .setInteractive();

            hitArea.on('pointerdown', () => {
                if (i === 0) {
                    selectedPortraitIndex = i;
                    this.portraitFrames.forEach((b, idx) => {
                        b.setStrokeStyle(4, (idx === selectedPortraitIndex) ? 0xffff66 : 0x667799);
                    });
                }
            });

            slotContainer.add(hitArea);
            this.trainingOverlayContainer.add(slotContainer);
        }

        const actionButton = this.add.text(0, h/2 - 55, 'Defend the Castle', {
            fontSize: '34px',
            fill: '#ffffff',
            backgroundColor: '#008822',
            padding: { left: 50, right: 50, top: 18, bottom: 18 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerover', () => actionButton.setStyle({ fill: '#ffffcc' }))
        .on('pointerout', () => actionButton.setStyle({ fill: '#ffffff' }))
        .on('pointerdown', () => {
            if (selectedPortraitIndex === 0) {
                savePlayerStats(this);
                this.trainingOverlayContainer.setVisible(false);
                this.resumeGameplay();
            }
        });

        this.trainingOverlayContainer.add(actionButton);

        this.trainingOverlayContainer.setVisible(true);
        this.pauseGameplay();

        this.input.keyboard.on('keydown-T', () => {
            if (this.trainingOverlayContainer.visible) {
                if (selectedPortraitIndex === 0) {
                    savePlayerStats(this);
                    this.trainingOverlayContainer.setVisible(false);
                    this.resumeGameplay();
                }
            } else {
                this.trainingOverlayContainer.setVisible(true);
                this.pauseGameplay();
            }
        });
    }

    pauseGameplay() {
        this.physics.pause();
        if (spawnTimer) spawnTimer.paused = true;
        if (shootTimer) shootTimer.paused = true;
        if (gameTimer) gameTimer.paused = true;
        if (enemyLevelTimer) enemyLevelTimer.paused = true;
        if (xpGrowthTimer) xpGrowthTimer.paused = true;
    }

    resumeGameplay() {
        this.physics.resume();
        if (spawnTimer) spawnTimer.paused = false;
        if (shootTimer) shootTimer.paused = false;
        if (gameTimer) gameTimer.paused = false;
        if (enemyLevelTimer) enemyLevelTimer.paused = false;
        if (xpGrowthTimer) xpGrowthTimer.paused = false;
    }
}

// =============================================
// GAME CONFIG + START
// =============================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, Castle]
};

const game = new Phaser.Game(config);