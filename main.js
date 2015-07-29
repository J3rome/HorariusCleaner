var HorariusHelper = require("./HorariusHelper");
var http = require('http');
var url = require("url");
const PORT=8080;

    // Parameters
        // TODO : Prendre groupe de tutorat en parametre (Si pas de groupe de tutorat, ne pas masquer tutorat)
        // TODO : prendre en parametre si on enleve les multi-day events (Enlevé par defaut)

    // TODO : Parse the calendars options in a json object
    // TODO : HTTPS support
    // TODO : Add a description and modify the name in the calendars options
    // TODO : Enleve tutorat inutile
    // TODO : Handle les infos du calendrier
    // TODO : S'assurer de bien catcher les exceptions, le service ne doit pas crasher

//We need a function which handles requests and send response
function handleRequest(req, res){

    var cip,
        parsedUrl = url.parse(req.url, true);

    console.log("Received Request on url : "+parsedUrl.href+" At "+new Date().toString());

    if(parsedUrl.pathname == "/horarius") {
        if (parsedUrl && parsedUrl.query && parsedUrl.query.cip) {
            HorariusHelper.getCalendar(parsedUrl.query.cip, function (error, calendar) {
                if (error) {
                    res.statusCode = 400;
                    console.log("Error Occured At "+new Date().toString() + ": ");
                    console.log(error);
                    res.end(error);     // CIP is invalid or response received is invalid
                } else {
                    res.setHeader("Content-Type", "text/x-download;charset=UTF-8");
                    res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''"+parsedUrl.query.cip+"_UdeS.ics");
                    res.end(calendar);
                }
            });
        } else {
            res.statusCode = 400;
            res.end("Please provide a CIP.");
        }
    }else{
        res.statusCode = 400;
        res.end("This url is not allowed.");
    }
}

// Create a server
var server = http.createServer(handleRequest);

// Lets start our server
server.listen(PORT, function(){
    console.log("HorariusCleaner listening on Port : %s", PORT);
});