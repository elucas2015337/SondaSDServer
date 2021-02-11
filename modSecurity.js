var pSqlInstance;
pSqlInstance = require('mssql');

var xdb = require('./moddb.js');
var console = require("./LogService.js");
var _cnnService = require("./ConnectionService.js");


module.exports = {
    checklogin: function (data, socket) {
        return new Promise((resolve, reject) => {
            try {
                var pSqlConfig = xdb.GetLoginSQLConfig();

                console.log('Attempting to connect using ' + data.loginid, "info");


                var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {


                    if (err != undefined) {
                        socket.emit('error_message', { 'message': 'checklogin.err: ' + err.message });
                        return;
                    }
                    var request1 = new pSqlInstance.Request(connection);
                    request1.verbose = _cnnService.GetVerbose();
                    request1.stream = false;

                    request1.input('USER', pSqlInstance.VarChar(50), data.loginid);
                    request1.input('PASSWORD', pSqlInstance.VarChar(50), data.pin);

                    var pReturned = '';
                    var loginid = data.loginid;
                    request1.execute('dbo.SWIFT_LOGIN', function (err, recordsets, returnValue) {

                        switch (returnValue) {
                            case 0:     //welcome

                                var puser = recordsets[0][0].DB_USER;
                                var ppassword = recordsets[0][0].DB_USER_PASS;
                                var data2 = {
                                    'loginid': recordsets[0][0].LOGIN.toUpperCase(),
                                    'dbuser': recordsets[0][0].DB_USER,
                                    'dbuserpass': recordsets[0][0].DB_USER_PASS,
                                    'user_name': recordsets[0][0].NAME_USER,
                                    'user_role': recordsets[0][0].TYPE_USER,
                                    'loginimage': recordsets[0][0].PROFILE_IMAGE,
                                    'routeid': recordsets[0][0].ROUTE_ID,
                                    'default_warehouse': recordsets[0][0].DEFAULT_WAREHOUSE,
                                    'presale_warehouse': recordsets[0][0].PRESALE_WAREHOUSE,
                                    'route_return_warehouse': recordsets[0][0].ROUTE_RETURN_WAREHOUSE,
                                    'name_enterprise': recordsets[0][0].NAME_ENTERPRISE,
                                    'device_id': recordsets[0][0].DEVICE_ID,
                                    'validation_type': recordsets[0][0].VALIDATION_TYPE,
                                    'loggeduser': recordsets[0][0].LOGIN.toUpperCase()
                                };

                                var request2 = new pSqlInstance.Request(connection);
                                request2.verbose = _cnnService.GetVerbose();
                                request2.stream = false;

                                request2.input('DEVICE_ID', pSqlInstance.VarChar(50), data.uuid);
                                request2.input('VALIDATION_TYPE', pSqlInstance.VarChar(50), data.validationtype);
                            request2.input('ROUTE_ID', pSqlInstance.VarChar(50), data2.routeid);
                            request2.input('SONDA_CORE_VERSION', pSqlInstance.VarChar(50), data.version);
                                request2.execute(recordsets[0][0].CODE_ENTERPRISE + '.SWIFT_SP_UPDATE_DEVICE_ID', () => {
                                    socket.emit('welcome_to_swift', data2);

                                    socket.emit('welcome_to_sonda', data2);
                                    resolve(data2);
                                    //console.log(recordsets[0].length);
                                });


                                break;
                            case -2:    //user not found
                                socket.emit('invalid_user', { 'loginid': loginid });
                                socket.emit('invalid_credentials', { 'loginid': loginid });
                                reject( new Error('invalid_credentials'));
                                break;
                            case -3:    //user found but invalid password
                                socket.emit('invalid_pass', { 'loginid': loginid });
                                socket.emit('invalid_credentials', { 'loginid': loginid });
                                reject(new Error('invalid_credentials'));
                                break;
                        }

                    });


                });

            } catch (e) { 
                console.log("validatecredentials.catch:" + e.message, "error"); 
                reject(new Error(e.message));
            }


        })

    }
}
