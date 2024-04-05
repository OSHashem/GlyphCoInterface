//html elements
const canvas = document.getElementById('drawingBoard');
const ctx = canvas.getContext('2d');
const toolbar = document.getElementById('toolbar');
const customWord = document.getElementById("customWord");
const wordToWrite = document.getElementById("wordToWrite");
// import Swal from "sweetalert2";


//constants & variables
let isDrawing = false;
let currentStroke = [];
let word = [];
let startingTime;

//on window load, generates a random word using the helper function below
window.onload = function () {
    generateWord();
}

//event listeners for mouse and touch (do NOT update to pointer events)
canvas.addEventListener('mousedown', handleWritingStart);
canvas.addEventListener('mousemove', handleWritingInProgress);
canvas.addEventListener('mouseup', handleDrawingEnd);
canvas.addEventListener('mouseout', handleDrawingEnd);
canvas.addEventListener('touchstart', handleWritingStart);
canvas.addEventListener('touchmove', handleWritingInProgress);
canvas.addEventListener('touchend', handleDrawingEnd);

//event listeners for the toolbar buttons
toolbar.addEventListener('click', async e => {
    if (e.target.id === 'saveWordBtn') {
        if (word.length == 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Oops...',
                text: 'Please write first!',
            });
            return;
        } else {
            //sets initial drawing time to 0, updates the rest of the array
            startingTime = word[0][0][2];
            for (let i = 0; i < word.length; i++) {
                for (let j = 0; j < word[i].length; j++) {
                    word[i][j][2] -= startingTime;
                }
            }

            // console.log(wordToWrite.innerHTML)
            //saving the array as a JSON file
            word = [[wordToWrite.innerHTML], [startingTime], word];
            const data = JSON.stringify(word);
            const jsonFileName = wordToWrite.innerHTML + startingTime + '.json';
            const jsonFile = new File([data], encodeURIComponent(jsonFileName), { type: 'application/json' });
            await sendBlobToServer(jsonFile, wordToWrite.innerHTML);

            //saving the drawing as a PNG file
            const newCanvas = trimCanvas(canvas);
            newCanvas.toBlob(async function (blob) {
                const pngFileName = wordToWrite.innerHTML + startingTime + '.png';
                const pngFile = new File([blob], encodeURIComponent(pngFileName), { type: 'image/png' });
                await sendBlobToServer(pngFile, wordToWrite.innerHTML);

                Swal.fire('Success!', 'Word Submitted', 'success');
            });
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        word = [];
    }

    if (e.target.id === 'clearBtn') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        word = [];
    }

    if (e.target.id === 'newWordBtn') {
        generateWord();
    }
    
    if (e.target.id === 'setWordBtn') {
        const text = customWord.value;
        // console.log(text)
        if (text != "") {
            wordToWrite.innerHTML = text;
        //     const wordToWriteParagraph = document.getElementById('wordToWrite');
        // const word = wordToWriteParagraph.textContent.trim();
        // // console.log(word)
        // // const nn = "NN";
        //     const formData = new FormData();
        //     formData.append('nameOfFolder',word ); 
        //     // formData.append('partOfSpeech',nn); 
            

        //     const response =  await fetch('/create-folder', {
        //         method: 'POST',
        //         body: formData
        //     });
        //     console.log(formData.get("nameOfFolder"));

        //     if (response.ok) {
        //         const data =  response.json();
        //         console.log('Folder created successfully. Folder ID:', data.folderId);
        //     } else {
        //         console.error('Error creating folder:', response.statusText);
        //     }
        }
        customWord.value = "";
    }
});


//on first touch, initializes drawing and draws a dot using the helper function below
function handleWritingStart(e) {
    e.preventDefault();

    const mousePos = getMousePositionOnCanvas(e);

    ctx.beginPath();
    ctx.moveTo(mousePos.x, mousePos.y);
    ctx.lineWidth = 5;
    ctx.strokesStyle = '#333';
    ctx.lineCap = 'round';
    ctx.fill();

    isDrawing = true;

    dot(e);
}

//on movement, keeps drawing using the helper function below
function handleWritingInProgress(e) {
    e.preventDefault();

    draw(e);
}

//on touch stop or touching outside the array, prepares for new stroke
function handleDrawingEnd(e) {
    e.preventDefault();
    if (currentStroke.length != 0) {
        word.push(currentStroke);
        console.log(currentStroke);
    }
    isDrawing = false;
    currentStroke = [];
}

//HELPER FUNCTIONS

//reads any file
function readFile(file) {
    const promise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", file, true);

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status == 0) {
                resolve(xhr.responseText);
            } else {
                reject(new Error("Error loading file"));
            }
        };

        xhr.send(null);
    });

    return promise;
}

//picks a word at random from the json file
function generateWord() {
    const promise = readFile('drawings.json');
    promise.then(function (jsonData) {
        const wordArray = JSON.parse(jsonData);
        const randomWord = wordArray[Math.floor(Math.random() * wordArray.length)];
        wordToWrite.innerHTML = randomWord;
    });
}

//fetches the proper x, y, and force of the mouse/touch when it is called
function getMousePositionOnCanvas(e) {
    const clientX = Math.round(e.clientX || e.touches[0].clientX);
    const clientY = Math.round(e.clientY || e.touches[0].clientY);
    const force = e.touches && e.touches[0].force || null;
    const { offsetLeft, offsetTop } = e.target;
    const canvasX = clientX - offsetLeft;
    const canvasY = clientY - offsetTop;
    return { x: canvasX, y: canvasY, force: force };
}

//saves the mouse/touch details to the stroke and draws on the canvas
const draw = (e) => {
    if (isDrawing) {

        const mousePos = getMousePositionOnCanvas(e);
        const time = new Date().getTime();
        currentStroke.push([mousePos.x, mousePos.y, time, mousePos.force]);

        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
    }
}

//saves the mouse/touch details to the stroke and places a dot on the canvas
const dot = (e) => {
    if (isDrawing) {
        const mousePos = getMousePositionOnCanvas(e);
        const time = new Date().getTime();
        currentStroke.push([mousePos.x, mousePos.y, time, mousePos.force]);

        ctx.fillRect(mousePos.x - 2.5, mousePos.y - 2.5, 5, 5);
    }
}

//sends a file to the server (server.js) to be uploaded
// Updated function to send file to server
async function sendBlobToServer(inputFile) {
    try {
        const formData = new FormData();
        formData.append('file', inputFile); // Append the file without specifying the filename

        // Retrieve the word to write
        const wordToWriteParagraph = document.getElementById('wordToWrite');
        const word = wordToWriteParagraph.textContent.trim();
        console.log(word)

        

        // Append the word to the FormData
        formData.append('word', word);

        const response = await fetch('/upload-file', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            // Success handling, if needed
        } else {
            console.error('Error uploading file to server:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending file to server:', error.message);
    }
}


//////////////////////////////////////////////////////////////////////////////

// Event listener for the "Modify" button
document.getElementById('modifyBtn').addEventListener('click', () => {
    // Redirect the user to a new page when the "Modify" button is clicked
    window.location.href = '/modify.html';
});

//////////////////////////////////////////////////////////////////////////////

//trim canvas function to minimize image size, written by https://github.com/remy, modified to center instead of trimming
function trimCanvas(c) {
    var ctx = c.getContext('2d'),
        pixels = ctx.getImageData(0, 0, c.width, c.height),
        l = pixels.data.length,
        i,
        bound = {
            top: null,
            left: null,
            right: null,
            bottom: null
        },
        x, y;

    // Iterate over every pixel to find the highest
    // and where it ends on every axis
    for (i = 0; i < l; i += 4) {
        if (pixels.data[i + 3] !== 0) {
            x = (i / 4) % c.width;
            y = ~~((i / 4) / c.width);

            if (bound.top === null) {
                bound.top = y;
            }

            if (bound.left === null) {
                bound.left = x;
            } else if (x < bound.left) {
                bound.left = x;
            }

            if (bound.right === null) {
                bound.right = x;
            } else if (bound.right < x) {
                bound.right = x;
            }

            if (bound.bottom === null) {
                bound.bottom = y;
            } else if (bound.bottom < y) {
                bound.bottom = y;
            }
        }
    }

    // Calculate the height and width of the content
    var trimHeight = bound.bottom - bound.top,
        trimWidth = bound.right - bound.left,
        trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    // Create a new canvas for the trimmed content
    var trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimWidth;
    trimmedCanvas.height = trimHeight;
    var trimmedCtx = trimmedCanvas.getContext('2d');
    trimmedCtx.putImageData(trimmed, 0, 0);

    // Create a new canvas for the centered content
    var centeredCanvas = document.createElement('canvas');
    centeredCanvas.width = c.width;
    centeredCanvas.height = c.height;
    var centeredCtx = centeredCanvas.getContext('2d');

    // Calculate the position to center the trimmed content
    var centerX = (centeredCanvas.width - trimWidth) / 2;
    var centerY = (centeredCanvas.height - trimHeight) / 2;

    // Draw the trimmed content onto the centered canvas
    centeredCtx.drawImage(trimmedCanvas, centerX, centerY);

    // Return centered canvas
    return centeredCanvas;
}