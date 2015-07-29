var XRegExp = require("xregexp").XRegExp;
var fs = require("fs");
var request = require("request");

// Constants
const exceptions = ["projet", "final", "intendants", "pr\u00E9sentations", "cong\u00E9"];       // We won't add a suffix when one of these words is contained in the summary

// Date Parsers
var dateParser = XRegExp("^ (?<year>   [0-9]{4}     )    # year    \n\
                            (?<month>  [0-9]{2}     )    # month   \n\
                            (?<day>    [0-9]{2}     )    # day", "x");

var dateParserWithHourMinuteSecond = XRegExp("^ (?<year>   [0-9]{4}     )    # year    \n\
                                                (?<month>  [0-9]{2}     )    # month   \n\
                                                (?<day>    [0-9]{2}     ) T  # day     \n\
                                                (?<hour>   [0-9]{2}     )    # hour    \n\
                                                (?<minute> [0-9]{2}     )    # minute  \n\
                                                (?<second> [0-9]{2}     )    # second", "x");

module.exports = HorariusHelper =  {
    getCalendar : function(cip, callback){
        request.get("http://www.gel.usherbrooke.ca/horarius/ical?cip="+cip, function(error, response, body){
            if (!error) {
                var parsedBody = HorariusHelper.parseResponse(body);       //Parse the body of the response

                if(parsedBody.error == undefined) {
                    var eventList = HorariusHelper.parseEvents(parsedBody.events);

                    // TODO : Pass a list of tutorat to remove
                    // TODO : Pass a boolean indicating if we should remove all day events
                    eventList = HorariusHelper.trimEvents(eventList, [], true);

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
                if(callback){
                    callback(error);
                }
            }
        });
    },
    parseResponse: function(body){
        if(body.indexOf("BEGIN:VCALENDAR") == 0) {
            var calendarInfos = body.substring(0, body.indexOf("BEGIN:VEVENT"))
            var events = body.substring(body.indexOf("\r\nBEGIN:VEVENT"), body.length);

            return {"calendarInfos": calendarInfos, "events": events.split(/\r\nBEGIN:.*\r\n/g)};
        }else if(body.indexOf("CIP invalide") != -1) {
            return {error : "Invalid CIP."};
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

        if(removeAllDayEvents == undefined){
            removeAllDayEvents = true;              // By default, will remove all days events
        }

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

            result = XRegExp.exec(appList[appIndex].start, dateParser);      // Parse APP Date
            appDate = new Date(parseInt(result.year, 10),                     // Create Date Object
                parseInt(result.month, 10) - 1,
                parseInt(result.day, 10));

            for (var i = 0; i < eventsList.length; i++) {
                if (eventsList[i]) {

                    result = XRegExp.exec(eventsList[i]["DTSTART"], dateParserWithHourMinuteSecond);    // Parse Current Date
                    curDate = new Date(parseInt(result.year, 10),                 // Create Date Object
                        parseInt(result.month, 10) - 1,
                        parseInt(result.day, 10),
                        parseInt(result.hour, 10),
                        parseInt(result.minute, 10),
                        parseInt(result.second, 10));

                    if (nextAppDate == undefined || nextAppDate == appDate && appIndex < appList.length - 1) {
                        result = XRegExp.exec(appList[appIndex + 1].start, dateParser);    // Parse Next APP Date
                        nextAppDate = new Date(parseInt(result.year, 10),                // Create Date Object
                            parseInt(result.month, 10) - 1,
                            parseInt(result.day, 10));
                    }

                    if (curDate > nextAppDate && appIndex < appList.length - 1) {          // If the current Date is > than the date of the next APP
                        appIndex++;
                        appDate = nextAppDate;

                    }
                    if (exceptions.some(function(exception) {if(eventsList[i]["SUMMARY"].toLowerCase().indexOf(exception) != -1){return true;} })) {    // verify if the summary contain an exception

                    }else if(eventsList[i]["SUMMARY"].toLocaleLowerCase().indexOf("tutorat") != -1){
                        eventsList[i]["SUMMARY"] += " - " + eventsList[i]["DESCRIPTION"] + " - " + appList[appIndex].name;     // Append the Tutorat Group and the APP Name
                    }else{
                        eventsList[i]["SUMMARY"] += " - " + appList[appIndex].name;     // Append APP Name
                    }
                }
            }

        }
        return eventsList;
    },
    reconstructCalendar: function (calendarInfos, eventList) {
        var keys,
            key,
            calendarInfoInsertIndex,
            calendar = "";

        // TODO : Parse the calendarInfos and rewrite them
        if(calendarInfos.indexOf("X-WR-CALDESC") != -1){
            calendarInfoInsertIndex = calendarInfos.indexOf("X-WR-CALDESC:\r\n")+17;
            calendarInfos = calendarInfos.slice(0,calendarInfoInsertIndex)+ "X-PUBLISHED-TTL:PT15M\r\n"+calendarInfos.slice(calendarInfoInsertIndex);
        }
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
    writeCalendarToFile: function(calendar) {
        fs.writeFile("test.ical", calendar, function(err){     // Writing to file
            if(err){
                console.log(err);
            }else{
                console.log("The calendar was saved to test.ical");
            }
        });
    }
};