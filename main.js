var request = require("request");
var fs = require("fs");
var GoogleCalendarHelper = require("./GoogleCalendarHelper");
var http = require('http');
const PORT=8080;

    // Parameters
        // TODO : Prendre groupe de tutorat en parametre
        // TODO : prendre en parametre si on enleve les multi-day events
        // TODO : CIP en parametre
        
    // TODO : Add HTTPS so user can send their client secret in the request
        
    // TODO : Si pas de groupe de tutorat, ne pas masquer tutorat
    // TODO : Enleve tutorat inutile (Faire le check a la creation de l'objet JSON ? ou apres?)
    // TODO : enleve multi-day events
    // TODO : Polling 3-4 fois par jour durant heures ouvrables (dison entre 5h du matin & 11h le soir) pour voir si ya du changement dans le ical (Garder une copie de la string recu pour comparaison rapide ?)
    // TODO : Http server pour repondre a la requete (On devrais effacer les events inutile a ce moment puisque c'est la qu'on recoit les parametres
    // TODO : Handle les infos du calendrier
    // TODO : S'assurer de bien catcher les exceptions, le service ne doit pas crasher

//We need a function which handles requests and send response
function handleRequest(req, res){

    console.log("Received Request on url : "+req.url);
    getCalendar("abdj2702", function(error, calendar){
        if(error){

        }else{
            res.setHeader("Content-Type","text/x-download;charset=UTF-8");
            res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''abdj2702_E15.ics");
            res.end(calendar);
        }

    });
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});

function getCalendar(cip,callback){
    request.get("http://www.gel.usherbrooke.ca/horarius/ical?cip=abdj2702", function(error, response, body){
        if (!error) {
            // FOR TESTING : Save the input so we can compare it later
            fs.writeFile("test.input", body, function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("The input was saved to test.input");
                }
            });

            var parsedBody = parseResponse(body);       //Parse the body of the response

            var eventList = parseEvents(parsedBody.events);

            eventList = trimEvents(eventList);

            var calendar = reconstructCalendar(parsedBody.calendarInfos, eventList);

            if(callback){
                callback(undefined, calendar);
            }

        }else{
            console.log(error);
        }
    });
}


/*setTimeout(function(){
    GoogleCalendarHelper.doAuthAndAction(GoogleCalendarHelper.calendarList);
}, 1500);*/

// TODO : Separate in helper file ?
function parseResponse(body){
    // TODO : Add some verification that we got the right response body
    var calendarInfos = body.substring(0,body.indexOf("BEGIN:VEVENT"))
    var events = body.substring(body.indexOf("\r\nBEGIN:VEVENT"),body.length);
    
    return {"calendarInfos" : calendarInfos, "events":events.split(/\r\nBEGIN:.*\r\n/g)};
}
function parseEvents(events){
    var eventList = [];
    var json = {};
    var eventLines;
    var keyAndValue;
    var splitIndex;
    
    for(var j=0;j<events.length;j++){
        eventLines = events[j].split("\r\n");
        for(var i=0;i<eventLines.length;i++){
            splitIndex = eventLines[i].indexOf(':');
            
            keyAndValue = [eventLines[i].substring(0,splitIndex),eventLines[i].substring(splitIndex+1)];
            
            // We don't want the END object into the parsed object neither do we want undefined fields
            if(keyAndValue[0] != "END" && keyAndValue[0] != "" && keyAndValue[0] != undefined && keyAndValue[1] != undefined){            
                json[keyAndValue[0]] = keyAndValue[1];
            }
        }
        if(Object.keys(json).length > 0){
            eventList.push(json);
            json = {};
        }
    }
    
    return eventList;
}

function trimEvents(eventsList, tutoList, removeAllDayEvents){

    // TODO : Implement Tutorat trimming
    /*if(tutoList && tutoList.length > 0){

    }*/

    removeAllDayEvents = removeAllDayEvents || true;        // By default, will remove all days events

    if(removeAllDayEvents){
        for(var i=0; i< eventsList.length;i++){
            if(eventsList[i].hasOwnProperty("DTSTART;VALUE=DATE") || eventsList[i].hasOwnProperty("DTSTART;VALUE=DATE;VALUE=DATE")){
                delete eventsList[i];
            }
        }
    }

    return eventsList;
}

function reconstructCalendar(calendarInfos, eventList){
    // TODO : Use async writing ?
    var keys,
        key,
        calendar = "";
        
    console.log("Writing Calendar to file.");
    
    // TODO : Parse the calendarInfos and rewrite them
    calendar += calendarInfos;               // We add the calendar header
    
    for(var i=0; i<eventList.length;i++){
        if(eventList[i] != undefined) {             // Verify that the event has not been deleted while trimming
            keys = Object.keys(eventList[i]);
            calendar += "BEGIN:VEVENT\r\n";      // We add the delimiter for a new event
            for (var j = 0; j < keys.length; j++) {
                key = keys[j];
                calendar += key + ":" + eventList[i][key] + "\r\n";
            }
            calendar += "END:VEVENT\r\n";        // We add the delimiter for the end of an event
        }
    }
    
    calendar += "END:VCALENDAR\r\n";         // We add the delimiter for the end of the calendar

    return calendar;
}

function writeCalendar(calendar){
    fs.writeFile("test.ical", calendar, function(err){     // Writing to file          // TODO : Send string as payload to HTTP request response
        if(err){
            console.log(err);
        }else{
            console.log("The calendar was saved to test.ical");
        }
    });
}