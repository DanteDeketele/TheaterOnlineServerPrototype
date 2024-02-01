const express = require('express')
const app = express()

// Server config
const port = 3000
const publicFolder = 'public'

app.set('view engine', 'ejs')
app.use(express.static(publicFolder))
app.listen(port)