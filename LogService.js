var EventLogger = require("node-windows").EventLogger;
var pSqlInstance = require('mssql');
var ConsoleLogger = require("./LogConsole.js");
var ConectionServer = require('./ConnectionService.js');
var modDB = require('./moddb.js');

var log = new EventLogger("SwiftExpressServer");
var console = new ConsoleLogger();

var messageDB = "";
module.exports = {
    log: function (message, type, sourceError, codeRoute, login, nombreFuncion, docResolution, docSerie, docNum, severityCode) {
        codeRoute = codeRoute || "Sin Ruta";
        login = login || "Sin Usuario";
        nombreFuncion = nombreFuncion || "Sin Funcion";
        docResolution = docResolution || "Sin Resolucion";
        docSerie = docSerie || "Sin Serie";
        docNum = docNum || 0;
        severityCode = severityCode || 1;
        sourceError = sourceError || "Sin Source";
        
        try {
            switch (type) {
                case "info":
                    log.info(message);
                    break;
                case "warn":
                    log.warn(message);
                    break;
                case "error":
                    messageDB = message;
                    message = formatMessage(message, codeRoute, login, nombreFuncion, docResolution, docSerie, docNum, severityCode, sourceError);
                    //log.error(message);
                    console.error(message);
                    InsertarLogDB(messageDB, type, codeRoute , login , nombreFuncion , docResolution, docSerie , docNum, severityCode , sourceError);
                    break;
                default:
                    console.log(message);
                    break;
            }

        } catch (e) {
            console.error(message);
        }

    },
    dir: function (obj) {
        console.dir(obj);
    }
}

var TAB = " ";

function formatMessage(message, codeRoute, login, nombreFuncion, docResolution, docSerie, docNum, severityCode, sourceError) {
    return "[SRCE:" + sourceError + "]" + TAB + "[RUTA:" + codeRoute + "]" + TAB + "[LGIN:" + login + "]" + TAB + "[FUNC:" + nombreFuncion + "]" + TAB + "[RES:" + docResolution + "]" + TAB + "[SERIE:" + docSerie + "]" + TAB + "[DCNUM:" + docNum + "]" + TAB + "[SEVERITY:" + severityCode + "]" + "[MSG:" + message + "]"
}

function InsertarLogDB(message, type, codeRoute, login, nombreFuncion, docResolution, docSerie, docNum, severityCode, sourceError) {
    try {
        
        var modDBInfo = modDB.GetLoginSQLConfig();
        var schema = modDB.GetLogSchema();
        
        var connection = new pSqlInstance.Connection(modDBInfo, function (err) {
            var request = new pSqlInstance.Request(connection);
            request.verbose = ConectionServer.GetVerbose();
            request.stream = false;
            
            request.input('MESSAGE_ERROR', pSqlInstance.VarChar, message);
            request.input('CODE_ROUTE', pSqlInstance.VarChar, codeRoute);
            request.input('LOGIN', pSqlInstance.VarChar, login);
            request.input('DOC_RESOLUTION', pSqlInstance.VarChar, docResolution);
            request.input('DOC_SERIE', pSqlInstance.VarChar, docSerie);
            request.input('DOC_NUM', pSqlInstance.Int, docNum);
            request.input('SEVERITY_CODE', pSqlInstance.Int, severityCode);
            request.input('SOURCE_ERROR', pSqlInstance.VarChar, nombreFuncion + " | " + sourceError);
            
            request.execute(schema + '.SONDA_SP_INSERT_SONDA_SERVER_ERROR_LOG', function (err, recordsets, returnValue) {
                if (err !== undefined) {
                    console.error("Error al insertar log en DB: " + err.message);
                    connection.close();
                    pSqlInstance.close();
                }
            });
        });
    } catch (err) {
        console.error("InsertarLogDB en catch: " + err.message, "error");
    }
}