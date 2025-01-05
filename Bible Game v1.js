// Create the canvas and set up the game----------------------------------------------------------------------------- Part 1
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let leftPadding = 0; // Define the left padding as a variable
canvas.width = 1600 + leftPadding; // Include leftPadding in the total width
canvas.height = 900; // Updated height
let level = 1; // Start at level 1
let levelResetTriggered = false; // Prevent multiple level resets
let enemyCollisionHandled = false; // Ensure enemy collision is handled once
let purpleSquareCooldown = false; // Cooldown for purple squares
document.body.appendChild(canvas);

// Adjust canvas position to create left padding
canvas.style.position = 'relative';
canvas.style.left = `${leftPadding}px`;

// Define the maze layout
let maze;
let cellSize = 50;

// Define the doors and their positions
const doors = [];
const doorSize = { width: 50, height: 50 };
const cornerSquares = [
    { x: leftPadding, y: 0, width: 50, height: 50, reached: false }, // Top-left
    { x: canvas.width - 50, y: 0, width: 50, height: 50, reached: false }, // Top-right
    { x: leftPadding, y: canvas.height - 50, width: 50, height: 50, reached: false }, // Bottom-left
    { x: canvas.width - 50, y: canvas.height - 50, width: 50, height: 50, reached: false } // Bottom-right
];

let purpleSquares = [
    { x: 0, y: 0, width: 50, height: 50 },
    { x: 0, y: 0, width: 50, height: 50 }
];

let bibleVerses = [];

// Add scaling logic for the canvas
function scaleCanvas() {
    const internalWidth = 1600; // Fixed logical width
    const internalHeight = 900; // Fixed logical height
    const aspectRatio = internalWidth / internalHeight; // Calculate aspect ratio

    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    // Calculate the scaling factor to preserve aspect ratio
    const scale = Math.min(
        availableWidth / internalWidth,
        availableHeight / internalHeight
    );

    // Calculate the new scaled width and height
    const scaledWidth = internalWidth * scale;
    const scaledHeight = internalHeight * scale;

    // Apply the scaling
    canvas.style.width = `${scaledWidth}px`;
    canvas.style.height = `${scaledHeight}px`;

    // Center the canvas on the screen
    canvas.style.marginTop = `${(availableHeight - scaledHeight) / 2}px`;
    canvas.style.marginLeft = `${(availableWidth - scaledWidth) / 2}px`;

    console.log(`Canvas scaled to ${scaledWidth}x${scaledHeight}, preserving aspect ratio.`);
}

// Attach the resize event listener and scale the canvas initially
window.addEventListener('resize', scaleCanvas);
scaleCanvas(); // Initial scaling


//---------------------------------------------------------------------------------------------------------------------------------------- Part 2
const hero = {
    x: 0,
    y: 0,
    radius: 10,
    speed: 5
};

// Preload the hero image
const heroImage = new Image();
heroImage.src = 'hero.png'; // Ensure hero.png is in the correct directory
heroImage.onload = function () {
    console.log('Hero image loaded successfully.');
};

// Define the enemy
const enemy = {
    x: 0,
    y: 0,
    radius: 10,
    speed: 2,
    active: true,
    stoppedUntil: null
};

// Notification system functions
function showNotification(message, options = {}) {
    const container = document.getElementById('notification-container');

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    if (options.restartButton) {
        const restartButton = document.createElement('button');
        restartButton.className = 'restart-button';
        restartButton.textContent = 'Restart';
        restartButton.addEventListener('click', () => {
            container.removeChild(notification);
            resetGame(); // Restart the game
        });
        notification.appendChild(restartButton);
    } else {
        setTimeout(() => {
            if (notification.parentElement) {
                container.removeChild(notification);
                if (typeof options.onDismiss === 'function') {
                    options.onDismiss();
                }
            }
        }, options.duration || 5000);
    }

    container.appendChild(notification);
}
//---------------------------------------------------------------------------------------------------------------------------------------- Part 3
function resetGame() {
    levelResetTriggered = false; // Reset level reset trigger
    enemyCollisionHandled = false; // Reset enemy collision handling
    purpleSquareCooldown = false; // Reset purple square cooldown
    gamePaused = false; // Ensure the game is not paused after restart

    console.log('Resetting game...');
    console.log(`Initial gamePaused state: ${gamePaused}`);

    // Stop the current game loop to prevent duplicate intervals
    stopGameLoop();

    // Reset the level number
    level = 1; // Reset to the first level (or set appropriately)
    console.log(`Level reset to: ${level}`);

    // Reinitialize properties dynamically for the current level
    const dimensions = getMazeDimensions(level);
    adjustPropertiesForLevel(level); // Properly adjust cell size and related properties
    generateMaze(dimensions.rows, dimensions.cols); // Regenerate the maze with the correct dimensions

    console.log(`Maze regenerated with dimensions: rows=${dimensions.rows}, cols=${dimensions.cols}`);
    console.log(`Cell size after adjustment: ${cellSize}`);

    // Reset hero and enemy positions
    spawnHero();
    console.log(`Hero spawned at: x=${hero.x}, y=${hero.y}`);

    placeEnemy(); // Place the enemy at a corner or deactivate it for levels below 10
    enemy.speed = 2; // Ensure the enemy's speed is reset to the default
    console.log(`Enemy placed. Active state: ${enemy.active}, Speed: ${enemy.speed}`);

    // Reinitialize blue squares
    placeCornerSquares(); // Ensure this is called after maze and cell size updates
    console.log('Corner squares reinitialized.');

    // Reset purple squares
    initializePurpleSquares(); // Ensure this is called after maze and cell size updates
    console.log('Purple squares reinitialized.');

    // Reset doors
    doors.length = 0; // Clear current doors
    placeDoors(); // Reinitialize door placements
    console.log(`Doors reset. Total doors: ${doors.length}`);

    // Ensure all movement and interaction mechanics are reinitialized
    stopHeroMovement();
    isHeroMoving = false;
    currentPath = [];
    moveHero(); // Reinitialize hero movement after resetting everything

    console.log('Game movement reset.');
    console.log(`Game paused state after reset: ${gamePaused}`);
    console.log('Game restarted');
    gameLoop(); // Restart the game loop
}

function stopGameLoop() {
    if (gameLoopId !== null) {
        console.log('Stopping existing game loop...');
        cancelAnimationFrame(gameLoopId); // Stop the animation frame
        gameLoopId = null; // Reset the game loop ID
    } else {
        console.log('No existing game loop to stop.');
    }
}











// Generate a random maze----------------------------------------------------------------------------- Part 4
function generateMaze(rows, cols) {
    maze = Array.from({ length: rows }, () => Array(cols).fill(1));

    function carvePassage(row, col) {
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];

        // Shuffle directions for randomness
        directions.sort(() => Math.random() - 0.5);

        for (const [dr, dc] of directions) {
            const newRow = row + dr * 2;
            const newCol = col + dc * 2;

            if (
                newRow >= 0 && newRow < rows &&
                newCol >= 0 && newCol < cols &&
                maze[newRow][newCol] === 1
            ) {
                maze[row + dr][col + dc] = 0; // Clear the wall
                maze[newRow][newCol] = 0; // Clear the cell
                carvePassage(newRow, newCol);
            }
        }
    }

    maze[1][1] = 0; // Start point
    carvePassage(1, 1);
}

// Dynamically adjust maze size based on level
function getMazeDimensions(level) {
    const baseRows = 18;
    const baseCols = 32;
    const scaleFactor = Math.max(1, Math.floor(level / 2));
    return { rows: baseRows * scaleFactor, cols: baseCols * scaleFactor };
}


// Ensure the maze is generated before defining exits
generateMaze(18, 32); // Adjusted dimensions for the maze


// Adjust properties dynamically based on level---------------------------------------------------------------------------------------------------------------------------------------- Part X
function adjustPropertiesForLevel(level) {
    const baseCellSize = 50;
    cellSize = baseCellSize / Math.max(1, Math.floor(level / 2));

    // Scale door size
    doorSize.width = cellSize;
    doorSize.height = cellSize;

    // Scale hero and enemy radius
    hero.radius = cellSize / 5;
    enemy.radius = cellSize / 5;

    // Update purple square size
    purpleSquares.forEach(square => {
        square.width = cellSize;
        square.height = cellSize;
    });

    // Adjust corner squares
    cornerSquares.forEach(square => {
        square.width = cellSize;
        square.height = cellSize;
    });

    console.log(`Properties adjusted for level ${level}: cellSize=${cellSize}`);
}


// Define four exits for the maze----------------------------------------------------------------------------- Part 5
const exits = [
    [1, Math.floor(maze[0].length / 2)], // Top center
    [maze.length - 2, Math.floor(maze[0].length / 2)], // Bottom center
    [Math.floor(maze.length / 2), 1], // Left center
    [Math.floor(maze.length / 2), maze[0].length - 2] // Right center
];

exits.forEach(([row, col]) => {
    maze[row][col] = 0; // Ensure the cell is walkable
    doors.push({
        x: col * cellSize + leftPadding, // Correct padding applied
        y: row * cellSize,
        removed: false,
        incorrect: false
    });
});




function spawnHero() {
    const middleRow = Math.floor(maze.length / 2);
    const middleCol = Math.floor(maze[0].length / 2);

    // Find the nearest walkable cell to the middle
    if (maze[middleRow][middleCol] === 0) {
        hero.x = middleCol * cellSize + cellSize / 2 + leftPadding; // Adjusted for left padding
        hero.y = middleRow * cellSize + cellSize / 2;
    } else {
        // If the middle cell is not walkable, search nearby
        for (let row = middleRow - 1; row <= middleRow + 1; row++) {
            for (let col = middleCol - 1; col <= middleCol + 1; col++) {
                if (maze[row] && maze[row][col] === 0) {
                    hero.x = col * cellSize + cellSize / 2 + leftPadding; // Adjusted for left padding
                    hero.y = row * cellSize + cellSize / 2;
                    return;
                }
            }
        }
    }
}

// Load verses from the text file----------------------------------------------------------------------------- Part 6
async function loadVerses() {
    try {
        const response = await fetch('Verses.txt'); // Ensure Verses.txt is in the same directory
        if (!response.ok) throw new Error('Failed to load Verses.txt');
        const text = await response.text();
        const lines = text.split('\n');

        let currentReference = '';
        let currentVerse = '';

        lines.forEach(line => {
            if (line.trim() === '') {
                if (currentReference && currentVerse) {
                    const parts = parseReference(currentReference);
                    // console.log('Parsed Reference:', currentReference, parts); // Debug log muted
                    bibleVerses.push({
                        reference: currentReference.trim(),
                        verse: currentVerse.trim(),
                        parts,
                    });
                }
                currentReference = '';
                currentVerse = '';
            } else if (!currentReference) {
                currentReference = line.trim();
            } else {
                currentVerse += (currentVerse ? ' ' : '') + line.trim();
            }
        });

        // Add the last verse if the file doesn't end with a blank line
        if (currentReference && currentVerse) {
            const parts = parseReference(currentReference);
            // console.log('Parsed Reference:', currentReference, parts); // Debug log muted
            bibleVerses.push({
                reference: currentReference.trim(),
                verse: currentVerse.trim(),
                parts,
            });
        }

        console.log('Verses loaded successfully.'); // Retained for high-level confirmation
    } catch (error) {
        console.error('Error loading verses:', error);
        alert('Error loading verses. Ensure Verses.txt is in the correct format and directory.');
    }
}

//---------------------------------------------------------------------------------------------------------------------------------------- Part 7
function parseReference(reference) {
    // Regex to handle various reference formats
    const match = reference.match(
        /^(\d+)?\s*([A-Za-z\s]+?)\s*(\d+):(\d+)(?:[-/]\d+:\d+)?(?:\s(ESV|NIV|KJV|NLT|MSG))?$/
    );

    if (!match) {
        console.error(`Invalid reference format: ${reference}`);
        return { A: '', B: '', C: '', E: '' }; // Return empty parts for invalid references
    }

    const partA = match[1] ? parseInt(match[1], 10) : ''; // Handle optional initial number
    const partB = match[2] ? match[2].trim() : '';        // Handle book name
    const partC = match[3] ? parseInt(match[3], 10) : ''; // Handle chapter
    const partE = match[4] ? parseInt(match[4], 10) : ''; // Handle verse

    return { A: partA, B: partB, C: partC, E: partE };
}

function parseReference(reference) {
    // Clean up the reference to remove ranges and multi-line parts
    const cleanedReference = reference.split(/[-/]/)[0].trim();

    // Regex to handle cleaned references
    const match = cleanedReference.match(
        /^(\d+)?\s*([A-Za-z\s]+?)\s*(\d+):(\d+)(?:\s(ESV|NIV|KJV|NLT|MSG))?$/
    );

    if (!match) {
        console.error(`Invalid reference format: ${reference}`);
        return { A: '', B: '', C: '', E: '' };
    }

    const partA = match[1] ? parseInt(match[1], 10) : ''; // Handle optional initial number
    const partB = match[2] ? match[2].trim() : '';        // Handle book name
    const partC = match[3] ? parseInt(match[3], 10) : ''; // Handle chapter
    const partE = match[4] ? parseInt(match[4], 10) : ''; // Handle verse

    return { A: partA, B: partB, C: partC, E: partE };
}


//---------------------------------------------------------------------------------------------------------------------------------------- Part 8
const portalImage = new Image();
portalImage.src = 'portal.png'; // Ensure portal.png is in the correct directory
portalImage.onload = function () {
    console.log('Portal image loaded successfully.');
};

const floorImage = new Image();
floorImage.src = 'floor.jpg'; // Ensure floor.jpg is in the correct directory
floorImage.onload = function () {
    console.log('Floor image loaded successfully.');
};

function drawMaze() {
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const x = col * cellSize + leftPadding;
            const y = row * cellSize;

            if (maze[row][col] === 1) {
                // Draw black tiles for walls
                ctx.fillStyle = 'black';
                ctx.fillRect(x, y, cellSize, cellSize);
            } else if (maze[row][col] === 0) {
                // Draw floor.jpg for walkable tiles
                ctx.drawImage(floorImage, x, y, cellSize, cellSize);
            }
        }
    }

    // Adjust blue border to account for the left padding
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 10;
    ctx.strokeRect(leftPadding, 0, canvas.width - leftPadding, canvas.height);
}

function drawPortals() {
    // Draw the purple squares if they exist, replacing them with the portal image
    if (purpleSquares.length > 0) {
        purpleSquares.forEach(square => {
            ctx.drawImage(portalImage, square.x, square.y, square.width, square.height);
        });
    }
}



function placePurpleSquares() {
    const leftSquarePosition = findWalkableTileOnSide('left');
    const rightSquarePosition = findWalkableTileOnSide('right');

    purpleSquares[0].x = leftSquarePosition.col * cellSize + leftPadding;
    purpleSquares[0].y = leftSquarePosition.row * cellSize;

    purpleSquares[1].x = rightSquarePosition.col * cellSize + leftPadding;
    purpleSquares[1].y = rightSquarePosition.row * cellSize;

    console.log("Placed Purple Squares:", purpleSquares); // Debug log
}



//---------------------------------------------------------------------------------------------------------------------------------------- Part 9
// Ensure doorImage is declared globally and initialized before use
const doorImage = new Image();
doorImage.src = 'door.jpg'; // Ensure door.jpg is in the correct directory
doorImage.onload = function () {
    console.log('Door image loaded successfully.');
};

// Place doors only in corridors
function placeDoors() {
    const corridors = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            if (maze[row][col] === 0) {
                corridors.push({ row, col });
            }
        }
    }

    // Shuffle corridors for randomness
    corridors.sort(() => Math.random() - 0.5);

    // Place doors in the first four corridors
    for (let i = 0; i < Math.min(4, corridors.length); i++) {
        const { row, col } = corridors[i];
        doors.push({
            x: col * cellSize + leftPadding, // Correct padding applied
            y: row * cellSize,
            removed: false,
            incorrect: false,
        });
    }
}

// Draw the doors
function drawDoors() {
    if (!doorImage.complete) {
        console.warn('Door image is not yet loaded.');
        return;
    }

    doors.forEach(door => {
        if (!door.removed) {
            if (door.incorrect) {
                // Draw a red rectangle for incorrect doors
                ctx.fillStyle = 'red';
                ctx.fillRect(door.x, door.y, doorSize.width, doorSize.height);
            } else {
                // Replace correct doors with the door.jpg image
                ctx.drawImage(doorImage, door.x, door.y, doorSize.width, doorSize.height);
            }
        }
    });
}

// Draw the hero
function drawHero() {
    const heroSize = 50; // Size of the hero image (50x50 pixels)
    const offset = heroSize / 2;

    // Draw the hero image centered at the hero's position
    ctx.drawImage(heroImage, hero.x - offset, hero.y - offset, heroSize, heroSize);
}


// Centralized list of Bible books
const allBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "Samuel", "Kings",
    "Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
    "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
    "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea",
    "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
    "Malachi", "Matthew", "Mark", "Luke", "John",
    "Acts", "Romans", "Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "Thessalonians", "Timothy", "Titus",
    "Philemon", "Hebrews", "James", "Peter", "Jude",
    "Revelation"
];

// Generate valid numbers---------------------------------------------------------------------------------------------------------------------------------------- Part 10
function generateValidNumbers(correctNumber) {
    const options = [];
    while (options.length < 3) {
        const randomNum = Math.floor(Math.random() * 50) + 1;
        if (!options.includes(randomNum) && randomNum !== correctNumber) {
            options.push(randomNum);
        }
    }
    if (!isNaN(correctNumber) && !options.includes(correctNumber)) {
        options.push(correctNumber);
    }
    return options.sort((a, b) => a - b);
}

// Generate random Bible books
function generateRandomBibleBooks(correctBook) {
    const shuffledBooks = allBooks.sort(() => Math.random() - 0.5);
    const options = shuffledBooks.slice(0, 3).concat(correctBook);
    return options
        .filter(book => typeof book === "string") // Ensure only valid strings
        .sort(() => Math.random() - 0.5);
}



// Move the hero----------------------------------------------------------------------------------------------------------------------------------------------- Part 11
let moveInterval = null; // Store the interval ID
let isHeroMoving = false; // Track if the hero is moving
let currentPath = []; // Store the current path
let gamePaused = false; // Pause state for the game

function moveHero() {
    // Debugging log to confirm the function is called
    console.log('moveHero reinitialized');
    
    // Remove any existing event listeners to avoid duplicate bindings
    canvas.removeEventListener('click', handleHeroMove);

    // Attach the click event listener
    canvas.addEventListener('click', handleHeroMove);
}

function handleHeroMove(event) {
    if (gamePaused) {
        console.log('Game paused; ignoring click');
        return; // Prevent movement when the game is paused
    }

    const pos = getScaledMousePosition(event); // Get the scaled mouse position
    console.log(`Hero clicked at scaled position: x=${pos.x}, y=${pos.y}`);
    moveToClosestValidTile(pos.x, pos.y);
}

function getScaledMousePosition(event) {
    const rect = canvas.getBoundingClientRect(); // Get the canvas position
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

function moveToClosestValidTile(clickX, clickY) {
    let targetCol = Math.floor(clickX / cellSize);
    let targetRow = Math.floor(clickY / cellSize);

    console.log(`Initial target: col=${targetCol}, row=${targetRow}`);

    // Adjust target to the closest valid tile if necessary
    if (
        targetCol < 0 ||
        targetCol >= maze[0].length ||
        targetRow < 0 ||
        targetRow >= maze.length ||
        maze[targetRow][targetCol] !== 0
    ) {
        console.log('Target is invalid; finding closest valid tile');
        const closestValid = findClosestWalkableTile(targetCol, targetRow);
        targetCol = closestValid.col;
        targetRow = closestValid.row;
    }

    console.log(`Final target: col=${targetCol}, row=${targetRow}`);

    const start = {
        x: Math.floor((hero.x - leftPadding) / cellSize),
        y: Math.floor(hero.y / cellSize),
    };
    const end = { x: targetCol, y: targetRow };

    const path = findPath(maze, start, end);

    if (path.length > 0) {
        console.log(`Path found: ${JSON.stringify(path)}`);
        stopHeroMovement(); // Stop any existing movement
        currentPath = path; // Set the current path
        followPath(path);
    } else {
        console.warn('No valid path found');
    }
}

function stopHeroMovement() {
    if (moveInterval) {
        clearInterval(moveInterval); // Clear any ongoing movement intervals
        moveInterval = null;
        console.log('Hero movement stopped');
    }
    isHeroMoving = false; // Mark the hero as not moving
    currentPath = []; // Clear the current path
}

function followPath(path) {
    if (path.length <= 1) {
        console.log('Path completed');
        stopHeroMovement();
        return;
    }

    const nextStep = path[1]; // Get the next step on the path
    const targetX = nextStep.x * cellSize + cellSize / 2 + leftPadding;
    const targetY = nextStep.y * cellSize + cellSize / 2;

    isHeroMoving = true;

    moveInterval = setInterval(() => {
        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hero.speed) {
            hero.x = targetX;
            hero.y = targetY;
            clearInterval(moveInterval);
            followPath(path.slice(1)); // Continue to the next step
        } else {
            hero.x += (dx / distance) * hero.speed;
            hero.y += (dy / distance) * hero.speed;
        }
    }, 1000 / 60); // Update at 60 FPS
}

// Find the closest walkable tile------------------------------------------------------------------------------- Part 12
function findClosestWalkableTile(targetCol, targetRow) {
    let closest = { col: targetCol, row: targetRow };
    let minDistance = Infinity;

    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[0].length; col++) {
            if (maze[row][col] === 0) {
                const distance = Math.sqrt(
                    Math.pow(col - targetCol, 2) + Math.pow(row - targetRow, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = { col, row };
                }
            }
        }
    }

    console.log(`Closest walkable tile: col=${closest.col}, row=${closest.row}`);
    return closest;
}

function findWalkableTileOnSide(side) {
    const validTiles = [];
    const halfMaze = Math.floor(maze[0].length / 2);

    // Loop through the maze to find valid walkable tiles on the specified side
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[0].length; col++) {
            if (maze[row][col] === 0) { // Check if the tile is walkable
                if (side === 'left' && col < halfMaze) {
                    validTiles.push({ row, col });
                } else if (side === 'right' && col >= halfMaze) {
                    validTiles.push({ row, col });
                }
            }
        }
    }

    if (validTiles.length === 0) {
        console.error(`No valid tiles found on the ${side} side of the maze.`);
        return { row: 0, col: 0 }; // Return a fallback to prevent crashes
    }

    // Shuffle and return a random valid tile
    validTiles.sort(() => Math.random() - 0.5);
    console.log(`Valid tiles on the ${side} side:`, validTiles);
    return validTiles[0];
}

function moveToClosestValidTile(clickX, clickY) {
    console.log('moveToClosestValidTile called');
    let targetCol = Math.floor(clickX / cellSize);
    let targetRow = Math.floor(clickY / cellSize);

    console.log(`Initial target: col=${targetCol}, row=${targetRow}`);

    // Adjust target to the closest valid tile if necessary
    if (
        targetCol < 0 ||
        targetCol >= maze[0].length ||
        targetRow < 0 ||
        targetRow >= maze.length ||
        maze[targetRow][targetCol] !== 0
    ) {
        console.log('Target is invalid; finding closest valid tile');
        const closestValid = findClosestWalkableTile(targetCol, targetRow);
        targetCol = closestValid.col;
        targetRow = closestValid.row;
    }

    console.log(`Final target: col=${targetCol}, row=${targetRow}`);

    const start = {
        x: Math.floor((hero.x - leftPadding) / cellSize),
        y: Math.floor(hero.y / cellSize),
    };
    const end = { x: targetCol, y: targetRow };

    console.log(`Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}`);

    const path = findPath(maze, start, end);

    if (path.length > 0) {
        console.log(`Path found: ${JSON.stringify(path)}`);
        stopHeroMovement(); // Stop any existing movement
        currentPath = path; // Set the current path
        followPath(path);
    } else {
        console.warn('No valid path found');
    }
}

function stopHeroMovement() {
    if (moveInterval) {
        clearInterval(moveInterval); // Clear any ongoing movement intervals
        moveInterval = null;
        console.log('Hero movement stopped');
    }
    isHeroMoving = false; // Mark the hero as not moving
    currentPath = []; // Clear the current path
}

//---------------------------------------------------------------------------------------------------------------------------------------- Part 13
function followPath(path) {
    let currentStep = 0;
    isHeroMoving = true; // Mark the hero as moving

    moveInterval = setInterval(() => {
        if (currentStep >= path.length || gamePaused) {
            stopHeroMovement(); // Stop movement when path is complete or game is paused
            return;
        }

        const nextStep = path[currentStep];
        const targetX = nextStep.x * cellSize + cellSize / 2 + leftPadding;
        const targetY = nextStep.y * cellSize + cellSize / 2;

        const dx = targetX - hero.x;
        const dy = targetY - hero.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hero.speed) {
            // Snap to the target step
            hero.x = targetX;
            hero.y = targetY;

            // Check if hero interacts with a door
            if (checkHeroDoorCollision()) {
                stopHeroMovement(); // Stop hero upon door interaction
                return;
            }

            currentStep++; // Move to the next step in the path
        } else {
            // Move towards the target step
            hero.x += (dx / distance) * hero.speed;
            hero.y += (dy / distance) * hero.speed;

            // Check if hero interacts with a door mid-movement
            if (checkHeroDoorCollision()) {
                stopHeroMovement(); // Stop hero upon door interaction
                return;
            }
        }

        checkCornerSquareCollision(); // Include collision detection with corner squares
    }, 16); // Update the movement every 16ms for smooth transitions
}

// Pause the game when widget is active---------------------------------------------------------------------------------------------------------------------------------------- Part 14
function pauseGame() {
    gamePaused = true; // Set the pause flag
    stopHeroMovement(); // Stop hero movement
}

// Resume the game when widget is closed
function resumeGame() {
    gamePaused = false; // Clear the pause flag
    console.log('Game resumed');
}


// Update collision logic for doors
function checkHeroDoorCollision() {
    let doorCollisionDetected = false;

    doors.forEach(door => {
        const isColliding =
            hero.x + hero.radius > door.x &&
            hero.x - hero.radius < door.x + doorSize.width &&
            hero.y + hero.radius > door.y &&
            hero.y - hero.radius < door.y + doorSize.height;

        if (isColliding && !door.removed) {
            doorCollisionDetected = true;
            if (!door.engaged) {
                door.engaged = true; // Mark the door as engaged
                console.log('Hero engaged with door:', door); // Debug log
                askBibleVerse(door); // Show the question widget
                pauseGame(); // Pause the game when interacting with a door
            }
        } else {
            door.engaged = false; // Reset the door engagement if no collision
        }
    });

    return doorCollisionDetected;
}

// Update the win condition and collision logic---------------------------------------------------------------------------------------------------------------------------------------- Part 15
function checkPurpleSquareCollision() {
    if (purpleSquareCooldown || purpleSquares.length === 0) return; // Prevent collisions if cooldown is active or squares are removed

    purpleSquares.forEach((square, index) => {
        const isColliding =
            hero.x + hero.radius > square.x &&
            hero.x - hero.radius < square.x + square.width &&
            hero.y + hero.radius > square.y &&
            hero.y - hero.radius < square.y + square.height;

        if (isColliding) {
            console.log(`Hero collided with purple square ${index}`); // Debug log

            // Ensure targetSquare exists before proceeding
            if (purpleSquares.length < 2) {
                console.warn("Teleportation skipped: Purple squares are no longer available.");
                return;
            }

            const targetSquare = index === 0 ? purpleSquares[1] : purpleSquares[0];
            console.log(`Teleporting to square: ${1 - index}, targetSquare:`, targetSquare); // Debug log

            // Teleport the hero to the target square
            hero.x = targetSquare.x + targetSquare.width / 2;
            hero.y = targetSquare.y + targetSquare.height / 2;

            console.log(
                `Hero transported to purple square ${1 - index}: x=${hero.x}, y=${hero.y}`
            ); // Debug log

            // Remove both purple squares
            purpleSquares = []; // Clear the array of purple squares
            console.log("Purple squares removed after teleportation.");

            // Ensure the hero visually updates on the screen
            drawHero();

            // Stop hero movement and clear the path
            stopHeroMovement(); // Stop any ongoing movement
            currentPath = []; // Clear the hero's current path to prevent unintended movement
        }
    });
}






function checkCornerSquareCollision() {
    cornerSquares.forEach((square, index) => {
        if (levelResetTriggered) return; // Prevent multiple resets during the same level

        const isColliding =
            hero.x + hero.radius > square.x &&
            hero.x - hero.radius < square.x + square.width &&
            hero.y + hero.radius > square.y &&
            hero.y - hero.radius < square.y + square.height;

        if (!square.reached && isColliding) {
            square.reached = true; // Mark the square as reached
            console.log(`Corner square reached: Square ${index}`);

            levelResetTriggered = true; // Set flag to prevent further collisions
            showNotification('Corner square reached! Prepare for the next level...', {
                duration: 5000, // Optional: allow notification to auto-dismiss
            });
        }
    });
}
function checkCornerSquareCollision() {
    cornerSquares.forEach((square, index) => {
        if (levelResetTriggered) return; // Prevent multiple resets during the same level

        const isColliding =
            hero.x + hero.radius > square.x &&
            hero.x - hero.radius < square.x + square.width &&
            hero.y + hero.radius > square.y &&
            hero.y - hero.radius < square.y + square.height;

        if (!square.reached && isColliding) {
            square.reached = true; // Mark the square as reached
            console.log(`Corner square reached: Square ${index}`);

            levelResetTriggered = true; // Set flag to prevent further collisions
            showNotification('Corner square reached! Resetting the level...', {
                duration: 5000, // Optional: allow notification to auto-dismiss
                onDismiss: () => {
                    resetLevel(); // Reset level after notification is dismissed
                },
            });
        }
    });
}


// Reset the hero movement during level reset---------------------------------------------------------------------------------------------------------------------------------------- Part 16
function resetLevel() {
    if (levelResetTriggered) return; // Ensure the function is not called redundantly
    levelResetTriggered = false; // Reset the level trigger

    stopHeroMovement(); // Stop hero movement before resetting the level
    level++; // Increment level

    const dimensions = getMazeDimensions(level);
    adjustPropertiesForLevel(level); // Adjust properties dynamically
    generateMaze(dimensions.rows, dimensions.cols); // Regenerate the maze with new dimensions

    // Reset doors and reinitialize
    doors.length = 0;
    placeDoors();

    // Place corner squares on valid walkable paths
    placeCornerSquares();

    // Reset enemy position
    placeEnemy();

    // Display notification instead of alert
    showNotification(`Level ${level} starts now!`, {
        duration: 5000, // Notification auto-dismisses after 5 seconds
    });
}



/// Initialize the purple squares at the start of a level--------------------------------------------------------------------------------------------------------------------------------- Part 17
function initializePurpleSquares() {
    console.log("initializePurpleSquares() called."); // Debug log

    const leftSquarePosition = findWalkableTileOnSide('left');
    const rightSquarePosition = findWalkableTileOnSide('right');

    console.log("Left square position:", leftSquarePosition); // Debug log
    console.log("Right square position:", rightSquarePosition); // Debug log

    if (leftSquarePosition && rightSquarePosition) {
        purpleSquares = [
            {
                x: leftSquarePosition.col * cellSize + leftPadding,
                y: leftSquarePosition.row * cellSize,
                width: 50,
                height: 50,
            },
            {
                x: rightSquarePosition.col * cellSize + leftPadding,
                y: rightSquarePosition.row * cellSize,
                width: 50,
                height: 50,
            },
        ];
        console.log("Purple squares initialized:", purpleSquares); // Debug log
    } else {
        console.warn("Failed to find valid positions for purple squares.");
        purpleSquares = []; // Ensure the array is empty if positions are invalid
    }
}


function canMoveTo(x, y) {
    if (x - hero.radius < leftPadding || x + hero.radius > canvas.width + leftPadding || // Use leftPadding
        y - hero.radius < 0 || y + hero.radius > canvas.height) {
        return false;
    }

    const col = Math.floor((x - leftPadding) / cellSize); // Use leftPadding
    const row = Math.floor(y / cellSize);

    return maze[row] && maze[row][col] === 0;
}

// General function to check if any entity can move to a position
function canEntityMoveTo(x, y, radius) {
    if (x - radius < leftPadding || x + radius > canvas.width + leftPadding || // Use leftPadding
        y - radius < 0 || y + radius > canvas.height) {
        return false;
    }

    const col = Math.floor((x - leftPadding) / cellSize); // Use leftPadding
    const row = Math.floor(y / cellSize);

    return maze[row] && maze[row][col] === 0;
}


/// Start a new level-------------------------------------------------------------------------------------------------------------------------------------------------------------- Part 18
function startLevel(levelNumber) {
    console.log(`Starting level ${levelNumber}`);
    // Reset other level data
    resetHeroPosition();
    resetEnemies();
    resetDoors();

    // Initialize purple squares for the new level
    initializePurpleSquares();

    // Redraw the maze and other elements
    drawMaze();
    drawHero();
}


function checkHeroDoorCollision() {
    doors.forEach(door => {
        // Skip removed doors
        if (door.removed) {
            return;
        }

        const isColliding =
            hero.x + hero.radius > door.x &&
            hero.x - hero.radius < door.x + doorSize.width &&
            hero.y + hero.radius > door.y &&
            hero.y - hero.radius < door.y + doorSize.height;

        if (isColliding) {
            if (!door.engaged) {
                door.engaged = true; // Mark the door as engaged
                console.log('Hero engaged with door:', door); // Debug log
                askBibleVerse(door); // Show the question widget
            }
        } else {
            door.engaged = false; // Reset the door engagement if no collision
        }
    });
}
// Check if the hero is colliding with any door
function isCollidingWithDoor() {
    return doors.some(door =>
        hero.x + hero.radius > door.x &&
        hero.x - hero.radius < door.x + doorSize.width &&
        hero.y + hero.radius > door.y &&
        hero.y - hero.radius < door.y + doorSize.height
    );
}



// Check if the hero escapes the maze---------------------------------------------------------------------------------------------------------------------------------------- Part 19
function checkEscape(x, y) {
    if (x - hero.radius <= 0 || x + hero.radius >= canvas.width ||
        y - hero.radius <= 0 || y + hero.radius >= canvas.height) {
        alert('Congratulations! You escaped the maze!');
    }
}


// Ask a Bible verse----------------------------------------------------------------------------- Part 20
function askBibleVerse(door) {
    console.log('askBibleVerse called'); // Debug log
    if (bibleVerses.length === 0) {
        alert('No verses loaded.');
        return;
    }

    // Pause the game
    pauseGame();

    const randomVerse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
    console.log('Random verse selected:', randomVerse); // Debug log
    createBibleReferenceWidget(randomVerse, document.getElementById('quiz-container'), (isCorrect) => {
        if (isCorrect) {
            showNotification('Correct! The door is removed.');
            door.removed = true;
        } else {
            showNotification(`Incorrect! The correct reference is: ${randomVerse.reference}`);
            door.incorrect = true;
        }

        // Resume the game after interaction
        resumeGame();
    });
}


// Generate valid numbers for the widget
function generateValidNumbers(correctNumber) {
    const options = [];
    while (options.length < 3) {
        const randomNum = Math.floor(Math.random() * 50) + 1;
        if (!options.includes(randomNum) && randomNum !== correctNumber) {
            options.push(randomNum);
        }
    }
    if (!options.includes(correctNumber)) {
        options.push(correctNumber); // Include the correct number
    }
    return options.sort((a, b) => a - b);
}

// Generate random Bible books for the widget---------------------------------------------------------------------------------------------------------------------------------------- Part 21
function generateRandomBibleBooks(correctBook) {
    const allBooks = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "Samuel", "Kings",
        "Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
        "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
        "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea",
        "Joel", "Amos", "Obadiah", "Jonah", "Micah",
        "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
        "Malachi", "Matthew", "Mark", "Luke", "John",
        "Acts", "Romans", "Corinthians", "Galatians", "Ephesians",
        "Philippians", "Colossians", "Thessalonians", "Timothy", "Titus",
        "Philemon", "Hebrews", "James", "Peter", "John",
        "Jude", "Revelation"
    ];

    const shuffledBooks = allBooks.sort(() => Math.random() - 0.5);
    const options = shuffledBooks.slice(0, 3).concat(correctBook);
    return options.sort(() => Math.random() - 0.5);
}

// Create the Bible reference widget---------------------------------------------------------------------------------------------------------------------------------------- Part 22
function createBibleReferenceWidget(verse, container, onResult) {
    const { parts, verse: verseText } = verse;
    const userSelections = { A: null, B: null, C: null, E: null };

    // Clear any existing content in the container
    container.innerHTML = '';
    container.className = 'quiz-container';

    // Create the options grid
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    // Helper function to create option columns
    function createOptionColumn(label, options, key) {
        const column = document.createElement('div');
        column.className = 'option-column';

        const columnLabel = document.createElement('label');
        columnLabel.textContent = label;
        columnLabel.style.marginBottom = '10px';
        columnLabel.style.fontWeight = 'bold';
        column.appendChild(columnLabel);

        options.forEach((option, index) => {
            const button = document.createElement('div');
            button.className = 'option';

            // Adjust the first button size for the first column
            if (key === 'A' && option === "") {
                button.style.padding = '20px 40px'; // Larger size for the top-left button
                button.style.fontSize = '18px';    // Adjust font size for readability
            }

            button.textContent = option.toString();
            button.addEventListener('click', () => {
                // Clear selection for the current column
                Array.from(column.children).forEach(btn => btn.classList.remove('selected'));
                // Highlight the selected button
                button.classList.add('selected');
                // Save the user's selection
                userSelections[key] = option;
            });

            column.appendChild(button);
        });

        return column;
    }

    // Define options for each column---------------------------------------------------------------------------------------------------------------------------------------- Part 23
    const AOptions = ["", 1, 2, 3]; // Fixed options for Part A
    const BOptions = generateRandomBibleBooks(parts.B); // Second column (books)
    const COptions = generateValidNumbers(parts.C); // Third column (numbers)
    const EOptions = generateValidNumbers(parts.E); // Fourth column (numbers)

    // Add columns to the grid
    optionsContainer.appendChild(createOptionColumn('Part A', AOptions, 'A'));
    optionsContainer.appendChild(createOptionColumn('Book', BOptions, 'B'));
    optionsContainer.appendChild(createOptionColumn('Chapter', COptions, 'C'));
    optionsContainer.appendChild(createOptionColumn('Verse', EOptions, 'E'));

    container.appendChild(optionsContainer);

    // Add the verse text
    const verseParagraph = document.createElement('p');
    verseParagraph.className = 'verse-text';
    verseParagraph.textContent = `"${verseText}"`;
    container.appendChild(verseParagraph);

    // Add the submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.className = 'submit-button';
    submitButton.addEventListener('click', () => {
        const isCorrect = JSON.stringify(userSelections) === JSON.stringify(parts);
        onResult(isCorrect);
        container.style.display = 'none'; // Hide the widget on submission
    });

    container.appendChild(submitButton);

    // Display the container
    container.style.display = 'block';
}



//---------------------------------------------------------------------------------------------------------------------------------------- Part 24
let gameLoopId = null; // Declare gameLoopId globally to track the loop
let frameCounter = 0; // Counter to track the frames

function gameLoop() {
    if (frameCounter % 60 === 0) { // Log once every 60 frames
        console.log(`Running gameLoop with ID: ${gameLoopId}, Frame: ${frameCounter}`);
    }
    frameCounter++; // Increment the frame counter

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze();
    drawDoors();
    drawCornerSquares(); // Add the corner squares
    drawHero(); // Draw the hero with hero.png
    
    drawLevelText(); // Add the level text
    moveEnemy(); // Move the enemy
    checkCornerSquareCollision(); // Check if the hero collides with a corner square
    checkPurpleSquareCollision(); // Check if the hero collides with purple squares
    checkHeroEnemyCollision(); // Check if the enemy catches the hero

    drawPortals(); // Draw portals LAST to ensure visibility
    drawEnemy(); // Draw the enemy
    levelResetTriggered = false; // Reset the flag for the next frame
    gameLoopId = requestAnimationFrame(gameLoop); // Store the animation frame ID
}

function stopGameLoop() {
    if (gameLoopId !== null) {
        console.log(`Stopping game loop with ID: ${gameLoopId}`);
        cancelAnimationFrame(gameLoopId); // Stop the animation frame
        gameLoopId = null; // Reset the game loop ID
    } else {
        console.log('No existing game loop to stop.');
    }
}

function drawLevelText() {
    ctx.font = '24px Arial'; // Set font size and style
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
    ctx.fillRect(5, 5, 120, 40); // Draw a rectangle for the background

    ctx.fillStyle = 'white'; // Set text color to white
    ctx.fillText(`Level ${level}`, 10, 30); // Draw text at (10, 30)
}









//---------------------------------------------------------------------------------------------------------------------------------------- Part 25
const stairsImage = new Image();
stairsImage.src = 'stairs.jpg'; // Ensure stairs.jpg is in the correct directory
stairsImage.onload = function () {
    console.log('Stairs image loaded successfully.');
};

function drawCornerSquares() {
    if (!stairsImage.complete) {
        console.warn('Stairs image is not yet loaded.');
        return;
    }

    cornerSquares.forEach(square => {
        if (!square.reached) {
            // Replace blue squares with stairs.jpg
            ctx.drawImage(stairsImage, square.x, square.y, square.width, square.height);
        }
    });
}

function placeCornerSquares() {
    // Find valid walkable tiles
    const walkableTiles = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[0].length; col++) {
            if (maze[row][col] === 0) {
                walkableTiles.push({ row, col });
            }
        }
    }

    // Shuffle walkable tiles for randomness
    walkableTiles.sort(() => Math.random() - 0.5);

    // Place corner squares on the first four random walkable tiles
    for (let i = 0; i < Math.min(4, walkableTiles.length); i++) {
        const { row, col } = walkableTiles[i];
        const square = cornerSquares[i];

        square.x = col * cellSize + leftPadding;
        square.y = row * cellSize;
        square.reached = false; // Reset state
    }
}



//---------------------------------------------------------------------------------------------------------------------------------------- Part 26
function checkCornerSquareCollision() {
    if (levelResetTriggered) return; // Prevent multiple resets during the same level

    cornerSquares.forEach((square, index) => {
        const isColliding =
            hero.x + hero.radius > square.x &&
            hero.x - hero.radius < square.x + square.width &&
            hero.y + hero.radius > square.y &&
            hero.y - hero.radius < square.y + square.height;

        if (!square.reached && isColliding) {
            square.reached = true; // Mark the square as reached
            console.log(`Corner square reached: Square ${index}`);
            showNotification('Stairs reached! Resetting the level...', { onDismiss: resetLevel });
            levelResetTriggered = true; // Set flag to prevent multiple resets
            resetLevel(); // Reset the level for the next round
        }
    });
}



function stopHeroMovement() {
    clearInterval(moveInterval); // Clear any ongoing movement intervals
    moveInterval = null;
}

// Initialize corner squares for the first level
placeCornerSquares();


//---------------------------------------------------------------------------------------------------------------------------------------- Part 27
// Preload the slime image
const slimeImage = new Image();
slimeImage.src = 'slime.png'; // Ensure slime.png is in the correct directory
slimeImage.onload = function () {
    console.log('Slime image loaded successfully.');
};

// Variables for squash and stretch effect
let stretchFactor = 0; // Tracks the animation phase
const stretchSpeed = 0.05; // Speed of the squash/stretch
const maxStretch = 0.2; // Maximum stretch/compression percentage

function placeEnemy() {
    if (level < 0) {
        enemy.active = false; // Disable the enemy for levels below 10
        return;
    }

    const randomCorner = cornerSquares[Math.floor(Math.random() * cornerSquares.length)];
    enemy.x = randomCorner.x + randomCorner.width / 2;
    enemy.y = randomCorner.y + randomCorner.height / 2;
    enemy.stoppedUntil = null; // Reset any stop timer
    enemy.active = true; // Ensure the enemy is active
    enemy.speed = 2; // Reset the speed to the default value
    console.log(`Enemy placed at x=${enemy.x}, y=${enemy.y}, Speed=${enemy.speed}`);
}

function moveEnemy() {
    if (!enemy.active) return;

    // Check if the enemy is currently stopped
    if (enemy.stoppedUntil && Date.now() < enemy.stoppedUntil) return;

    console.log(`Enemy moving at speed: ${enemy.speed}`); // Log speed every tick

    const start = {
        x: Math.floor((enemy.x - leftPadding) / cellSize),
        y: Math.floor(enemy.y / cellSize)
    };
    const end = {
        x: Math.floor((hero.x - leftPadding) / cellSize),
        y: Math.floor(hero.y / cellSize)
    };

    const path = findPath(maze, start, end);

    if (path.length > 1) {
        const nextStep = path[1];
        const targetX = nextStep.x * cellSize + cellSize / 2 + leftPadding;
        const targetY = nextStep.y * cellSize + cellSize / 2;

        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }
    }

    checkEnemyDoorCollision(); // Check if the enemy is at a door
}

function drawEnemy() {
    if (!enemy.active) return;

    const imageSize = 50; // Base size of the slime image
    const offset = imageSize / 2;

    // Update the stretch factor
    stretchFactor += stretchSpeed;

    // Calculate squash and stretch scale
    const scaleX = 1 + Math.sin(stretchFactor) * maxStretch; // Horizontal stretch
    const scaleY = 1 - Math.sin(stretchFactor) * maxStretch; // Vertical squash

    // Save the context to isolate transformations
    ctx.save();

    // Apply squash and stretch transformations
    ctx.translate(enemy.x, enemy.y); // Move to the enemy's position
    ctx.scale(scaleX, scaleY); // Apply the stretch/squash effect
    ctx.drawImage(slimeImage, -offset, -offset, imageSize, imageSize);

    // Restore the context
    ctx.restore();
}

function checkEnemyDoorCollision() {
    doors.forEach(door => {
        if (!door.removed &&
            enemy.x + enemy.radius > door.x && // Remove leftPadding adjustment
            enemy.x - enemy.radius < door.x + doorSize.width &&
            enemy.y + enemy.radius > door.y &&
            enemy.y - enemy.radius < door.y + doorSize.height) {
            enemy.stoppedUntil = Date.now() + 500; // Stop the enemy briefly
            console.log('Enemy stopped at door for 500 milliseconds');
        }
    });
}



//---------------------------------------------------------------------------------------------------------------------------------------- Part 29
function checkHeroEnemyCollision() {
    const dx = hero.x - enemy.x;
    const dy = hero.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < hero.radius + enemy.radius && enemy.active && !enemyCollisionHandled) {
        enemyCollisionHandled = true; // Ensure collision is handled only once
        enemy.active = false; // Deactivate the enemy to prevent further collisions
        console.log('Hero caught by the enemy. Game over!'); // Debug log

        // Show a notification with a restart button
        showNotification('You were caught by the enemy! Game over!', {
            restartButton: true, // Add a button to restart the game
        });

        pauseGame(); // Pause the game to prevent unintended movement
    }
}





// Pathfinding: A* Algorithm----------------------------------------------------------------------------- Part 30
function findPath(maze, start, end) {
    const rows = maze.length;
    const cols = maze[0].length;

    const openList = [];
    const closedList = [];
    const cameFrom = {};

    function heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function nodeKey(node) {
        return `${node.x},${node.y}`;
    }

    function getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }   // Right
        ];

        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 0) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    openList.push({ ...start, g: 0, f: heuristic(start, end) });

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        const current = openList.shift();
        closedList.push(current);

        if (current.x === end.x && current.y === end.y) {
            const path = [];
            let node = current;

            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = cameFrom[nodeKey(node)];
            }

            return path;
        }

        for (const neighbor of getNeighbors(current)) {
            if (closedList.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                continue;
            }

            const tentativeG = current.g + 1;

            const existingNode = openList.find(node => node.x === neighbor.x && node.y === neighbor.y);
            if (!existingNode || tentativeG < existingNode.g) {
                cameFrom[nodeKey(neighbor)] = current;
                if (existingNode) {
                    existingNode.g = tentativeG;
                    existingNode.f = tentativeG + heuristic(neighbor, end);
                } else {
                    openList.push({
                        ...neighbor,
                        g: tentativeG,
                        f: tentativeG + heuristic(neighbor, end)
                    });
                }
            }
        }
    }

    return []; // No path found
}

// Initialize the game---------------------------------------------------------------------------------------------------------------------------------------- Part 31
async function initGame() {
    const dimensions = getMazeDimensions(level);
    adjustPropertiesForLevel(level); // Adjust properties based on the current level
    generateMaze(dimensions.rows, dimensions.cols); // Generate the maze with updated dimensions
    await loadVerses(); // Ensure verses are loaded before starting the game
    spawnHero(); // Ensure hero spawns in a valid corridor
    placeDoors();
    placeEnemy(); // Place the enemy at a random corner
    initializePurpleSquares(); // Place the purple squares
    moveHero();
    gameLoop();
}


initGame();
