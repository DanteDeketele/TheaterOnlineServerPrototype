// Envirement
if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY


// Requirements
const express = require('express')
const app = express()
const AWS = require('aws-sdk')
const fs = require('fs')
const homepage = require('./homepage')
const watchpage = require('./watchpage')



// Replace these with your AWS credentials and S3 bucket details
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY 
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL
const REFERER = process.env.REFERER


const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: 'eu-west-3' // Specify the correct AWS region here
});
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
});

// Server config
const port = 3000
const publicFolder = 'public'

// Server setup
app.set('view engine', 'ejs')
app.use(express.static(publicFolder))
// Enable CORS to allow requests from your domain
/*app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://your-website.com');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});*/

// When a user goes to the homepage
app.get('/', function(req, res){
    homepage.display(req, res)
})

// When a user goes to /watch?id=...
app.get('/watch', function(req, res){
    watchpage.display(req,res)
})


app.get('/getVideo', async (req, res) => {
  const videoId = parseInt(req.query.id);
  // Check user authentication (you can implement your own logic here)
  const isAuthenticated = true; // Replace with your authentication logic

  if (isAuthenticated) {
    // Specify the S3 object key for the video stream
    const videoKey = 'video-' + videoId + '/master.mpd';

    // Generate a pre-signed URL for the S3 object
    const params = {
      Bucket: S3_BUCKET_NAME,
      Key: videoKey,
      Expires: 60 * 60 * 5, // URL expires in 5 hours (adjust as needed)
    };

    try {
      const signedUrl = await s3.getSignedUrlPromise('getObject', params);

      // Use the signed URL in the response
      res.send(signedUrl);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})