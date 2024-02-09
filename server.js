// Envirement
if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY


// Requirements
const express = require('express')
const session = require('express-session');
const app = express()
const AWS = require('aws-sdk')
const fs = require('fs')
const homepage = require('./homepage')
const watchpage = require('./watchpage')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const bodyParser = require('body-parser');

const markdownpdf = require('markdown-pdf');



// Replace these with your AWS credentials and S3 bucket details
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY 
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL
const SESSION_KEY = process.env.SESSION_KEY

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

app.use(express.json())

// Use bodyParser to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: SESSION_KEY,
  resave: false,
  saveUninitialized: true
}));

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



app.get('/document', function(req, res){
  res.render('document.ejs', {
  });
})

app.get('/getPdf', (req, res) => {
  const file = req.query.file;
  const mdFilePath = './public/documents/' + file + '.md';

  // Check if the file exists
  if (!fs.existsSync(mdFilePath)) {
    return res.status(404).send('Markdown file not found');
  }

  const pdfFilePath = './public/pdf/' + file + '.pdf';

  // Convert .md to .pdf
  markdownpdf().from(mdFilePath).to(pdfFilePath, () => {
    console.log(`Conversion successful. PDF saved at: ${pdfFilePath}`);
    res.redirect('./pdf/' + file + '.pdf');
  });
});


app.get('/login', function(req, res){
  const notification = req.query.notification;
  res.render('login.ejs', {
    notification: notification
  });
})
// Handle login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Add your authentication logic here
  // For simplicity, we'll just check if the username and password are non-empty
  if (username && password) {
      res.redirect('./');
      console.log(`user logged in: ${username}`);
  } else {
      res.send('Invalid login credentials');
  }
});

app.get('/signup', function(req, res){
  res.render('signup.ejs', {
  });
})
// Handle login form submission
app.post('/signup', (req, res) => {
  const { username, password, email, passwordcert } = req.body;

  // Add your authentication logic here
  // For simplicity, we'll just check if the username and password are non-empty
  if (username && password) { 
       
      //res.redirect('./login?notification="Account succesvol aangemaakt. U ontvangt straks een verificatiemail"');
      res.redirect('./login?notification=ERROR: In deze demo aanvaarden we geen nieuwe accounts');
      console.log(`user created: ${username}`);
  } else {
      res.send('Invalid login credentials');
  }
});



/*app.get('/cart', (req, res) => {
  res.render('cart', { stripePublicKey: STRIPE_PUBLIC_KEY });
});*/

app.post('/create-checkout-session', async (req, res) => {
  fs.readFile('videos.json', async function (error, data) {
    if (error) {
      console.error(error.message)
      res.status(500).end();
    } else {
      const videos = JSON.parse(data);
      const videoMap = videos.reduce((map, video) => {
        map.set(video.id, video);
        return map;
      }, new Map());
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card","bancontact"],
          mode: "payment",
          line_items: req.body.items.map(item => {
            const storeItem = videoMap.get(item.id)
            return {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `${storeItem.title} - ${storeItem.creator}`,
                  images: [ `${process.env.SERVER_URL}/product-images/${storeItem.id}.png` ], // Add the URL of the logo image here
                },
                unit_amount: storeItem.priceInCents,
              },
              quantity: item.quantity,
            }
          }),
          success_url: `${process.env.SERVER_URL}/watch?id=${req.body.items[0].id}`, 
          cancel_url: `${process.env.SERVER_URL}/watch?id=${req.body.items[0].id}`,
          consent_collection: {
            terms_of_service: 'required',
          },
          custom_text: {
            terms_of_service_acceptance: {
              message: `Ik aanvaard de [Terms of Service](${process.env.SERVER_URL}/document?file=tos)`,
            },
          },
        })
        res.json({ url: session.url })
      } catch (e) {
        res.status(500).json({ error: e.message })
      }
    }
  });
});

app.get('/subscription', (req, res) => {
  res.render('subscription', { stripePublicKey: STRIPE_PUBLIC_KEY });
});

app.post('/create-checkout-session-subscription', async (req, res) => {
  
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: "mrdeegames@gmail.com",
      payment_method_types: ["card","bancontact"],
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{
          price_data: {
            currency: "eur",
            product_data: {
              name: `Theateronline+`
            },
            unit_amount: 699,
            recurring: {
              interval: 'month',
              interval_count: 1
            }
          },
          quantity: 1,
        }
      ],
      metadata: {
        userId: "Dante",
      },
      success_url: `${process.env.SERVER_URL}/subscription`, 
      cancel_url: `${process.env.SERVER_URL}/subscription`,
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `Ik aanvaard de [Terms of Service](${process.env.SERVER_URL}/document?file=tos)`,
        },
      },
    })
    res.json({ url: session.url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
});




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})