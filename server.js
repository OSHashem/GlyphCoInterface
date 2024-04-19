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
app.use(express.json());

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

    const response = await drive.files.create({ //an already defined method/function in google drive api 
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

  const folderId = '1V4W2uGdRCKMi377ox4XUOGZ4jsFzbN9c'; // Fares, folder ID for the folder that will contain the uploaded files
  const word = req.body.word; // The word/symobl that is being uploaded
  
  try {
    let folder = await findOrCreateFolder(word, folderId);

    // Create unique filenames for the new files
    const { pngFileName, jsonFileName } = await createUniqueFilenamesForNewFiles(word, auth);

    // Access both JSON and PNG files
    const jsonFile = req.files['jsonFile'][0]; 
    const pngFile = req.files['pngFile'][0]; 
     
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


// app.post('/create-folder', upload.none(), async (req, res)  => {
  
//   const parentFolderId = '1jSRxEukjPAFFYF_qK6MuFMit1aHpMFtD'; // Omar, folder ID for the folder that will contain the uploaded folder
  
//   const nameOfFolder   = req.body.nameOfFolder;
//   console.log(nameOfFolder)


//   try {
//       const folderId = await createFolder(nameOfFolder, parentFolderId);
//       res.status(200).json({ folderId });
//   } catch (error) {
//       console.error('Error creating folder:', error.message);
//       res.status(500).json({ message: 'Error creating folder' });
//   }
// });

// Function to create folder in Google Drive
async function createFolder(folderName, parentFolderId) {
  try {
    const fileMetadata = {
      name: folderName, // Use the word as the folder name
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await drive.files.create({ //an already defined method/function in google drive api 
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

// Function to find or create folder if folder with such name doesn't exist in Google Drive
async function findOrCreateFolder(folderName, parentFolderId) {
  try {
    const response = await drive.files.list({ // method is used to list the files in the drive
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });
    
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

// List Files with Parent IDs
async function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  let files = [];
  let nextPageToken = null;
  
  do {
    const response = await drive.files.list({ // method is used to list the files in the drive
      pageSize: 300,
      fields: 'nextPageToken, files(id, name, mimeType, parents, thumbnailLink, webViewLink, webContentLink)',
      q: `mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/jpg' and trashed = false`, // filter files to shown/displayed
      pageToken: nextPageToken
    });

    files = files.concat(response.data.files);// add the files to the array
        nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

  return files;
}

// Group Files by Their Parent Folder ID
function groupFilesByFolder(files) {
  const grouped = {};
  files.forEach(file => {
      const folderId = file.parents[0];
      if (!grouped[folderId]) {// if the folder id is not in the grouped object, add it
          grouped[folderId] = [];
      }
      grouped[folderId].push(file);
  });
  return grouped;
}

// Fetch Folder Names
async function fetchFolderNames(auth, folderIds) {
  const drive = google.drive({ version: 'v3', auth });
  const folderNames = {};

  for (const folderId of folderIds) {
      const response = await drive.files.get({
          fileId: folderId,// get the folder id
          fields: 'id, name'  
      });
      folderNames[folderId] = response.data.name;// add the folder name to the object with the folder id as the key 
  }
  return folderNames;
}


// Route for fetching and grouping files by folder from google drive
app.get('/api/files', async (req, res) => {
  try {
      const files = await listFiles(auth); // Fetch files
      const groupedFiles = groupFilesByFolder(files); // Group files by folder

      const folderIds = Object.keys(groupedFiles); // Get folder IDs
      const folderNames = await fetchFolderNames(auth, folderIds); // Fetch folder names

      const response = {};
      folderIds.forEach(folderId => {
          const folderName = folderNames[folderId] || folderId; // Fallback to folder ID if name not fetched
          response[folderName] = groupedFiles[folderId].map(file => ({
              id: file.id,
              name: file.name,
              thumbnailLink: file.thumbnailLink // Add other properties as needed
          }));
      });

      res.json(response);
  } catch (error) {
      console.error('Failed to list files:', error);
      res.status(500).send('Error listing files');
  }
});

////////////////////////////////////////////////////////////////////

// 
function categorizeAndDetermineNextNumber(files) {
  const highestNumbers = {};
  
  files.forEach(file => {
    const match = file.name.match(/^(.*?)(\d+)(?:\.[^.]*)$/);// Regex to match file names like "baseWord1.png"
    // If the file name matches the regex, extract the base word and the number and store the highest number
    if (match) {
      const baseWord = match[1];
      const number = parseInt(match[2], 10);// 10 is the radix, i.e. base 10
      
      if (!highestNumbers[baseWord] || number > highestNumbers[baseWord]) {
        highestNumbers[baseWord] = number;
      }
    }
  });
  
  return highestNumbers;
}

// 
async function createUniqueFilenamesForNewFiles(baseWord, auth) {
  const files = await listFiles(auth); // Fetch existing files
  const highestNumbers = categorizeAndDetermineNextNumber(files);
  
  const nextNumber = highestNumbers[baseWord] ? highestNumbers[baseWord] + 1 : 1;// If there is no highest number, start with 1
  
  // Create the file names
  const pngFileName = `${baseWord}${nextNumber}.png`; 
  const jsonFileName = `${baseWord}${nextNumber}.json`;
  
  return { pngFileName, jsonFileName };
}

///////////////////////////////////////////////////////////////////////
//// DANGER ZONE !!!

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


app.use(express.static('public')); 

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});