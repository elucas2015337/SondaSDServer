var pSqlInstance;
pSqlInstance = require('mssql');

var xdb = require('./moddb.js');
var dbserver = xdb.GetDBServer();
var console = require("./LogService.js");

module.exports = {
    BarcodeIsScanned:
    function (data, socket) {
        try {            
            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: xdb.GetDBPort(),
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            }

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                request1.input('BARCODE', pSqlInstance.VarChar(75), data.barcode.toUpperCase());
                request1.input('SERVICE_ID', pSqlInstance.VarChar(50), data.serviceid);
                
                request1.execute('SWIFT_SP_BARCODE_SCANNED', function (err, recordsets, returnValue) {

                    if (returnValue == 0) 
                    {                        
                            socket.emit('barcode_success',
                                {
                                    'recordset': recordsets[0],
                                    'serviceid': data.serviceid,
                                    'page': data.page,
                                    'dbuser': data.dbuser,
                                    'dbuserpass': data.dbuserpass,
                                    'barcode': data.barcode.toUpperCase()
                                }
                            );
                    }
                    else 
                    {
                            console.log("Barcode not found", "warn");
                            var pnot_found_data = {
                                'barcode': data.barcode,
                                'serviceid': data.serviceid,
                                'page': data.page,
                                'response': returnValue
                            };
                            socket.emit('barcode_not_found', pnot_found_data);
                    
                    }
                    pSqlInstance.close();
                });
            });

        } catch (e) { console.log("BarcodeIsScanned.catch:" + e.message, "error"); }
    },
    ValidateSerie:
    function (data, socket) {
        try {            
            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: xdb.GetDBPort(),
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            }
            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                request1.input('pSERIE', pSqlInstance.VarChar(75), data.serie);
                request1.input('pLOCATION', pSqlInstance.VarChar(75), data.location);
                request1.input('pSKU', pSqlInstance.VarChar(75), data.sku);
                request1.input('pSERVICE_ID', pSqlInstance.VarChar(50), data.serviceid);
                request1.input('pQTY', pSqlInstance.Int, data.qty);
                
                request1.execute('SWIFT_SP_VALIDATE_SERIE', function (err, recordsets, returnValue) {

                    if (returnValue == 0) 
                    {
                            socket.emit('serie_success',
                                {
                                    'recordset': recordsets[0],
                                    'serviceid': data.serviceid,
                                    'page': data.page,
                                    'dbuser': data.dbuser,
                                    'dbuserpass': data.dbuserpass,
                                    'barcode': data.serie,
                                    'qty': data.qty
                                }
                            );

                    }
                    else
                        {
                            var pnot_found_data = {
                                'barcode': data.serie,
                                'serviceid': data.serviceid,
                                'page': data.page,
                                'response': returnValue,
                                'qty': data.qty
                            };

                            socket.emit('serie_not_found', pnot_found_data);                            
                    }
                    pSqlInstance.close();
                });
            });
        } catch (e) {
            console.log("BarcodeValidateSerie.catch:" + e.message, "error");
            socket.emit('error_message', { 'message': 'ValidateSerie.catch: ' + e.message });

        }
    },
    ValidateQtyPicking:
    function (data, socket) {
        try {            
            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: xdb.GetDBPort(),
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            }
            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                request1.input('CODE_SKU', pSqlInstance.VarChar(50), data.sku);
                request1.input('TASK_ID', pSqlInstance.Int, data.taskid);
                request1.input('QTY', pSqlInstance.Float, data.qty);

                request1.execute('[SWIFT_VALIDATE_QTY_PICKING ]', function (err, recordsets, returnValue) {

                    if (returnValue == 0) 
                    {                    
                            socket.emit('validar_qty_picking_ok', { 'data': data });
                    }
                    else
                    {
                            socket.emit('validar_qty_picking_fail', { 'msg': 'error_validar_qty_picking' })                    
                    }
                    pSqlInstance.close();
                });
            });
        } catch (e) {
            console.log("BarcodeValidateQtyPicking.catch:" + e.message, "error");
            socket.emit('error_message', { 'message': 'validar_qty_picking.catch: ' + e.message });

        }
    }
}
