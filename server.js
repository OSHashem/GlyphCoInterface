const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer();
const port = 3000;

const serviceAccountKey = require('./inspired-shell-417401-a25f25878ef3.json');

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: 'https://www.googleapis.com/auth/drive',
});

const drive = google.drive({ version: 'v3', auth });

//Route for upload
app.post('/upload-file', upload.single('file'), async (req, res) => {
  const uploadedFile = req.file;
  const folderId = '1jSRxEukjPAFFYF_qK6MuFMit1aHpMFtD';
  try {
    await uploadFileToGoogleDrive(uploadedFile.originalname, uploadedFile.mimetype, uploadedFile.buffer, folderId);
    res.status(200).send('File uploaded successfully to Google Drive.');
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).send('Error uploading file to Google Drive.');
  }
});

// Upload file to drive
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
  } catch (error) {
    console.error('Error uploading file:', error.message);
    throw error;
  }
}''

/////////////////////////////////////////////////////////////////////////////////////////

app.get('/list-files', async (req, res) => {
  try {
      const response = await drive.files.list({
          pageSize: 10, // Adjust this value as needed
          fields: 'files(id, name)', // Specify the fields you want to retrieve
      });
      const files = response.data.files;
      res.json(files);
  } catch (error) {
      console.error('Error listing files from Google Drive:', error.message);
      res.status(500).send('Error listing files from Google Drive.');
  }
});

//Define a route to handle fetching file content based on file ID
app.get('/get-file-content', (req, res) => {
  const fileId = req.query.id; // Get the file ID from the query parameters
  const filePath = path.join(__dirname, 'files', fileId); // Assuming files are stored in a directory named 'files'

  // Check if the file exists
  if (fs.existsSync(filePath)) {
      // Read the file content and send it as a response
      fs.readFile(filePath, (err, data) => {
          if (err) {
              console.error('Error reading file:', err);
              res.status(500).send('Error reading file');
          } else {
              // Set appropriate headers and send the file content as response
              res.setHeader('Content-Type', 'image/png'); // Set the content type as 'image/png' for PNG files
              res.send(data);
          }
      });
  } else {
      res.status(404).send('File not found'); // If the file does not exist, send a 404 response
  }
});


//////////////////////////////////////////////////////////////////////////////////

app.use(express.static('public')); 

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});