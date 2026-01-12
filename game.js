// =============================================
// GLOBAL VARIABLES
// =============================================
let player, enemies, stars, stopLine;
let castleHealth = 100;
let playerXP = 0;
let playerLevel = 1;
let xpMax = 100;
let baseAttack = 25;
let projectileTravelSpeed = 201.6;
let fireRate = 0.5;
let projectilesCount = 1;
let xpMultiplier = 1;
let enemyStatMultiplier = 1;
let statsText;
let healthBg, healthBar, healthText;
let timerText;
let gameTimer;
let timeLeft = 60;
let gameState = 'playing';
let spawnTimer, shootTimer;
let enemyLevelTimer;
let xpGrowthTimer;

// =============================================
// GLOBAL FUNCTIONS
// =============================================

function updateStatsDisplay() {
    statsText.setText(
        `Level: ${playerLevel}   XP: ${playerXP}/${xpMax}\n` +
        `Att: ${Math.round(baseAttack)}     AttS: ${fireRate.toFixed(2)}\n` +
        `Proj: ${projectilesCount}     ProjS: ${Math.round(projectileTravelSpeed)}`
    );
}

function levelUp() {
    if (playerLevel >= 10) return;

    playerLevel++;
    playerXP = 0;
    xpMax += 100;

    if (playerLevel % 5 === 0) {
        projectilesCount++;
    }

    baseAttack *= 1.1;
    projectileTravelSpeed *= 1.05;
    fireRate *= 1.1;
    if (shootTimer) shootTimer.delay = 1000 / fireRate;
    updateStatsDisplay();
}

function autoShootAtNearest() {
    if (gameState !== 'playing' || !player || !player.active) return;

    // Collect all valid targets (active enemies to the right of player)
    const targets = [];
    enemies.children.iterate(enemy => {
        if (enemy.active && enemy.x > player.x + 20) {
            targets.push(enemy);
        }
    });

    // Prioritize attacking enemies first
    const attacking = targets.filter(e => e.isAttacking);
    const normal = targets.filter(e => !e.isAttacking);

    // Build final list: attacking first, then closest normal enemies
    const priorityTargets = [...attacking, ...normal]
        .sort((a, b) => {
            if (a.isAttacking !== b.isAttacking) return a.isAttacking ? -1 : 1;
            const da = Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y);
            const db = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
            return da - db;
        });

    // Fire at most one projectile per enemy, up to projectilesCount
    const shootCount = Math.min(projectilesCount, priorityTargets.length);

    for (let i = 0; i < shootCount; i++) {
        shootAtTarget(priorityTargets[i]);
    }
}

function shootAtTarget(target) {
    const star = stars.create(player.x + 50, player.y, 'enemy');
    star.setTint(0xffff00);
    star.setScale(1.47);
    star.body.setSize(48, 48);

    const distance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const speed = projectileTravelSpeed;
    const leadFactor = 1.15;
    const timeToImpact = (distance / speed) * leadFactor;

    const predictedX = target.x + (target.body.velocity.x * timeToImpact);
    const predictedY = target.y + (target.body.velocity.y * timeToImpact);

    const angle = Phaser.Math.Angle.Between(player.x, player.y, predictedX, predictedY);
    star.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
}

function hitEnemy(star, enemy) {
    star.destroy();
    enemy.health -= baseAttack;

    if (enemy.health < enemy.maxHealth) {
        enemy.setTint(0xffaa00);
    }

    if (enemy.health <= 0) {
        if (enemy.damageTimer) enemy.damageTimer.remove();
        enemy.destroy();
        if (playerLevel < 10) {
            playerXP += Math.round(50 * xpMultiplier);
            if (playerXP >= xpMax) {
                levelUp();
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
            if (gameState !== 'playing' || !enemy.active) {
                if (enemy.damageTimer) enemy.damageTimer.remove();
                return;
            }
            castleHealth -= 10;
            updateHealthBar();

            if (castleHealth <= 0) {
                endGame.call(this, 'lose');
            }
        },
        loop: true
    });
}

function updateTimer() {
    if (gameState !== 'playing') return;

    timeLeft--;
    timerText.setText(`Time: ${timeLeft}`);

    if (timeLeft <= 0) {
        if (castleHealth > 0) {
            endGame.call(this, 'win');
        }
    }
}

function endGame(result) {
    gameState = result;

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
        padding: { left: 20, right: 20, top: 10, bottom: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => this.scene.restart());

    this.add.text(400, 480, 'GO TRAIN', {
        fontSize: '32px',
        fill: '#ffffff',
        backgroundColor: '#444444',
        padding: { left: 20, right: 20, top: 10, bottom: 10 }
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
        enemyStatMultiplier = 1;
        this.registry.set('stats', {
            playerLevel,
            playerXP,
            xpMax,
            baseAttack,
            projectileTravelSpeed,
            fireRate,
            projectilesCount
        });
        this.scene.start('Training');
    });
}

function updateHealthBar() {
    const percent = Math.max(0, castleHealth / 100);
    healthBar.clear();
    healthBar.fillStyle(0xff4444, 1);
    healthBar.fillRect(0, 0, 200 * percent, 20);
    healthText.setText(`Castle Health: ${castleHealth}`);
}

function spawnEnemyTraining() {
    if (enemies.countActive(true) > 0) return;

    const enemy = enemies.create(850, 300, 'enemy');
    enemy.setScale(2.0);
    enemy.setVelocityX(-52.5);
    enemy.setVelocityY(0);
    enemy.body.setBounce(0);
    enemy.setTint(0xff4444);
    enemy.health = 100;
    enemy.maxHealth = 100;
    enemy.stopAtX = 400;
}

function spawnEnemyCastle() {
    const randomY = Phaser.Math.Between(100, 500);
    const enemy = enemies.create(850, randomY, 'enemy');
    enemy.setScale(2.0);
    enemy.setVelocityX(-52.5 * enemyStatMultiplier);
    enemy.setVelocityY(0);
    enemy.body.setBounce(0);
    enemy.setTint(0xff4444);
    enemy.health = 100 * enemyStatMultiplier;
    enemy.maxHealth = enemy.health;
}

function increaseEnemyLevel() {
    enemyStatMultiplier *= 1.2;
}

function increaseXPMultiplier() {
    xpMultiplier += 0.25;
}

function resetCastleState() {
    castleHealth = 100;
    timeLeft = 60;
    gameState = 'playing';
    enemyStatMultiplier = 1;  // ← Reset enemy level multiplier

    spawnTimer?.remove();
    shootTimer?.remove();
    gameTimer?.remove();
    enemyLevelTimer?.remove();
    xpGrowthTimer?.remove();

    spawnTimer = null;
    shootTimer = null;
    gameTimer = null;
    enemyLevelTimer = null;
    xpGrowthTimer = null;
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
    }

    create() {
        this.anims.create({
            key: 'idle_right',
            frames: [ { key: 'dude', frame: 5 } ],
            frameRate: 0,
            repeat: -1
        });

        this.scene.start('Training');
    }
}

class Training extends Phaser.Scene {
    constructor() {
        super('Training');
    }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0xffffff);

        const stats = this.registry.get('stats') || {
            playerLevel: 1,
            playerXP: 0,
            xpMax: 100,
            baseAttack: 25,
            projectileTravelSpeed: 201.6,
            fireRate: 0.5,
            projectilesCount: 1
        };

        playerLevel = stats.playerLevel;
        playerXP = stats.playerXP;
        xpMax = stats.xpMax;
        baseAttack = stats.baseAttack;
        projectileTravelSpeed = stats.projectileTravelSpeed;
        fireRate = stats.fireRate;
        projectilesCount = stats.projectilesCount;

        player = this.physics.add.sprite(150, 260, 'dude');
        player.setScale(2);
        player.body.setSize(24, 40);
        player.body.setOffset(4, 4);
        player.body.immovable = true;
        player.setFlipX(false);
        player.anims.play('idle_right');

        enemies = this.physics.add.group();
        stars = this.physics.add.group();

        this.physics.add.overlap(stars, enemies, hitEnemy, null, this);

        spawnTimer = this.time.addEvent({
            delay: 1000,
            callback: spawnEnemyTraining,
            callbackScope: this,
            loop: true
        });

        shootTimer = this.time.addEvent({
            delay: 1000 / fireRate,
            callback: autoShootAtNearest,
            callbackScope: this,
            loop: true
        });

        gameState = 'playing';

        const defendButton = this.add.text(400, 550, 'Defend Castle', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#444444',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => {
            this.registry.set('stats', {
                playerLevel,
                playerXP,
                xpMax,
                baseAttack,
                projectileTravelSpeed,
                fireRate,
                projectilesCount
            });
            this.scene.start('Castle');
        });

        statsText = this.add.text(20, 20, '', {
            fontSize: '18px',
            fill: '#000000',
            stroke: '#ffffff',
            strokeThickness: 4,
            backgroundColor: 'rgba(255,255,255,0.7)',
            padding: { left: 12, right: 12, top: 10, bottom: 10 }
        });

        updateStatsDisplay.call(this);
    }

    update() {
        enemies.children.iterate(enemy => {
            if (!enemy || !enemy.active) return;

            if (enemy.x > enemy.stopAtX) {
                const speed = 52.5;
                enemy.x -= speed * this.game.loop.delta / 1000;
            } else {
                enemy.setVelocityX(0);
                if (!enemy.isAttacking) {
                    enemy.isAttacking = true;
                }
            }

            if (enemy.x < -50) enemy.destroy();
        });

        stars.children.iterate(star => {
            if (star && (star.x < -50 || star.x > 900 || star.y < -50 || star.y > 650)) star.destroy();
        });
    }
}

class Castle extends Phaser.Scene {
    constructor() {
        super('Castle');
    }

    create() {
        resetCastleState();  // Ensures enemyStatMultiplier = 1, time = 60, health = 100, etc.

        const stats = this.registry.get('stats') || {};

        playerLevel = stats.playerLevel ?? 1;
        playerXP = stats.playerXP ?? 0;
        xpMax = stats.xpMax ?? 100;
        baseAttack = stats.baseAttack ?? 25;
        projectileTravelSpeed = stats.projectileTravelSpeed ?? 201.6;
        fireRate = stats.fireRate ?? 0.5;
        projectilesCount = stats.projectilesCount ?? 1;

        const bg = this.add.image(400, 300, 'castle');
        bg.setDisplaySize(800, 600);

        healthBg = this.add.rectangle(150, 440, 200, 20, 0x444444)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x000000);

        healthBar = this.add.graphics();
        healthBar.fillStyle(0xff4444, 1);
        healthBar.fillRect(0, 0, 200, 20);
        healthBar.setPosition(50, 430);

        healthText = this.add.text(150, 405, 'Castle Health: 100', {
            fontSize: '18px',
            fill: '#eeeeee',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        timerText = this.add.text(400, 40, 'Time: 60', {
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

        player = this.physics.add.sprite(150, 260, 'dude');
        player.setScale(2);
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
        this.physics.add.overlap(stars, enemies, hitEnemy, null, this);

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
            delay: 1000 / fireRate,
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
    }

    update() {
        if (gameState !== 'playing') return;

        enemies.children.iterate(enemy => {
            if (enemy && enemy.x < -50) enemy.destroy();
        });

        stars.children.iterate(star => {
            if (star && (star.x > 900 || star.y < -50 || star.y > 650)) star.destroy();
        });
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
    scene: [Preloader, Training, Castle]
};

const game = new Phaser.Game(config);