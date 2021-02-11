function ConsoleLogger() {
}

ConsoleLogger.prototype.getLogEntry = function (message) {
    return "[" + obtenerFechaYHora() + "] : " + message;
}

ConsoleLogger.prototype.log = function (message) {
    //console.log(this.getLogEntry(message));
}

ConsoleLogger.prototype.error = function (message) {
    console.error(this.getLogEntry(message));
}

ConsoleLogger.prototype.dir = function (obj) {
    //console.log(this.getLogEntry('[dir dump]'));
    //console.dir(obj);
}

module.exports = ConsoleLogger;

function obtenerFechaYHora() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    if (month.toString().length == 1) {
        var month = '0' + month;
    }
    if (day.toString().length == 1) {
        var day = '0' + day;
    }
    if (hour.toString().length == 1) {
        var hour = '0' + hour;
    }
    if (minute.toString().length == 1) {
        var minute = '0' + minute;
    }
    if (second.toString().length == 1) {
        var second = '0' + second;
    }
    return year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;

}