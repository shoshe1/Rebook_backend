require('dotenv').config();
const mongoose = require('mongoose');
const { createModel } = require('mongoose-gridfs');
const { Readable } = require('stream');
const util = require('util');

// Use dynamic import for mime package
async function loadMime() {
    const mime = await import('mime');
    return mime;
}

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/rebook';

// Connect to MongoDB with proper error handling
mongoose.connect(mongoURI).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Handle connection success
mongoose.connection.on('open', async () => {
    console.log('MongoDB Connected for GridFS Test');

    // Initialize GridFS Model
    const Attachment = createModel({
        modelName: 'Attachment',
        connection: mongoose.connection
    });

    // Test file upload - replace this with dynamic file upload logic
    try {
        const writeStream = Attachment.write({
            filename: 'test-file.txt',
            contentType: 'text/plain'
        });

        writeStream.write('Hello, GridFS!');
        writeStream.end();

        writeStream.on('close', (file) => {
            console.log('File written to GridFS:', file);
            mongoose.connection.close();
        });

        writeStream.on('error', (err) => {
            console.error('Error writing file to GridFS:', err);
            mongoose.connection.close();
        });
    } catch (err) {
        console.error('Error during file upload:', err);
        mongoose.connection.close();
    }
});

// Handle connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
