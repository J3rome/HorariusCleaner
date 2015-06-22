var request = require("request");
var fs = require("fs");

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
        
        writeCalendar(parsedBody.calendarInfos, eventList);

    }else{
        console.log(error);
    }
});

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
            
            // We don't want the END object into the parsed object
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

function writeCalendar(calendarInfos, eventList){
    // TODO : Use async writing ?
    var keys,
        key,
        fileContent = "";
        
    console.log("Writing Calendar to file.");
    
    // TODO : Parse the calendarInfos and rewrite them
    fileContent += calendarInfos;               // We add the calendar header
    
    for(var i=0; i<eventList.length;i++){
        keys = Object.keys(eventList[i]);
        fileContent += "BEGIN:VEVENT\r\n";      // We add the delimiter for a new event
        for(var j=0; j< keys.length;j++){
            key = keys[j];
            fileContent += key+":"+eventList[i][key]+"\r\n";
        }
        fileContent += "END:VEVENT\r\n";        // We add the delimiter for the end of an event
    }
    
    fileContent += "END:VCALENDAR\r\n";         // We add the delimiter for the end of the calendar
    
    fs.writeFile("test.output", fileContent, function(err){     // Writing to file          // TODO : Send string as payload to HTTP request response
        if(err){
            console.log(err);
        }else{
            console.log("The calendar was saved to test.output");
        }
    });
}