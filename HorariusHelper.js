var XRegExp = require("xregexp").XRegExp;
var fs = require("fs");
var request = require("request");


// Date Parsers
var dateParser = XRegExp("^ (?<year>   [0-9]{4}     )    # year    \n\
                            (?<month>  [0-9]{2}     )    # month   \n\
                            (?<day>    [0-9]{2}     ) T  # day     \n\
                            (?<hour>   [0-9]{2}     )    # hour    \n\
                            (?<minute> [0-9]{2}     )    # minute  \n\
                            (?<second> [0-9]{2}     )    # second", "x");

var appDateParser = XRegExp("^ (?<year>   [0-9]{4}     )    # year    \n\
                            (?<month>  [0-9]{2}     )    # month   \n\
                            (?<day>    [0-9]{2}     )    # day", "x");

var exceptions = ["projet", "final", "intendants", "présentations", "congé"];       // We won't add a suffix when one of these words is in the summary


module.exports = HorariusHelper =  {
    getCalendar : function(cip, callback){
        request.get("http://www.gel.usherbrooke.ca/horarius/ical?cip="+cip, function(error, response, body){
            if (!error) {
                var parsedBody = HorariusHelper.parseResponse(body);       //Parse the body of the response

                if(parsedBody.error == undefined) {
                    var eventList = HorariusHelper.parseEvents(parsedBody.events);

                    eventList = HorariusHelper.trimEvents(eventList);

                    var calendar = HorariusHelper.reconstructCalendar(parsedBody.calendarInfos, eventList);

                    if (callback) {
                        callback(undefined, calendar);
                    }
                }else{
                    if(callback){
                        callback(parsedBody.error);
                    }
                }

            }else{
                console.log(error);
            }
        });
    },
    parseResponse: function(body){
        if(body.indexOf("CIP invalide") == -1) {
            // TODO : Add some verification that we got the right response body
            var calendarInfos = body.substring(0, body.indexOf("BEGIN:VEVENT"))
            var events = body.substring(body.indexOf("\r\nBEGIN:VEVENT"), body.length);

            return {"calendarInfos": calendarInfos, "events": events.split(/\r\nBEGIN:.*\r\n/g)};
        }else{
            return {error : body};
        }
    },
    parseEvents: function(events){
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
    },
    trimEvents: function(eventsList, tutoList, removeAllDayEvents) {

        // TODO : Implement Tutorat trimming
        /*if(tutoList && tutoList.length > 0){

         }*/

        removeAllDayEvents = removeAllDayEvents || true;        // By default, will remove all days events

        var appList = [];

        if (removeAllDayEvents) {
            var lastAPP, currentAPP;

            for (var i = 0; i < eventsList.length; i++) {
                if (eventsList[i].hasOwnProperty("DTSTART;VALUE=DATE")) {
                    lastAPP = currentAPP;
                    currentAPP = eventsList[i]["SUMMARY"];

                    currentAPP = currentAPP.substr(0, currentAPP.indexOf(":"));

                    if (currentAPP != lastAPP) {
                        appList.push({
                            "name": currentAPP,
                            "start": eventsList[i]["DTSTART;VALUE=DATE"]
                        });
                    }

                    delete eventsList[i];       // We delete the event from the calendar
                } else if (eventsList[i].hasOwnProperty("DTSTART;VALUE=DATE;VALUE=DATE")) {
                    delete eventsList[i];       // We delete the single day event from the calendar
                }
            }

            var appIndex = 0;
            var curDate, appDate, nextAppDate, result;

            result = XRegExp.exec(appList[appIndex].start, appDateParser);      // Parse APP Date
            appDate = new Date(parseInt(result.year, 10),                     // Create Date Object
                parseInt(result.month, 10) - 1,
                parseInt(result.day, 10));

            for (var i = 0; i < eventsList.length; i++) {
                if (eventsList[i]) {

                    result = XRegExp.exec(eventsList[i]["DTSTART"], dateParser);    // Parse Current Date
                    curDate = new Date(parseInt(result.year, 10),                 // Create Date Object
                        parseInt(result.month, 10) - 1,
                        parseInt(result.day, 10),
                        parseInt(result.hour, 10),
                        parseInt(result.minute, 10),
                        parseInt(result.second, 10));

                    if (nextAppDate == undefined || nextAppDate == appDate && appIndex < appList.length - 1) {
                        result = XRegExp.exec(appList[appIndex + 1].start, appDateParser);    // Parse Next APP Date
                        nextAppDate = new Date(parseInt(result.year, 10),                // Create Date Object
                            parseInt(result.month, 10) - 1,
                            parseInt(result.day, 10));
                    }

                    if (curDate > nextAppDate && appIndex < appList.length - 1) {          // If the current Date is > than the date of the next APP
                        appIndex++;
                        appDate = nextAppDate;

                    }
                    if (exceptions.some(function(exception) { return eventsList[i]["SUMMARY"].indexOf(exception) != -1; })) {    // verify if the summary contain an exception
                        eventsList[i]["SUMMARY"] += " - " + appList[appIndex].name;     // Append APP Name
                    }
                }
            }

        }
        return eventsList;
    },
    reconstructCalendar: function (calendarInfos, eventList) {
        // TODO : Use async writing ?
        var keys,
            key,
            calendar = "";

        // TODO : Parse the calendarInfos and rewrite them
        calendar += calendarInfos;               // We add the calendar header

        for (var i = 0; i < eventList.length; i++) {
            if (eventList[i] != undefined) {             // Verify that the event has not been deleted while trimming
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
    },
    writeCalendar: function(calendar) {
        fs.writeFile("test.ical", calendar, function(err){     // Writing to file          // TODO : Send string as payload to HTTP request response
            if(err){
                console.log(err);
            }else{
                console.log("The calendar was saved to test.ical");
            }
        });
    }
};