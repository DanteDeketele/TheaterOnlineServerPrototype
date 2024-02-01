const fs = require('fs');

// Main enterypoint: gets called when someone visits the homepage
function display(req, res){
    fs.readFile('videos.json', function (error, data) {
        if (error) {
            res.status(500).end();
        } else {
            const videos = JSON.parse(data);

            res.render('homepage.ejs', {
                videos: videos
            })
        }
    })
}

module.exports = {
    display
};