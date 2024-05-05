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
let currentIndex = 0;

var pathname = window.location.pathname;
// console.log(pathname);

if ((pathname ==='/') || pathname.includes('index.html') || pathname.includes('Evaluate.html') ) {
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
        const origin = e.target.getAttribute('data-origin')
        let number;
        if (word.length == 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Oops...',
                text: 'Please write first!',
            });
            return;
        } else {
            // Adjust behavior based on the origin
            if (origin === 'drawing') {
                number = 1;
                // console.log('Button clicked on Index');
                // console.log(number);

            } else if (origin === 'translate') {
                number = 2;
                // console.log('Button clicked on Translation');
                // console.log(number)
            }
            else if (origin === 'evaluate'){
                number = 3;
                // console.log('Button clicked on Evaluation');
                // console.log(number)
            }
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
            const jsonFileName = wordToWrite.innerHTML  + '.json';
            const jsonFile = new File([data], encodeURIComponent(jsonFileName), { type: 'application/json' });
            
            //saving the drawing as a PNG file
            const newCanvas = trimCanvas(canvas);
            newCanvas.toBlob(async function (blob) {
                const pngFileName = wordToWrite.innerHTML  + '.png';
                const pngFile = new File([blob], encodeURIComponent(pngFileName), { type: 'image/png' });
                // await sendBlobToServer(pngFile);
                await sendBlobToServer(jsonFile,pngFile,number);

                Swal.fire('Success!', 'Successful Submission', 'success');
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        word = []; 

    }
    
    if (e.target.id === 'setWordBtn') {
        const text = customWord.value;
        const name = text.toLowerCase();
        // console.log(name)
        translateName(name)
        if (text != "") {
            wordToWrite.innerHTML = text;
            // displayImage(text); // Ensure this line is here to display the image for the custom word
        }
        customWord.value = "";
    }
});



// const words = [
//     { word: 'mummy', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/305c0c25727d4fd6354b58ae1e4f2ee528e374bc/public/Samples/mummy.jpeg' },
//     { word: 'Crown', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/305c0c25727d4fd6354b58ae1e4f2ee528e374bc/public/Samples/Crown.png' },
//     { word: 'obelisk', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/305c0c25727d4fd6354b58ae1e4f2ee528e374bc/public/Samples/obelisk.jpg' },
//     { word: 'The-Ankh', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/305c0c25727d4fd6354b58ae1e4f2ee528e374bc/public/Samples/The-Ankh.jpg' },
//     { word: 'karnaktemple', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/305c0c25727d4fd6354b58ae1e4f2ee528e374bc/public/Samples/karnaktemple.jpg' },
//     { word: 'Amenhotep III', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/64f4669f116f27bf386c8c72954447421ed26d7d/public/Samples/Amenhotep%20III.jpeg' },
//     { word: 'Pyramid', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/64f4669f116f27bf386c8c72954447421ed26d7d/public/Samples/Pyramid.jpeg' },
//     { word: 'bicycle', imageUrl: 'https://raw.githubusercontent.com/OSHashem/GlyphCoInterface/64f4669f116f27bf386c8c72954447421ed26d7d/public/Samples/bicycle.jpg' },

//     // Add more words and image URLs here
// ];

// Loop through the words array and create an image element for each word
async function displayImage(word) {
// const wordObj = words.find(w => w.word === word);

// if (wordObj) {
    // If the word is found, create an image element and set its source to the corresponding image URL
    const img = document.createElement('img');
    const image = await fetchFiles(word)
    console.log(image)
    img.src = image;
    img.style.height = '300px';
    img.style.width = '300px';

    // Add the image to the imageContainer div
    document.getElementById('imageContainer').innerHTML = '';
    document.getElementById('imageContainer').appendChild(img);
// } else {
    // If the word is not found, clear the imageContainer div
    // document.getElementById('imageContainer').innerHTML = '';
// }
}


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
    promise.then(async function (jsonData) {
        const wordArray = JSON.parse(jsonData);
        if (currentIndex >= wordArray.length) {
            currentIndex = 0; // Reset index if it exceeds the length
        }
        const nextWord = wordArray[currentIndex];
        wordToWrite.innerHTML = nextWord;
        displayImage(nextWord); // Display an image for the current word
        currentIndex++;  // Display an image for the current word

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
async function sendBlobToServer(jsonFile,pngFile,number) {
    try {
        const formData = new FormData();
        formData.append('jsonFile', jsonFile);
        formData.append('pngFile', pngFile); // Append the file without specifying the filename

        // Retrieve the word to write
        const wordToWriteParagraph = document.getElementById('wordToWrite');
        const word = wordToWriteParagraph.textContent.trim();

        // Append the word to the FormData
        formData.append('word', word);
        formData.append('number',number)

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

////////////////////////////////////////////////////////////////////////////////////////

async function fetchFiles(word) {
    let imageLink;
    try {
        const response = await fetch('/api/files');
        const folders = await response.json(); // Expecting an object grouped by folders
            const files = folders["Samples"];
            files.forEach(file => {
                const name = file.name.split(".")
                if(word===name[0]){
                    imageLink =  file.thumbnailLink;
                }
            });
    } catch (error) {
        console.error('Error fetching files:', error);
    }
    return imageLink;
}

////////////////////////////////////////////////////////////////////////////////////////

function translateName(name){
    const imageUrls = Array.from(name).map(char => `letters/${char}.png`);
    concatenateImages(imageUrls);
}

// Load an image from a URL
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Concatenate a list of images horizontally
async function concatenateImages(imageUrls) {
    let images = await Promise.all(imageUrls.map(url => loadImage(url)));
    const imgHeight = 90;
    const imgWidth = 90;

        // Resize each image to be the same height
        images = images.map(img => {
            const ratio = img.width / img.height;
            return {
                img: img,
                width: imgWidth ,
                height: imgHeight // New height is the target height
            };
        });
    
        const canvas2 = document.getElementById('canvas2');
        const ctx2 = canvas2.getContext('2d');
        
    // Calculate total width
    // const totalWidth = images.reduce((acc, img) => acc + img.width, 0);
    const totalWidth = images.length*imgWidth;

    // Set canvas size
    canvas2.width = totalWidth;
    canvas2.height = imgHeight;

    // Draw each image onto the canvas at the correct offset
    let xOffset = 0;
    images.forEach(({ img, width, height }) => {
        ctx2.drawImage(img, xOffset, 0, width, height); // Draw and resize image simultaneously
        xOffset += width; // Move the x offset for the next image
    });
}

///////////////////////////////////////////////////////////////////////////////////////////