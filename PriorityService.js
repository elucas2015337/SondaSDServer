function GetErrorMessage(err) {
        try {
            return err.message;
        } catch (e) {
            return e.message;
        }
    }

var console = require("./LogService.js");
var _cnnServ = require('./ConnectionService.js');

module.exports = {
    SendBatch: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;
                    request.input('BATCH_SUPPLIER', pSqlInstance.VarChar, data.batch.BatchSupplier);
                    request.input('BATCH_SUPPLIER_EXPIRATION_DATE', pSqlInstance.Date, data.batch.BatchSupplierExpirationDate);
                    request.input('STATUS', pSqlInstance.VarChar, data.batch.Status);
                    request.input('SKU', pSqlInstance.VarChar, data.batch.Sku);
                    request.input('QTY', pSqlInstance.INT, data.batch.Qty);
                    request.input('QTY_LEFT', pSqlInstance.INT, data.batch.QtyLeft);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.batch.LastUpdateBy);
                    request.input('TASK_ID', pSqlInstance.INT, data.batch.TaskId);
                    request.input('BATCH_ID', pSqlInstance.VarChar, data.batch.LastBatch);

                    request.execute('SWIFT_SP_ADD_BATCH', function (err, recordsets) {
                        if (err === undefined) {
                            data.batch.BatchId = recordsets[0][0].ID;
                            socket.emit("SendBatch_success", { "batch": data.batch });
                            console.log("SendBatch_success");
                        } else {
                            socket.emit("SendBatch_fail", { "data": data.batch, "Message": GetErrorMessage(errConnConsig) });
                            console.log("SendBatch_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("SendBatch_fail", { "data": data.batch, "Message": GetErrorMessage(errConnConsig) });
                    console.log("SendBatch error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("SendBatch_fail", { "data": data.batch, "Message": GetErrorMessage(err) });
            console.log("SendBatch_ catch: " + GetErrorMessage(err), "error");
        }
    },
    SendPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('BATCH_ID', pSqlInstance.INT, data.pallet.BatchId);
                    request.input('STATUS', pSqlInstance.VarChar, data.pallet.Status);
                    request.input('QTY', pSqlInstance.INT, data.pallet.Qty);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.pallet.LastUpdateBy);
                    request.input('WAREHOUSE', pSqlInstance.VarChar, data.pallet.Warehouse);
                    request.input('LOCATION', pSqlInstance.VarChar, data.pallet.Location);
                    request.input('TASK_ID', pSqlInstance.INT, data.pallet.TaskId);

                    request.execute('SWIFT_SP_INSERT_PALLET', function (err, recordsets) {

                        if (err === undefined) {
                            data.pallet.PalletId = recordsets[0][0].ID;
                            socket.emit("SendPallet_success", { "pallet": data.pallet });
                            console.log("SendPallet_success");
                        } else {
                            socket.emit("SendPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(errConnConsig) });
                            console.log("SendPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("SendPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(errConnConsig) });
                    console.log("SendPallet error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("SendPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(err) });
            console.log("SendPallet error connection: " + GetErrorMessage(err), "error");
        }
    },
    CloseBatch: function (data, socket) {
        try {

            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('BATCH_ID', pSqlInstance.INT, data.BatchId);
                    request.input('QTY', pSqlInstance.INT, data.Qty);

                    request.execute('SWIFT_SP_BATCH_CLOSED', function (err, recordsets, returnValue) {
                        if (err === undefined) {
                            socket.emit("CloseBatch_success", { "batch": data.batch });
                            console.log("CloseBatch_success");
                        } else {
                            socket.emit("CloseBatch_fail", { "data": data, "Message": GetErrorMessage(errConnConsig) });
                            console.log("CloseBatch_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });
                } else {
                    socket.emit("CloseBatch_fail", { "data": data, "Message": GetErrorMessage(errConnConsig) });
                    console.log("CloseBatch error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("CloseBatch_fail", { "data": data, "Message": GetErrorMessage(err) });
            console.log("CloseBatch catch: " + GetErrorMessage(err), "error");
        }
    },
    GetPalletstByTask: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = true;
                    console.log("GetPalletstByTask_Requested-" + JSON.stringify(data), "info");
                    socket.emit('GetPalletstByTask-' + data.request, { 'option': 'requested_get_pallets_by_task', 'task': data.task, 'code_sku': data.codeSku });

                    request.input('TASK', pSqlInstance.INT, data.task);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.codeSku);
                    request.input('STATUS', pSqlInstance.VarChar, data.status);
                    console.log("Status: " + data.status, "info");
                    var rowscount = 0;
                    request.execute('SWIFT_SP_GET_PALLETS_BY_TASK', function (err, recordsets) {
                        if (err) {
                            socket.emit('GetPalletstByTask-' + data.request, { 'option': 'error_get_pallets_by_task', 'error': err.message });
                            console.log("GetPalletstByTask_Error-" + err.message, "error");
                        }
                        if (recordsets.length === 0) {
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetPalletstByTask-' + data.request, { 'option': 'no_get_pallets_by_task_found', 'routeid': data.routeid });
                            console.log("GetPalletstByTask_Count-0", "info");
                        }

                    });
                    request.on('row', function (row) {
                        rowscount++;
                        socket.emit('GetPalletstByTask-' + data.request, { 'option': 'add_pallet', 'row': row, 'rowscount': rowscount });
                        console.log("GetPalletstByTask_Row-" + JSON.stringify(row), "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetPalletstByTask-' + data.request, { 'option': 'get_pallets_by_task_completed', 'rowcount': rowscount });
                        rowscount = 0;
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetPalletstByTask_Complete");
                    });
                } else {
                    socket.emit("GetPalletstByTask-" + data.request, { 'option': 'error_get_pallets_by_task', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetPalletstByTask error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetPalletstByTask-" + data.request, { 'option': 'error_get_pallets_by_task', "error": GetErrorMessage(err) });
            console.log("GetPalletstByTask_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetBatch: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = true;
                    console.log("GetBatch-" + JSON.stringify(data), "info");
                    socket.emit('GetBatch', { 'option': 'requested_get_batch', 'batchId': data.BATCH_ID });
                    request.input('BATCH_ID', pSqlInstance.INT, data.batchId);
                    var rowscount = 0;
                    request.execute('SWIFT_SP_GET_BATCH', function (err, recordsets) {
                        if (err) {
                            socket.emit('GetBatch', { 'option': 'error_get_batch', 'error': err.message });
                            console.log("GetBatch_Error-" + err.message, "error");
                        }
                        if (recordsets.length === 0) {
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetBatch', { 'option': 'no_get_batch_found', 'routeid': data.routeid });
                            console.log("GetBatch_Count-0", "error");
                        }

                    });
                    request.on('row', function (row) {
                        rowscount++;
                        socket.emit('GetBatch', { 'option': 'add_batch', 'row': row, 'rowscount': rowscount });
                        console.log("GetBatch_Row-" + JSON.stringify(row), "error");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetBatch', { 'option': 'get_batch_completed', 'rowcount': rowscount });
                        rowscount = 0;
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetBatch_Complete");
                    });
                } else {
                    socket.emit("GetBatch", { 'option': 'error_get_batch', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetBatch error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetBatch", { 'option': 'error_get_batch', "error": GetErrorMessage(err) });
            console.log("GetBatch_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetLastBatchByTask: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('TASK_ID', pSqlInstance.INT, data.taskId);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.codeSku);

                    request.execute('SWIFT_SP_GET_LAST_BATCH_BY_TASK', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0] !== undefined) {
                                socket.emit("GetLastBatchByTask_request", { 'option': "OLD", "taskId": data.TaskId, "batch": recordsets[0][0] });
                                console.log("GetLastBatchByTask_success_OLD");
                            } else {
                                socket.emit("GetLastBatchByTask_request", { 'option': "NEW", "taskId": data.TaskId });
                                console.log("GetLastBatchByTask_success_NEW");
                            }
                        } else {
                            socket.emit("GetLastBatchByTask_request", { 'option': "fail", "taskId": data.TaskId, "Message": GetErrorMessage(errConnConsig) });
                            console.log("GetLastBatchByTask_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("GetLastBatchByTask_request", { 'option': "fail", "taskId": data.TaskId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("GetLastBatchByTask_fail error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetLastBatchByTask_request", { 'option': "fail", 'taskId': data.TaskId, "Message": GetErrorMessage(err) });
            console.log("GetLastBatchByTask_fail catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidateLocationReception: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    console.log("ValidateLocationReception_Requested-" + JSON.stringify(data), "info");

                    request.input('LOCATION', pSqlInstance.VarChar, data.location);
                    request.execute('SWIFT_SP_VALIDATE_LOCATION_RECEPTION', function (err, recordsets) {
                        if (err) {
                            socket.emit('ValidateLocationReception_Requested', { 'option': 'error_Validate_location', 'error': err.message });
                            console.log("ValidateLocationReception_Error-" + err.message, "error");
                        }
                        if (recordsets.length !== 0) {
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('ValidateLocationReception_Requested', { 'option': 'Validate_location_success', 'message': recordsets[0][0].RESULT });
                            console.log("ValidateLocationReception_Success");
                        }

                    });
                } else {
                    socket.emit("ValidateLocationReception_Requested", { 'option': 'error_Validate_location', "error": GetErrorMessage(errConnConsig) });
                    console.log("ValidateLocationReception error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateLocationReception_Requested", { 'option': 'error_Validate_location', "error": GetErrorMessage(err) });
            console.log("ValidateLocationReception_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    AllocatedPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;


                    request.input('PALLET_ID', pSqlInstance.INT, data.palletid);
                    request.input('CODE_LOCATION', pSqlInstance.VarChar, data.location);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.LastUpdateBy);
                    //request.input('CODESKU', pSqlInstance.VarChar, data.codeSku);
                    request.input('TASK_ID', pSqlInstance.INT, data.task);
                    request.input('TXN_DESCRIPTION', pSqlInstance.VarChar, data.categoryDescription);
                    request.input('TXN_CATEGORY', pSqlInstance.VarChar, data.category);

                    request.execute('SWIFT_SP_ALLOCATE_PALLET', function (err, recordsets) {

                        if (err === undefined) {
                            //data.pallet.PalletId = recordsets[0][0].Resultado;
                            socket.emit("AllocatedPallet_success", { "Message": "Exito" });
                            console.log("AllocatedPallet_success");
                        } else {
                            socket.emit("AllocatedPallet_fail", { "pallet": data.pallet, "Message": err.message });
                            console.log("AllocatedPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("AllocatedPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(errConnConsig) });
                    console.log("AllocatedPallet error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });

        } catch (err) {
            socket.emit("AllocatedPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(err) });
            console.log("AllocatedPallet error connection: " + GetErrorMessage(err), "error");
        }
    },
    AdjustPallet: function (data, socket) {
        try {

            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('Batch_Id', pSqlInstance.VarChar, data.BatchId);
                    request.input('PALLET_ID', pSqlInstance.INT, data.PalletId);
                    request.input('TASK_ID', pSqlInstance.INT, data.TaskId);
                    request.input('QTY', pSqlInstance.INT, data.Qty);

                    request.execute('SWIFT_SP_ADJUST_LAST_PALLET', function (err, recordsets) {

                        if (err === undefined) {
                            //data.pallet.PalletId = recordsets[0][0].ID;
                            socket.emit("AdjustPallet_success", { "pallet": data.pallet });
                            console.log("AdjustPallet_success");
                        } else {
                            socket.emit("AdjustPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(errConnConsig) });
                            console.log("AdjustPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("AdjustPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(errConnConsig) });
                    console.log("AdjustPallet error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });

        } catch (err) {
            socket.emit("AdjustPallet_fail", { "pallet": data.pallet, "Message": GetErrorMessage(err) });
            console.log("AdjustPallet error connection: " + GetErrorMessage(err), "error");
        }
    },
    GetPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;
                    request.input('PALLET_ID', pSqlInstance.VarChar, data.palletId);

                    request.execute('SWIFT_SP_GET_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0] !== undefined) {
                                socket.emit("GetPallet_success-" + data.request, { "Pallet": recordsets[0][0] });
                                console.log("GetPallet_success-" + data.request, "info");
                            } else {
                                socket.emit("GetPallet_success-" + data.request, { "Pallet": null });
                                console.log("GetPallet_success-" + data.request, "info");
                            }

                        } else {
                            socket.emit("GetPallet_fail-" + data.request, { "PalletId": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                            console.log("GetPallet_fail- " + data.request + ": " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("GetPallet_fail-" + +data.request, { "PalletId": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("GetPallet-" + data.request + " error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetPallet_fail-" + data.request, { "PalletId": data.PalletId, "Message": GetErrorMessage(err) });
            console.log("GetPallet-" + data.request + "_catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidatedStatusBatchAndPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('TASK_ID', pSqlInstance.INT, data.TaskId);

                    request.execute('SWIFT_SP_VALIDATE_TO_CLOSE_TASK_WITH_BATCH', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT === 1) {
                                socket.emit("ValidatedStatusBatchAndPallet_request", { 'option': "COMPLETE", "taskId": data.TaskId });
                                console.log("ValidatedStatusBatchAndPallet_success_COMPLETE");
                            } else {
                                socket.emit("ValidatedStatusBatchAndPallet_request", { 'option': "INCOMPLATE", "taskId": data.TaskId, "Message": "Faltan por ubicar pallets o cerrar lotes" });
                                console.log("ValidatedStatusBatchAndPallet_success_INCOMPLETE", "warn");
                            }
                        } else {
                            socket.emit("ValidatedStatusBatchAndPallet_request", { 'option': "fail", "taskId": data.TaskId, "Message": GetErrorMessage(err) });
                            console.log("ValidatedStatusBatchAndPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("ValidatedStatusBatchAndPallet_request", { 'option': "fail", "taskId": data.TaskId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("ValidatedStatusBatchAndPallet_fail error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidatedStatusBatchAndPallet_request", { 'option': "fail", 'taskId': data.TaskId, "Message": GetErrorMessage(err) });
            console.log("ValidatedStatusBatchAndPallet_fail catch: " + GetErrorMessage(err), "error");
        }
    },
    SerchSku: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;
                    console.log("SerchSku_requestRequested-" + JSON.stringify(data), "info");
                    socket.emit('SerchSku_request', { 'option': 'requested_SerchSku_request' });
                    request.input('FILTER', pSqlInstance.VarChar, data.FILTER);

                    request.execute('SWIFT_SP_GET_SKU_BY_SERCH', function (err, recordsets) {
                        if (err) {
                            console.log("Err: " + JSON.stringify(err), "error");
                            socket.emit('SerchSku_request', { 'option': 'error_serch_sku', 'error': err.message });
                            console.log("SerchSku_Error-" + err.message, "error");
                        }
                        if (recordsets[0].length === 0) {
                            console.log("recordsets[0]: " + JSON.stringify(recordsets[0]), "info");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('SerchSku_request', { 'option': 'no_get_sku_found', 'data': recordsets[0] });
                            console.log("SerchSku_Count-0", "info");
                        }
                    });
                    var rowscount = 0;
                    request.on('row', function (row) {
                        rowscount = rowscount + 1;
                        console.log("rowscount: " + rowscount, "info");
                        socket.emit('SerchSku_request', { 'option': 'add_sku', 'row': row, 'rowscount': rowscount });
                        console.log("SerchSku_request" + JSON.stringify(row), "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('SerchSku_request', { 'option': 'get_sku_completed', 'rowcount': rowscount });
                        rowscount = 0;
                        console.log("rowscount: " + rowscount, "info");
                        connection.close();
                        pSqlInstance.close();
                        console.log("Serch_Sku_Complete");
                    });
                } else {
                    socket.emit("SerchSku_request", { 'option': 'error_serch_sku', "error": GetErrorMessage(errConnConsig) });
                    console.log("Serch_Sku error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("SerchSku_request", { 'option': 'error_serch_sku', "error": GetErrorMessage(err) });
            console.log("Serch_Sku_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    MakeAdjustment: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;
                    request.input('BATCH_SUPPLIER', pSqlInstance.VarChar, data.Pallet.BatchSupplier);
                    request.input('BATCH_SUPPLIER_EXPIRATION_DATE', pSqlInstance.Date, data.Pallet.BatchSupplierExpirationDate);
                    request.input('TASK_ID', pSqlInstance.Int, data.Pallet.TaskId);
                    request.input('BATCH_ID_OLD', pSqlInstance.INT, data.Pallet.BatchIdOld);
                    request.input('PALLET_ID_OLD', pSqlInstance.INT, data.Pallet.PalletIdOld);
                    request.input('STATUS_PALLET', pSqlInstance.VarChar, data.Pallet.StatusPallet);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.Pallet.CodeSku);
                    request.input('DESCRIPTION_SKU', pSqlInstance.VarChar, data.Pallet.DescriptionSku);
                    request.input('BARCODE_SKU', pSqlInstance.VarChar, data.Pallet.BarcodeSku);
                    request.input('QTY', pSqlInstance.INT, data.Pallet.Qty);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.Pallet.LastUpdateBy);
                    request.input('LAST_UPDATE_BY_NAME', pSqlInstance.VarChar, data.Pallet.LastUpdateByName);
                    request.input('WAREHOUSE_OLD', pSqlInstance.VarChar, data.Pallet.WarehouseOld);
                    request.input('LOCATION_OLD', pSqlInstance.VarChar, data.Pallet.LocationOld);
                    request.input('WAREHOUSE_NEW', pSqlInstance.VarChar, data.Pallet.WarehouseNew);
                    request.input('LOCATION_NEW', pSqlInstance.VarChar, data.Pallet.LocationNew);
                    request.input('BATCH_ID_NEW', pSqlInstance.INT, data.Pallet.BatchIdNew);
                    request.input('PALLET_ID_NEW', pSqlInstance.INT, data.Pallet.PalletIdNew);

                    request.execute('SWIFT_SP_ADJUSTMENT_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            socket.emit("MakeAdjustment_success", { "Pallet": data.Pallet, "Answer": recordsets[recordsets.length - 1][0] });
                            console.log("MakeAdjustment_success");
                        } else {
                            socket.emit("MakeAdjustment_fail", { "Pallet": data.Pallet, "Message": GetErrorMessage(err) });
                            console.log("MakeAdjustment_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("MakeAdjustment_fail", { "Pallet": data.Pallet, "Message": GetErrorMessage(errConnConsig) });
                    console.log("MakeAdjustment error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("MakeAdjustment_fail", { "Pallet": data.Pallet, "Message": GetErrorMessage(err) });
            console.log("MakeAdjustment_catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidateLocationByRelocate: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('CODE_LOCATION', pSqlInstance.VarChar, data.location);
                    request.input('IS_SOURCE_LOTATION', pSqlInstance.Int, data.IsSourceLocation);

                    request.execute('SWIFT_SP_VALIDATE_LOCATION_BY_RELOCATE', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("ValidateLocationByRelocate_Requested", { 'option': "EXISTS", "CodeLocation": data.location });
                                console.log("ValidateLocationByRelocate_success_EXISTS");
                            } else {
                                socket.emit("ValidateLocationByRelocate_Requested", { 'option': "NO_EXISTS", "CodeLocation": data.location });
                                console.log("ValidateLocationByRelocate_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateLocationByRelocate_Requested", { 'option': "fail", "CodeLocation": data.location, "Message": GetErrorMessage(errConnConsig) });
                            console.log("ValidateLocationByRelocate_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });
                } else {
                    socket.emit("ValidateLocationByRelocate_Requested", { 'option': 'fail', "CodeLocation": data.location, "Message": GetErrorMessage(errConnConsig) });
                    console.log("ValidateLocationByRelocate error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateLocationByRelocate_Requested", { 'option': 'fail', "CodeLocation": data.location, "Message": GetErrorMessage(err) });
            console.log("ValidateLocationByRelocate_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidatePalletByRelocate: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('PALLET_ID', pSqlInstance.Int, data.PalletId);

                    request.execute('SWIFT_SP_VALIDATE_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("ValidatePalletByRelocate_Requested", { 'option': "EXISTS", "PalletId": data.PalletId });
                                console.log("ValidatePalletByRelocate_success_EXISTS");
                            } else {
                                socket.emit("ValidatePalletByRelocate_Requested", { 'option': "NO_EXISTS", "PalletId": data.PalletId });
                                console.log("ValidatePalletByRelocate_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateLocationByRelocate_Requested", { 'option': "fail", "PalletId": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                            console.log("ValidateLocationByRelocate_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("ValidateLocationByRelocate_Requested", { 'option': 'fail', "PalletId": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("ValidateLocationByRelocate error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateLocationByRelocate_Requested", { 'option': 'fail', "PalletId": data.PalletId, "Message": GetErrorMessage(err) });
            console.log("ValidateLocationByRelocate_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    RelocatePallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('PALLET_ID', pSqlInstance.Int, data.Pallet.PalletId);
                    request.input('CODE_LOCATION', pSqlInstance.VarChar, data.Pallet.CodeLocation);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.Pallet.LastUpdateBy);

                    request.execute('SWIFT_SP_RELOCATE_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            socket.emit("RelocatePallet_Requested", { 'option': "success", 'pallet': recordsets[0][0] });
                            console.log("RelocatePallet_success");
                        } else {
                            socket.emit("RelocatePallet_Requested", { 'option': "fail", "Message": GetErrorMessage(errConnConsig) });
                            console.log("RelocatePallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("RelocatePallet_Requested", { 'option': 'fail', "Message": GetErrorMessage(errConnConsig) });
                    console.log("RelocatePallet error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("RelocatePallet_Requested", { 'option': 'fail', "Message": GetErrorMessage(err) });
            console.log("RelocatePallet_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetPalletPickingByBatch: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;
                    var rowscount = 0;
                    socket.emit('GetPalletPickingByBatch', { 'option': 'requested_GetPalletPickingByBatch', 'code_sku': data.codeSku });
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.codeSku);
                    request.input('TASK_ID', pSqlInstance.INT, data.taskId);

                    request.execute('SWIFT_SP_GET_EXPIRATION_PALLETS', function (err, recordsets) {
                        if (err) {
                            socket.emit('GetPalletPickingByBatch', { 'option': 'error_GetPalletPickingByBatch', 'error': err.message });
                            console.log("GetPalletPickingByBatch_Error-" + err.message, "error");
                        }
                        if (recordsets.length === 0) {
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetPalletPickingByBatch', { 'option': 'no_GetPalletPickingByBatch_found', 'routeid': data.routeid });
                            console.log("GetPalletPickingByBatch_Count-0");
                        }

                    });
                    request.on('row', function (row) {
                        rowscount++;
                        socket.emit('GetPalletPickingByBatch', { 'option': 'set_GetPalletPickingByBatch', 'row': row, 'rowscount': rowscount });
                        console.log("GetPalletPickingByBatch_Row-" + JSON.stringify(row), "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetPalletPickingByBatch', { 'option': 'GetPalletPickingByBatch_completed', 'rowcount': rowscount });
                        rowscount = 0;
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetPalletPickingByBatch_Complete");
                    });
                } else {
                    socket.emit("GetPalletPickingByBatch", { 'option': 'error_GetPalletPickingByBatch', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetPalletPickingByBatch error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetPalletPickingByBatch", { 'option': 'error_GetExpirationPallet_sku', "error": GetErrorMessage(err) });
            console.log("GetPalletPickingByBatch_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidateSkuUbication: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;


                    request.input('CODE_LOCATION', pSqlInstance.VarChar, data.CodeLocation);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.CodeSku);
                    request.input('PALLET_ID', pSqlInstance.Int, data.PalletId);

                    request.execute('SWIFT_SP_VALIDATE_SKU_UBICATION', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("ValidateSkuByUbication_Requested", { 'option': "EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidateSkuByUbication_success_EXISTS");
                            } else {
                                socket.emit("ValidateSkuByUbication_Requested", { 'option': "NO_EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidateSkuByUbication_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateSkuByUbication_Requested", { 'option': "fail", "CodeSku": data.CodeSku, "Message": GetErrorMessage(errConnConsig) });
                            console.log("ValidateSkuByUbication_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("ValidateSkuByUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(errConnConsig) });
                    console.log("ValidateSkuByUbication error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateSkuByUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(err) });
            console.log("ValidateSkuByUbication_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    PickingPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('BATCH_ID', pSqlInstance.Int, data.BatchId);
                    request.input('PALLET_ID', pSqlInstance.Int, data.PalletId);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.CodeSku);
                    request.input('DESCRIPTION_SKU', pSqlInstance.VarChar, data.DescriptionSku);
                    request.input('BARCODE_SKU', pSqlInstance.VarChar, data.BarcodeSku);
                    request.input('QTY', pSqlInstance.Int, data.Qty);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.LastUpdateBy);
                    request.input('LAST_UPDATE_BY_NAME', pSqlInstance.VarChar, data.LastUpdateBy);
                    request.input('WAREHOUSE', pSqlInstance.VarChar, data.Warehouse);
                    request.input('LOCATION', pSqlInstance.VarChar, data.Location);
                    request.input('CATEGORY', pSqlInstance.VarChar, data.Category);
                    request.input('CATEGORY_DESCRIPTION', pSqlInstance.VarChar, data.CategoryDescription);


                    request.execute('SWIFT_SP_PICKING_FOR_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("PickingPallet_Requested", { 'option': "EXISTS", "CodeSku": data.CodeSku });
                                console.log("PickingPallet_success_EXISTS");
                            } else {
                                socket.emit("PickingPallet_Requested", { 'option': "NO_EXISTS", "CodeSku": data.CodeSku });
                                console.log("PickingPallet_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("PickingPallet_Requested", { 'option': "fail", "CodeSku": data.CodeSku, "Message": GetErrorMessage(errConnConsig) });
                            console.log("PickingPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("ValidateSkuByUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(errConnConsig) });
                    console.log("ValidateSkuByUbication error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateSkuByUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(err) });
            console.log("ValidateSkuByUbication_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidateSkuQuantity: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('CODE_SKU', pSqlInstance.VarChar, data.CodeSku);
                    request.input('QTY', pSqlInstance.Int, data.Qty);
                    request.input('PALLET_ID', pSqlInstance.Int, data.PalletId);

                    request.execute('SWIFT_SP_VALIDATE_SKU_QUANTITY', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("ValidatePalletByQuantity_Requested", { 'option': "EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidatePalletByQuantity_success_EXISTS");
                            } else {
                                socket.emit("ValidatePalletByQuantity_Requested", { 'option': "NO_EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidatePalletByQuantity_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateLocationByQuantity_Requested", { 'option': "fail", "CodeSku": data.CodeSku, "Message": GetErrorMessage(errConnConsig) });
                            console.log("ValidateLocationByQuantity_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("ValidateLocationByQuantity_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(errConnConsig) });
                    console.log("ValidateLocationByQuantity error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateLocationByQuantity_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(err) });
            console.log("ValidateLocationByQuantity_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    ValidateSkuPalletQuantityUbication: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('CODE_SKU', pSqlInstance.VarChar, data.CodeSku);
                    request.input('QTY AS', pSqlInstance.Int, data.QTY);
                    request.input('LOCATION AS', pSqlInstance.Int, data.Location);
                    request.input('PALLET_ID', pSqlInstance.Int, data.PalletId);


                    request.execute('SWIFT_SP_VALIDATE_SKU_QUANTITY_UBICATION', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT == 1) {
                                socket.emit("ValidateSkuPalletQuantityUbication_Requested", { 'option': "EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidateSkuPalletQuantityUbication_success_EXISTS");
                            } else {
                                socket.emit("ValidateSkuPalletQuantityUbication_Requested", { 'option': "NO_EXISTS", "CodeSku": data.CodeSku });
                                console.log("ValidateSkuPalletQuantityUbication_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateSkuPalletQuantityUbication_Requested", { 'option': "fail", "CodeSku": data.CodeSku, "Message": GetErrorMessage(errConnConsig) });
                            console.log("ValidateSkuPalletQuantityUbication_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }

                    });
                } else {
                    socket.emit("ValidateSkuPalletQuantityUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(errConnConsig) });
                    console.log("ValidateSkuPalletQuantityUbication error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateSkuPalletQuantityUbication_Requested", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(err) });
            console.log("ValidateSkuPalletQuantityUbication_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetMobileLocations: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;

                    request.input('CODE_WAREHOUSE', pSqlInstance.VarChar, data.WareHouse);
                    request.input('FLOOR_LOCATION', pSqlInstance.VarChar, data.FloorLocation);
                    request.input('TYPE_LOCATION', pSqlInstance.VarChar, data.TypeLocation);
                    request.input('NAME_LOCATION', pSqlInstance.VarChar, data.NameLocation);

                    request.execute('SWIFT_SP_GET_MOBILE_LOCATIONS', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0] !== undefined) {
                                socket.emit("GetMobileLocations_success-" + data.request, { "Location": recordsets[0][0] });
                                console.log("GetMobileLocations_success-" + JSON.stringify(data.request), "info");
                            } else {
                                socket.emit("GetMobileLocations_success-" + data.request, { "Location": null });
                                console.log("GetMobileLocations_success-" + data.request, "info");
                            }

                        } else {
                            socket.emit("GetMobileLocations_fail-" + data.request, { "Location": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                            console.log("GetMobileLocations_fail- " + JSON.stringify(data.request) + ": " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("GetMobileLocations_fail-" + +data.request, { "Location": data.PalletId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("GetMobileLocations-" + JSON.stringify(data.request) + " error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetMobileLocations_fail-" + data.request, { "Location": data.PalletId, "Message": GetErrorMessage(err) });
            console.log("GetMobileLocations-" + JSON.stringify(data.request) + "_catch: " + GetErrorMessage(err), "error");
        }
    },
    GetWarehouse: function (data, socket) {
        try {
            var rowscount = 0;
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;
                    console.log("requested_GetWarehouse_request" + JSON.stringify(data), "info");
                    socket.emit('GetWarehouse_request', { 'option': 'requested_GetWarehouse_request' });

                    //request.input('FILTER_WH', pSqlInstance.VarChar, data.filterWarehouse);

                    //	request.execute('SWIFT_SP_GET_WAREHOUSE_BY_FILTER', function (err, recordsets) {
                    request.execute('SWIFT_SP_GET_WAREHOUSE', function (err, recordsets) {
                        if (err) {
                            console.log("Err: " + JSON.stringify(err), "error");
                            socket.emit('GetWarehouse_request', { 'option': 'error_GetWarehouse', 'error': err.message });
                            console.log("GetWarehouse_Error-" + err.message, "error");
                        }
                        if (recordsets[0].length === 0) {
                            console.log("recordsets[0]: " + JSON.stringify(recordsets[0]), "info");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetWarehouse_request', { 'option': 'no_get_warehouse_found', 'data': recordsets[0] });
                            console.log("GetWarehouse_Count-0", "info");
                        }
                    });

                    request.on('row', function (row) {
                        rowscount = rowscount + 1;
                        console.log("rowscount: " + rowscount, "info");
                        socket.emit('GetWarehouse_request', { 'option': 'add_warehouse', 'row': row, 'rowscount': rowscount });
                        console.log("GetWarehouse" + JSON.stringify(row), "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetWarehouse_request', { 'option': 'get_warehouse_completed', 'rowcount': rowscount });
                        rowscount = 0;
                        console.log("rowscount: " + rowscount, "info");
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetWarehouse_Complete");
                    });
                } else {
                    socket.emit("GetWarehouse_request", { 'option': 'error_GetWarehouse', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetWarehouse error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetWarehouse_request", { 'option': 'error_GetWarehouse', "error": GetErrorMessage(err) });
            console.log("GetWarehouse_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    SerchLocation: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    socket.emit('SerchLocation_request', { 'option': 'requested_SerchLocation_request' });
                    console.log("SerchLocation_request" + JSON.stringify(data), "info");

                    request.input('WAREHOUSE', pSqlInstance.VarChar, data.warehouse);
                    request.input('CLASIFICTATION_ID', pSqlInstance.Int, data.typeLocation);
                    request.input('PASILLO', pSqlInstance.VarChar, data.hallLocation);
                    request.input('PISO', pSqlInstance.VarChar, data.floorLocation);
                    request.input('RACK', pSqlInstance.VarChar, data.rackLocation);
                    request.input('COLUMNA', pSqlInstance.VarChar, data.columnLocation);
                    request.input('NIVEL', pSqlInstance.VarChar, data.levelLocation);

                    request.execute('SWIFT_SP_GET_LOCATION_BY_WH', function (err, recordsets) {
                        if (err) {
                            socket.emit("SerchLocation_request", { 'option': 'error_SerchLocation', 'error': err.message });
                            console.log("SerchLocation_request" + JSON.stringify(data.request), "info");
                        }

                        if (recordsets[0].length === 0) {
                            console.log("recordsets[0]: " + JSON.stringify(recordsets[0]), "info");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('SerchLocation_request', { 'option': 'no_get_SerchLocation_found', 'data': recordsets[0] });
                            console.log("SerchLocation_request");
                        }
                    });

                    request.on('row', function (row) {
                        socket.emit('SerchLocation_request', { 'option': 'add_SerchLocation', 'row': row });
                        console.log("SerchLocation_request" + JSON.stringify(row), "info");
                    });

                    request.on('done', function (returnValue) {
                        socket.emit('SerchLocation_request', { 'option': 'get_SerchLocation_completed' });
                        connection.close();
                        pSqlInstance.close();
                        console.log("SerchLocation_request Completed");
                    });

                } else {
                    socket.emit("SerchLocation_request", { 'option': 'error_SerchLocation', 'error': errConnConsig.message });
                    console.log("SerchLocation_request" + errConnConsig.message, "error");
                }
            });
        } catch (e) {
            socket.emit("SerchLocation_request", { 'option': 'error_SerchLocation', 'error': e.message });
            console.log("SerchLocation_request" + e.message, "error");
        }
    },
    PickingForPallet: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = false;
                    request.input('TASK_ID', pSqlInstance.VarChar, data.Pallet.TaskId);
                    request.input('BATCH_ID', pSqlInstance.VarChar, data.Pallet.BatchId);
                    request.input('PALLET_ID', pSqlInstance.VarChar, data.Pallet.PallletId);
                    request.input('CODE_SKU', pSqlInstance.VarChar, data.Pallet.CodeSku);
                    request.input('DESCRIPTION_SKU', pSqlInstance.VarChar, data.Pallet.DescriptionSku);
                    request.input('BARCODE_SKU', pSqlInstance.VarChar, data.Pallet.BarcodeSku);
                    request.input('QTY', pSqlInstance.INT, data.Pallet.Qty);
                    request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.Pallet.LastUpdateBy);
                    request.input('LAST_UPDATE_BY_NAME', pSqlInstance.VarChar, data.Pallet.LastUpdateByName);
                    request.input('WAREHOUSE', pSqlInstance.VarChar, data.Pallet.Warehouse);
                    request.input('LOCATION', pSqlInstance.VarChar, data.Pallet.Location);
                    request.input('CATEGORY', pSqlInstance.VarChar, data.Pallet.Category);
                    request.input('CATEGORY_DESCRIPTION', pSqlInstance.VarChar, data.Pallet.CategoryDescription);

                    request.execute('SWIFT_SP_PICKING_FOR_PALLET', function (err, recordsets) {
                        if (err === undefined) {
                            socket.emit("PickingForPallet_success", { "Pallet": data.Pallet, "Answer": recordsets[recordsets.length - 1][0] });
                            console.log("PickingForPallet_success");
                        } else {
                            socket.emit("PickingForPallet_fail", { "Pallet": data.Pallet, "Message": err.message });
                            console.log("PickingForPallet_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("PickingForPallet_fail", { "Pallet": data.Pallet, "Message": GetErrorMessage(errConnConsig) });
                    console.log("PickingForPallet error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("PickingForPallet_fail", { "Pallet": data.Pallet, "Message": GetErrorMessage(err) });
            console.log("PickingForPallet_catch: " + GetErrorMessage(err), "error");
        }
    },
    GetPalletsByLocation: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = true;
                    console.log("GetPalletsByLocation_Requested-" + JSON.stringify(data), "info");
                    socket.emit('GetPalletsByLocation_request', { 'option': 'requested_get_pallets_by_location' });
                    request.input('CODE_LOCATION', pSqlInstance.VarChar, data.location);
                    var rowscount = 0;
                    request.execute('SWIFT_SP_GET_PALLETS_BY_LOCATION', function (err, recordsets) {
                        if (err) {
                            socket.emit('GetPalletsByLocation_request', { 'option': 'error_get_pallets_by_location', 'error': err.message });
                            console.log("GetPalletsByLocation_Error-" + err.message, "error");
                        }
                        if (recordsets[0].length === 0) {
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetPalletsByLocation_request', { 'option': 'no_get_pallets_by_location_found' });
                            console.log("GetPalletsByLocation_Count-0", "info");
                        }
                    });

                    request.on('row', function (row) {
                        rowscount++;
                        socket.emit('GetPalletsByLocation_request', { 'option': 'add_pallet', 'row': row });
                        console.log("GetPalletsByLocation_Row-" + JSON.stringify(row), "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetPalletsByLocation_request', { 'option': 'get_pallets_by_location_completed' });
                        rowscount = 0;
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetPalletsByLocation_Complete");
                    });
                } else {
                    socket.emit("GetPalletsByLocation_request", { 'option': 'error_get_pallets_by_location', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetPalletsByLocation error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("GetPalletsByLocation_request", { 'option': 'error_get_pallets_by_location', "error": GetErrorMessage(err) });
            console.log("GetPalletsByLocation_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    SendReturnFromPicking: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var transaction = new pSqlInstance.Transaction(connection);
                    transaction.begin(function (errN1) {
                        if (errN1 === null) {
                            var request1 = new pSqlInstance.Request(transaction);
                            request1.input('PICKING_HEADER', pSqlInstance.INT, data.PickingHeader);

                            request1.execute('SWIFT_SP_CREATE_RECPTION_HEADER_BY_PICKING', function (errN2, recordsets1) {
                                if (errN2 === undefined) {
                                    for (var i = 0; i < data.Detail.length; i++) {
                                        var detail = data.Detail[i];
                                        var request2 = new pSqlInstance.Request(transaction);

                                        request2.input('PICKING_HEADER', pSqlInstance.INT, data.PickingHeader);
                                        request2.input('RECEPTION_HEADER', pSqlInstance.INT, recordsets1[0][0].ID);
                                        request2.input('CODE_SKU', pSqlInstance.VarChar, detail.CodeSku);
                                        request2.input('QTY', pSqlInstance.INT, detail.Sku);

                                        EjecutarSP(request2, 'SWIFT_SP_CREATE_RECPTION_DETAIL_BY_PICKING', i, function (index) {
                                            if (index === (data.Detail.length - 1)) {
                                                var request3 = new pSqlInstance.Request(transaction);
                                                request3.input('RECEPTION_HEADER', pSqlInstance.INT, recordsets1[0][0].ID);

                                                request3.execute('SWIFT_SP_INSERT_TASK_BY_RECEPTION', function (errN6, recordsets3) {
                                                    if (errN6 === undefined) {
                                                        transaction.commit(function (errN8, recordset) {
                                                            if (errN8 === null) {
                                                                socket.emit("SendReturnFromPicking_Request", { 'option': 'success', 'NewTask': recordsets3[0][0].ID });
                                                                console.log("SendReturnFromPicking Transaction commited.");
                                                            } else {
                                                                socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN8) });
                                                                console.log("SendReturnFromPicking Error en el commit: " + GetErrorMessage(errN8), "error");
                                                            }
                                                            connection.close();
                                                            pSqlInstance.close();
                                                        });
                                                    } else {
                                                        transaction.rollback(function (errN7) {
                                                            if (errN7 === null) {
                                                                socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN6) });
                                                                console.log("SendReturnFromPicking error al ejecutar: " + GetErrorMessage(errN6), "error");
                                                                console.log("SendReturnFromPicking rollback");
                                                            } else {
                                                                socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN7) });
                                                                console.log("SendReturnFromPicking error en rollback: " + GetErrorMessage(errN7), "error");
                                                            }
                                                            connection.close();
                                                            pSqlInstance.close();
                                                        });
                                                    }
                                                });
                                            }
                                        }, function (errN4) {
                                            i = l;
                                            transaction.rollback(function (errN5) {
                                                if (errN5 === null) {
                                                    socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN4) });
                                                    console.log("SendReturnFromPicking error al ejecutar: " + GetErrorMessage(errN4), "error");
                                                    console.log("SendReturnFromPicking rollback");
                                                } else {
                                                    socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN5) });
                                                    console.log("SendReturnFromPicking error en rollback: " + GetErrorMessage(errN5), "error");
                                                }
                                                connection.close();
                                                pSqlInstance.close();
                                            });
                                        });
                                    }
                                } else {
                                    transaction.rollback(function (errN3) {
                                        if (errN3 === null) {
                                            socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN2) });
                                            console.log("SendReturnFromPicking error al ejecutar SWIFT_SP_PICKING_FOR_PALLET: " + GetErrorMessage(errN2), "error");
                                            console.log("SendReturnFromPicking rollback");
                                        } else {
                                            socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN3) });
                                            console.log("SendReturnFromPicking error en rollback: " + GetErrorMessage(errN3), "error");
                                        }
                                        connection.close();
                                        pSqlInstance.close();
                                    });
                                }
                            });
                        } else {
                            socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "error": GetErrorMessage(errN1) });
                            console.log("SendReturnFromPicking No se abrio la transaccion: " + GetErrorMessage(errN1), "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(errConnConsig) });
                    console.log("SendReturnFromPicking error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("SendReturnFromPicking_Request", { 'option': 'fail', "CodeSku": data.CodeSku, "error": GetErrorMessage(err) });
            console.log("SendReturnFromPicking_Request error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetSkuByPicking: function (data, socket) {
        try {
            var rowscount = 0;
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    socket.emit('GetSkuByPicking_Request', { 'option': 'receive' });
                    console.log("GetSkuByPicking_Request" + JSON.stringify(data), "info");

                    var request = new pSqlInstance.Request(connection);
                    request.verbose = false;
                    request.stream = true;

                    request.input('PICKING_HEADER', pSqlInstance.INT, data.PickingHeader);

                    request.execute('SWIFT_SP_GET_SKU_BY_PICKING', function (err, recordsets) {
                        if (err) {
                            socket.emit("GetSkuByPicking_Request", { 'option': 'fail', 'error': err.message });
                            console.log("GetSkuByPicking_Request" + JSON.stringify(data.request), "info");
                        }

                        if (recordsets[0].length === 0) {
                            console.log("recordsets[0]: " + JSON.stringify(recordsets[0]), "info");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetSkuByPicking_Request', { 'option': 'GetSkuByPicking_found', 'data': recordsets[0] });
                            console.log("GetSkuByPicking_Request");
                        }
                    });

                    request.on('row', function (row) {
                        rowscount = rowscount + 1;
                        console.log("rowscount: " + rowscount, "info");
                        socket.emit('GetSkuByPicking_Request', { 'option': 'addSku', 'row': row, 'rowscount': rowscount });
                        console.log("GetSkuByPicking_Request" + row, "info");
                    });
                    request.on('done', function (returnValue) {
                        socket.emit('GetSkuByPicking_Request', { 'option': 'success', 'rowcount': rowscount });
                        rowscount = 0;
                        console.log("rowscount: " + rowscount, "info");
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetSkuByPicking_Request");
                    });
                } else {
                    socket.emit("GetSkuByPicking_Request", { 'option': 'fail', 'error': err.message });
                    console.log("GetSkuByPicking_Request" + JSON.stringify(data.request), "error");
                }
            });
        } catch (e) {
            socket.emit("GetSkuByPicking_Request", { 'option': 'fail', 'error': e.message });
            console.log("GetSkuByPicking_Request" + JSON.stringify(data.request), "error");
        }
    },
    ValidateReceptionByPicking: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('PICKING_HEADER', pSqlInstance.INT, data.PickingHeader);

                    request.execute('SWIFT_SP_VALIDATE_RECEPTION_BY_PICKING', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets.length > 0 && recordsets[0][0].RESULT === 1) {
                                socket.emit("ValidateReceptionByPicking_Requested", { 'option': "success" });
                                console.log("ValidateReceptionByPicking_success_EXISTS");
                            } else {
                                socket.emit("ValidateReceptionByPicking_Requested", { 'option': "fail", "Message": "Hay recepciones pendientes de completar" });
                                console.log("ValidateReceptionByPicking_success_NO_EXISTS", "warn");
                            }
                        } else {
                            socket.emit("ValidateReceptionByPicking_Requested", { 'option': "fail", "Message": GetErrorMessage(err) });
                            console.log("ValidateReceptionByPicking_fail: " + err.message, "error");
                            connection.close();
                            pSqlInstance.close();
                        }
                    });
                } else {
                    socket.emit("ValidateReceptionByPicking_Requested", { 'option': 'fail', "Message": GetErrorMessage(errConnConsig) });
                    console.log("ValidateReceptionByPicking error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (err) {
            socket.emit("ValidateReceptionByPicking_Requested", { 'option': 'fail', "error": GetErrorMessage(err) });
            console.log("ValidateReceptionByPicking_Error catch: " + GetErrorMessage(err), "error");
        }
    },
    GetTypeLocation: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    socket.emit("GetTypeLocation_Request", { 'option': 'receive' });
                    console.log("GetTypeLocation_Request: " + data.dbuser, "info");

                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    request.execute('SWIFT_SP_GET_TYPE_LOCATION', function (err, recordsets) {
                        if (err) {
                            socket.emit("GetTypeLocation_Request", { 'option': 'fail', 'error': err.message });
                            console.log("GetTypeLocation_Request" + err.message, "error");
                        }

                        if (recordsets[0].length === 0) {
                            console.log("recordsets[0]: " + JSON.stringify(recordsets[0]), "info");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('GetTypeLocation_Request', { 'option': 'GetTypeLocation_Not_found' });
                            console.log("GetTypeLocation_Request");
                        }
                    });

                    request.on('row', function (row) {
                        socket.emit('GetTypeLocation_Request', { 'option': 'addTypeLocation', 'row': row });
                    });

                    request.on('done', function (returnValue) {
                        connection.close();
                        pSqlInstance.close();
                        console.log("GetTypeLocation_Request Success. ");
                    });

                } else {
                    socket.emit("GetTypeLocation_Request", { 'option': 'fail', "error": GetErrorMessage(errConnConsig) });
                    console.log("GetTypeLocation_Request error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (e) {
            socket.emit("GetTypeLocation_Request", { 'option': 'fail', "error": e.message });
            console.log("GetTypeLocation_Request error connection: " + e.message, "error");
        }
    },
    Get_Series_Scanned: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    socket.emit('Get_Series_Scanned_Sku', { 'option': 'received' });
                    console.log("Get_Series_Scanned_Sku: " + JSON.stringify(data), "info");


                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    request.input('TXNID', pSqlInstance.INT, data.txnid);
                    request.input('TXNCODESKU', pSqlInstance.VarChar, data.sku);

                    request.execute('SWIFT_SP_GET_SERIES_SCANNED_SKU', function (err, recordsets) {
                        if (err) {
                            console.log("Get_Series_Scanned_Sku");
                            socket.emit('Get_Series_Scanned_Sku', { 'option': 'fail' + err.message });
                        }
                        if (recordsets[0].length == 0) {
                            console.log("Get_Series_Scanned_Sku");
                            connection.close();
                            pSqlInstance.close();
                            socket.emit('Get_Series_Scanned_Sku', { 'option': 'fail' });
                        }
                    });

                    request.on('row', function (row) {
                        console.log('Get_Series_Scanned_Sku Row: ');
                        socket.emit('Get_Series_Scanned_Sku', { 'option': 'addrow', 'row': row });
                    });

                    request.on('done', function (returnValue) {
                        connection.close();
                        pSqlInstance.close();
                        console.log("Get_Series_Scanned_Sku Success. ");
                    });

                } else {
                    socket.emit("Get_Series_Scanned_Sku", { 'option': 'fail', "error": GetErrorMessage(errConnConsig) });
                    console.log("Get_Series_Scanned_Sku error connection: " + GetErrorMessage(errConnConsig), "error");
                }
            });
        } catch (e) {
            socket.emit("Get_Series_Scanned_Sku", { 'option': 'fail', "error": e.message });
            console.log("Get_Series_Scanned_Sku error connection: " + e.message, "error");
        }
    }
}

function EjecutarQuery(request, sql, index, callback, errCallback) {
    request.query(sql, function (err, recordset) {
        if (err === undefined) {
            callback(index);
            console.log("Ejecucion correcta");
        } else {
            errCallback(err);
            console.log("Error al ejecutar: " + GetErrorMessage(err), "error");
        }

    });
}

function EjecutarSP(request, sql, index, callback, errCallback) {
    request.execute(sql, function (err, recordset) {
        if (err === undefined) {
            callback(index);
            console.log("Ejecucion correcta");
        } else {
            errCallback(err);
            console.log("Error al ejecutar: " + GetErrorMessage(err), "error");
        }

    });
}
