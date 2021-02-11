var _cnnServ = require('./ConnectionService.js');
var xdb = require('./moddb.js');
var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();
var pSqlInstance = require('mssql');
var console = require("./LogService.js");

module.exports = {
    process_signature: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {

                var request = new pSqlInstance.Request(connection);
                request.verbose = false;
                request.stream = false;
                console.log(data.dataurl);

                var pImgBinary = data.dataurl.split(",");

                //console.log(pImgBinary);

                var pSQL = "UPDATE SWIFT_TXNS set TXN_SIGNATURE = '" + pImgBinary[1] + "' WHERE TXN_TASK_SOURCE = " + data.TASK_ID;

                console.log(pSQL, "info"); //Log SQL

                request.query(pSQL, function (err, recordsets, returnValue) {
                    socket.emit('signature_has_been_saved', { 'taskid': data.TASK_ID });

                    console.log('signature_has_been_saved:' + data.TASK_ID, "info");

                    connection.close();

                });

            });

        } catch (e) {
            console.log("process_signature.catch:" + e.message, "error");
        }
    },
    post_order: function (data, socket) {
        console.log("post_order.received");
        try {
            var pOrder = [];
            var pSkus = [];
            var j=0;
            var i=0;    
            var pSQL="";
            pOrder = JSON.parse(data.data.data_order);
            pSkus = JSON.parse(data.data.data_skus);

            var pOrderID = pOrder[0].ORDER_ID;
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
              
                var request = new pSqlInstance.Request(connection);
                request.verbose = true;
                request.stream = false;
                

                for (i = 0; i <= (pOrder.length - 1); i++) {

                    pSQL = "INSERT INTO SWIFT_ORDERS "
                    pSQL += "(ORDER_ID"
                    pSQL += ",CREATED_DATESTAMP"
                    pSQL += ",CREATED_BY"
                    pSQL += ",PRESALE_ROUTE"
                    pSQL += ",CLIENT_CODE, CLIENT_NAME"
                    pSQL += ",DELIVERY_POINT"
                    pSQL += ",DELIVERY_BRANCH_NAME"
                    pSQL += ",DELIVERY_BRANCH_ADDRESS"
                    pSQL += ",TOTAL_AMOUNT"
                    pSQL += ",TASK_SOURCE"
                    pSQL += ",SIGNATURE"
                    pSQL += ",IMAGE"
                    pSQL += ",STATUS"
                    pSQL += ",GPS_URL) "
                    console.log("partial:" + pSQL);

                    pSQL += " VALUES('" + pOrder[i].ORDER_ID + "'";
                    pSQL += ",'" + pOrder[i].CREATED_DATESTAMP + "'";
                    pSQL += ",'" + data.data.loginid + "'"
                    pSQL += ",'" + pOrder[i].PRESALE_ROUTE + "'";

                    if (pOrder[i].CLIENT_CODE == "999999") {
                        pSQL += ",'999999'";
                        pSQL += ",'" + pOrder[i].CLIENT_NAME + "'";
                    } else {
                        pSQL += ",ISNULL((SELECT COSTUMER_CODE  FROM SWIFT_TASKS WHERE TASK_ID = " + pOrder[i].SOURCE_TASK + "),'" + pOrder[i].CLIENT_CODE + "')";
                        pSQL += ",ISNULL((SELECT COSTUMER_NAME  FROM SWIFT_TASKS WHERE TASK_ID = " + pOrder[i].SOURCE_TASK + "),'" + pOrder[i].CLIENT_NAME + "')";
                    }

                    pSQL += ",'" + pOrder[i].DELIVERY_POINT + "'";
                    pSQL += ",'" + pOrder[i].DELIVERY_BRANCH_NAME + "'";
                    pSQL += ",'" + pOrder[i].DELIVERY_BRANCH_ADDRESS + "'";
                    pSQL += "," + pOrder[i].TOTAL_AMOUNT;
                    pSQL += "," + pOrder[i].SOURCE_TASK;
                    pSQL += ",'" + pOrder[i].SIGNATURE + "'";
                    pSQL += ",'" + pOrder[i].IMAGE + "'";
                    pSQL += ",'ORDERED'";
                    pSQL += ",'" + data.data.gps + "')";
                    console.log(pSQL, "info"); //Log SQL

                    request.query(pSQL, function (err, recordsets, returnValue) {
                        console.log('post.guide.err:' + err, "error");
                        console.log('post.guide.ok:' + pOrderID, "info");

                    });
                }

                for (j = 0; j <= (pSkus.length - 1); j++) {

                    pSQL = "INSERT INTO SWIFT_SKUS_BY_ORDER "
                    pSQL += "(ORDER_ID"
                    pSQL += ",SKU_ID"
                    pSQL += ",SKU_DESCRIPTION"
                    pSQL += ",QTY"
                    pSQL += ",SKU_PRICE"
                    pSQL += ",TOTAL_LINE)"

                    pSQL += " VALUES('" + pSkus[j].ORDER_ID + "'";
                    pSQL += ",'" + pSkus[j].SKU_ID + "'";
                    pSQL += ",'" + pSkus[j].SKU_DESCRIPTION + "'"
                    pSQL += "," + pSkus[j].QTY
                    pSQL += "," + pSkus[j].UNIT_PRICE
                    pSQL += "," + (parseFloat(pSkus[j].QTY) * parseFloat(pSkus[j].UNIT_PRICE)) + ")";
                    request.query(pSQL,
                        function (err, recordsets, returnValue) {
                            console.log('post_pickup.skus_x_order.ok:' + pOrderID, "info");
                        }
                    );
                }

                pSQL = "UPDATE SWIFT_TASKS SET TASK_STATUS = 'COMPLETED' , COMPLETED_STAMP = CURRENT_TIMESTAMP, POSTED_GPS = '" + data.data.gps + "' WHERE TASK_ID= " + data.data.task

                request.query(pSQL, function (err, recordsets, returnValue) {
                    console.log('post_pickup.update_task.ok:' + data.data.task, "info");
                });

                socket.emit('post_order.posted', {
                    'pResult': '0',
                    'pORDER_ID': pOrderID,
                    'taskid': data.data.task
                });
            }

            );
            console.log("post.close.1");

        }
        catch (e) {
            console.log("post_pickup.error:" + e.message, "error");
            return;
        }
    },
    process_pickup_image: function (data, socket) {
        try {
            vconsole.log("process_pickup_image:" + data.taskid);

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                
                var request = new pSqlInstance.Request(connection);
                request.verbose = false;
                request.stream = false;

                var pSQL = "update SWIFT_TXNS set TXN_IMAGE_1 = '" + data.image + "' WHERE TXN_TASK_SOURCE = " + data.taskid;
                request.query(pSQL, function (err, recordsets, returnValue) {

                    //socket.emit('task_has_been_syncro', {'task_id': data.TASK_ID});
                    console.log('process_pickup_image.posted:' + data.taskid, "info");

                    connection.close();

                });

            });

        } catch (e) {
            console.log("process_pickup_image.catch:" + e.message, "error");
        }
    },
    get_all_skus: function (data, socket) {
        try {
            console.log("get_all_skus");
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var rowscount = 0;

                var request = new pSqlInstance.Request(connection);
                request.verbose = false;
                request.stream = true;

                var pSQL = "SELECT CODE_SKU, dbo.FUNC_REMOVE_SPECIAL_CHARS(DESCRIPTION_SKU) AS DESCRIPTION_SKU, LIST_PRICE FROM SWIFT_VIEW_ALL_SKU WHERE LIST_PRICE > 0 ORDER BY DESCRIPTION_SKU";

                request.query(pSQL,
                    function (err, recordset) {
                        if (err) {
                            console.log("get_all_skus.error:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'get_all_sku_row.sql.err: ' + err });
                        }
                        if (recordset.length == 0) {
                            socket.emit('no_skus_found');
                        }
                    }
                );

                request.on('row', function (row) {
                    socket.emit('get_all_skus_row', { 'row': row });
                    //console.log('get_all_skus_row:' + row.SKU_ID + ', ' + row.SKU_DESCRIPTION);
                    rowscount++;
                });


                request.on('done', function (returnValue) {
                    console.log('TERMINO DE CARGAR LOS ' + rowscount + ' SKUS', "error");
                    socket.emit('get_all_skus_done', { 'rowcount': rowscount });
                    rowscount = 0;
                    connection.close();
                });

            });

        } catch (e) {
            console.log("get_all_skus.catch:" + e.message, "error");
        }
    },
    get_all_branches: function (data, socket) {
        try {
            socket.emit('get_all_branches_received');
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var rowscount = 0;

                var request = new pSqlInstance.Request(connection);
                request.verbose = false;
                request.stream = true;

                var pSQL = "SELECT * FROM SWIFT_BRANCHES";

                request.query(pSQL,
                    function (err, recordset) {
                        // ... error checks
                        if (err) {
                            console.log("get_all_branches_received.query:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'get_all_branches.sql.err: ' + err });
                        }
                        if (recordset.length == 0) {
                            socket.emit('no_branches_found', { 'courierid': data.courierid });
                        }
                    }
                );

                request.on('row', function (row) {

                    socket.emit('add_to_get_all_branches', { 'row': row });
                    rowscount++;
                });


                request.on('done', function (returnValue) {


                    socket.emit('get_all_branches_completed', { 'rowcount': rowscount });
                    rowscount = 0;
                    connection.close();

                });


            });
        }
        catch (e) {
            console.log("get_all_branches.catch:" + e.message, "error");
        }
    },
    get_all_novisit: function (data, socket) {
        try {
            console.log("get_all_novisit");
            socket.emit('get_all_novisit');
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var rowscount = 0;

                var request = new pSqlInstance.Request(connection);
                request.verbose = false;
                request.stream = true;

                pSQL = "SELECT * FROM SWIFT_VIEW_NO_VISIT_REASONS ORDER BY PARAM_NAME";

                request.query(pSQL,
                    function (err, recordset) {
                        if (err) {
                            console.log("get_all_novisit.query:" + JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'get_all_novisit.sql.err: ' + err });
                        }
                        if (recordset.length == 0) {
                            socket.emit('novisit_not_found', { 'routeid': data.routeid });
                        }
                    }
                );

                request.on('row', function (row) {
                    socket.emit('get_all_novisit_row', { 'row': row });
                    console.log('get_all_novisit_row:' + row.PARAM_NAME + ', ' + row.PARAM_CAPTION, "info");
                    rowscount++;
                });


                request.on('done', function (returnValue) {
                    socket.emit('get_all_novisit_done', { 'rowcount': rowscount });
                    rowscount = 0;
                    connection.close();

                });

            });

        } catch (e) {
            console.log("get_all_novisit.catch:" + e.message, "error");
        }
    }
}