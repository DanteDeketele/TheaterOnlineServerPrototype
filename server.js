// Envirement
if (process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY

// Requirements
const express = require('express')
const app = express()
const fs = require('fs')
const homepage = require('./homepage')
const watchpage = require('./watchpage')

// Server config
const port = 3000
const publicFolder = 'public'

// Server setup
app.set('view engine', 'ejs')
app.use(express.static(publicFolder))

// When a user goes to the homepage
app.get('/', function(req, res){
    homepage.display(req, res)
})

// When a user goes to /watch?id=...
app.get('/watch', function(req, res){
    watchpage.display(req,res)
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
})