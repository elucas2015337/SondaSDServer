var _cnnServ = require('./ConnectionService.js');
var console = require("./LogService.js");

module.exports = {
    GetQrCodes: function (data, socket) {
        try {
            var rowscount = 0;

            socket.emit('qr_code_recibe', data);

            var pSql = "";
            pSql += " SELECT ";
            pSql += " 		 [ID] ";
            pSql += "      ,[TASK_ID]";
            pSql += "      ,[CUSTOMER_NAME]";
            pSql += "      ,[CODE_SKU]";
            pSql += "      ,[SERIE]";
            pSql += "      ,[ERP_DOC]";
            pSql += "      ,[SHIP_TO_ADDRESSES]";
            pSql += "      ,[CREATE_DATE]";
            pSql += " FROM  [SWIFT_QR_CODE_LABEL]";
            pSql += " WHERE [TASK_ID] =" + data.taskid;

            console.log(pSql, "info"); //Log SQL

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = true;
                request.stream = true;

                request.query(pSql,
                    function (err) {
                        if (err) {
                            console.log(JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'get_qr_codes.sql.err: ' + err.message });
                        }
                    }
                );

                request.on('row', function (row) {
                    console.log('add_qr_code_to_list.emited');

                    var label = {
                        erp: row.ERP_DOC,
                        cus: row.CUSTOMER_NAME,
                        sku: row.CODE_SKU,
                        ser: row.SERIE,
                        sta: row.SHIP_TO_ADDRESSES
                    };
                    socket.emit('add_qr_code_to_list', label);
                    rowscount++;

                });

                request.on('done', function () {
                    console.log('get_qr_codes.done:' + rowscount, "info");
                    //console.log(rowscount);
                    try {
                        socket.emit('get_qr_code_completed', { 'rowcount': rowscount });
                        rowscount = 0;
                    }
                    catch (e) {
                        console.log('get_qr_codes.catch: ' + e.message, "error");
                    }
                });

            });

        } catch (e) {
            console.log("GetQrCodes.catch" + e.message, "error");
        }
    },
    DeliverySku: function (data, socket) {
        try {
            var sql = "";
            sql += "UPDATE SWIFT_QR_CODE_LABEL ";
            sql += "    SET STATUS='DELIVERY', UPDATE_DATE = '" + data.label.UPDATE_DATE + "'";
            sql += "WHERE ";
            sql += "    ERP_DOC=" + data.label.ERP_DOC;
            sql += "    AND CODE_SKU='" + data.label.CODE_SKU + "'";
            sql += "    AND SERIE='" + data.label.SERIE + "'";
            sql += "    AND STATUS='IN_TRANSIT'";

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = true;
                request.stream = true;

                request.query(sql, function (err) {
                    if (err) {
                        console.log(JSON.stringify(err), "error");
                        socket.emit('error_message', { 'message': 'DeliverySku.err: ' + err.message });
                    }
                    else {
                        console.log('DeliverySku.Ok');
                        socket.emit('DeliverySkuRecibe', data);
                    }
                }
                );
            });

        } catch (e) {
            console.log("DeliverySku.catch" + e.message, "error");
        }
    },
    GetRrLabels: function (data, socket) {
        try {
            var rowscount = 0;

            socket.emit('get_repair_reception_labels_recibe', data);

            var pSql = "";
            pSql += "SELECT A.TASK_SOURCE_ID ";
            pSql += "	, A.TXN_CREATED_STAMP ";
            pSql += "	, B.RELATED_PROVIDER_NAME ";
            pSql += "    , B.RELATED_PROVIDER_CODE ";
            pSql += "    , A.TXN_CODE_SKU ";
            pSql += "    , ISNULL(C.TXN_SERIE,'N/A') AS TXN_SERIE ";
            pSql += "	, CASE WHEN COUNT(C.TXN_SERIE) > 0 ";
            pSql += "		THEN COUNT(C.TXN_SERIE) ";
            pSql += "		WHEN COUNT(C.TXN_SERIE) = 0 ";
            pSql += "		THEN A.TXN_QTY ";
            pSql += "	END AS QTY ";
            pSql += "FROM [SWIFT_TXNS] AS A ";
            pSql += "LEFT OUTER JOIN [SWIFT_TASKS] B ";
            pSql += "ON A.TASK_SOURCE_ID = B.TASK_ID ";
            pSql += "LEFT OUTER JOIN [SWIFT_TXNS_SERIES] AS C ";
            pSql += "ON C.TXN_ID = A.TXN_ID ";
            pSql += "WHERE A.TXN_CATEGORY = 'RR' AND A.TASK_SOURCE_ID = " + data.taskid;
            pSql += " GROUP BY A.TASK_SOURCE_ID ";
            pSql += "	, A.TXN_CREATED_STAMP ";
            pSql += "	, B.RELATED_PROVIDER_NAME ";
            pSql += "    , B.RELATED_PROVIDER_CODE ";
            pSql += "    , A.TXN_CODE_SKU ";
            pSql += "    , C.TXN_SERIE ";
            pSql += "	, A.TXN_QTY ";

            console.log(pSql, "info"); //Log SQL

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = true;
                request.stream = true;

                request.query(pSql,
                    function (err) {
                        if (err) {
                            console.log(JSON.stringify(err), "error");
                            socket.emit('error_message', { 'message': 'get_repair_reception_labels.sql.err: ' + err.message });
                        }
                    }
                );

                request.on('row', function (row) {
                    console.log('add_repair_reception_labels_to_list.emited');

                    var label = {
                        ProviderName: row.RELATED_PROVIDER_NAME,
                        ProviderCode: row.RELATED_PROVIDER_CODE,
                        Sku: row.TXN_CODE_SKU,
                        Serie: row.TXN_SERIE,
                        ReceptionDate: row.TXN_CREATED_STAMP
                    };
                    socket.emit('add_repair_reception_labels_to_list', { 'label': label, 'qty': row.QTY });
                    rowscount++;

                });

                request.on('done', function () {
                    console.log('get_repair_reception_labels.done:' + rowscount, "info");
                    //console.log(rowscount);
                    try {
                        socket.emit('get_repair_reception_labels_completed', { 'rowcount': rowscount });
                        rowscount = 0;
                    }
                    catch (e) {
                        console.log('get_repair_reception_labels.catch');
                    }
                });

            });

        } catch (e) {
            console.log("GetDevolutionLabels.catch" + e.message, "error");
        }
    }
}