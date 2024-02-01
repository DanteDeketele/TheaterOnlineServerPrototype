
const fs = require('fs');

// Main enterypoint: gets called when someone visits /watch
function display(req, res){
    const videoId = parseInt(req.query.id);

    if (!videoId){
        displayWatchNotFound(res, videoId)
    } else {
        displayWatchFound(res, videoId)
    }
}

// Display a error page given an id
function displayWatchNotFound(res, videoId) {
    res.render('watch-not-found.ejs', {
        videoId: videoId
    });
}

// Display a watch page given an id
function displayWatchFound(res, videoId) {
    fs.readFile('videos.json', function (error, data) {
        if (error) {
            res.status(500).end();
        } else {
            const videos = JSON.parse(data);

            if (videos.some(video => video.id === videoId)) {
                const foundVideo = videos.find(video => video.id === videoId);
                res.render('watch.ejs', {
                    video: foundVideo
                });
            } else {
                displayWatchNotFound(res, videoId);
            }
        }
    });
}

module.exports = {
    display,
    displayWatchNotFound,
    displayWatchFound
};