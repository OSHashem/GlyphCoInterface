const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer();
const port = 3000;

const serviceAccountKey = require('./secret/inspired-shell-417401-a25f25878ef3.json');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: 'https://www.googleapis.com/auth/drive',
});

const drive = google.drive({ version: 'v3', auth });

// Function to upload file to Google Drive
async function uploadFileToGoogleDrive(fileName, mimeType, fileBuffer, folderId) {
  try {
    const fileMetadata = {
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
app.post('/upload-file', upload.single('file'), async (req, res) => {
  const uploadedFile = req.file;
    const folderId = '1jSRxEukjPAFFYF_qK6MuFMit1aHpMFtD'; // Parent folder ID

  const word = req.body.word; // Random word generated when submitting
  
  try {
    // Create folder for the random word if it doesn't exist
    let folder = await findOrCreateFolder(word, folderId);
    
    // Upload file to the created folder
    await uploadFileToGoogleDrive(uploadedFile.originalname, uploadedFile.mimetype, uploadedFile.buffer, folder);
    
    res.status(200).send('File uploaded successfully to Google Drive.');
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).send('Error uploading file to Google Drive.');
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
    
    if (response.data.files.length > 0) {
      // Folder already exists, return its ID
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
      pageSize: 300, // Increase the page size if needed
      fields: 'nextPageToken, files(*)',
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