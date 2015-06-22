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
    // TODO : Reconstruire ical
    // TODO : Http server pour repondre a la requete (On devrais effacer les events inutile a ce moment puisque c'est la qu'on recoit les parametres
    // TODO : Handle les infos du calendrier
    // TODO : S'assurer de bien catcher les exceptions, le service ne doit pas crasher

request.get("http://www.gel.usherbrooke.ca/horarius/ical?cip=abdj2702", function(error, response, body){
if (!error) {
    
    var parsedBody = parseResponse(body);
    //parsedBody.calendarInfos
    
    var eventList = parseEvents(parsedBody.events);
    writeEvents(eventList);
    
    //console.log(eventList[50]["LOCATION"]);
}else{
    console.log(error);
}
});

// TODO : Separate in helper file ?

function parseResponse(body){
    var calendarInfos = body.substring(0,body.indexOf("BEGIN:VEVENT"))
    var events = body.substring(body.indexOf("\r\nBEGIN:VEVENT"),body.length);
    
    return {"calendarInfos" : calendarInfos, "events":events.split(/\r\nBEGIN:.*\r\n/g)};
}
function parseEvents(events){
    var eventList = [];
    var json = {};
    var eventLines;
    var keyAndValue;
    
    for(var j=0;j<events.length;j++){
        eventLines = events[j].split("\r\n");
        console.log("Event "+j);
        for(var i=0;i<eventLines.length;i++){
            console.log("Event Line : "+i);
            keyAndValue = eventLines[i].split(":");
            if(keyAndValue[0] != "END" && keyAndValue[0] != "" && keyAndValue[0] != undefined && keyAndValue[1] != undefined){            // We don't want the end line into the parsed object
                json[keyAndValue[0]] = keyAndValue[1];
            }
        }
        console.log(json);
        if(Object.keys(json).length > 0){
            eventList.push(json);
            console.log("PUSHED !");
        }
        json = {};
    }
    
    return eventList;
}

function writeEvents(eventList){
    // TODO : Use async writing ?
    var fileContent = "";
    fileContent = JSON.stringify(eventList);
    fs.writeFile("test.output", fileContent, function(err){
        if(err){
            console.log(err);
        }else{
            console.log("The file was saved!");
        }
    });
}