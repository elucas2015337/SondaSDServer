var xdb = require('./moddb.js');
var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();
var gVerbose = false;


var xdb = require('./moddb.js');
module.exports = {
    GetVerbose: function () {
        return gVerbose;
    }
    ,
    ConnectDb: function (data, callback) {
        var instance = require('mssql');
        var config = {
            server: dbserver, // You can use 'localhost\\instance' to connect to named instance
            user: data.dbuser,
            password: data.dbuserpass,
            port: gdbPort,
            database: 'SWIFT_EXPRESS',
            connectionTimeout: 240000,
			requestTimeout: 240000,
            pool: {
                idleTimeoutMillis: 240000,
                max: 1,
				min: 1
            },
            options: {
                encrypt: false // Use this if you're on Windows Azure
            }
        };


        var sqlConnection = new instance.connect(config, function (err) {
            callback(err, instance);
        });
        return sqlConnection;
    }
}
