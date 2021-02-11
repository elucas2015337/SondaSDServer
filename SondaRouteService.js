var _cnnServ = require('./ConnectionService.js');
var xdb = require('./moddb.js');
var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();
var pSqlInstance = require('mssql');
var console = require("./LogService.js");

module.exports = {

    GetManifestHeader: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                
                if (isNaN(data.ManifestHeader)) {
                    console.log('Ingrese un dato numerico', "error");
                    socket.emit('GetManifestHeaderFail', { 'msg': 'Ingrese un dato numerico' });
                    return;
                }
                request.input('MANIFEST_HEADER', pSqlInstance.Int, data.ManifestHeader);
                request.output('pResult', pSqlInstance.VarChar(250));

                request.execute('[SONDA_SP_GET_MANIFEST_HEADER]', function (err, recordsets, returnValue) {
                    if (!err) {
                        switch (returnValue) {
                            case 0:
                                socket.emit('GetManifestHeaderSend', recordsets[0][0]);
                                //socket.emit('GetManifestHeaderCompleted', { 'rowcount': rowscount });
                                break;
                            case 2:     //data not found
                                console.log("Data not found: " + request.parameters.pResult.value, "warn");
                                socket.emit('GetManifestHeaderFail', { 'error': returnValue, 'msg': request.parameters.pResult.value });
                                break;
                            case -1:	//DB Error
                                console.log("Database error" + request.parameters.pResult.value, "error");
                                socket.emit('GetManifestHeaderFail', { 'error': returnValue, 'msg': request.parameters.pResult.value });
                                break;
                        }
                    }
                    else {
                        socket.emit('GetManifestHeaderFail', { 'msg': err });
                    }
                });
            });
        } catch (e) { console.log("GetManifestHeader.catch:" + e.message, "error"); }
    },
    CreateMyRoutePlan: function (data, socket) {
        try {
            var pSQL = "SELECT * FROM [SWIFT_FUNC_GET_MANIFEST_DETAIL] (" + data.ManifestHeader + ")";
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var rowscount = 1;
                var request = new pSqlInstance.Request(connection);

                request.verbose = _cnnServ.GetVerbose();
                request.stream = true;

                request.query(pSQL,
                    function (err) {
                        if (err) {
                            console.log("CreateMyRoutePlan.query:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'CreateMyRoutePlan.error: ' + err.message });
                        }
                    }
                );

                request.on('row', function (row) {
                    var requestInsert = new pSqlInstance.Request(connection);
                    requestInsert.input('DOC_NUM', pSqlInstance.Int, row.NUMERO_PICKING);
                    requestInsert.input('CUSTOMER_CODE', pSqlInstance.VarChar(25), row.CODE_CUSTOMER);
                    requestInsert.input('CUSTOMER_NAME', pSqlInstance.VarChar(250), row.NAME_CUSTOMER);
                    requestInsert.input('CUSTOMER_PHONE', pSqlInstance.VarChar(50), row.PHONE_CUSTOMER);
                    requestInsert.input('TASK_ADDRESS', pSqlInstance.VarChar(250), row.ADRESS_CUSTOMER);
                    requestInsert.input('ASSIGNED_TO', pSqlInstance.VarChar(25), data.loggedUser);
                    requestInsert.input('TASK_SEQ', pSqlInstance.Int, rowscount);
                    requestInsert.input('TASK_COMMENTS', pSqlInstance.VarChar(150), row.OBSERVACIONES);
                    requestInsert.input('TASK_TYPE', pSqlInstance.VarChar(15), 'DELIVERY');
                    requestInsert.input('CREATED_STAMP', pSqlInstance.DateTime, row.FECHA_PROPUESTA);
                    requestInsert.output('pResult', pSqlInstance.VarChar(250));

                    requestInsert.execute('[SONDA_SP_CREATE_TASKS]', function (err, recordsets, returnValue) {
                        if (!err) {
                            console.log(requestInsert.parameters.pResult.value);
                            if (requestInsert.parameters.pResult.value != 'OK') {
                                socket.emit('error_message', { 'message': 'InsertRoutePlan.error: ' + requestInsert.parameters.pResult.value });
                                return;
                            }
                        }
                        else {
                            socket.emit('error_message', { 'message': 'InsertRoutePlan.error: ' + err.message });
                        }
                    });
                    rowscount++;
                });

                request.on('done', function () {
                    console.log('CreateMyRoutePlan.done:' + rowscount, "info");
                    try {
                        socket.emit('CreateMyRoutePlanCompleted', { 'rowcount': rowscount });
                        rowscount = 1;
                    }
                    catch (e) {
                        console.log('CreateMyRoutePlan.catch' + e.message, "error");
                    }
                });

            });
        } catch (e) { console.log("GetManifestHeader.catch:" + e.message, "error"); }
    },
    GetInvoice: function (data, socket) {
        try {
            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_INTERFACES',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };
            var pSQL = "SELECT DocNum, DocTotal, dbo.FUNC_REMOVE_SPECIAL_CHARS(CardCode) AS CardCode, dbo.FUNC_REMOVE_SPECIAL_CHARS(CardName) AS CardName, dbo.FUNC_REMOVE_SPECIAL_CHARS(ISNULL(Address,Address2)) AS Address FROM ERP_VIEW_INVOICE_HEADER WHERE [DocNum] = " + data.Doc_Num + "";
            var pSQLDet = "SELECT dbo.FUNC_REMOVE_SPECIAL_CHARS(ItemCode) AS ItemCode, dbo.FUNC_REMOVE_SPECIAL_CHARS(Dscription) AS Dscription, Quantity, Price, LineTotal FROM ERP_VIEW_INVOICE_DETAIL WHERE [DocEntry] = " + data.Doc_Num + "";
            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                var rowscount = 0;
                var rowsdetail = 0;
                var requestHeader = new pSqlInstance.Request(connection);
                requestHeader.verbose = true;
                requestHeader.stream = true;
                var requestDetail = new pSqlInstance.Request(connection);
                requestDetail.verbose = true;
                requestDetail.stream = true;


                requestHeader.query(pSQL,
                    function (err) {
                        if (err) {
                            console.log("GetInvoice.query:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'GetInvoiceHeader.error: ' + err.message });
                        }
                    }
                );

                requestHeader.on('row', function (row) {
                    console.log('POR EL HEADER');
                    socket.emit('GetInvoiceHeader', { 'row': row });
                    rowscount++;
                });

                requestDetail.query(pSQLDet,
                    function (err) {
                        if (err) {
                            console.log("GetInvoiceDetail.query:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'GetInvoiceDetail.error: ' + err.message });
                        }
                    }
                );

                requestDetail.on('row', function (row) {
                    socket.emit('GetInvoiceDet', { 'row': row });
                    rowsdetail++;
                });

                requestDetail.on('done', function () {
                    try {
                        socket.emit('GetInvoiceDetCompleted', { 'rowcount': rowsdetail });
                        rowsdetail = 0;
                    }
                    catch (e) {
                        console.log('GetInvoiceDet.catch' + e.message, "error");
                    }
                });

                // requestHeader.on('done', function () {
                // console.log('GetInvoice.done:' + rowscount);
                // try {
                // socket.emit('GetInvoice', { 'rowcount': rowscount });
                // rowscount = 1;
                // }
                // catch (e) {
                // console.log('CreateMyRoutePlan.catch');
                // }
                // });

            });
        } catch (e) { console.log("GetManifestHeader.catch:" + e.message, "error"); }
    },
    CreateTaskByNewCustomer: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var requestInsert = new pSqlInstance.Request(connection);
                //requestInsert.input('DOC_NUM', pSqlInstance.Int, row.NUMERO_PICKING);
                requestInsert.input('CUSTOMER_CODE', pSqlInstance.VarChar(25), data.Codigo);
                requestInsert.input('CUSTOMER_NAME', pSqlInstance.VarChar(250), data.Nombre);
                requestInsert.input('CUSTOMER_PHONE', pSqlInstance.VarChar(50), data.Telefono);
                requestInsert.input('TASK_ADDRESS', pSqlInstance.VarChar(250), data.Direccion);
                requestInsert.input('ASSIGNED_TO', pSqlInstance.VarChar(25), data.loginid);
                requestInsert.input('TASK_SEQ', pSqlInstance.Int, 1);
                requestInsert.input('TASK_COMMENTS', pSqlInstance.VarChar(150), 'Tarea generada para nuevo cliente ' + data.Nombre);
                requestInsert.input('TASK_TYPE', pSqlInstance.VarChar(15), 'SALES');
                //requestInsert.input('CREATED_STAMP', pSqlInstance.DateTime, row.FECHA_PROPUESTA);
                requestInsert.output('pResult', pSqlInstance.VarChar(250));

                requestInsert.execute('[SONDA_SP_CREATE_TASKS]', function (err, recordsets, returnValue) {
                    if (!err) {
                        console.log(requestInsert.parameters.pResult.value);
                        if (requestInsert.parameters.pResult.value != 'OK') {
                            console.log('create_new_task_by_customer.error: ' + requestInsert.parameters.pResult.value, "error");
                            socket.emit('error_message', { 'message': 'create_new_task_by_customer.error: ' + requestInsert.parameters.pResult.value });
                            return;
                        } else {
                            socket.emit('create_new_task_completed', data);
                            console.log('create_new_task_completed');
                        }
                    }
                    else {
                        console.log("Sonda create tasks finished with error. " + err.message, "error");
                        socket.emit('error_message', { 'message': 'create_new_task_by_customer.error: ' + err.message });
                    }
                });
            });
        } catch (e) { console.log("create_new_task_by_customer.catch:" + e.message, "error"); }
    },
    OrderDelivered: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var requestInsert = new pSqlInstance.Request(connection);
                //requestInsert.input('DOC_NUM', pSqlInstance.Int, row.NUMERO_PICKING);
                requestInsert.input('MANIFEST_ID', pSqlInstance.VarChar(25), data.Codigo);
                requestInsert.input('LOGIN_ID', pSqlInstance.VarChar(250), data.Nombre);
                requestInsert.input('DELIVERY_IMG', pSqlInstance.VarChar(50), data.Telefono);
                requestInsert.input('DELIVERY_GPS', pSqlInstance.VarChar(250), data.Direccion);
                requestInsert.input('TASK_ID', pSqlInstance.VarChar(25), data.loginid);
                requestInsert.output('pResult', pSqlInstance.VarChar(250));

                requestInsert.execute('[SONDA_SP_MAKE_DELIVER]', function (err, recordsets, returnValue) {
                    if (!err) {
                        console.log(requestInsert.parameters.pResult.value);
                        if (requestInsert.parameters.pResult.value != 'OK') {
                            console.log('create_new_task_by_customer.error: ' + requestInsert.parameters.pResult.value, "error");
                            socket.emit('error_message', { 'message': 'create_new_task_by_customer.error: ' + requestInsert.parameters.pResult.value });
                            return;
                        } else {
                            socket.emit('create_new_task_completed', data);
                            console.log('create_new_task_completed');
                        }
                    }
                    else {
                        console.log(err.message, "error");
                        socket.emit('error_message', { 'message': 'create_new_task_by_customer.error: ' + err.message });
                    }
                });
            });
        } catch (e) { console.log("create_new_task_by_customer.catch:" + e.message, "error"); }
    },

}