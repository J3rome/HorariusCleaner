var GoogleCalendarHelper = require("./GoogleCalendarHelper");
var HorariusHelper = require("./HorariusHelper");
var http = require('http');
var url = require("url");
const PORT=8080;

    // Parameters
        // TODO : Prendre groupe de tutorat en parametre
        // TODO : prendre en parametre si on enleve les multi-day events

    // TODO : Add HTTPS so user can send their client secret in the request
    // TODO : Parse the calendars options in a json object
    // TODO : Add a description and modify the name in the calendars options
    // TODO : Si pas de groupe de tutorat, ne pas masquer tutorat
    // TODO : Enleve tutorat inutile (Faire le check a la creation de l'objet JSON ? ou apres?)
    // TODO : Polling 3-4 fois par jour durant heures ouvrables (dison entre 5h du matin & 11h le soir) pour voir si ya du changement dans le ical (Garder une copie de la string recu pour comparaison rapide ?)
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
                    res.end(error);     // CIP is invalid
                } else {
                    res.setHeader("Content-Type", "text/x-download;charset=UTF-8");
                    res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''abdj2702_E15.ics");
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

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on Port : %s", PORT);
});

/*setTimeout(function(){
 GoogleCalendarHelper.doAuthAndAction(GoogleCalendarHelper.calendarList);
 }, 1500);*/