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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player, enemies, stars, stopLine;
let castleHealth = 100;
let playerXP = 0;
let playerLevel = 1;
let xpMax = 100;
let baseAttack = 50;
let baseProjectileSpeed = 420;
let projectilesCount = 1;
let statsText;
let healthBg, healthBar, healthText;
let xpBg, xpBar, xpText;
let spawnTimer, shootTimer;
let gameOverText;

function preload() {
    this.load.image('castle', 'assets/castle-bg.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('enemy', 'assets/bomb.png');
}

function create() {
    const bg = this.add.image(400, 300, 'castle');
    bg.setDisplaySize(800, 600);

    this.add.text(500, 30, 'Castle Defense RPG', {
        fontSize: '32px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5);

    player = this.physics.add.sprite(110, 310, 'dude');
    player.setScale(2);
    player.body.setSize(24, 40);
    player.body.setOffset(4, 4);
    player.body.immovable = true;

    this.anims.create({
        key: 'idle_right',
        frames: [{ key: 'dude', frame: 5 }],
        frameRate: 20
    });
    player.anims.play('idle_right');

    enemies = this.physics.add.group();
    stars = this.physics.add.group();

    // Wider invisible stop line at ~1/3 from left (x = 267) for reliable collision
    stopLine = this.add.rectangle(267, 300, 40, 600, 0xff0000, 0);
    this.physics.add.existing(stopLine);
    stopLine.body.immovable = true;
    stopLine.body.allowGravity = false;

    // Collider: enemies hit the stop line and stop
    this.physics.add.collider(enemies, stopLine, onEnemyReachStopLine, null, this);

    this.physics.add.overlap(stars, enemies, hitEnemy, null, this);

    // UI - Health & XP bars
    healthBg = this.add.rectangle(400, 560, 280, 25, 0x444444)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x000000);

    healthBar = this.add.graphics();
    healthBar.fillStyle(0xff4444, 1);
    healthBar.fillRect(0, 0, 280, 25);
    healthBar.setPosition(400 - 140, 560 - 12.5);

    healthText = this.add.text(400, 538, 'Castle Health: 100', {
        fontSize: '18px',
        fill: '#eeeeee',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);

    xpBg = this.add.rectangle(400, 595, 280, 25, 0x444444)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x000000);

    xpBar = this.add.graphics();
    xpBar.fillStyle(0x44ff44, 1);
    xpBar.fillRect(0, 0, 280, 25);
    xpBar.setPosition(400 - 140, 595 - 12.5);

    xpText = this.add.text(400, 573, 'Level 1 - XP: 0 / 100', {
        fontSize: '18px',
        fill: '#eeeeee',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5);

    // Stats overlay
    statsText = this.add.text(20, 20, '', {
        fontSize: '18px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { left: 12, right: 12, top: 10, bottom: 10 }
    });

    updateStatsDisplay.call(this);
    updateBars.call(this);

    spawnTimer = this.time.addEvent({
        delay: 1200,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    shootTimer = this.time.addEvent({
        delay: 1000,
        callback: autoShootAtNearest,
        callbackScope: this,
        loop: true
    });
}

function update() {
    enemies.children.iterate(enemy => {
        if (enemy && enemy.x < -50) enemy.destroy();
    });

    stars.children.iterate(star => {
        if (star && (star.x > 900 || star.y < -50 || star.y > 650)) star.destroy();
    });
}

function spawnEnemy() {
    if (enemies.countActive(true) >= 10) return;

    const yPos = Phaser.Math.Between(60, 540);

    const enemy = enemies.create(850, yPos, 'enemy');
    enemy.setScale(1.2);
    enemy.setVelocityX(-70);
    enemy.setVelocityY(0);
    enemy.body.setBounce(0);
    enemy.setTint(0xff4444);
    enemy.health = 100;
    enemy.maxHealth = 100;
    enemy.isAttacking = false;
    enemy.damageTimer = null;
}

function autoShootAtNearest() {
    if (!player.active) return;

    let nearest = null;
    let minDistance = Infinity;

    enemies.children.iterate(enemy => {
        if (!enemy.active || enemy.x <= player.x + 20) return;
        const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = enemy;
        }
    });

    if (!nearest) return;

    const star = stars.create(player.x + 50, player.y, 'enemy');
    star.setTint(0xffff00);
    star.setScale(1.1);
    star.body.setSize(32, 32); // larger hitbox for reliable hits

    const speed = baseProjectileSpeed;
    const leadFactor = 1.15;
    const timeToImpact = (minDistance / speed) * leadFactor;
    const predictedX = nearest.x + (nearest.body.velocity.x * timeToImpact);
    const predictedY = nearest.y + (nearest.body.velocity.y * timeToImpact);

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
        playerXP += 50;
        if (playerXP >= xpMax) {
            levelUp.call(this);
        }
        updateBars.call(this);
        updateStatsDisplay.call(this);
    }
}

function onEnemyReachStopLine(objA, objB) {
    // Identify the enemy (the one with health property)
    const enemy = objA.health !== undefined ? objA : objB;

    if (!enemy || !enemy.active || enemy.isAttacking) return;

    enemy.setVelocityX(0);
    enemy.setVelocityY(0);
    enemy.setTint(0x880000);
    enemy.isAttacking = true;

    enemy.damageTimer = this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!enemy.active || castleHealth <= 0) {
                if (enemy.damageTimer) enemy.damageTimer.remove();
                return;
            }
            castleHealth -= 10;
            updateBars.call(this);

            if (castleHealth <= 0) {
                gameOverText = this.add.text(400, 300, `GAME OVER\nCastle Destroyed!\nFinal Level: ${playerLevel}`, {
                    fontSize: '48px',
                    fill: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 8,
                    align: 'center'
                }).setOrigin(0.5);

                spawnTimer.remove();
                shootTimer.remove();
                this.physics.pause();
            }
        },
        loop: true
    });
}

function levelUp() {
    playerLevel++;
    playerXP = 0;
    xpMax += 100;
    baseAttack *= 1.1;
    baseProjectileSpeed *= 1.1;
    updateStatsDisplay.call(this);
}

function updateBars() {
    const healthPercent = Math.max(0, castleHealth / 100);
    healthBar.clear();
    healthBar.fillStyle(0xff4444, 1);
    healthBar.fillRect(0, 0, 280 * healthPercent, 25);
    healthText.setText(`Castle Health: ${castleHealth}`);

    const xpPercent = Math.min(1, playerXP / xpMax);
    xpBar.clear();
    xpBar.fillStyle(0x44ff44, 1);
    xpBar.fillRect(0, 0, 280 * xpPercent, 25);
    xpText.setText(`Level ${playerLevel} - XP: ${playerXP} / ${xpMax}`);
}

function updateStatsDisplay() {
    statsText.setText(
        `Level: ${playerLevel}\n` +
        `Attack: ${Math.round(baseAttack)}\n` +
        `Attack Speed: ${Math.round(baseProjectileSpeed)}\n` +
        `Projectiles: ${projectilesCount}`
    );
}