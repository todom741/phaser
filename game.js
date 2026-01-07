const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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

let player, stars, bombs, platforms, cursors, score = 0, scoreText;
let portraitOverlay;
let leftButton, rightButton, jumpButton;
let leftText, rightText, jumpText;
let isMobile = false;

function preload() {
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

function create() {
    // Reliable mobile detection
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Auto fullscreen
    this.scale.startFullscreen();

    this.add.image(400, 300, 'sky');

    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');

    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.physics.add.collider(player, platforms);

    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });
    stars.children.iterate(child => child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8)));
    this.physics.add.collider(stars, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#000' });

    bombs = this.physics.add.group();
    this.physics.add.collider(bombs, platforms);
    this.physics.add.collider(player, bombs, hitBomb, null, this);

    cursors = this.input.keyboard.createCursorKeys();

    // === MOBILE TOUCH CONTROLS ===
    if (isMobile) {
        const buttonRadius = 50;
        const padding = 30;

        // LEFT & RIGHT on the LEFT side
        leftButton = this.add.circle(
            padding + buttonRadius,
            this.scale.height - (padding + buttonRadius),
            buttonRadius, 0x000000, 0.5
        ).setInteractive().setDepth(10);

        rightButton = this.add.circle(
            padding + buttonRadius * 3 + padding,
            this.scale.height - (padding + buttonRadius),
            buttonRadius, 0x000000, 0.5
        ).setInteractive().setDepth(10);

        leftText = this.add.text(leftButton.x, leftButton.y, '←', {
            fontSize: '56px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);

        rightText = this.add.text(rightButton.x, rightButton.y, '→', {
            fontSize: '56px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(11);

        // JUMP on the RIGHT side
        jumpButton = this.add.circle(
            this.scale.width - (padding + buttonRadius),
            this.scale.height - (padding + buttonRadius),
            buttonRadius * 1.3, 0x000000, 0.5  // slightly larger
        ).setInteractive().setDepth(10);

        jumpText = this.add.text(jumpButton.x, jumpButton.y, 'JUMP', {
            fontSize: '36px', color: '#ffffff', fontFamily: 'Arial Black'
        }).setOrigin(0.5).setDepth(11);

        // Input handling
        leftButton.on('pointerdown', () => cursors.left.isDown = true);
        leftButton.on('pointerup', () => cursors.left.isDown = false);
        leftButton.on('pointerout', () => cursors.left.isDown = false);

        rightButton.on('pointerdown', () => cursors.right.isDown = true);
        rightButton.on('pointerup', () => cursors.right.isDown = false);
        rightButton.on('pointerout', () => cursors.right.isDown = false);

        jumpButton.on('pointerdown', () => cursors.up.isDown = true);
        jumpButton.on('pointerup', () => cursors.up.isDown = false);
        jumpButton.on('pointerout', () => cursors.up.isDown = false);
    }

    // Portrait overlay
    portraitOverlay = this.add.container(400, 300).setVisible(false);
    const bg = this.add.rectangle(0, 0, 500, 180, 0x000000, 0.75);
    const msg = this.add.text(0, 0, 'Please rotate to landscape mode', {
        fontSize: '36px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5);
    portraitOverlay.add([bg, msg]);

    // Resize & orientation handling
    this.scale.on('resize', resizeControls, this);
    this.scale.on('orientationchange', handleOrientation, this);

    this.scale.lockOrientation('landscape');
    handleOrientation.call(this);
}

function resizeControls() {
    if (!isMobile) return;

    const buttonRadius = 50;
    const padding = 30;

    // Reposition left/right
    leftButton?.setPosition(padding + buttonRadius, this.scale.height - (padding + buttonRadius));
    rightButton?.setPosition(padding + buttonRadius * 3 + padding, this.scale.height - (padding + buttonRadius));
    leftText?.setPosition(leftButton.x, leftButton.y);
    rightText?.setPosition(rightButton.x, rightButton.y);

    // Reposition jump
    jumpButton?.setPosition(this.scale.width - (padding + buttonRadius), this.scale.height - (padding + buttonRadius));
    jumpText?.setPosition(jumpButton.x, jumpButton.y);

    // Center overlay
    portraitOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
}

function handleOrientation() {
    if (this.scale.orientation === Phaser.Scale.PORTRAIT) {
        this.physics.pause();
        portraitOverlay.setVisible(true);
    } else {
        this.physics.resume();
        portraitOverlay.setVisible(false);
    }
    resizeControls.call(this);
}

function update() {
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }
}

function collectStar(player, star) {
    star.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);

    if (stars.countActive(true) === 0) {
        stars.children.iterate(child => child.enableBody(true, child.x, 0, true, true));
        let x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
        let bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
}

function hitBomb(player, bomb) {
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
}