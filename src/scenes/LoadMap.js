class Load extends Phaser.Scene {
    constructor() {
        super('loadScene');
    }

    preload() {
        this.load.path = './assets/kenney_map-pack/Tilesheet/';
        this.load.image('tiles', 'mapPack_tilesheet.png');

        let loadingBar = this.add.graphics();
        this.load.on('progress', (value) => {
            loadingBar.clear();                            
            loadingBar.fillStyle(0xFFFFFF, 1);                 
            loadingBar.fillRect(0, centerY, w * value, 5); 
        });
        this.load.on('complete', () => {
            loadingBar.destroy();
        });
    }

    create() {
        this.scene.start('mapScene');
    }
}
