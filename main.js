var request = require("request");
var fs = require("fs");

    // Parameters
        // TODO : Prendre groupe de tutorat en parametre
        // TODO : prendre en parametre si on enleve les multi-day events
        // TODO : CIP en parametre
        
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
    var calendarInfos = body.substring(0,body.indexOf("BEGIN:VEVENT"))
    var events = body.substring(body.indexOf("BEGIN:VEVENT"),body.length);
    
    events = events.split(/\r\nBEGIN:.*\r\n/g);
    
    var eventList = parseEvents(events);
    
    console.log(eventList[50]["LOCATION"]);
}else{
    console.log(error);
}
});

// TODO : Separate in helper file ?
function parseEvents(events){
    var eventList = [];
    var json = {};
    var eventLines;
    var keyAndValue;
    
    for(var j=0;j<events.length;j++){
        eventLines = events[j].split("\r\n");
        for(var i=0;i<eventLines.length;i++){
            keyAndValue = eventLines[i].split(":");
            json[keyAndValue[0]] = keyAndValue[1];
        }
        eventList.push(json);
        json = {};
    }
    
    return eventList;
}

function writeEvents(eventList){
    // TODO : Use async writing ?
    var fileContent = "";
    fs.writeFileSync("/tmp/test", fileContent, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 
}