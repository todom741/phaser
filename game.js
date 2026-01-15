// =============================================
// STATS & CONFIGURATION
// =============================================

// ── CONSTANTS ───────────────────────────────────────────────────
const MAX_LEVEL = 100;
const XP_GROWTH = 1.5;
const XP_BASE_REQ = 100;
const XP_CUMUL_FACTOR = 200;

// ── CHARACTER DEFINITIONS ───────────────────────────────────────
const CHARACTERS = [
    { id: 0, name: 'Mona',   spriteKey: 'dude', spriteScale: 3.0 },
    { id: 1, name: 'Luna',   spriteKey: 'dude', spriteScale: 3.0 },
    { id: 2, name: 'Riven',  spriteKey: 'dude', spriteScale: 3.0 },
    { id: 3, name: 'Zephyr', spriteKey: 'dude', spriteScale: 3.0 }
];

let currentCharacterIndex = 0;
let selectedLevelIndex = 0;
let levelSpeedMultiplier = 1;

// ── CASTLE STATS (reset every run) ──────────────────────────────
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
    damage: 10,
    tint: 0xff4444,
    scale: 2.0
};

let enemyStats = { multiplier: 1 };

// ── GAME VARIABLES ──────────────────────────────────────────────
let player, enemies, stars, stopLine;
let statsText, healthBg, healthBar, healthText, timerText;
let spawnTimer, shootTimer, gameTimer, enemyLevelTimer, xpGrowthTimer;
let xpMultiplier = 1;
let selectedPortraitIndex = 0;
let playerStats = {};

// =============================================
// HELPER FUNCTIONS
// =============================================

function getCharacterSaveKey() {
    return 'characterStats_' + currentCharacterIndex;
}

function getBaseStats(index) {
    const bases = [
        { baseAttack: 25, projectileTravelSpeed: 201.6, fireRate: 0.5, projectilesCount: 1 },
        { baseAttack: 22, projectileTravelSpeed: 220,   fireRate: 0.6, projectilesCount: 1 },
        { baseAttack: 30, projectileTravelSpeed: 180,   fireRate: 0.4, projectilesCount: 2 },
        { baseAttack: 28, projectileTravelSpeed: 210,   fireRate: 0.55, projectilesCount: 1 }
    ];
    return bases[index] || bases[0];
}

function computeLevelFromTotalXP(totalXP) {
    if (totalXP <= 0) return 1;
    const arg = (totalXP / XP_CUMUL_FACTOR) + 1;
    const logVal = Math.log(arg) / Math.log(XP_GROWTH);
    return Math.min(Math.floor(logVal) + 1, MAX_LEVEL);
}

function computeLevelAndStats(scene) {
    const totalXP = playerStats.totalXP || 0;
    let level = computeLevelFromTotalXP(totalXP);

    const powToLevelM1 = Math.pow(XP_GROWTH, level - 1);
    const cumToLevel = Math.round(XP_CUMUL_FACTOR * (powToLevelM1 - 1));

    let xp, xpMax;
    if (level === MAX_LEVEL) {
        xp = 0;
        xpMax = 1;
    } else {
        xpMax = Math.round(XP_BASE_REQ * powToLevelM1);
        xp = totalXP - cumToLevel;
    }

    playerStats.level = level;
    playerStats.xp = Math.max(0, xp);
    playerStats.xpMax = xpMax;

    const bases = getBaseStats(currentCharacterIndex);
    playerStats.baseAttack           = bases.baseAttack           * Math.pow(1.1,  level - 1);
    playerStats.projectileTravelSpeed = bases.projectileTravelSpeed * Math.pow(1.05, level - 1);
    playerStats.fireRate             = bases.fireRate             * Math.pow(1.1,  level - 1);
    playerStats.projectilesCount     = bases.projectilesCount + Math.floor(level / 5);

    updateStatsDisplay();
    if (shootTimer) shootTimer.delay = 1000 / playerStats.fireRate;
    savePlayerStats(scene);
}

function loadPlayerStats(scene) {
    const key = getCharacterSaveKey();
    const savedStr = localStorage.getItem(key);
    let totalXP = 0;
    if (savedStr) {
        try {
            const saved = JSON.parse(savedStr);
            if (typeof saved.totalXP === 'number') totalXP = saved.totalXP;
        } catch (e) {}
    }
    playerStats.totalXP = totalXP;
}

function savePlayerStats(scene) {
    const key = getCharacterSaveKey();
    localStorage.setItem(key, JSON.stringify({ totalXP: playerStats.totalXP }));
}

function resetCastleAndEnemyStats() {
    castleStats.health    = 100;
    castleStats.timeLeft  = 60;
    castleStats.gameState = 'playing';
    enemyStats.multiplier = 1;
    xpMultiplier          = 1;
}

function updateStatsDisplay() {
    if (!statsText || typeof statsText.setText !== 'function') return;
    statsText.setText(
        `Level: ${playerStats.level}   XP: ${Math.floor(playerStats.xp)}/${playerStats.xpMax}\n` +
        `Att: ${Math.round(playerStats.baseAttack)}     AttS: ${playerStats.fireRate.toFixed(2)}\n` +
        `Proj: ${playerStats.projectilesCount}     ProjS: ${Math.round(playerStats.projectileTravelSpeed)}`
    );
}

// =============================================
// SCENE CLASSES
// =============================================

class Preloader extends Phaser.Scene {
    constructor() { super('Preloader'); }

    preload() {
        this.load.image('castle', 'assets/castle-bg.png');
        this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 63, frameHeight: 74 });
        this.load.image('enemy', 'assets/bomb.png');
        this.load.image('star', 'assets/star.png');
    }

    create() {
        this.anims.create({
            key: 'idle_cycle',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 7 }),
            frameRate: 4,
            repeat: -1,
            yoyo: true
        });
        this.scene.start('Castle');
    }
}

class Castle extends Phaser.Scene {
    constructor() { super('Castle'); }

    create() {
        resetCastleAndEnemyStats();
        loadPlayerStats(this);

        const bg = this.add.image(720, 360, 'castle').setOrigin(0.5);

        healthBg = this.add.rectangle(300, 650, 400, 40, 0x444444)
            .setOrigin(0.5).setStrokeStyle(4, 0x000000);

        healthBar = this.add.graphics();
        healthBar.fillStyle(0xff4444, 1);
        healthBar.fillRect(0, 0, 400, 40);
        healthBar.setPosition(100, 630);

        healthText = this.add.text(300, 590, `Castle Health: ${castleStats.health}`, {
            fontSize: '28px', fill: '#eeeeee', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        timerText = this.add.text(720, 60, `Time: ${castleStats.timeLeft}`, {
            fontSize: '48px', fill: '#ffffff', stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(720, 680, 'Castle Defense RPG', {
            fontSize: '40px', fill: '#ffffff', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5);

        player = this.physics.add.sprite(280, 460, CHARACTERS[currentCharacterIndex].spriteKey);
        player.setScale(CHARACTERS[currentCharacterIndex].spriteScale);
        player.setOrigin(0.5, 1.0);
        player.body.setSize(32, 64);
        player.body.setOffset(16, 0);
        player.body.immovable = true;
        player.anims.play('idle_cycle');

        enemies = this.physics.add.group();
        stars   = this.physics.add.group();

        stopLine = this.add.rectangle(500, 360, 80, 720, 0xff0000, 0);
        this.physics.add.existing(stopLine);
        stopLine.body.immovable = true;
        stopLine.body.allowGravity = false;

        this.physics.add.collider(enemies, stopLine, this.onEnemyReachStopLine, null, this);
        this.physics.add.overlap(stars, enemies, this.hitEnemy, null, this);

        statsText = this.add.text(40, 40, '', {
            fontSize: '28px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { left: 20, right: 20, top: 15, bottom: 15 }
        });

        this.updateHealthBar();

        spawnTimer = this.time.addEvent({ delay: 5900, callback: this.spawnEnemyCastle, callbackScope: this, loop: true });

        shootTimer = this.time.addEvent({ delay: 2000, callback: autoShootAtNearest, callbackScope: this, loop: true });

        gameTimer = this.time.addEvent({ delay: 1000, callback: this.updateTimer, callbackScope: this, loop: true });

        enemyLevelTimer = this.time.addEvent({ delay: 15000, callback: this.increaseEnemyLevel, callbackScope: this, loop: true });

        xpGrowthTimer = this.time.addEvent({ delay: 30000, callback: this.increaseXPMultiplier, callbackScope: this, loop: true });

        computeLevelAndStats(this);
        this.createTrainingOverlay();
    }

    updateHealthBar() {
        const percent = Math.max(0, castleStats.health / castleStats.maxHealth);
        healthBar.clear();
        healthBar.fillStyle(0xff4444, 1);
        healthBar.fillRect(0, 0, 400 * percent, 40);
        healthText.setText(`Castle Health: ${castleStats.health}`);
    }

    spawnEnemyCastle() {
        const randomY = Phaser.Math.Between(150, 570);
        const enemy = enemies.create(1300, randomY, 'enemy');
        enemy.setScale(ENEMY_BASE.scale * 1.8 * 0.67);
        enemy.setVelocityX(-ENEMY_BASE.speed * enemyStats.multiplier * 1.8 * levelSpeedMultiplier);
        enemy.setVelocityY(0);
        enemy.body.setBounce(0);
        enemy.setTint(ENEMY_BASE.tint);
        enemy.health = ENEMY_BASE.health * enemyStats.multiplier;
        enemy.maxHealth = enemy.health;
    }

    increaseEnemyLevel() {
        enemyStats.multiplier *= 1.2;
    }

    increaseXPMultiplier() {
        xpMultiplier += 0.25;
    }

    hitEnemy(star, enemy) {
        star.destroy();
        enemy.health -= playerStats.baseAttack;

        if (enemy.health < enemy.maxHealth) enemy.setTint(0xffaa00);

        if (enemy.health <= 0) {
            if (enemy.damageTimer) enemy.damageTimer.remove();
            enemy.destroy();

            if (playerStats.level < MAX_LEVEL) {
                playerStats.totalXP += Math.round(50 * xpMultiplier);
                computeLevelAndStats(this);
            }
        }
    }

    onEnemyReachStopLine(objA, objB) {
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
                this.updateHealthBar();

                if (castleStats.health <= 0) this.endGame('lose');
            },
            loop: true
        });
    }

    updateTimer() {
        if (castleStats.gameState !== 'playing') return;

        castleStats.timeLeft--;
        timerText.setText(`Time: ${castleStats.timeLeft}`);

        if (castleStats.timeLeft <= 0) {
            if (castleStats.health > 0) this.endGame('win');
        }
    }

    endGame(result) {
        castleStats.gameState = result;

        spawnTimer?.remove();
        shootTimer?.remove();
        gameTimer?.remove();
        enemyLevelTimer?.remove();
        xpGrowthTimer?.remove();
        this.physics.pause();

        const message = result === 'win'
            ? 'VICTORY!\nCastle Defended!'
            : 'GAME OVER\nCastle Destroyed!';

        this.add.text(720, 360, message, {
            fontSize: '64px',
            fill: result === 'win' ? '#00ff00' : '#ff0000',
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(720, 520, 'RESTART', {
            fontSize: '48px',
            fill: '#ffffff',
            backgroundColor: '#444444',
            padding: { left: 60, right: 60, top: 20, bottom: 20 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => this.scene.restart());
    }

    createTrainingOverlay() {
        const overlayW = 1000;
        const overlayH = 500;
        const overlayX = 720;
        const overlayY = 360;

        this.trainingOverlayContainer = this.add.container(overlayX, overlayY).setDepth(10);

        const overlayBg = this.add.rectangle(0, 0, overlayW, overlayH, 0x334466)
            .setAlpha(0.92)
            .setStrokeStyle(6, 0x88ccff);
        this.trainingOverlayContainer.add(overlayBg);

        // ── LEFT CONTAINER (characters) ─────────────────────────────────
        const leftContainer = this.add.container(-220, 0);
        this.trainingOverlayContainer.add(leftContainer);

        const titleY = -overlayH / 2 + 30;

        const charTitle = this.add.text(0, titleY, 'CHOOSE CHARACTER', {
            fontSize: '36px',
            fill: '#aaffaa',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        leftContainer.add(charTitle);

        const charScale = 1.75;
        const charSlotW = 112;
        const charSlotH = 144;
        const charSpacingX = 145;
        const charSpacingY = 155;
        const charStartX = -110;
        const charStartY = -90;

        this.portraitFrames = [];
        this.characterLevelTexts = [];

        for (let i = 0; i < 4; i++) {
            const px = charStartX + (i % 2) * charSpacingX;
            const py = charStartY + Math.floor(i / 2) * charSpacingY;

            const slot = this.add.container(px, py);

            const frame = this.add.rectangle(0, 0, charSlotW, charSlotH, 0x223355);
            const border = this.add.rectangle(0, 0, charSlotW + 8, charSlotH + 8, 0x000000, 0)
                .setStrokeStyle(4, (i === selectedPortraitIndex) ? 0xffff66 : 0x667799);

            this.portraitFrames.push(border);
            slot.add([frame, border]);

            const sprite = this.add.sprite(0, -16, CHARACTERS[i].spriteKey)
                .setScale(charScale)
                .setFrame(0)
                .setFlipX(false);
            sprite.anims.play('idle_cycle');

            const nameText = this.add.text(0, 38, CHARACTERS[i].name, {
                fontSize: '16px',
                fill: '#ffff99',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            let displayLevel = 1;
            const savedStr = localStorage.getItem('characterStats_' + i);
            if (savedStr) {
                try {
                    const data = JSON.parse(savedStr);
                    displayLevel = computeLevelFromTotalXP(data.totalXP || 0);
                } catch (e) {}
            }
            const levelText = this.add.text(0, 56, `Lv ${displayLevel}`, {
                fontSize: '14px',
                fill: '#ccffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            this.characterLevelTexts.push(levelText);

            slot.add([sprite, nameText, levelText]);

            const hitArea = this.add.rectangle(0, 0, charSlotW, charSlotH, 0xffffff, 0)
                .setInteractive();

            hitArea.on('pointerdown', () => {
                selectedPortraitIndex = i;
                currentCharacterIndex = i;
                this.portraitFrames.forEach((b, idx) => {
                    b.setStrokeStyle(4, (idx === selectedPortraitIndex) ? 0xffff66 : 0x667799);
                });

                for (let idx = 0; idx < CHARACTERS.length; idx++) {
                    const key = 'characterStats_' + idx;
                    let lv = 1;
                    const saved = localStorage.getItem(key);
                    if (saved) {
                        try {
                            const data = JSON.parse(saved);
                            lv = computeLevelFromTotalXP(data.totalXP || 0);
                        } catch {}
                    }
                    this.characterLevelTexts[idx].setText(`Lv ${lv}`);
                }
            });

            slot.add(hitArea);
            leftContainer.add(slot);
        }

        // ── RIGHT CONTAINER (levels) ────────────────────────────────────
        const rightContainer = this.add.container(250, 0);
        this.trainingOverlayContainer.add(rightContainer);

        const levelTitle = this.add.text(0, titleY, 'CHOOSE LEVEL', {
            fontSize: '36px',
            fill: '#aaffaa',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);
        rightContainer.add(levelTitle);

        const levelViewX = -210;
        const levelViewY = -overlayH / 2 + 80;
        const levelViewW = 500;
        const levelViewH = 300;

        const topPadding = 40;

        const maskGraphics = this.make.graphics({ x: 0, y: 0 });
        const absMaskX = overlayX + rightContainer.x + levelViewX;
        const absMaskY = overlayY + rightContainer.y + levelViewY;
        maskGraphics.fillStyle(0xffffff, 1);
        maskGraphics.fillRect(absMaskX, absMaskY, levelViewW, levelViewH);
        const mask = maskGraphics.createGeometryMask();

        const levelsContainer = this.add.container(levelViewX, levelViewY + topPadding);
        levelsContainer.setMask(mask);
        rightContainer.add(levelsContainer);

        const levelSlotW = 365;
        const levelSlotH = 50;
        const levelSpacingY = 10;

        this.levelFrames = [];

        for (let i = 0; i < 10; i++) {
            const py = i * (levelSlotH + levelSpacingY);

            const slot = this.add.container(0, py);

            const frame = this.add.rectangle(0, 0, levelSlotW, levelSlotH, 0x223355)
                .setOrigin(0, 0.5);
            const border = this.add.rectangle(0, 0, levelSlotW + 6, levelSlotH + 6, 0x000000, 0)
                .setOrigin(0, 0.5)
                .setStrokeStyle(3, (i === selectedLevelIndex) ? 0xffff66 : 0x667799);

            this.levelFrames.push(border);
            slot.add([frame, border]);

            const img = this.add.image(30, 0, 'castle')
                .setScale(0.06)
                .setOrigin(0.5);

            const txt = this.add.text(80, 0, `1-${i+1}`, {
                fontSize: '24px',
                fill: '#ffff99',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0, 0.5);

            slot.add([img, txt]);

            const hit = this.add.rectangle(0, 0, levelSlotW, levelSlotH, 0xffffff, 0)
                .setOrigin(0, 0.5)
                .setInteractive();

            hit.on('pointerdown', ((idx) => () => {
                selectedLevelIndex = idx;
                this.levelFrames.forEach((b, j) => {
                    b.setStrokeStyle(3, (j === selectedLevelIndex) ? 0xffff66 : 0x667799);
                });
            })(i));

            slot.add(hit);
            levelsContainer.add(slot);
        }

        // ── Scrollbar ───────────────────────────────────────────────
        const scrollBarX = levelViewX + levelViewW + 15;
        const scrollBarY = levelViewY;
        const scrollBarHeight = levelViewH;

        const scrollTrack = this.add.rectangle(scrollBarX, scrollBarY + scrollBarHeight / 2, 10, scrollBarHeight, 0x666666)
            .setOrigin(0.5);
        rightContainer.add(scrollTrack);

        const totalContentH = 10 * (levelSlotH + levelSpacingY) - levelSpacingY;
        const maxScroll = Math.max(0, totalContentH - levelViewH);
        const thumbHeight = Math.max(30, (levelViewH / totalContentH) * scrollBarHeight || 30);

        const scrollThumb = this.add.rectangle(scrollBarX, scrollBarY, 10, thumbHeight, 0xaaaaaa)
            .setOrigin(0.5, 0)
            .setInteractive();
        rightContainer.add(scrollThumb);

        let scrollPos = 0;

        const updateThumbPosition = () => {
            const thumbRange = scrollBarHeight - thumbHeight;
            scrollThumb.y = scrollBarY + (scrollPos / maxScroll) * thumbRange;
        };

        updateThumbPosition();

        this.input.on('wheel', (pointer, over, deltaX, deltaY) => {
            if (!this.trainingOverlayContainer.visible) return;

            const relX = pointer.x - (overlayX + rightContainer.x + levelViewX);
            const relY = pointer.y - (overlayY + rightContainer.y + levelViewY);

            if (relX >= 0 && relX <= levelViewW && relY >= 0 && relY <= levelViewH) {
                scrollPos += deltaY * 0.5;
                scrollPos = Phaser.Math.Clamp(scrollPos, 0, maxScroll);
                levelsContainer.y = levelViewY + topPadding - scrollPos;
                updateThumbPosition();
            }
        });

        scrollThumb.on('pointerdown', () => this.input.setDraggable(scrollThumb, true));

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject !== scrollThumb) return;

            const thumbRange = scrollBarHeight - thumbHeight;
            const clampedY = Phaser.Math.Clamp(dragY, scrollBarY, scrollBarY + thumbRange);
            scrollThumb.y = clampedY;

            const progress = (clampedY - scrollBarY) / thumbRange;
            scrollPos = maxScroll * progress;
            levelsContainer.y = levelViewY + topPadding - scrollPos;
        });

        this.input.on('dragend', () => this.input.setDraggable(scrollThumb, false));

        const startBtn = this.add.text(0, overlayH/2 - 60, 'Defend the Castle', {
            fontSize: '40px',
            fill: '#ffffff',
            backgroundColor: '#008822',
            padding: { left: 60, right: 60, top: 20, bottom: 20 }
        })
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerover', () => startBtn.setStyle({ fill: '#ffffcc' }))
        .on('pointerout', () => startBtn.setStyle({ fill: '#ffffff' }))
        .on('pointerdown', () => {
            loadPlayerStats(this);
            computeLevelAndStats(this);
            this.trainingOverlayContainer.setVisible(false);
            this.resumeGameplay();
        });

        this.trainingOverlayContainer.add(startBtn);

        this.trainingOverlayContainer.setVisible(true);
        this.pauseGameplay();

        this.input.keyboard.on('keydown-T', () => {
            if (this.trainingOverlayContainer.visible) {
                loadPlayerStats(this);
                computeLevelAndStats(this);
                this.trainingOverlayContainer.setVisible(false);
                this.resumeGameplay();
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
        const rateFactor = Math.pow(1.3, selectedLevelIndex);
        spawnTimer.delay = 5900 / rateFactor;
        levelSpeedMultiplier = Math.pow(1.2, selectedLevelIndex);

        this.physics.resume();
        if (spawnTimer) spawnTimer.paused = false;
        if (shootTimer) shootTimer.paused = false;
        if (gameTimer) gameTimer.paused = false;
        if (enemyLevelTimer) enemyLevelTimer.paused = false;
        if (xpGrowthTimer) xpGrowthTimer.paused = false;

        player.destroy();
        player = this.physics.add.sprite(280, 460, CHARACTERS[currentCharacterIndex].spriteKey);
        player.setScale(CHARACTERS[currentCharacterIndex].spriteScale);
        player.setOrigin(0.5, 1.0);
        player.body.setSize(32, 64);
        player.body.setOffset(16, 0);
        player.body.immovable = true;
        player.anims.play('idle_cycle');
    }
}

// =============================================
// GLOBAL HELPER FUNCTIONS
// =============================================

function autoShootAtNearest() {
    if (castleStats.gameState !== 'playing' || !player || !player.active) return;

    const targets = [];
    enemies.children.iterate(e => {
        if (e.active && e.x > player.x + 25) targets.push(e);
    });

    const attacking = targets.filter(e => e.isAttacking);
    const normal = targets.filter(e => !e.isAttacking);

    const priority = [...attacking, ...normal].sort((a,b) => {
        if (a.isAttacking !== b.isAttacking) return a.isAttacking ? -1 : 1;
        return Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y) -
               Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
    });

    const count = Math.min(playerStats.projectilesCount, priority.length);

    for (let i = 0; i < count; i++) shootAtTarget(priority[i]);
}

function shootAtTarget(target) {
    const spawnX = player.x;
    const spawnY = player.y - (player.displayHeight / 2) * 0.5;

    const star = stars.create(spawnX, spawnY, 'star');
    star.setTint(0xffff00);
    star.setScale(1.47 * 1.8 * 0.67);

    const bodySize = 48 * 0.8;
    star.body.setSize(bodySize, bodySize);
    star.body.setOffset((star.displayWidth - bodySize) / 2, (star.displayHeight - bodySize) / 2);

    const dx = target.x - spawnX;
    const dy = target.y - spawnY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 1) {
        star.setVelocity(0, 0);
        return;
    }

    const speed = playerStats.projectileTravelSpeed;
    const tx = target.body.velocity.x;
    const ty = target.body.velocity.y;

    const a = tx*tx + ty*ty - speed*speed;
    const b = 2*(dx*tx + dy*ty);
    const c = dx*dx + dy*dy;

    let t = -1;
    if (Math.abs(a) < 0.001) {
        t = -c / b;
        if (t < 0) t = dist / speed;
    } else {
        const disc = b*b - 4*a*c;
        if (disc >= 0) {
            const sd = Math.sqrt(disc);
            t = (-b - sd) / (2*a);
            if (t <= 0) t = (-b + sd) / (2*a);
        }
    }

    if (t <= 0 || !isFinite(t)) t = dist / speed;

    let px = target.x + tx * t;
    let py = target.y + ty * t;

    // ── NEW: Clamp prediction to the stop line (barrier) ─────────────
    px = Math.max(px, stopLine.x);

    const angle = Phaser.Math.Angle.Between(spawnX, spawnY, px, py);
    star.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
}

// =============================================
// GAME CONFIG + START
// =============================================

const config = {
    type: Phaser.AUTO,
    width: 1440,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, Castle]
};

const game = new Phaser.Game(config);