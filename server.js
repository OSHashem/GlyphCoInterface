const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const upload = multer();
const port = 3000;
require('dotenv').config();
// app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// const bodyParser = require('body-parser');
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// const bodyParser = require('body-parser');
// app.use(bodyParser.json());


// const projectId = process.env.GOOGLE_APPLICATION_CREDENTIALS_PROJECT_ID;
// const privateKeyId = process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY_ID;
// const privateKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY.replace(/\\n/g, '\n'); // Replace escaped newlines
// const clientEmail = process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL;

// console.log(projectId, privateKeyId, privateKey,clientEmail);

const serviceAccountKey = require('./secret/inspired-shell-417401-a25f25878ef3.json');
const { file } = require('googleapis/build/src/apis/file');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: 'https://www.googleapis.com/auth/drive',
});

const drive = google.drive({ version: 'v3', auth });

// Function to upload file to Google Drive
async function uploadFileToGoogleDrive(fileName, mimeType, fileBuffer, folderId) {
  try {
    const fileMetadata = {
      originalName: fileName,
      name: decodeURIComponent(fileName),
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: stream.Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('File uploaded successfully. File ID:', response.data.id);
    return response.data.id; // Return the ID of the uploaded file
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}

// Route for upload
app.post('/upload-file', upload.fields([{ name: 'jsonFile' }, { name: 'pngFile' }]), async (req, res) => {
  const folderId = '1V4W2uGdRCKMi377ox4XUOGZ4jsFzbN9c'; // Fares
  const word = req.body.word; // The associated word
  
  try {
    // Find or create folder for the word
    let folder = await findOrCreateFolder(word, folderId);

    const { pngFileName, jsonFileName } = await createUniqueFilenamesForNewFiles(word, auth);

    const jsonFile = req.files['jsonFile'][0]; // Access the JSON file
    const pngFile = req.files['pngFile'][0]; // Access the PNG file
     
    // Upload JSON file to the created or found folder
      await uploadFileToGoogleDrive(jsonFileName, jsonFile.mimetype, jsonFile.buffer, folder);
      
      // Upload PNG file to the same folder
      await uploadFileToGoogleDrive(pngFileName, pngFile.mimetype, pngFile.buffer, folder);

      jsonFile.originalname = jsonFileName;
      pngFile.originalname = pngFileName;

      res.status(200).send('Files uploaded successfully to Google Drive.');
  } catch (error) {
      console.error('Error uploading files:', error.message);
      res.status(500).send('Error uploading files to Google Drive.');
  }
});


app.post('/create-folder', upload.none(), async (req, res)  => {
  
  const parentFolderId = '1V4W2uGdRCKMi377ox4XUOGZ4jsFzbN9c'; // Fares
  
  const nameOfFolder   = req.body.nameOfFolder;
  console.log(nameOfFolder)


  try {
      const folderId = await createFolder(nameOfFolder, parentFolderId);
      res.status(200).json({ folderId });
  } catch (error) {
      console.error('Error creating folder:', error.message);
      res.status(500).json({ message: 'Error creating folder' });
  }
});

// Function to create folder in Google Drive
async function createFolder(folderName, parentFolderId) {
  try {
    const fileMetadata = {
      name: folderName, // Use the randomly generated word as the folder name
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    console.log('Folder created successfully. Folder ID:', response.data.id);
    
    return response.data.id; // Return the ID of the created folder
  } catch (error) {
    console.error('Error creating folder:', error.message);
    throw error;
  }
}

// Function to find or create folder in Google Drive
async function findOrCreateFolder(folderName, parentFolderId) {
  try {
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });
    
// response.data.files.length
console.log(response.data.files.length)
    if (response.data.files.length > 0) {
      // Folder already exists, return its ID
      console.log(response.data.files[0].id)
      return response.data.files[0].id;
    } else {
      // Folder doesn't exist, create it and return its ID
      return await createFolder(folderName, parentFolderId);
    }
  } catch (error) {
    console.error('Error finding or creating folder:', error.message);
    throw error;
  }
}



////////////////////////////////////////////////////////////////////

// Function to list files from Google Drive
async function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  let files = [];
  let nextPageToken = null;
  
  do {
    const response = await drive.files.list({
      pageSize: 300,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink)',
      q: `(mimeType='image/jpeg' or mimeType='image/png') and trashed = false`,
      pageToken: nextPageToken
    });

    const pageFiles = response.data.files;
    if (pageFiles) {
      files = [...files, ...pageFiles];
    }

    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);

  return files;
}


// Route to fetch files from Google Drive
app.get('/api/files', async (req, res) => {
  try {
    const files = await listFiles(auth);
    res.json(files);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

////////////////////////////////////////////////////////////////////

app.use(express.static('public')); 

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});


//////////////////////////////////////////////////////////////

function categorizeAndDetermineNextNumber(files) {
  const highestNumbers = {};

  files.forEach(file => {
      const match = file.name.match(/^(.*?)(\d+)(?:\.[^.]*)$/);
      if (match) {
          const baseWord = match[1];
          const number = parseInt(match[2], 10);
          console.log(number)

          if (!highestNumbers[baseWord] || number > highestNumbers[baseWord]) {
              highestNumbers[baseWord] = number;
          }
      }
  });

  return highestNumbers;
}


async function createUniqueFilenamesForNewFiles(baseWord, auth) {
  const files = await listFiles(auth); // Fetch existing files
  const highestNumbers = categorizeAndDetermineNextNumber(files);

  const nextNumber = highestNumbers[baseWord] ? highestNumbers[baseWord] + 1 : 1;

  const pngFileName = `${baseWord}${nextNumber}.png`;
  const jsonFileName = `${baseWord}${nextNumber}.json`;

  return { pngFileName, jsonFileName };
}

///////////////////////////////////////////////////////////////////////

async function deleteAllFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  let nextPageToken = null;

  do {
      // Fetch files according to the criteria
      const response = await drive.files.list({
          pageSize: 100,
          fields: 'nextPageToken, files(id, name)',
          q: "(mimeType='image/jpeg' or mimeType='image/png' or mimeType='application/json') and trashed = false",
          pageToken: nextPageToken
      });

      const files = response.data.files;
      nextPageToken = response.data.nextPageToken;

      // Delete fetched files
      for (const file of files) {
          await drive.files.delete({
              fileId: file.id
          });
          console.log(`Deleted file: ${file.name} (${file.id})`);
      }
  } while (nextPageToken);
}

app.delete('/api/delete-all-files', async (req, res) => {
  try {
      await deleteAllFiles(auth); // Ensure `auth` is correctly initialized
      res.send('All files have been deleted.');
  } catch (error) {
      console.error('Failed to delete files:', error);
      res.status(500).send('Error deleting files.');
  }
});

