var pSqlInstance;
var xdb = require('./moddb.js');
var console = require("./LogService.js");

var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();


function CreateQrCode(pSqlInstance, data, connection, socket) {
    try {
        var request1 = new pSqlInstance.Request(connection);
        request1.verbose = true;
        request1.stream = false;
        request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
        request1.input('pCUSTOMER_NAME', pSqlInstance.VarChar(250), data.customername);
        request1.input('pCODE_SKU', pSqlInstance.VarChar(250), data.sku);
        request1.input('pSERIE', pSqlInstance.VarChar(75), data.serie);
        request1.input('pERP_DOC', pSqlInstance.VarChar(50), data.erpreference);
        request1.output('pShipTo', pSqlInstance.VarChar(250));
        request1.output('pRESULT', pSqlInstance.VarChar(250));

        request1.execute('[SWIFT_SP_CREATE_QR_CODE_LABEL]', function (err, recordsets, returnValue) {
            switch (returnValue) {
                case 0:
                    data.shiptoaddresses = request1.parameters.pShipTo.value;
                    //callback(data);    


                    var request2 = new pSqlInstance.Request(connection);
                    request2.verbose = true;
                    request2.stream = false;

                    request2.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                    request2.input('pBARCODE_LOC', pSqlInstance.VarChar(75), data.location);
                    request2.input('pSKU', pSqlInstance.VarChar(75), data.sku);
                    request2.input('pSERIE', pSqlInstance.VarChar(75), data.serie);

                    request2.input('pQTY', pSqlInstance.Decimal(18, 2), data.qty);
                    request2.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                    request2.output('pTXN_ID', pSqlInstance.Int);
                    request2.output('pRESULT', pSqlInstance.VarChar(250));

                    request2.execute('SWIFT_SP_PROCESS_PICKING', function (err2, recordsets2, returnValue2) {

                        switch (returnValue2) {
                            case 0://ok
                                socket.emit('picking_processed_ok',
                                    {
                                        'sku': data.sku,
                                        'txnid': request2.parameters.pTXN_ID.value,
                                        'taskid': data.taskid,
                                        'erpreference': data.erpreference,
                                        'customername': data.customername,
                                        'serie': data.serie,
                                        'shiptoaddresses': data.shiptoaddresses
                                    });
                                break;
                            default:
                                socket.emit('picking_fail',
                                    { 'sku': data.sku, 'error': returnValue2, 'msg': request2.parameters.pRESULT.value });
                                break;
                        }
                        connection.close();
                    });

                    break;
                default:
                    socket.emit('picking_fail',
                        { 'sku': data.sku, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                    connection.close();
                    break;
            }
        });

    } catch (e) {
        socket.emit('picking_fail', { 'sku': data.sku, 'error': -1, 'msg': e.message });
        return 0;
    }
}

module.exports = {

    process_inv_init:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');
            console.log("process_inv_init.received ");
            console.dir(data);

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pLOCATION_ID', pSqlInstance.VarChar(50), data.location);
                request1.input('pSKU', pSqlInstance.VarChar(150), data.sku);
                request1.input('pBARCODE_SERIE', pSqlInstance.VarChar(75), data.serie);
                request1.input('pQTY', pSqlInstance.Int, 1);

                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pRESULT', pSqlInstance.VarChar(250));

                request1.execute('[SWIFT_SP_PROCESS_INIT_INV]', function (err, recordsets, returnValue) {

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('init_inv_processed_ok');
                            break;
                        case -2:
                            var errdata = { 'serviceid': 'init', 'error': returnValue, 'msg': request1.parameters.pRESULT.value };
                            console.log("error: " + returnValue + " message: " + request1.parameters.pRESULT.value, "error");

                            socket.emit('init_inv_fail', errdata);
                            break;
                        default://something happen
                            var isduplicated = request1.parameters.pRESULT.value.indexOf('PRIMARY');
                            var pmsgformated = '';

                            if (isduplicated >= 1) {
                                pmsgformated = 'ERROR, SERIE ' + data.serie + ' YA FUE ESCANEADA';
                            } else {
                                pmsgformated = request1.parameters.pRESULT.value;
                            }

                            socket.emit('init_inv_fail', { 'serviceid': 'init', 'error': returnValue, 'msg': pmsgformated });
                            break;
                    }
                    connection.close();
                });
            });

        } catch (e) {
            console.log("process_inv_init.catch:" + e.message, "error");
        }
    },
    process_putaway_series:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');
            console.log("process_putaway_series.received");
            console.dir(data);

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pTXN_ID', pSqlInstance.Int, data.txnid);
                request1.input('pBARCODE_SERIE', pSqlInstance.VarChar(150), data.serie);
                request1.input('pLOCATION_ID', pSqlInstance.VarChar(75), data.location);
                request1.input('pSKU', pSqlInstance.VarChar(75), data.sku);
                request1.input('pLAST_INVENTORY_KY', pSqlInstance.VarChar(75), data.invid);

                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pRESULT', pSqlInstance.VarChar(250));

                request1.execute('[SWIFT_SP_PROCESS_PUTAWAY_SKU_SERIE]', function (err, recordsets, returnValue) {

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('putaway_series_processed_ok', { 'serie': data.serie, 'txnid': data.txnid, 'sku': data.sku });
                            break;
                        default://something happen
                            var isduplicated = request1.parameters.pRESULT.value.indexOf('PRIMARY');
                            var pmsgformated = '';

                            if (isduplicated >= 1) {
                                pmsgformated = 'ERROR, SERIE ' + data.serie + ' YA FUE ESCANEADA';
                            } else {
                                pmsgformated = request1.parameters.pRESULT.value;
                            }

                            socket.emit('putaway_fail', { 'serie': data.serie, 'error': returnValue, 'msg': pmsgformated });
                            break;
                    }
                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("process_putaway.catch:" + e.message, "error");
        }
    },
    process_putaway:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');
            console.log("process_putaway.received");
            console.dir(data);

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                port: gdbPort,
                password: data.dbuserpass,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };


            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = false;
                request1.stream = false;

                //console.dir(err);

                var pReturned = '';

                request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                request1.input('pBARCODE_LOC', pSqlInstance.VarChar(75), data.location);
                request1.input('pSKU', pSqlInstance.VarChar(75), data.sku);

                request1.input('pQTY', pSqlInstance.Decimal(18, 2), data.qty);
                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pTXN_ID', pSqlInstance.Int, data.txnid);
                request1.output('pINV_ID', pSqlInstance.Int);

                request1.output('pRESULT', pSqlInstance.VarChar(250));


                request1.execute('[SWIFT_SP_PROCESS_PUTAWAY]', function (err, recordsets, returnValue) {

                    switch (returnValue) {
                        case 0://ok
                            console.dir(recordsets);
                            var msgoptions =
                                {
                                    'sku': data.sku,
                                    'txnid': request1.parameters.pTXN_ID.value,
                                    'invid': request1.parameters.pINV_ID.value
                                };
                            console.dir(msgoptions);

                            socket.emit('putaway_processed_ok', msgoptions);
                            break;
                        case -8://location not found
                            socket.emit('putaway_fail', { 'sku': data.sku, 'error': returnValue, 'msg': 'Ubicacion no existe' });
                            break;
                        case -9://task with no erp doc
                            socket.emit('putaway_fail', { 'sku': data.sku, 'error': returnValue, 'msg': 'Tarea sin documento ERP' });
                            break;
                        case -0://exception found
                            socket.emit('putaway_fail', { 'sku': data.sku, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                        default:
                            socket.emit('putaway_fail', { 'sku': data.sku, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                    }
                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("process_putaway.catch:" + e.message, "error");
        }
    },
    finish_reception_task:
    function (data, socket) {
        try {
            var pSQL = '';
            console.dir(data);
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                port: gdbPort,
                password: data.dbuserpass,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false, // Use this if you're on Windows Azure
                    appName: 'swift express'
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                console.dir(err);

                //console.log('inside [SWIFT_SP_PROCESS_FINISH_RECEPTION]');
                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pRESULT', pSqlInstance.VarChar(250));
                console.log('about to [SWIFT_SP_PROCESS_FINISH_RECEPTION]');

                request1.execute('[SWIFT_SP_PROCESS_FINISH_RECEPTION]', function (err, recordsets, returnValue) {
                    console.log("returnValue: " + returnValue, "info");
                    console.dir(recordsets);

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('reception_completed', { 'sku': data.taskid });
                            break;
                        default:
                            socket.emit('reception_fail', { 'sku': data.taskid, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                    }

                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("finish_reception_task.catch:" + e.message, "error");
        }
    },

    process_picking:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            console.dir(data);

            console.dir(pSqlConfig);

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                if (err != undefined) {
                    socket.emit('picking_fail', { 'sku': data.sku, 'error': -9999, 'msg': err.message });
                    return -1;
                }

                CreateQrCode(pSqlInstance, data, connection, socket);

            });

        }
        catch (e) {
            console.log("process_picking.catch:" + e.message, "error");
        }
    },
    process_realloc:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                console.dir(err);

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pBARCODE_LOC_SOURCE', pSqlInstance.VarChar(75), data.sourcelocation);
                request1.input('pBARCODE_LOC_TARGET', pSqlInstance.VarChar(75), data.targetlocation);
                request1.input('pBARCODE_SKU', pSqlInstance.VarChar(75), data.sku);
                request1.input('pSOURCE_SERIE', pSqlInstance.VarChar(75), data.serie);


                request1.input('pQTY', pSqlInstance.Decimal(18, 2), data.qty);
                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pRESULT', pSqlInstance.VarChar(250));

                request1.execute('[SWIFT_SP_PROCESS_REALLOC]', function (err, recordsets, returnValue) {

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('realloc_processed_ok', { 'sku': data.sku });
                            break;
                        default://exception found
                            socket.emit('realloc_fail', { 'sku': data.sku, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                    }
                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("process_realloc.catch:" + e.message, "error");
        }
    },
    get_next_location:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                port: gdbPort,
                password: data.dbuserpass,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };
            //console.dir(pSqlConfig);

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                console.dir(err);

                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pSKU', pSqlInstance.VarChar(75), data.sku);

                request1.output('pRESULT', pSqlInstance.VarChar(250));

                request1.execute('[SWIFT_SP_GET_NEXT_PICKING_LOCATION]', function (err, recordsets, returnValue) {

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('get_next_location_ok', { 'sku': data.sku, 'warehouse': recordsets[0][0].WAREHOUSE, 'location': recordsets[0][0].LOCATION, 'location_type': recordsets[0][0].LOCATION_TYPE });
                            break;
                        default://exception found
                            socket.emit('get_next_location_fail', { 'sku': data.sku, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                    }
                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("get_next_location.catch:" + e.message, "error");
        }
    },
    remove_scanned_serie:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                var request2 = new pSqlInstance.Request(connection);
                var request3 = new pSqlInstance.Request(connection);
                request2.verbose = true;
                request2.stream = false;

                var pQuery = "DELETE FROM [SWIFT_INVENTORY] WHERE SKU = (SELECT TOP 1 UPPER(CODE_SKU) FROM SWIFT_VIEW_SKU  WHERE CODE_SKU = UPPER('" + data.sku + "') OR BARCODE_SKU = UPPER('" + data.sku + "')) AND SERIAL_NUMBER ='" + data.serie + "'";
                console.log(pQuery, "info"); //Log SQL
                request2.query(pQuery, function (err, recordset) { });

                var pQueryTxn = "DELETE FROM [SWIFT_TXNS] WHERE TXN_CODE_SKU = (SELECT TOP 1 UPPER(CODE_SKU) FROM SWIFT_VIEW_SKU  WHERE CODE_SKU = UPPER('" + data.sku + "') OR BARCODE_SKU = UPPER('" + data.sku + "')) AND TXN_SERIE ='" + data.serie + "' AND TXN_TYPE = 'INIT'";
                console.log(pQueryTxn, "info"); //Log SQL
                request3.query(pQueryTxn, function (err, recordset) { });

                var request1 = new pSqlInstance.Request(connection);
                pQuery = "DELETE FROM [SWIFT_TXNS_SERIES] WHERE TXN_CODE_SKU = (SELECT TOP 1 UPPER(CODE_SKU) FROM SWIFT_VIEW_SKU  WHERE CODE_SKU = UPPER('" + data.sku + "') OR BARCODE_SKU = UPPER('" + data.sku + "')) AND TXN_SERIE ='" + data.serie + "'";
                console.log(pQuery, "info"); //Log SQL

                request1.query(pQuery, function (err, recordset) {
                    if (err != undefined) {
                        socket.emit("serie_remove_fail",
                            {
                                'dbuser': data.dbuser,
                                'dbpassword': data.dbuserpass,
                                'serie': data.serie,
                                'error': err
                            }
                        );
                    } else {
                        socket.emit("serie_removed",
                            { 'serie': data.serie, 'sku': data.sku, 'txnid': data.TXN_ID }
                        );
                    }
                });

                var request3 = new pSqlInstance.Request(connection);
                pQuery = "UPDATE [SWIFT_INVENTORY] SET ON_HAND = (ON_HAND + 1) WHERE INVENTORY = " + data.invid;
                console.log('pQuery3: ' + pQuery, "info"); //Log SQL
                request3.query(pQuery, function (err, recordset) { });

            });

        }
        catch (e) {
            console.log("remove_scanned_serie.catch:" + e.message, "error");
            socket.emit("serie_remove_fail",
                { 'serie': data.serie, 'error': e.message }
            );
        }
    },
    finish_picking_task:
    function (data, socket) {
        try {
            var pSQL = '';
            console.dir(data);
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                port: gdbPort,
                password: data.dbuserpass,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false, // Use this if you're on Windows Azure
                    appName: 'swift express'
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                console.dir(err);

                //console.log('inside [SWIFT_SP_PROCESS_FINISH_RECEPTION]');
                var request1 = new pSqlInstance.Request(connection);
                request1.verbose = true;
                request1.stream = false;

                var pReturned = '';

                request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);

                request1.output('pRESULT', pSqlInstance.VarChar(250));
                console.log('about to [SWIFT_SP_PROCESS_FINISH_PICKING]');

                request1.execute('[SWIFT_SP_PROCESS_FINISH_PICKING]', function (err, recordsets, returnValue) {
                    console.log("returnValue: " + returnValue, "info");
                    console.dir(recordsets);

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('picking_completed', { 'sku': data.taskid });
                            break;
                        default:
                            socket.emit('picking_fail', { 'sku': data.taskid, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                            break;
                    }

                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("finish_picking_task.catch:" + e.message, "error");
            socket.emit('picking_fail', { 'sku': data.taskid, 'error': 0, 'msg': e.message });

        }
    },
    remove_null_serie:
    function (data, socket) {
        try {
            var pSQL = '';
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                password: data.dbuserpass,
                port: gdbPort,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false // Use this if you're on Windows Azure
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                var request1 = new pSqlInstance.Request(connection);
                var request2 = new pSqlInstance.Request(connection);
                var pQuery1 = "";
                var pQuery2 = "";

                //request2.verbose = true;
                //request2.stream = false;

                pQuery1 = "DELETE FROM [SWIFT_TXNS_SERIES] WHERE TXN_CODE_SKU = (SELECT TOP 1 UPPER(CODE_SKU) FROM SWIFT_VIEW_SKU  WHERE CODE_SKU = UPPER('" + data.sku + "') OR BARCODE_SKU = UPPER('" + data.sku + "')) AND TXN_SERIE ='" + data.serie + "'";
                console.log('pQuery1: ' + pQuery1, "info"); //Log SQL
                request1.query(pQuery1, function (err, recordset) {
                    if (err != undefined) {
                        socket.emit("serie_remove_fail",
                            {
                                'dbuser': data.dbuser,
                                'dbpassword': data.dbuserpass,
                                'serie': data.serie,
                                'error': err
                            }
                        );
                    } else {
                        socket.emit("serie_removed",
                            { 'serie': data.serie, 'sku': data.sku }
                        );
                    }
                });

                pQuery2 = "DELETE FROM [SWIFT_INVENTORY] WHERE SKU = (SELECT TOP 1 UPPER(CODE_SKU) FROM SWIFT_VIEW_SKU  WHERE CODE_SKU = UPPER('" + data.sku + "') OR BARCODE_SKU = UPPER('" + data.sku + "')) AND SERIAL_NUMBER ='" + data.serie + "'";
                console.log('pQuery2: ' + pQuery2, "info"); //Log SQL
                request2.query(pQuery2, function (err, recordset) { });


            });

        }
        catch (e) {
            console.log("remove_scanned_serie.catch:" + e.message, "error");
            socket.emit("serie_remove_fail",
                { 'serie': data.serie, 'error': e.message }
            );
        }
    },
    CancelScan:
    function (data, socket) {
        try {
            var pSQL = '';
            console.dir(data);
            pSqlInstance = require('mssql');

            var pSqlConfig = {
                server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                user: data.dbuser,
                port: gdbPort,
                password: data.dbuserpass,
                database: 'SWIFT_EXPRESS',
                options: {
                    encrypt: false, // Use this if you're on Windows Azure
                    appName: 'swift express'
                }
            };

            var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                console.dir(err);

                console.log('inside [SWIFT_SP_CANCEL_SCAN]');
                var request = new pSqlInstance.Request(connection);
                request.verbose = true;
                request.stream = false;

                var pReturned = '';

                request.input('pTXN_ID', pSqlInstance.Int, data.txnid);
                request.input('pSKU', pSqlInstance.VarChar(75), data.sku);
                request.output('pResult', pSqlInstance.VarChar(250));
                console.log('about to [SWIFT_SP_CANCEL_SCAN]');

                request.execute('[SWIFT_SP_CANCEL_SCAN]', function (err, recordsets, returnValue) {
                    console.log("returnValue: " + returnValue, "info");
                    console.dir(recordsets);

                    switch (returnValue) {
                        case 0://ok
                            socket.emit('cancel_scan_ok', { 'txnid': data.txnid, 'sku': data.sku });
                            break;
                        default:
                            socket.emit('cancel_scan_fail', { 'error': err, 'result': request.parameters.pRESULT.value });
                            break;
                    }

                    connection.close();
                });
            });

        }
        catch (e) {
            console.log("cancel_scan.catch:" + e.message, "error");
            //socket.emit('cancel_scan_error', { 'sku' : data.sku, 'txnid' : data.txnid, 'error': 0, 'msg': e.message });

        }
    }

}