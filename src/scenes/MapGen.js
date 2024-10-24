class Map extends Phaser.Scene {
    constructor() {
        super('mapScene');
    }

    create() {
        this.map = null;

        this.reseed();

        this.scaleFactor = 0.5;

        this.width = (20 * widthFactor) / this.scaleFactor;
        this.height = (15 * heightFactor) / this.scaleFactor;
        
        const water = [186, 202, 203];
        const land = this.rectangularSlice(landArr, 3, landOffset);
        const mountain = this.rectangularSlice(mountainArr, 3, mountainOffset);

        this.world = [water, land, mountain];

        this.landDecor = this.rectangularSlice(landDecorArr, 2, landDecorOffset);

        this.mountainDecor = this.rectangularSlice(mountainDecorArr, 2, mountainDecorOffset);

        this.generateMap();

        this.reload = this.input.keyboard.addKey('R');

        this.decreaseNoise = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA);
        this.increaseNoise = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);


        this.noiseSampleWindowText = this.add.text(10, 10, 'Noise Sample Window: ' + noiseSampleWindow, { fontFamily: 'Arial', fontSize: '24px', color: '#000000' });

        this.noiseSampleWindowText.setDepth(2);

        // Create Player
        this.player = new Player(this, 0, 0);
    }

    generateMap() {
 
        const arr = [];

        for (let i = 0; i < this.height; i++) {
            arr.push([])
            for (let j = 0; j < this.width; j++) {
                let x = this.noiseValue(i, j);

                let tile = this.threeSection(x, worldSyms);

                arr[i].push(tile);
            }
        }

        this.map = arr;


        let landSpecifics = arr.map(function(arr) {
            return arr.slice();
        });

        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (landSpecifics[i][j] === '^') {
                    landSpecifics[i][j] = '-';
                }
            }
        }

     
        const waterLayer = [];
        const landLayer = [];
        const mountainLayer = [];
        for (let i = 0; i < this.height; i++) {
            waterLayer.push([]);
            landLayer.push([]);
            mountainLayer.push([]);
            for (let j = 0; j < this.width; j++) {
                let char = arr[i][j];

                let type = this.tileType(char);

                let code = type == this.world[1] ? this.tileCode(landSpecifics, i, j, char) : this.tileCode(arr, i, j, char);

                let tile;

                if (lookup[code] === null) {
                    tile = type !== this.world[0] ? type[1][1] : this.calculateWaterTile(i, j);
                } else {
                    let [x, y] = lookup[code];

                    tile = type !== this.world[0] ? type[y][x] : this.calculateWaterTile(i, j);
                }

                if (type == this.world[1]) {
                    landLayer[i].push(tile);
                    mountainLayer[i].push(blank);
                } else if (type == this.world[2]) {
                    let [landX, landY] = lookup[this.tileCode(landSpecifics, i, j, landSpecifics[i, j])];
                    landLayer[i].push(this.world[1][landY][landX]);
                    mountainLayer[i].push(tile);
                } else {
                    landLayer[i].push(blank);
                    mountainLayer[i].push(blank);
                }

                waterLayer[i].push(this.calculateWaterTile(i, j));
            }
        }

        const waterMap = this.make.tilemap({
            data: waterLayer,      // load direct from array
            tileWidth: tileSize,
            tileHeight: tileSize
        })

        const tilesheet = waterMap.addTilesetImage('tiles');

        const wlayer = waterMap.createLayer(0, tilesheet, 0, 0);

        wlayer.setScale(this.scaleFactor);

        const landMap = this.make.tilemap({
            data: landLayer,
            tileWidth: tileSize,
            tileHeight: tileSize
        })

        const landTilesheet = landMap.addTilesetImage('tiles');

        const llayer = landMap.createLayer(0, landTilesheet, 0, 0);
        
        llayer.setScale(this.scaleFactor);

        const mountainMap = this.make.tilemap({
            data: mountainLayer,
            tileWidth: tileSize,
            tileHeight: tileSize
        })

        const mountainTilesheet = mountainMap.addTilesetImage('tiles');

        const mlayer = mountainMap.createLayer(0, mountainTilesheet, 0, 0);

        mlayer.setScale(this.scaleFactor);

        this.decorateMap(arr);
    }

    reseed() {
        this.seed = Math.random();
        noise.seed(this.seed);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.reload)) {
            this.reseed();
            this.generateMap();
        }

        if (Phaser.Input.Keyboard.JustDown(this.decreaseNoise)) {

            if (noiseSampleWindow > 1) {
                noiseSampleWindow -= 1;
            }
            this.noiseSampleWindowText.text = 'Noise Sample Window: ' + noiseSampleWindow;
            this.generateMap();
        }

        if (Phaser.Input.Keyboard.JustDown(this.increaseNoise)) {
     
            noiseSampleWindow += 1;
            this.noiseSampleWindowText.text = 'Noise Sample Window: ' + noiseSampleWindow;
            this.generateMap();
        }

        this.player.changeSprite();
    }

    noiseValue(i, j) {
        let value = noise.simplex2(i / noiseSampleWindow, j / noiseSampleWindow);
        return Math.round(Math.abs(value) * 256);
    }

    threeSection(noiseValue, vals, cutoff1 = 85, cutoff2 = 170) {


        if (noiseValue < cutoff1) {
            return vals[0];
        } else if (noiseValue < cutoff2) {
            return vals[1];
        } else {
            return vals[2];
        }
    }

    fourSection(noiseValue, vals, min, max) {

        
        let diff = (max - min) / 2;
        let cutoff = min + diff;
        let cutoff1 = cutoff + (diff / 4);
        let cutoff2 = cutoff + (diff / 2);
        let cutoff3 = cutoff + 3 * (diff / 4)

        if (noiseValue < cutoff) {
            return blank;
        } else if (noiseValue < cutoff1) {
            return vals[0][0];
        } else if (noiseValue < cutoff2) {
            return vals[0][1];
        } else if (noiseValue < cutoff3) {
            return vals[1][0];
        } else {
            return vals[1][1];
        }
    }

    rectangularSlice(arr, height, verticalGap = 0) {

        let array = [];
        let width = arr.length;

        for (let y = 0; y < height; y++) {
            array.push([]);
            for (let x = 0; x < width; x++) {
                array[y].push(arr[y] + gap * (x + verticalGap));
            }
        }

        return array;
    }

    tileType(char) {


        let tile;

        switch (char) {
            case '~':
                tile = this.world[0];
                break;
            case '-':
                tile = this.world[1];
                break;
            case '^':
                tile = this.world[2];
                break;
            default:
                tile = this.world[0];
                console.log('Invalid character. Defaulting to water tile.');
                break;
        }

        return tile;
    }

    tileCode(arr, i, j, target) {
        const northBit = this.tileCheck(arr, i - 1, j, target) ? 1 : 0;
        const southBit = this.tileCheck(arr, i + 1, j, target) ? 1 : 0;
        const eastBit = this.tileCheck(arr, i, j + 1, target) ? 1 : 0;
        const westBit = this.tileCheck(arr, i, j - 1, target) ? 1 : 0;

        const code =
          (northBit << 0) + (southBit << 1) + (eastBit << 2) + (westBit << 3);
        
        return code;
    }

    tileCheck(arr, i, j, target) {
        return arr[i] && arr[i][j] === target;
    }

    calculateWaterTile(i, j) {
        return this.threeSection(this.noiseValue(i, j), this.world[0], waterThreshold / 3, 2*(waterThreshold / 3));
    }

    decorateMap(arr) {
        let decorLayer = [];
        
        for (let i = 0; i < this.height; i++) {
            decorLayer.push([]);
            for (let j = 0; j < this.width; j++) {
                switch (arr[i][j]) {
                    case '~':
                        decorLayer[i].push(blank);
                        break;
                    case '-':
                        let placeLandDecor = decorPlacementLookup[this.tileCode(arr, i, j, '-')];
                        let landTile = placeLandDecor ? this.fourSection(this.noiseValue(i, j), this.landDecor, waterThreshold, landThreshold) : blank;
                        decorLayer[i].push(landTile);
                        break;
                    case '^':
                        let placeMountainDecor = decorPlacementLookup[this.tileCode(arr, i, j, '^')];
                        let mountainTile = placeMountainDecor ? this.fourSection(this.noiseValue(i, j), this.mountainDecor, landThreshold, mountainThreshold) : blank;
                        decorLayer[i].push(mountainTile);
                        break;
                    default:
                        decorLayer[i].push(blank);
                        console.log('Invalid character. Defaulting to water tile.');
                        break;
                }
            }
        }

        const decorMap = this.make.tilemap({
            data: decorLayer,     
            tileWidth: tileSize,
            tileHeight: tileSize
        })

        const tilesheet = decorMap.addTilesetImage('tiles');

        const layer = decorMap.createLayer(0, tilesheet, 0, 0);

        layer.setScale(this.scaleFactor);
    }
}
