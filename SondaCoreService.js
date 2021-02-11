var js2xmlparser = require("js2xmlparser");
var console = require("./LogService.js");
var rutasInsertandoOrdenesDeVenta = [];

function GetErrorMessage(err) {
    try {
        return err.message;
    } catch (e) {
        return e.message;
    }
}

function InsertSalesOrderDetail(saleOrderDetails, idSaleOrderHeader, callback) {
    var pSql = "";
    var det;
    for (var i = 0; i < saleOrderDetails.length; i++) {
        det = saleOrderDetails[i];

        pSql += "INSERT INTO [SONDA_SALES_ORDER_DETAIL] (";
        pSql += "[SALES_ORDER_ID]";
        pSql += " ,[SKU]";
        pSql += " ,[LINE_SEQ]";
        pSql += " ,[QTY]";
        pSql += " ,[PRICE]";
        pSql += " ,[DISCOUNT]";
        pSql += " ,[TOTAL_LINE]";
        pSql += " ,[POSTED_DATETIME]";
        pSql += " ,[SERIE]";
        pSql += " ,[SERIE_2]";
        pSql += " ,[REQUERIES_SERIE]";
        pSql += " ,[COMBO_REFERENCE]";
        pSql += " ,[PARENT_SEQ]";
        pSql += " ,[IS_ACTIVE_ROUTE]";
        pSql += " ,[CODE_PACK_UNIT]";
        pSql += " ,[IS_BONUS]";
        pSql += " ,[LONG]";
        pSql += ") VALUES (";
        pSql += idSaleOrderHeader;
        pSql += " ,'" + det.Sku + "'";
        pSql += " ," + det.LineSeq;
        pSql += " ," + det.Qty;
        pSql += " ," + det.Price;
        pSql += " ," + det.Discount;
        pSql += " ," + det.TotalLine;
        pSql += " ,'" + det.PostedDatetime + "'";
        pSql += " ,'" + det.Serie + "'";
        pSql += " ,'" + det.Serie2 + "'";
        pSql += " ,'" + det.RequeriesSerie + "'";
        pSql += " ,'" + det.ComboReference + "'";
        pSql += " ,'" + det.ParentSeq + "'";
        pSql += " ," + det.IsActiveRoute;
        pSql += " ,'" + det.CodePackUnit + "'";
        pSql += " ," + det.IsBonus;
        if (det.Long === null || det.Long === "null" || det.Long === undefined) {
            pSql += ",1";

        } else {
            pSql += " ," + det.Long;
        }
        pSql += ");";
    }

    callback(pSql);
}

function IncreaseInvetoryCommitedBySku(saleOrderDetails, warehouse, callback) {
    var pSql = "";
    var det;
    for (var i = 0; i < saleOrderDetails.length; i++) {
        det = saleOrderDetails[i];

        pSql += "UPDATE SONDA_IS_COMITED_BY_WAREHOUSE SET IS_COMITED = IS_COMITED + " + det.Qty + " WHERE CODE_WAREHOUSE = '" + warehouse + "' AND CODE_SKU = '" + det.Sku + "';    ";
    }

    callback(pSql);
}

var _cnnServ = require('./ConnectionService.js');
var xdb = require('./moddb.js');
module.exports = {
    CheckInventory: function (data, socket) {
        var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
            var request = new pSqlInstance.Request(connection);
            request.verbose = _cnnServ.GetVerbose();
            request.stream = true;
            request.input('SKU', pSqlInstance.VarChar, data.sku);
            request.input('WAREHOUSE', pSqlInstance.VarChar, data.warehouse);
            request.execute("SWIFT_SP_GET_SKU", function (err, recordset) {
                if (err) {
                    console.dir(err);
                }
            });

            request.on('row', function (row) {
                socket.emit('CheckInventorySend', { 'sku': row.SKU, 'on_hand': row.ON_HAND, 'is_committed': row.IS_COMITED, 'warehouse': row.WAREHOUSE });

            });

            request.on('done', function () {
                connection.close();
                pSqlInstance.close();
            });
        });
    }
    ,
    SendTask: function (data, socket) {
        try {
            var task = data.task;
            socket.emit("TaskReceive", { "TaskId": task.TaskId });


            var connection = _cnnServ.ConnectDb(data, function (errConnTask, pSqlInstance) {
                if (errConnTask == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var sql = '';
                    if (task.TaskBoId == null) {


                        sql = "DECLARE @ID NUMERIC(18,0);";
                        sql += " INSERT INTO SWIFT_TASKS (";
                        sql += "TASK_TYPE";
                        sql += ",TASK_DATE";
                        sql += ",SCHEDULE_FOR";
                        sql += ",CREATED_STAMP";
                        sql += ",ASSIGEND_TO";
                        sql += ",ASSIGNED_BY";
                        if (task.AcceptedStamp != null)
                            sql += ",ACCEPTED_STAMP";
                        if (task.CompletedStamp != null)
                            sql += ",COMPLETED_STAMP";
                        sql += ",EXPECTED_GPS";
                        sql += ",POSTED_GPS";
                        sql += ",TASK_COMMENTS";
                        sql += ",TASK_SEQ";
                        sql += ",TASK_ADDRESS";
                        sql += ",COSTUMER_CODE";
                        sql += ",COSTUMER_NAME";
                        sql += ",TASK_STATUS";
                        sql += " ,IN_PLAN_ROUTE";
                        sql += " ,CREATE_BY";
                        if (task.CompletedSuccessfully != null)
                            sql += ",COMPLETED_SUCCESSFULLY";
                        if (task.Reason != null)
                            sql += ",REASON";
                        sql += " ,TASK_ID_HH";
                        sql += " ,DEVICE_NETWORK_TYPE";
                        sql += " ,IS_POSTED_OFFLINE";
                        sql += " ,CODE_ROUTE";
                        sql += ")";
                        sql += " VALUES(";
                        sql += "'" + task.TaskType + "'";
                        sql += ",'" + task.TaskDate + "'";
                        sql += ",'" + task.ScheduleFor + "'";
                        sql += ",'" + task.CreatedStamp + "'";
                        sql += ",'" + task.AssigendTo + "'";
                        sql += ",'" + task.AssignedBy + "'";
                        if (task.AcceptedStamp != null)
                            sql += ",'" + task.AcceptedStamp + "'";
                        if (task.CompletedStamp != null)
                            sql += ",'" + task.CompletedStamp + "'";
                        sql += ",'" + task.ExpectedGps + "'";
                        sql += ",'" + task.PostedGps + "'";
                        sql += ",'" + task.TaskComments + "'";
                        sql += "," + task.TaskSeq + "";
                        sql += ",'" + task.TaskAddress + "'";
                        sql += ",'" + task.RelatedClientCode + "'";
                        sql += ",'" + task.RelatedClientName + "'";
                        sql += ",'" + task.TaskStatus + "'";
                        sql += "," + task.InPlanRoute;
                        sql += ",'" + task.CreateBy + "'";
                        if (task.CompletedSuccessfully != null)
                            sql += "," + task.CompletedSuccessfully;
                        if (task.Reason != null)
                            sql += ",'" + task.Reason + "'";
                        sql += "," + task.TaskId;
                        sql += ", '" + task.DeviceNetworkType +"'";
                        sql += "," + task.IsPostedOffLine;
                        sql += "," + data.routeid;
                        sql += ");";
                        sql += " SET @ID = SCOPE_IDENTITY();";
                        sql += " SELECT @ID as ID;";
                    } else {


                        sql = "UPDATE SWIFT_TASKS";
                        sql += " SET ";
                        sql += "TASK_STATUS='" + task.TaskStatus + "'";
                        if (task.AcceptedStamp != null)
                            sql += ",ACCEPTED_STAMP= '" + task.AcceptedStamp + "' ";
                        if (task.CompletedStamp != null)
                            sql += ",COMPLETED_STAMP='" + task.CompletedStamp + "'";
                        sql += ",POSTED_GPS='" + task.PostedGps + "'";
                        if (task.CompletedSuccessfully != null)
                            sql += ",COMPLETED_SUCCESSFULLY = " + task.CompletedSuccessfully;
                        if (task.Reason != null)
                            sql += ",REASON = '" + task.Reason + "'";
                        sql += " WHERE  ";
                        sql += " TASK_ID = " + task.TaskBoId;
                    }

                    request.query(sql, function (err, recordsets, returnValue) {
                        if (err === undefined) {
                            if (recordsets !== undefined) {
                                task.TaskBoId = recordsets[0].ID;
                            }

                            socket.emit("SendTask_Request", { "task": task, "result": "ok" });

                        } else {
                            socket.emit("SendTask_Request", { "TaskId": task.TaskId, "Message": err.message, "result": "error" });
                            console.log("Task error: " + err.message, "error", "SendTask");
                        }
                        connection.close();
                        pSqlInstance.close();
                    });
                } else {
                    socket.emit("SendTask_Request", { "TaskId": task.TaskId, "Message": errConnTask.message, "result": "error" });
                    console.log("Task error connection: " + errConnTask.message, "error", "SendTask");
                }

            });

        } catch (e) {
            socket.emit("TaskFail", {
                "TaskId": task.TaskId,
                "Message": e.message
            });
            console.log("Task error catch: " + e.message, "error", "SendTask");
        }
    }
    ,
    SendInvoice: function (data, socket) {
        var invoice = data.invoice;
        try {
            socket.emit("InvoiceReceive", { "InvoiceNum": invoice.InvoiceNum });
            var connection = _cnnServ.ConnectDb(data, function (errConnInv, pSqlInstance) {
                if (errConnInv == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = "";
                    //if (invoice.IsPosted === 1) {
                    pSql = "DELETE FROM [SONDA_POS_INVOICE_HEADER] where IS_ACTIVE_ROUTE = 1 AND CDF_SERIE = '" + invoice.SatSerie + "' AND INVOICE_ID = " + invoice.InvoiceNum + "; ";
                    pSql += "DELETE FROM [SONDA_POS_INVOICE_DETAIL] where IS_ACTIVE_ROUTE = 1 AND INVOICE_SERIAL = '" + invoice.SatSerie + "' AND INVOICE_ID = " + invoice.InvoiceNum + "; ";
                    //}
                    pSql += "INSERT INTO [SONDA_POS_INVOICE_HEADER]";
                    pSql += "([INVOICE_ID]";
                    pSql += ",[TERMS]";
                    pSql += ",[POSTED_DATETIME]";
                    pSql += ",[CLIENT_ID]";
                    pSql += ",[POS_TERMINAL]";
                    pSql += ",[GPS_URL]";
                    pSql += ",[TOTAL_AMOUNT]";
                    pSql += ",[STATUS]";
                    pSql += ",[POSTED_BY]";
                    pSql += ",[IS_POSTED_OFFLINE]";
                    pSql += ",[INVOICED_DATETIME]";
                    pSql += ",[DEVICE_BATTERY_FACTOR]";
                    pSql += ",[CDF_DOCENTRY]";
                    pSql += ",[CDF_SERIE]";
                    pSql += ",[CDF_NIT]";
                    pSql += ",[CDF_NOMBRECLIENTE]";
                    pSql += ",[CDF_RESOLUCION]";
                    pSql += ",[CDF_POSTED_ERP]";
                    pSql += ",[IS_CREDIT_NOTE]";
                    pSql += ",[VOID_DATETIME]";
                    pSql += ",[CDF_PRINTED_COUNT]";
                    pSql += ",[VOID_REASON]";
                    pSql += ",[VOID_NOTES]";
                    pSql += ",[VOIDED_INVOICE]";
                    pSql += ",IMAGE_1";
                    pSql += ",IMAGE_2";
                    pSql += ",GPS_EXPECTED";
                    pSql += ")";
                    pSql += " VALUES(" + invoice.InvoiceNum;
                    pSql += ",'CASH'";
                    pSql += ", CURRENT_TIMESTAMP";
                    pSql += ",'" + invoice.ClientId + "'";
                    pSql += ",'" + invoice.PosTerminal + "'";
                    pSql += ",'" + invoice.Gps + "'";
                    pSql += "," + invoice.TotalAmount;
                    pSql += ",1";
                    pSql += ", [SWIFT_FN_GET_LOGIN_BY_ROUTE]('" + data.routeid + "')";
                    pSql += ",0";
                    pSql += ",'" + invoice.PostedDatetime + "'";
                    pSql += "," + data.battery;
                    pSql += ",NULL";
                    pSql += ",'" + invoice.SatSerie + "'";
                    pSql += ",'" + invoice.ClientId + "'";
                    pSql += ",'" + invoice.ClientName + "'";
                    pSql += ",'" + invoice.AuthId + "'";
                    pSql += ",NULL";
                    pSql += ",0";
                    pSql += ",NULL";
                    pSql += ",1";
                    pSql += ",NULL";
                    pSql += ",NULL";
                    pSql += ",NULL";
                    pSql += ",'" + invoice.Img1 + "'";
                    pSql += ",'" + invoice.Img2 + "'";
                    pSql += ",'" + invoice.GpsExpected + "'";
                    pSql += ")";

                    request.query(pSql, function (err, recordsets, returnValue) {
                        if (err === undefined) {
                            for (var i = 0; i < invoice.InvoiceRows.length; i++) {
                                var det = invoice.InvoiceRows[i];
                                pSql = "";
                                pSql = "INSERT INTO [SONDA_POS_INVOICE_DETAIL]";
                                pSql += "([INVOICE_ID]";
                                pSql += ",[SKU]";
                                pSql += ",[QTY]";
                                pSql += ",[PRICE]";
                                pSql += ",[DISCOUNT]";
                                pSql += ",[TOTAL_LINE]";
                                pSql += ",[POSTED_DATETIME]";
                                pSql += ",[SERIE]";
                                pSql += ",[SERIE_2]";
                                pSql += ",[REQUERIES_SERIE]";
                                pSql += ",[COMBO_REFERENCE], PARENT_SEQ, INVOICE_SERIAL, LINE_SEQ, INVOICE_RESOLUTION";
                                pSql += ")";
                                pSql += " VALUES(" + det.InvoiceNum;
                                pSql += ",'" + det.Sku + "'";
                                pSql += "," + det.Qty;
                                pSql += "," + det.Price;
                                pSql += ",0";
                                pSql += "," + det.TotalLine;
                                pSql += ",CURRENT_TIMESTAMP";
                                pSql += ",'" + det.Serie + "'";
                                pSql += ",'" + det.Serie2 + "'";
                                pSql += ",1";
                                pSql += ",'" + det.ComboReference + "'";
                                pSql += "," + det.ParentSeq + ", '" + invoice.SatSerie + "'," + det.LineSeq + ",'" + invoice.AuthId + "'";
                                pSql += ")";

                                request.query(pSql, function (error, recordsets, returnValue) {
                                    if (error !== undefined) {
                                        if (i === invoice.InvoiceRows.length) {
                                            socket.emit("InvoiceFail", { "InvoiceNum": invoice.InvoiceNum, "Message": error.message });
                                            console.log("Invoice error insert encabezado: " + error.message, "error", "SendInvoice", invoice.PosTerminal, data.routeid, "SendInvoice", invoice.AuthId, invoice.SatSerie, invoice.InvoiceNum, 10);
                                        }
                                    } else {
                                        if (i === invoice.InvoiceRows.length) {
                                            for (var j = 0; j < invoice.InvoiceRows.length; j++) {
                                                var invoiceDet = invoice.InvoiceRows[j];
                                                if (invoiceDet.Exposure === 1) {
                                                    pSql = "UPDATE SONDA_POS_SKUS SET ON_HAND = ON_HAND - " + invoiceDet.Qty + " WHERE ROUTE_ID = '" + data.DefaultWHS + "' AND SKU = '" + invoiceDet.Sku + "' AND PARENT_SKU = '" + det.ComboReference + "' AND EXPOSURE = 1";
                                                    request.query(pSql, function (err, recordsets, returnValue) {
                                                        console.log('Inventory Updated RETURN=OK');
                                                    });
                                                }
                                            }
                                            var pSql2 = "UPDATE SONDA_POS_RES_SAT set AUTH_CURRENT_DOC = " + data.CurrentDoc + " WHERE AUTH_ID = '" + invoice.AuthId + "' AND AUTH_SERIE = '" + invoice.SatSerie + "' AND AUTH_STATUS = '1'";
                                            request.query(pSql2, function (err, recordsets, returnValue) {
                                                socket.emit('InvoiceReceiveComplete', { 'pResult': 'OK', 'InvoiceNum': invoice.InvoiceNum });

                                                connection.close();
                                                pSqlInstance.close();
                                            });

                                        }

                                    }
                                });
                            }
                        } else {
                            socket.emit("InvoiceFail", { "InvoiceNum": invoice.InvoiceNum, "Message": err.message });
                            console.log("Invoice error insert encabezado: " + err.message, "error", "SendInvoice", invoice.PosTerminal, data.routeid, "SendInvoice", invoice.AuthId, invoice.SatSerie, invoice.InvoiceNum, 10);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });
                } else {
                    socket.emit("InvoiceFail", { "Invoice": consignment.ConsignmentId, "Message": errConnInv.message });
                    console.log("Invoice error connection: " + errConnInv.message, "error", "SendInvoice", invoice.PosTerminal, data.routeid, "SendInvoice", invoice.AuthId, invoice.SatSerie, invoice.InvoiceNum, 10);
                }
            });
        } catch (e) {
            socket.emit("InvoiceFail", {
                "InvoiceNum": invoice.InvoiceNum,
                "Message": e.message
            });
            console.log("Invoice error catch: " + e.message, "error", "SendInvoice", invoice.PosTerminal, data.routeid, "SendInvoice", invoice.AuthId, invoice.SatSerie, invoice.InvoiceNum, 10);
        }
    }
    ,
    SendPayment: function (data, socket) {
        var payment = data.payment;
        try {
            socket.emit("PaymentReceive", { "PaymentNum": payment.PaymentNum });
            var connection = _cnnServ.ConnectDb(data, function (errConnPay, pSqlInstance) {
                if (errConnPay == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = "";
                    //if (payment.IsPosted === 1) {
                    var from = "FROM [SONDA_PAYMENT_HEADER] where IS_ACTIVE_ROUTE = 1 AND POS_TERMINAL = '" + payment.PosTerminal + "' and PAYMENT_HH_NUM = " + payment.PaymentNum;
                    pSql = "DELETE FROM [SONDA_PAYMENT_DETAIL] WHERE ID IN (SELECT PAYMENT_HH_NUM " + from + "); ";
                    pSql += "DELETE " + from + "; ";
                    //}
                    pSql += "DECLARE @ID NUMERIC(18,0), @SERVER_POSTED_DATETIME DATETIME = GETDATE(); ";
                    pSql += " INSERT INTO [SONDA_PAYMENT_HEADER] (";
                    pSql += "[CLIENT_ID]";
                    pSql += " ,[CLIENT_NAME]";
                    pSql += " ,[TOTAL_AMOUNT]";
                    pSql += " ,[POSTED_DATETIME]";
                    pSql += " ,[POS_TERMINAL]";
                    pSql += " ,[GPS]";
                    pSql += " ,[DOC_DATE]";
                    pSql += " ,[DEPOSIT_TO_DATE]";
                    pSql += " ,[IS_POSTED]";
                    pSql += " ,[STATUS]";
                    pSql += " ,[PAYMENT_HH_NUM]";
                    pSql += " ,[DOC_SERIE]";
                    pSql += " ,[DOC_NUM]";
                    pSql += " ,[SERVER_POSTED_DATETIME]";
                    pSql += ") VALUES (";
                    pSql += "'" + payment.ClientId + "'";
                    pSql += " ,'" + payment.ClientName + "'";
                    pSql += " ," + payment.TotalAmount;
                    pSql += " ,'" + payment.PostedDatetime + "'";
                    pSql += " ,'" + payment.PosTerminal + "'";
                    pSql += " ,'" + payment.Gps + "'";
                    pSql += " ,'" + payment.DocDate + "'";
                    if (payment.DepositToDate != "null") {
                        pSql += " ,'" + payment.DepositToDate + "'";
                    } else {
                        pSql += " ,NULL";
                    }

                    pSql += " ,1";
                    pSql += " ,'" + payment.Status + "'";
                    pSql += " ," + payment.PaymentNum + "";
                    pSql += " ,'" + payment.DocSerie + "'";
                    pSql += " ," + payment.DocNum + "";
                    pSql += " ,@SERVER_POSTED_DATETIME);";
                    pSql += " SET @ID = SCOPE_IDENTITY();";
                    pSql += " SELECT @ID as ID, @SERVER_POSTED_DATETIME as SERVER_POSTED_DATETIME;";

                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {

                        if (errN1 === undefined) {

                            for (var i = 0; i < payment.PaymentRows.length; i++) {
                                var det = payment.PaymentRows[i];
                                pSql = "";
                                pSql += "INSERT INTO [SONDA_PAYMENT_DETAIL] (";
                                pSql += "[ID]";
                                pSql += " ,[PAYMENT_NUM]";
                                pSql += " ,[PAYMENT_TYPE]";
                                pSql += " ,[LINE_NUM]";
                                pSql += " ,[DOC_DATE]";
                                pSql += " ,[DOC_NUM]";
                                pSql += " ,[IMAGE]";
                                pSql += " ,[BANK_ID]";
                                pSql += " ,[ACCOUNT_NUM]";
                                pSql += " ,[INVOICE_NUM]";
                                pSql += " ,[INVOICE_SERIE]";
                                pSql += " ,[AMOUNT_PAID]";
                                pSql += " ,[DOCUMENT_NUMBER]";
                                pSql += " ,[SOURCE_DOC_TYPE]";
                                pSql += " ,[SOURCE_DOC_SERIE]";
                                pSql += " ,[SOURCE_DOC_NUM]";
                                pSql += " ,[IMAGE_1]";
                                pSql += " ,[IMAGE_2]";
                                pSql += ") VALUES (";
                                pSql += det.PaymentId;
                                pSql += " ," + recordsetsEncabezado[0].ID;
                                pSql += " ,'" + det.PaymentType + "'";
                                pSql += " ," + det.LineNum;
                                if (det.DocDate != "null") {
                                    pSql += " ,'" + det.DocDate + "'";
                                } else {
                                    pSql += " ,NULL";
                                }
                                if (det.DocNum != null) {
                                    pSql += " ," + det.DocNum;
                                } else {
                                    pSql += " ,NULL";
                                }
                                if (det.Image != null) {
                                    pSql += " ,'" + det.Image + "'";
                                } else {
                                    pSql += " ,NULL";
                                }
                                if (det.BankId != "null") {
                                    pSql += " ,'" + det.BankId + "'";
                                } else {
                                    pSql += " ,NULL";
                                }
                                if (det.AccountNum != "null") {
                                    pSql += " ,'" + det.AccountNum + "'";
                                } else {
                                    pSql += " ,NULL";
                                }

                                pSql += " ," + det.InvoiceNum;
                                pSql += " ,'" + det.SatSerie + "'";
                                pSql += " ," + det.AmountPaid + "";
                                pSql += " ,'" + det.DocumentNumber + "'";
                                pSql += " ,'" + det.SourceDocType + "'";
                                pSql += " ,'" + det.SourceDocSerie + "'";
                                pSql += " ," + det.SourceDocNum + "";
                                if (det.Image1 !== "null" && det.Image1 !== null) {
                                    pSql += " ,'" + det.Image1 + "'";
                                } else {
                                    pSql += " ,NULL";
                                }
                                if (det.Image2 !== "null" && det.Image2 !== null) {
                                    pSql += " ,'" + det.Image2 + "'";
                                } else {
                                    pSql += " ,NULL";
                                }
                                pSql += ");";

                                request.query(pSql, function (errN2, recordsetsDetalle, returnValue) {
                                    if (errN2 !== undefined) {
                                        if (i === payment.PaymentRows.length) {
                                            socket.emit("PaymentFail", { "PaymentNum": payment.PaymentNum, "Message": errN2.message });
                                            connection.close();
                                            pSqlInstance.close();
                                            console.log("Payment error insert detalle: " + errN2.message, "error", "SendPayment", payment.PosTerminal, null, "SendPayment", null, payment.DocSerie, payment.DocNum, 9);
                                        }
                                    } else {
                                        if (i === payment.PaymentRows.length) {
                                            socket.emit('PaymentReceiveComplete', { 'pResult': 'OK', 'PaymentBoNum': recordsetsEncabezado[0].ID, 'PaymentNum': payment.PaymentNum, "ServerPostedDateTime": recordsetsEncabezado[0].SERVER_POSTED_DATETIME });
                                            connection.close();
                                            pSqlInstance.close();

                                        }
                                    }

                                });
                            }

                        } else {
                            socket.emit("PaymentFail", { "PaymentNum": payment.PaymentNum, "Message": errN1.message });
                            connection.close();
                            pSqlInstance.close();
                            console.log("Payment error insert encabezado: " + errN1.message, "error", "SendPayment", payment.PosTerminal, null, "SendPayment", null, payment.DocSerie, payment.DocNum, 9);
                        }

                    });
                } else {
                    socket.emit("PaymentFail", { "PaymentNum": payment.PaymentNum, "Message": errConnPay.message });
                    console.log("Payment error connection: " + errConnPay.message, "error", "SendPayment", payment.PosTerminal, null, "SendPayment", null, payment.DocSerie, payment.DocNum, 9);
                }



            });
        } catch (e) {
            socket.emit("PaymentFail", {
                "PaymentNum": payment.PaymentNum,
                "Message": e.message
            });
            console.log("Payment catch: " + e.message, "error", "SendPayment", payment.PosTerminal, null, "SendPayment", null, payment.DocSerie, payment.DocNum, 9);
        }

    }
    ,
    SendConsignment: function(data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data,
                function(err, pSqlInstance) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    var infoXml = js2xmlparser.parse("Data", data);
                    request.input("XML", pSqlInstance.Xml, infoXml);

                    request.execute("SONDA_SP_ADD_CONSIGNMENT_BY_XML",
                        function(errorExec, recordsets) {

                            connection.close();
                            pSqlInstance.close();

                            if (errorExec) {
                                socket.emit("ConsignmentReceiveComplete", { "option": "fail", "error": errorExec.message });
                            } else {
                                socket.emit("ConsignmentReceiveComplete",
                                    { "option": "success", "Consignments": recordsets[0] ? recordsets[0] : [] });
                            }
                        });
                });
        } catch (e) {
            socket.emit("ConsignmentReceiveComplete", { "option": "fail", "error": e.message });
        }
    }
    ,
    SetActiveRoute: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;
                request.input('Route', pSqlInstance.VarChar(15), data.routeid);
                request.output('pRESULT', pSqlInstance.VarChar(250));
                var pReturned = '';

                request.execute('SONDA_UPDATE_ACTIVE_ROUTE', function (err, recordsets, returnValue) {
                    pReturned = request.parameters.pRESULT.value;
                    connection.close();
                    pSqlInstance.close();
                    if (pReturned === "OK") {
                        socket.emit("ActiveRouteComplete", { 'pResult': 'OK', "optionPrint": data.optionPrint });
                        console.log("Fin de ruta: " + data.routeid,
                            "error",
                            "SetActiveRoute",
                            data.routeid,
                            null,
                            "SetActiveRoute",
                            null,
                            null,
                            null,
                            -100);
                    } else {
                        socket.emit("ActiveRouteFail", { "Message": pReturned });
                        console.log("Error al ejecutar SP:" + GetErrorMessage(err), "error", "SONDA_UPDATE_ACTIVE_ROUTE", data.routeid, null, "SetActiveRoute", null, null, null, 10);
                    }
                });
            });
        } catch (err) {
            console.log("Consignment catch: " + GetErrorMessage(err), "error", "SetActiveRoute", data.routeid, null, "SetActiveRoute", null, null, null, 10);
            socket.emit("ActiveRouteFail", { "Message": err.message });
        }
    }
    ,
    InsertNewClient: function (data, socket) {
        try {
            console.log("insert_new_client.received");

            var connection = _cnnServ.ConnectDb(data,
                function (err, pSqlInstance) {
                    var requestDeviceId = new pSqlInstance.Request(connection);
                    requestDeviceId.verbose = _cnnServ.GetVerbose();
                    requestDeviceId.stream = false;

                    requestDeviceId.input("LOGIN", pSqlInstance.VarChar, data.client.loginid);

                    requestDeviceId.execute("SWIFT_SP_GET_DEVICE_ID_FROM_USER",
                        function (errDeviceId, recordsetsDeviceId, returnValueDeviceId) {
                            if (errDeviceId === undefined) {
                                if (recordsetsDeviceId[0][0].VALIDATION_TYPE === "PerDevice") {
                                    if (recordsetsDeviceId[0][0].DEVICE_ID !== data.uuid) {
                                        socket.emit('device_autenthication_failed',
                                            { message: 'No se pudo sincornizar el scouting: error de autenticacion, el dispositivo no esta registrado.' });
                                        console.log("Cliente error insert: Error de autenticacion, el dispositivo no esta registrado", "error", "SWIFT_SP_GET_DEVICE_ID_FROM_USER", null, null, "InsertNewClient", null, null, null, 9);
                                        return;
                                    }
                                }
                                var request = new pSqlInstance.Request(connection);
                                request.verbose = _cnnServ.GetVerbose();
                                request.stream = false;
                                //--CUSTOMER
                                request.input('CODE_CUSTOMER', pSqlInstance.VarChar, data.client.CodigoHH);
                                request.input('NAME_CUSTOMER', pSqlInstance.VarChar, data.client.Nombre);
                                request.input('PHONE_CUSTOMER', pSqlInstance.VarChar, data.client.Telefono);
                                request.input('ADDRESS_CUSTOMER', pSqlInstance.VarChar, data.client.Direccion);
                                request.input('CONTACT_CUSTOMER', pSqlInstance.VarChar, data.client.ContactCustomer);
                                request.input('CODE_ROUTE', pSqlInstance.VarChar, data.client.Ruta);
                                request.input('SELLER_CODE', pSqlInstance.VarChar, data.client.Seller_code);
                                request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.client.loginid);
                                //request.input('HHID', pSqlInstance.VarChar, data.client.CodigoHH);
                                request.input('SING', pSqlInstance.VarChar, data.client.Sign);
                                request.input('PHOTO', pSqlInstance.VarChar, data.client.Photo);
                                request.input('STATUS', pSqlInstance.VarChar, data.client.Status);
                                request.input('NEW', pSqlInstance.VarChar, data.client.New);
                                request.input('GPS', pSqlInstance.VarChar, data.client.Gps);
                                request.input('REFERENCE', pSqlInstance.VarChar, data.client.Reference);

                                request.input('POST_DATETIME', pSqlInstance.VarChar, data.client.PostDateTime);
                                request.input('POS_SALE_NAME', pSqlInstance.VarChar, data.client.PosSaleName);
                                request.input('INVOICE_NAME', pSqlInstance.VarChar, data.client.InvoiceName);
                                request.input('INVOICE_ADDRESS', pSqlInstance.VarChar, data.client.InvoiceAddress);
                                request.input('NIT', pSqlInstance.VarChar, data.client.Nit);
                                request.input('CONTACT_ID', pSqlInstance.VarChar, data.client.ContactId);
                                request.input('UPDATED_FROM_BO', pSqlInstance.Int, data.client.UpdatedFromBo);
                                request.input('SYNC_ID', pSqlInstance.VarChar, data.client.SyncId);

                                request.input('OWNER_ID', pSqlInstance.Int, data.client.OwnerId);

                                //--FREQUENCY
                                request.input('MONDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Monday);
                                request.input('TUESDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Tuesday);
                                request.input('WEDNESDAY',
                                    pSqlInstance.VarChar,
                                    data.client.DiasVisita[0].Wednesday);
                                request.input('THURSDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Thursday);
                                request.input('FRIDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Friday);
                                request.input('SATURDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Saturday);
                                request.input('SUNDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Sunday);
                                request.input('FREQUENCY_WEEKS',
                                    pSqlInstance.VarChar,
                                    data.client.DiasVisita[0].FrequencyWeeks);
                                request.input('LAST_DATE_VISITED',
                                    pSqlInstance.VarChar(50),
                                    data.client.DiasVisita[0].LastDateVisited);

                                //Registro de Transaccion
                                request.input('DEVICE_NETWORK_TYPE', pSqlInstance.VarChar, data.client.DeviceNetworkType);
                                request.input('IS_POSTED_OFFLINE', pSqlInstance.Int, data.client.IsPostedOffLine);
                                
                                request.execute('SONDA_SP_INSERT_SCOUTING',
                                    function (err, recordsets, returnValue) {
                                        connection.close();
                                        pSqlInstance.close();
                                        if (err === undefined) {
                                            try {
                                                if (recordsets.length > 0 && recordsets[0][0] !== undefined) {
                                                    data.client.CodigoBo = recordsets[0][0].ID;
                                                    data.client.ServerPostedDateTime = recordsets[0][0].SERVER_POSTED_DATETIME;
                                                    socket.emit('insert_new_client_completed', data);
                                                    console.log('insert_new_client_completed');
                                                } else {
                                                    console.log('insert_new_client.fail: no genero id', "warn");
                                                }
                                            } catch (ex) {
                                                console.log('insert_new_client.fail:' + ex.message, "error", "SONDA_SP_INSERT_SCOUTING", null, null, "InsertNewClient", null, null, null, 9);
                                            }
                                        } else {
                                            console.log("Cliente error insert: " + err.message, "error", "SONDA_SP_INSERT_SCOUTING", null, null, "InsertNewClient", null, null, null, 9);
                                        }
                                    });
                            }
                        });
                });
        } catch (e) {
            console.log("insert_new_client.catch" + e.message, "error", "SONDA_SP_INSERT_SCOUTING", null, null, "InsertNewClient", null, null, null, 9);
        }
    }

    ,
    InsertNewTagsXClient: function (data, socket) {
        try {
            console.log("insert_tags_x_client.received");

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('TAG_COLOR', pSqlInstance.VarChar, data.tagscolor);
                request.input('CUSTOMER', pSqlInstance.VarChar, data.customer);
                request.output('pRESULT', pSqlInstance.VarChar(250));
                request.input('DEVICE_NETWORK_TYPE', pSqlInstance.VarChar, data.deviceNetworkType);
                request.input('IS_POSTED_OFFLINE', pSqlInstance.Int, data.isPostedOffLine);

                var pReturned = '';

                request.execute('SWIFT_SP_INSERT_TAG_X_CUSTOMER', function (errN1, recordsets, returnValue) {
                    pReturned = request.parameters.pRESULT.value;
                    connection.close();
                    pSqlInstance.close();
                    if (pReturned === "OK") {
                        console.log("Customer returned:" + pReturned, "info");
                        socket.emit('insert_tags_x_client_completed', data);
                        console.log('insert_tags_x_client_completed');
                    } else {
                        socket.emit("insert_tags_x_client_fail", { "Message": pReturned, "data": data });
                    }
                });
            });
        } catch (e) {
            console.log("insert_new_client.catch" + e.message, "error", "SWIFT_SP_INSERT_TAG_X_CUSTOMER", null, null, "InsertNewTagsXClient", null, null, null, 8);
        }
    }
    ,
    SendSalesOrder: function (data, socket) {
        var indiceDeRutaInsertandoOrdenDeVenta = rutasInsertandoOrdenesDeVenta.findIndex(ruta => (ruta.codigoDeRuta === data.routeid));

        if (indiceDeRutaInsertandoOrdenDeVenta === -1) { //No se encontro la ruta
            rutasInsertandoOrdenesDeVenta.push({"codigoDeRuta": data.routeid,"estaInsertandoOrdenDeVenta": true,"idDeSocket": socket.id });
            this.insertarOrdenDeVenta(data,socket);
        } else {//Se encontro la ruta
            if (rutasInsertandoOrdenesDeVenta[indiceDeRutaInsertandoOrdenDeVenta].estaInsertandoOrdenDeVenta) { //Se encontro la ruta pero esta insertando orden de venta
                console.log("SendSalesOrder ruta: " + data.routeid + " esta insertando orden de venta",
                    "error",
                    "ADD_SALES_ORDER_BY_XML",
                    null,
                    null,
                    "SendSalesOrder",
                    null,
                    null,
                    null,
                    5);
                this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(data, null);
            } else {//Se encontro la ruta pero no esta insertando orden de venta
                rutasInsertandoOrdenesDeVenta[indiceDeRutaInsertandoOrdenDeVenta].estaInsertandoOrdenDeVenta = true;
                this.insertarOrdenDeVenta(data, socket);
            }
        }
    }
    ,
    SendSalesOrderTimesPrinted: function (data, socket) {
        var salesOrder = data.salesOrder;
        try {
            socket.emit("SendSalesOrderTimesPrintedReceive", { "SalesOrderId": salesOrder.SalesOrderId, "estado": 1, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = "";
                    pSql += "UPDATE [SONDA_SALES_ORDER_HEADER]";
                    pSql += " SET [TIMES_PRINTED] = " + salesOrder.TimesPrinted;
                    pSql += ",[PAYMENT_TIMES_PRINTED] = " + salesOrder.PaymentTimesPrinted;
                    pSql += " WHERE [SALES_ORDER_ID] = " + salesOrder.SalesOrderId;

                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {
                        if (errN1 === undefined) {
                            socket.emit("SendSalesOrderTimesPrintedReceive", { "SalesOrderId": salesOrder.SalesOrderId, "estado": 2, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                            console.log("SendSalesOrderTimesPrinted_success");
                        } else {
                            socket.emit("SendSalesOrderTimesPrintedFail", { "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errN1), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                            connection.close();
                            pSqlInstance.close();
                            console.log("SendSalesOrderTimesPrintedNum error al actualizar: " + GetErrorMessage(errN1), "error", "SendSalesOrderTimesPrinted", salesOrder.PosTerminal, null, "SendSalesOrderTimesPrinted", null, salesOrder.DocSerie, salesOrder.DocNum, 8);
                        }
                    });
                } else {
                    socket.emit("SendSalesOrderTimesPrintedFail", { "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errConnConsig), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                    console.log("SendSalesOrderTimesPrinted error connection: " + GetErrorMessage(errConnConsig), "error", "SendSalesOrderTimesPrinted", salesOrder.PosTerminal, null, "SendSalesOrderTimesPrinted", null, salesOrder.DocSerie, salesOrder.DocNum, 8);
                }
            });
        } catch (err) {
            socket.emit("SendSalesOrderTimesPrintedFail", { "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(err), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
            console.log("SendSalesOrderTimesPrinted catch: " + GetErrorMessage(err), "error", "SendSalesOrderTimesPrinted", salesOrder.PosTerminal, null, "SendSalesOrderTimesPrinted", null, salesOrder.DocSerie, salesOrder.DocNum, 8);
        }
    }
    ,
    SendDocumentSecuence: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('DOC_TYPE', pSqlInstance.VarChar, data.DocType);
                request.input('SERIE', pSqlInstance.VarChar, data.Serie);
                request.input('DOC_NUM', pSqlInstance.Int, data.DocNum);

                request.execute('SONDA_SP_UPDATE_DOCUMENT_SEQUENCE', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        socket.emit("SendDocumentSecuence_Request", { 'option': 'success' });


                    } else {
                        socket.emit("SendDocumentSecuence_Request", { 'option': 'fail', 'message': err.message });
                        console.log("SendDocumentSecuence Fail" + err.message, "error", "SendDocumentSecuence", null, null, "SendDocumentSecuence", null, data.Serie, data.DocNum, 9);
                    }
                });
            });
        } catch (e) {
            socket.emit("SendDocumentSecuence_Request", { 'option': 'fail', 'message': e.message });
            console.log("SendDocumentSecuence Fail" + err.message, "error", "SendDocumentSecuence", null, null, "SendDocumentSecuence", null, data.Serie, data.DocNum, 9);
        }
    }
    ,
    SendSalesOrderVoid: function (data, socket) {
        try {
            socket.emit("SendSalesOrderVoid_Request", { 'option': 'receive', 'data': data });

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('SERIE', pSqlInstance.VarChar, data.DocSerie);
                request.input('DOC_NUM', pSqlInstance.Int, data.DocNum);
                request.input('VOID', pSqlInstance.Int, data.IsVoid);

                request.execute('SONDA_SP_UPDATE_SALE_ORDER_VOID', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        socket.emit("SendSalesOrderVoid_Request", { 'option': 'success', 'data': data });
                        console.log("SendSalesOrderVoid_Request success");
                    } else {
                        socket.emit("SendSalesOrderVoid_Request", { 'option': 'fail', 'message': err.message, 'data': data });
                        console.log("SendSalesOrderVoid Fail" + err.message, "error", "SONDA_SP_UPDATE_SALE_ORDER_VOID", null, null, "SendSalesOrderVoid", null, data.DocSerie, data.DocNum, 10);
                    }
                });
            });
        } catch (e) {
            socket.emit("SendSalesOrderVoid_Request", { 'option': 'fail', 'message': e.message, 'data': data });
            console.log("Error al anular orden de venta " + e.message, "error", "SONDA_SP_UPDATE_SALE_ORDER_VOID", null, null, "SendSalesOrderVoid", null, data.DocSerie, data.DocNum, 10);
        }
    }
    ,
    SendCommitedInventoryVoid: function (data, socket) {
        try {
            socket.emit("SendCommitedInventoryVoid_Request", { 'option': 'receive', 'data': data });

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('CODE_WAREHOUSE', pSqlInstance.VarChar, data.warehouse);
                request.input('CODE_SKU', pSqlInstance.VarChar, data.CodeSku);
                request.input('QTY', pSqlInstance.Int, data.Qty);

                request.execute('SONDA_SP_VOID_COMMITED_INVENTORY', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        socket.emit("SendCommitedInventoryVoid_Request", { 'option': 'success', 'data': data });
                        console.log("SendCommitedInventoryVoid_Request success");
                    } else {
                        socket.emit("SendCommitedInventoryVoid_Request", { 'option': 'fail', 'message': err.message, 'data': data });
                        console.log("SendCommitedInventoryVoid Fail" + err.message, "error", "SONDA_SP_VOID_COMMITED_INVENTORY", null, null, "SendCommitedInventoryVoid", null, null, null, 8);
                    }
                });
            });
        } catch (e) {
            socket.emit("SendCommitedInventoryVoid_Request", { 'option': 'fail', 'message': e.message, 'data': data });
            console.log("Error al anular inventario reservado " + e.message, "error", "SONDA_SP_VOID_COMMITED_INVENTORY", null, null, "SendCommitedInventoryVoid", null, null, null, 8);
        }
    }
    ,
    GetCurrentAccountByCustomer: function (data, socket) {
        try {
            socket.emit("GetCurrentAccountByCustomer_Request", { 'option': 'receive', 'data': data });

            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('CODE_COSTUMER', pSqlInstance.VarChar, data.CodeCustomer);
                request.input('CURRENT_AMOUT_PAYMENT', pSqlInstance.FLOAT, data.Total);
                request.input('SALES_ORDER_TYPE', pSqlInstance.VarChar, data.salesOrderType);
                request.input('CODE_ROUTE', pSqlInstance.VarChar, data.routeid);

                request.execute('SONDA_SP_GET_CURRENT_ACCOUNT_BY_CUSTOMER', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        if (recordsets.length > 0 && recordsets[0][0] === undefined) {
                            socket.emit("GetCurrentAccountByCustomer_Request", { 'option': 'success', 'data': data, 'source': data.source });
                            console.log("GetCurrentAccountByCustomer_Request success");
                        } else {
                            socket.emit("GetCurrentAccountByCustomer_Request", { 'option': 'fail', 'message': recordsets[0][0].DESCRIPTION_RULE, 'data': data });
                            console.log("GetCurrentAccountByCustomer Fail" + recordsets[0][0].DESCRIPTION_RULE, "warn");
                        }

                    } else {
                        socket.emit("GetCurrentAccountByCustomer_Request", { 'option': 'fail', 'message': err.message, 'data': data });
                        console.log("GetCurrentAccountByCustomer Fail" + err.message, "error", "SONDA_SP_GET_CURRENT_ACCOUNT_BY_CUSTOMER", data.routeid, null, "GetCurrentAccountByCustomer", null, null, null, 8);
                    }
                });
            });
        } catch (e) {
            socket.emit("GetCurrentAccountByCustomer_Request", { 'option': 'fail', 'message': e.message, 'data': data });
            console.log("Error al validar saldo del cliente " + e.message, "error", "SONDA_SP_GET_CURRENT_ACCOUNT_BY_CUSTOMER", data.routeid, null, "GetCurrentAccountByCustomer", null, null, null, 8);
        }
    }
    ,
    ValidateSalesOrders: function (data, socket) {
        try {
            if (data.OrdenesDeVenta.length < 1 || data.OrdenesDeVenta.length === undefined) {
                socket.emit("ValidateSalesOrders_Request" + data.Source, { 'option': 'success', 'reSend': 0 });
                return;
            }

            if (data.Source !== "InRoute") {
                var connection = _cnnServ.ConnectDb(data,
                    function (errorConnection, pSqlInstance) {
                        if (errorConnection) {
                            socket.emit("ValidateSalesOrders_Request" + data.Source,
                                { 'option': 'fail', 'reSend': 0, 'message': errorConnection.message, 'data': data });
                            console.log("Error de coneccion al validar orden de venta: " + e.message, "error", "ValidateSalesOrders", data.routeid, null, "ValidateSalesOrders", null, null, null, 10);
                        } else {
                            var request = new pSqlInstance.Request(connection);
                            request.verbose = -_cnnServ.GetVerbose();
                            request.stream = false;

                            var objMin = arrayMin(data.OrdenesDeVenta);

                            var docSerieMin = objMin.docSerie;
                            var docNumMin = objMin.docNum;

                            //data.OrdenesDeventa = _.sortBy(data.OrdenesDeVenta, "DocNum");

                            //docSerieMin = data.OrdenesDeventa[0].DocSerie;
                            //docNumMin = data.OrdenesDeventa[0].DocNum;



                            request.input('CODE_ROUTE', pSqlInstance.VarChar, data.routeid);
                            request.input('SALES_ORDER_QTY', pSqlInstance.Int, data.OrdenesDeVenta.length);
                            request.input('DOC_SERIE', pSqlInstance.VarChar, docSerieMin);
                            request.input('DOC_NUM', pSqlInstance.Int, docNumMin);

                            request.execute("SONDA_SP_VALIDATE_SALES_ORDER_QTY",
                                function (errorExecution,
                                    recordsetsExecution,
                                    returnValue) {
                                    if (errorExecution) {
                                        socket.emit("ValidateSalesOrders_Request" + data.Source,
                                            {
                                                'option': 'fail',
                                                'reSend': 0,
                                                'message': errorExecution.message,
                                                'data': data
                                            });
                                        console.log("Error al ejecutar SP: " + e.message, "error", "SONDA_SP_VALIDATE_SALES_ORDER_QTY", data.routeid, null, "ValidateSalesOrders", null, docSerieMin, docNumMin, 10);
                                    } else {
                                        if (recordsetsExecution[0][0].SUCCESS !== 0) {
                                            socket.emit("ValidateSalesOrders_Request" + data.Source,
                                                { 'option': 'success', 'reSend': 0 });
                                            //console.log("Fin de ruta: " + data.routeid, "error", "ValidateSalesOrders", data.routeid, null, "ValidateSalesOrders", null, null, null, -100);
                                        } else {
                                            console.log("Faltan ordenes por sincronizar ruta: " + data.routeid, "info");
                                            ValidateSalesOrders(data, socket);
                                        }
                                    }
                                });
                        }
                    });
            } else {
                ValidateSalesOrders(data, socket);
            }
        } catch (e) {
            socket.emit("ValidateSalesOrders_Request" + data.Source, { 'option': 'fail', 'reSend': 0, 'message': e.message, 'data': data });
            console.log("En catch: " + e.message, "error", "ValidateSalesOrders", data.routeid, null, "ValidateSalesOrders", null, docSerieMin, docNumMin, 10);
        }
    }
    ,
    SendInsertSalesOrderDraft: function (data, socket) {
        var salesOrder = data.salesOrder;
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = ObtenerFormatoInsertarOrdeDeVenta(salesOrder, data);
                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {
                        if (errN1 === undefined) {
                            InsertSalesOrderDetail(salesOrder.SaleDetails, recordsetsEncabezado[0].ID, function (pSql2) {
                                request.query(pSql2, function (errN2, recordsetsDetalle, returnValue) {
                                    connection.close();
                                    pSqlInstance.close();
                                    if (errN2 !== undefined) {
                                        socket.emit("SendSalesOrderDraft", { "option": "SendSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errN2), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum});
                                        console.log("SalesOrderDraft error insert detalle: " + GetErrorMessage(errN2), "error", "SendInsertSalesOrderDraft", salesOrder.PosTerminal, null, "SendInsertSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                                        connection.close();
                                        pSqlInstance.close();
                                    } else {
                                        socket.emit('SendSalesOrderDraft', { "option": "SendSalesOrderDraft_Completed", 'SalesOrderIdBo': recordsetsEncabezado[0].ID, 'SalesOrderId': salesOrder.SalesOrderId, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum, "ServerPostedDateTime": recordsetsEncabezado[0].SERVER_POSTED_DATETIME });
                                        console.log('SalesOrderDraft success ');
                                    }
                                });
                            });
                        } else {
                            socket.emit("SendSalesOrderDraft", { "option": "SendSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errN1), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                            connection.close();
                            pSqlInstance.close();
                            console.log("SalesOrderDraft error insert encabezado: " + GetErrorMessage(errN1), "error", "SendInsertSalesOrderDraft", salesOrder.PosTerminal, null, "SendInsertSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                        }
                    });
                } else {
                    socket.emit("SendSalesOrderDraft", { "option": "SendSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errConnConsig), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                    console.log("SalesOrderDraft error connection: " + GetErrorMessage(errConnConsig), "error", "SendInsertSalesOrderDraft", salesOrder.PosTerminal, null, "SendInsertSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                }
            });
        } catch (err) {
            socket.emit("SendSalesOrderDraft", { "option": "SendSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(err), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
            console.log("SalesOrderDraft catch: " + GetErrorMessage(err), "error", "SendInsertSalesOrderDraft", salesOrder.PosTerminal, null, "SendInsertSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
        }
    }
    ,
    SendUpdateSalesOrderDraft: function (data, socket) {
        var salesOrder = data.salesOrder;
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = ObtenerFormatoActualizarOrdeDeVenta(salesOrder, data);
                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {
                        if (errN1 === undefined) {
                            InsertSalesOrderDetail(salesOrder.SaleDetails, salesOrder.SalesOrderIdBo, function (pSql2) {
                                request.query(pSql2, function (errN2, recordsetsDetalle, returnValue) {
                                    connection.close();
                                    pSqlInstance.close();
                                    if (errN2 !== undefined) {
                                        socket.emit("SendUpdateSalesOrderDraft", { "option": "SendUpdateSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errN2), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                                        console.log("UpdateSalesOrderDraft error insert detalle: " + GetErrorMessage(errN2), "error", "InsertSalesOrderDetail", salesOrder.PosTerminal, null, "SendUpdateSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                                        connection.close();
                                        pSqlInstance.close();
                                    } else {
                                        socket.emit('SendUpdateSalesOrderDraft', { "option": "SendUpdateSalesOrderDraft_Completed", 'SalesOrderIdBo': salesOrder.SalesOrderIdBo, 'SalesOrderId': salesOrder.SalesOrderId, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                                        console.log('UpdateSalesOrderDraft success ');
                                    }
                                });
                            });
                        } else {
                            socket.emit("SendUpdateSalesOrderDraft", { "option": "SendUpdateSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errN1), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                            connection.close();
                            pSqlInstance.close();
                            console.log("UpdateSalesOrderDraft error insert encabezado: " + GetErrorMessage(errN1), "error", "ObtenerFormatoActualizarOrdeDeVenta", salesOrder.PosTerminal, null, "SendUpdateSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                        }
                    });
                } else {
                    socket.emit("SendUpdateSalesOrderDraft", { "option": "SendUpdateSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(errConnConsig), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                    console.log("UpdateSalesOrderDraft error connection: " + GetErrorMessage(errConnConsig), "error", "SendUpdateSalesOrderDraft", salesOrder.PosTerminal, null, "SendUpdateSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                }
            });
        } catch (err) {
            socket.emit("SendUpdateSalesOrderDraft", { "option": "SendUpdateSalesOrderDraft_Fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(err), 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
            console.log("UpdateSalesOrderDraft catch: " + GetErrorMessage(err), "error", "SendUpdateSalesOrderDraft", salesOrder.PosTerminal, null, "SendUpdateSalesOrderDraft", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
        }
    }
    ,
    SendTakesInventory: function (data, socket) {
        var takeInventory = data.takeInventory;
        try {
            socket.emit("TakeInventoryReceive", { "TakeInventoryId": takeInventory.TakeInventoryId });
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = "";

                    var from = "FROM [SONDA_TAKE_INVENTORY_HEADER] where IS_ACTIVE_ROUTE = 1 AND CODE_ROUTE = '" + takeInventory.CodeRoute + "' and TAKE_INVENTORY_ID_HH = " + takeInventory.TakeInventoryId + " and DOC_SERIE = '" + takeInventory.DocSerie + "' and DOC_NUM = " + takeInventory.DocNum;
                    pSql = "DELETE FROM [SONDA_TAKE_INVENTORY_DETAIL] WHERE TAKE_INVENTORY_ID IN (SELECT TAKE_INVENTORY_ID " + from + "); ";
                    pSql += "DELETE " + from + "; ";

                    pSql += "DECLARE @ID NUMERIC(18,0), @SERVER_POSTED_DATETIME DATETIME = GETDATE(); ";
                    pSql += " INSERT INTO [SONDA_TAKE_INVENTORY_HEADER] (";
                    pSql += " [POSTED_DATETIME]";
                    pSql += " ,[CLIENT_ID]";
                    pSql += " ,[CODE_ROUTE]";
                    pSql += " ,[GPS_URL]";
                    pSql += " ,[POSTED_BY]";
                    pSql += " ,[DEVICE_BATERY_FACTOR]";
                    pSql += " ,[IS_ACTIVE_ROUTE]";
                    pSql += " ,[GPS_EXPECTED]";
                    pSql += " ,[TAKE_INVENTORY_ID_HH]";
                    pSql += " ,[DOC_SERIE]";
                    pSql += " ,[DOC_NUM]";
                    pSql += " ,[IS_VOID]";
                    pSql += " ,[TASK_ID]";
                    pSql += ", [SERVER_POSTED_DATETIME]";
                    pSql += ", [DEVICE_NETWORK_TYPE]";
                    pSql += ", [IS_POSTED_OFFLINE]";
                    pSql += ") VALUES (";
                    pSql += "'" + takeInventory.PostedDatetime + "'";
                    pSql += " ,'" + takeInventory.ClientId + "'";
                    pSql += " ,'" + takeInventory.CodeRoute + "'";
                    pSql += " ,'" + takeInventory.GpsUrl + "'";
                    pSql += " ,'" + takeInventory.PostedBy + "'";
                    pSql += " ," + takeInventory.DeviceBatteryFactor;
                    pSql += " ," + takeInventory.IsActiveRoute;
                    pSql += " ,'" + takeInventory.GpsExpected + "'";
                    pSql += " ," + takeInventory.TakeInventoryId;
                    pSql += " ,'" + takeInventory.DocSerie + "'";
                    pSql += " ," + takeInventory.DocNum;
                    pSql += " ," + takeInventory.IsVoid;
                    pSql += " ," + takeInventory.TaskId;
                    pSql += " ,@SERVER_POSTED_DATETIME";
                    pSql += " , '" + takeInventory.DeviceNetworkType + "'";
                    pSql += " , " + takeInventory.IsPostedOffLine;
                    pSql += ");";
                    pSql += " SET @ID = SCOPE_IDENTITY();";
                    pSql += " SELECT @ID as ID, @SERVER_POSTED_DATETIME as SERVER_POSTED_DATETIME;";

                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {
                        if (errN1 === undefined) {
                            connection.close();
                            pSqlInstance.close();
                            EjecutarSpTakeInvnetory(data, 0, recordsetsEncabezado[0].ID, function () {
                                socket.emit('TakeInventoryReceiveComplete', { 'pResult': 'OK', 'TakeInventoryBoId': recordsetsEncabezado[0].ID, 'TakeInventoryHhId': takeInventory.TakeInventoryId, "ServerPostedDateTime": recordsetsEncabezado[0].SERVER_POSTED_DATETIME });
                            }, function (err) {
                                socket.emit("TakeInventoryFail", { "TakeInventoryId": takeInventory.TakeInventoryId, "Message": GetErrorMessage(err) });
                            });
                        } else {
                            socket.emit("TakeInventoryFail", { "TakeInventoryId": takeInventory.TakeInventoryId, "Message": GetErrorMessage(errN1) });
                            connection.close();
                            pSqlInstance.close();
                            console.log("Take Inventory error insert header: " + GetErrorMessage(errN1), "error", "SendTakesInventory", takeInventory.CodeRoute, null, "SendTakesInventory", null, takeInventory.DocSerie, takeInventory.DocNum, 9);
                        }
                    });
                } else {
                    socket.emit("TakeInventoryFail", { "TakeInventoryId": takeInventory.TakeInventoryId, "Message": GetErrorMessage(errConnConsig) });
                    console.log("Take Inventory error connection: " + GetErrorMessage(errConnConsig), "error", "SendTakesInventory", takeInventory.CodeRoute, null, "SendTakesInventory", null, takeInventory.DocSerie, takeInventory.DocNum, 9);
                }
            });
        } catch (err) {
            socket.emit("TakeInventoryFail", { "TakeInventoryId": takeInventory.TakeInventoryId, "Message": GetErrorMessage(err) });
            console.log("Take Inventory catch: " + GetErrorMessage(err), "error", "SendTakesInventory", takeInventory.CodeRoute, null, "SendTakesInventory", null, takeInventory.DocSerie, takeInventory.DocNum, 9);
        }

    }
    ,
    SendDeliveryTask: function (data, socket) {
        try {
            var task = data.task;

            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig === null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('TASK_ID', pSqlInstance.INT, task.taskid);
                    request.input('TASK_STATUS', pSqlInstance.VarChar, task.taskstatus);
                    request.input('LOGIN', pSqlInstance.VarChar, task.loginid);
                    request.input('REJECT_COMMENT', pSqlInstance.VarChar, task.reason);
                    request.input('PHOTO', pSqlInstance.VarChar, task.taskimg);
                    request.input('GPS', pSqlInstance.VarChar, task.postedgps);

                    request.execute('SWIFT_SP_UPDATE_MANIFEST_DETAIL_BY_TASK', function (err, recordsets) {
                        if (err === undefined) {
                            socket.emit("SendDeliveryTask_success", { "data": task.taskid });
                            console.log("SendDeliveryTask_success");
                        } else {
                            socket.emit("SendDeliveryTask_fail", { "data": task.taskid, "Message": GetErrorMessage(errConnConsig) });
                            console.log("SendDeliveryTask_fail: " + err.message, "error", "SWIFT_SP_UPDATE_MANIFEST_DETAIL_BY_TASK", null, task.loginid, "SendDeliveryTask", null, null, null, 9);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("SendDeliveryTask_fail", { "data": data.task, "Message": GetErrorMessage(errConnConsig) });
                    console.log("SendDeliveryTask error connection: " + GetErrorMessage(errConnConsig), "error", "SendDeliveryTask", null, task.loginid, "SendDeliveryTask", null, null, null, 9);
                }
            });
        } catch (err) {
            socket.emit("SendDeliveryTask_fail", { "data": data.task, "Message": GetErrorMessage(err) });
            console.log("SendDeliveryTask_ catch: " + GetErrorMessage(err), "error", "SendDeliveryTask", null, task.loginid, "SendDeliveryTask", null, null, null, 9);
        }
    }
    ,
    GetReverseGetGeoCode: function (data, socket) {
        try {
            ObtenerClientesParaGeocodingInverso(data, function (customers) {
                if (customers.length > 0) {
                    for (var i = 0; i < customers.length; i++) {
                        var customer = customers[i];

                        ObtenerGeocodingInverso(customer, i, data.key, function (customerN1, indexN1, result) {
                            if (result.status === 'OK') {
                                ObtenerDeparamentoMunicipioColonia(customerN1, indexN1, result.results, function (customerN2, indexN2) {
                                    ActualizarGeocodingInversoDeCliente(data, customerN2, indexN2, function (customerN3, indexN3) {
                                        socket.emit("GetReverseGetGeoCode_Request", { 'option': 'newGeocodiong', 'customer': customerN3 });

                                        if (indexN3 === (customers.length - 1)) {
                                            socket.emit("GetReverseGetGeoCode_Request", { 'option': 'success' });
                                            console.log("GetReverseGetGeoCode success");
                                        }
                                    }, function (errN3) {
                                        socket.emit("GetReverseGetGeoCode_Request", { 'option': 'failActualizarGeocodingInversoDeCliente', 'message': errN3.message });
                                        console.log("GetReverseGetGeoCode ActualizarGeocodingInversoDeCliente fail " + errN3.message, "error", "ActualizarGeocodingInversoDeCliente", null, null, "GetReverseGetGeoCode", null, null, null, 5);
                                    });
                                }, function (errN2) {
                                    socket.emit("GetReverseGetGeoCode_Request", { 'option': 'failObtenerDeparamentoMunicipioColonia', 'message': errN2.message });
                                    console.log("GetReverseGetGeoCode ObtenerDeparamentoMunicipioColonia fail " + errN2.message, "error", "ObtenerDeparamentoMunicipioColonia", null, null, "GetReverseGetGeoCode", null, null, null, 5);
                                });
                            } else {
                                socket.emit("GetReverseGetGeoCode_Request", { 'option': 'failGetGeocoding', 'message': 'status' + result.status, 'GPS': customerN1.Gps });
                                console.log("GetReverseGetGeoCode status: " + result.status + ' GPS: ' + customerN1.Gps, "error", "ObtenerGeocodingInverso", null, null, "GetReverseGetGeoCode", null, null, null, 5);
                            }
                        }, function (errN1) {
                            socket.emit("GetReverseGetGeoCode_Request", { 'option': 'failGetGeocoding', 'message': errN1.message });
                            console.log("GetReverseGetGeoCode ObtenerGeocodingInverso fail " + errN1.message, "error", "ObtenerGeocodingInverso", null, null, "GetReverseGetGeoCode", null, null, null, 5);
                        });
                    }
                } else {
                    socket.emit("GetReverseGetGeoCode_Request", { 'option': 'success', 'message': 'Sin registros' });
                    console.log("GetReverseGetGeoCode success sin registros", "info");
                }
            }, function (err) {
                socket.emit("GetReverseGetGeoCode_Request", { 'option': 'fail', 'message': err.message });
                console.log("GetReverseGetGeoCode ObtenerClientesParaGeocodingInverso fail " + err.message, "error", "ObtenerClientesParaGeocodingInverso", null, null, "GetReverseGetGeoCode", null, null, null, 5);
            });
        } catch (e) {
            socket.emit("GetReverseGetGeoCode_Request", { 'option': 'fail', 'message': e.message, 'data': data });
            console.log("GetReverseGetGeoCode catch " + e.message, "error", "GetReverseGetGeoCode", null, null, "GetReverseGetGeoCode", null, null, null, 5);
        }
    }
    ,
    SendCustomerChange: function (data, socket) {
        try {
            var customer = data.customer;

            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig === null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('CODE_CUSTOMER', pSqlInstance.VarChar, customer.ClientId);
                    request.input('PHONE_CUSTOMER', pSqlInstance.VarChar, customer.PhoneCustomer);
                    request.input('ADRESS_CUSTOMER', pSqlInstance.VarChar, customer.AddressCustomer);
                    request.input('CONTACT_CUSTOMER', pSqlInstance.VarChar, customer.ContactCustomer);
					request.input('GPS', pSqlInstance.VarChar, customer.Gps);
					request.input('POSTED_DATETIME', pSqlInstance.VarChar, customer.PostedDatetime);
                    request.input('POSTED_BY', pSqlInstance.VarChar, customer.PostedBy); 
                    request.input('CODE_ROUTE', pSqlInstance.VarChar, customer.CodeRoute); 
                    request.input('TAX_ID', pSqlInstance.VarChar, customer.TaxId);
                    request.input('INVOICE_NAME', pSqlInstance.VarChar, customer.InvoiceName); 
                    request.input('CUSTOMER_NAME', pSqlInstance.VarChar, customer.CustomerName);
                    request.input('NEW_CUSTOMER_NAME', pSqlInstance.VarChar, customer.CustomerNewName);
                    request.input('DEVICE_NETWORK_TYPE', pSqlInstance.VarChar, customer.DeviceNetworkType);
                    request.input('IS_POSTED_OFFLINE', pSqlInstance.Int, customer.IsPostedOffLine);
                    
                    request.execute('SWIFT_SP_INSERT_CUSTOMER_CHANGE', function (err, recordsets) {
                        if (err === undefined) {
                            connection.close();
                            pSqlInstance.close();
                            console.dir(recordsets[0][0]);
                            EjecutarSpTagsCustomerChange(data,
                                0,
                                recordsets[0][0].ID,
                                recordsets[0][0].SERVER_POSTED_DATETIME,
                                function(customerChangeIdBo, serverPostedDateTime) {
                                    socket.emit("SendCustomerChange_Request",
                                    {
                                        "option": "success",
                                        "ClientId": customer.ClientId,
                                        "CustomerChangeId": customer.CustomerChangeId,
                                        "CustomerChangeIdBo": customerChangeIdBo,
                                        "ServerPostedDateTime": serverPostedDateTime
                                    });
                                    console.log("SendCustomerChange_Request: success cliente:" + customer.ClientId,
                                        "info");
                                },
                                function(err) {
                                    socket.emit("SendCustomerChange_Request", { "option": "fail", "message": err });
                                    console.log("SendCustomerChange_Request: fail cliente:" + customer.ClientId,
                                        "error",
                                        "EjecutarSpTagsCustomerChange",
                                        customer.CodeRoute,
                                        null,
                                        "SendCustomerChange",
                                        null,
                                        null,
                                        null,
                                        10);
                                });

                        } else {
                            socket.emit("SendCustomerChange_Request", { "option": "fail", "message": err });
                            console.log("SendCustomerChange_fail: " + err.message, "error", "SWIFT_SP_INSERT_CUSTOMER_CHANGE", customer.CodeRoute, null, "SendCustomerChange", null, null, null, 10);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("SendCustomerChange_fail", { "data": data.customer, "Message": GetErrorMessage(errConnConsig) });
                    console.log("SendCustomerChange error connection: " + GetErrorMessage(errConnConsig), "error", "SendCustomerChange", data.customer.CodeRoute, null, "SendCustomerChange", null, null, null, 10);
                }
            });
        } catch (err) {
            socket.emit("SendCustomerChange_fail", { "data": data.customer, "Message": GetErrorMessage(err) });
            console.log("SendCustomerChange_ catch: " + GetErrorMessage(err), "error", "SendCustomerChange", data.customer.CodeRoute, null, "SendCustomerChange", null, null, null, 10);
        }
    }
    ,
    obtenerInformacionManifiesto: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig === null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input('MANIFEST_HEADER', pSqlInstance.INT, data.numeroManifiesto);

                    request.execute('SONDA_SP_CREATE_LOAD_MANIFEST', function (err, recordsets) {
                        if (err === undefined) {
                            if (recordsets[0][0] === undefined) {
                                connection.close();
                                pSqlInstance.close();
                                socket.emit("ObtenerInformacionDeManifiesto", { "option": "informacionDeManifiestoNoEncontrada", "data": data });
                                console.log("ObtenerInformacionDeManifiesto, informacion no encontrada...", "warn");
                            } else {
                                socket.emit("ObtenerInformacionDeManifiesto", { "option": "procesarInformacionDeManifiesto", "data": recordsets[0] });
                                console.log("ObtenerInformacionDeManifiesto, procesar informacion... ");
                            }
                        } else {
                            socket.emit("ObtenerInformacionDeManifiesto", { "option": "fail", "Message": "No se ha podido obtener el detalle del manifiesto debido a: " + err });
                            console.log("No se ha podido obtener el detalle del manifiesto debido a: " + err, "error", "SONDA_SP_CREATE_LOAD_MANIFEST", null, null, "obtenerInformacionManifiesto", null, null, nul, 7);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("ObtenerInformacionDeManifiesto", { "option": "fail", "Message": GetErrorMessage(errConnConsig) });
                    console.log("ObtenerInformacionDeManifiesto error connection: " + GetErrorMessage(errConnConsig), "error", "obtenerInformacionManifiesto", null, null, "obtenerInformacionManifiesto", null, null, nul, 7);
                }
            });
        } catch (err) {
            socket.emit("ObtenerInformacionDeManifiesto", { "option": "fail", "Message": "Error al intentar obtener el detalle del manifiesto debido a: " + e.message });
            console.log("Error al intentar obtener el detalle del manifiesto debido a: " + e.message, "error", "obtenerInformacionManifiesto", null, null, "obtenerInformacionManifiesto", null, null, nul, 7);
        }
    }
    ,
    SendAllSalesOrder: function (data, socket) {
        var salesOrder = data.salesOrder;
        try {
            socket.emit("SendAllSalesOrderReceive", { "option": "receive", "SalesOrderId": salesOrder.SalesOrderId, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });

            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig == null) {
                    var requestValidation = new pSqlInstance.Request(connection);
                    requestValidation.verbose = false;
                    requestValidation.stream = false;

                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;
                    var pSql = "";

                    pSql += " INSERT INTO [SONDA_SALES_ORDER_HEADER_TEMP] (";
                    pSql += "[SALES_ORDER_ID]";
                    pSql += " ,[TERMS]";
                    pSql += " ,[POSTED_DATETIME]";
                    pSql += " ,[CLIENT_ID]";
                    pSql += " ,[POS_TERMINAL]";
                    pSql += " ,[GPS_URL]";
                    pSql += " ,[TOTAL_AMOUNT]";
                    pSql += " ,[STATUS]";
                    pSql += " ,[POSTED_BY]";
                    pSql += " ,[IMAGE_1]";
                    pSql += " ,[IMAGE_2]";
                    pSql += " ,[IMAGE_3]";
                    pSql += " ,[DEVICE_BATTERY_FACTOR]";
                    pSql += " ,[VOID_DATETIME]";
                    pSql += " ,[VOID_REASON]";
                    pSql += " ,[VOID_NOTES]";
                    pSql += " ,[VOIDED]";
                    pSql += " ,[CLOSED_ROUTE_DATETIME]";
                    pSql += " ,[IS_ACTIVE_ROUTE]";
                    pSql += " ,[GPS_EXPECTED]";
                    pSql += " ,[DELIVERY_DATE]";
                    pSql += " ,[SALES_ORDER_ID_HH]";
                    pSql += " ,[IS_PARENT]";
                    pSql += " ,[REFERENCE_ID]";
                    pSql += " ,[WAREHOUSE]";
                    pSql += " ,[TIMES_PRINTED]";
                    pSql += " ,[DOC_SERIE]";
                    pSql += " ,[DOC_NUM]";
                    pSql += " ,[IS_VOID]";
                    pSql += " ,[SALES_ORDER_TYPE]";
                    pSql += " ,[DISCOUNT]";
                    pSql += " ,[IS_DRAFT]";
                    pSql += " ,[TASK_ID]";
                    pSql += " ,[COMMENT]";
                    pSql += " ,[IS_POSTED]";
                    pSql += " ,[SINC]";
                    pSql += " ,[IS_POSTED_VOID]";
                    pSql += " ,[IS_UPDATED]";
                    pSql += " ,[PAYMENT_TIMES_PRINTED]";
                    pSql += " ,[PAID_TO_DATE]";
                    pSql += " ,[TO_BILL]";
                    pSql += " ,[AUTHORIZED]";
                    pSql += " ,[DETAIL_QTY]";
                    pSql += ") VALUES (";
                    pSql += salesOrder.SalesOrderIdBo;
                    if (salesOrder.Terms != null && salesOrder.Terms != "null") {
                        pSql += " ,'" + salesOrder.Terms + "'";
                    } else {
                        pSql += " ,null";
                    }
                    pSql += " ,'" + salesOrder.PostedDatetime + "'";
                    pSql += " ,'" + salesOrder.ClientId + "'";
                    pSql += " ,'" + salesOrder.PosTerminal + "'";
                    pSql += " ,'" + salesOrder.GpsUrl + "'";
                    pSql += " ," + salesOrder.TotalAmount;
                    pSql += " ,'" + salesOrder.Status + "'";
                    pSql += " ,'" + salesOrder.PostedBy + "'";
                    if (salesOrder.Image1 != null && salesOrder.Image1 != "null") {
                        pSql += " ,'" + salesOrder.Image1 + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.Image2 != null && salesOrder.Image2 != "null") {
                        pSql += " ,'" + salesOrder.Image2 + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.Image3 != null && salesOrder.Image3 != "null") {
                        pSql += " ,'" + salesOrder.Image3 + "'";
                    } else {
                        pSql += ",null";
                    }

                    pSql += " ,'" + salesOrder.DeviceBatteryFactor + "'";
                    if (salesOrder.VoidDatetime != null && salesOrder.VoidDatetime != "null") {
                        pSql += " ,'" + salesOrder.VoidDatetime + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.VoidReason != null && salesOrder.VoidReason != "null") {
                        pSql += " ,'" + salesOrder.VoidReason + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.VoidNotes != null && salesOrder.VoidNotes != "null") {
                        pSql += " ,'" + salesOrder.VoidNotes + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.Voided != null && salesOrder.Voided != "null") {
                        pSql += " ,'" + salesOrder.Voided + "'";
                    } else {
                        pSql += ",null";
                    }
                    if (salesOrder.ClosedRouteDatetime != null && salesOrder.ClosedRouteDatetime != "null") {
                        pSql += " ,'" + salesOrder.ClosedRouteDatetime + "'";
                    } else {
                        pSql += ",null";
                    }

                    pSql += " ," + salesOrder.IsActiveRoute;
                    if (salesOrder.GpsExpected != null && salesOrder.GpsExpected != "null") {
                        pSql += " ,'" + salesOrder.GpsExpected + "'";
                    } else {
                        pSql += ",null";
                    }

                    if (salesOrder.DeliveryDate != null && salesOrder.DeliveryDate != "null") {
                        pSql += " ,'" + salesOrder.DeliveryDate + "'";
                    } else {
                        pSql += ",null";
                    }
                    pSql += " ," + salesOrder.SalesOrderId;
                    pSql += " ," + salesOrder.IsParent;
                    pSql += " ,'" + salesOrder.ReferenceId + "'";
                    pSql += " ,'" + data.warehouse + "'";
                    pSql += " ," + salesOrder.TimesPrinted;
                    pSql += " ,'" + salesOrder.DocSerie + "'";
                    pSql += " ," + salesOrder.DocNum;
                    pSql += " ," + salesOrder.IsVoid;
                    pSql += " ,'" + salesOrder.SalesOrderType + "'";
                    pSql += " ,'" + salesOrder.Discount + "'";
                    pSql += " ," + salesOrder.IsDraft;
                    pSql += " ," + salesOrder.TaskId;
                    pSql += " ,'" + salesOrder.Comment + "'";
                    pSql += " ," + salesOrder.IsPosted;
                    pSql += " ," + salesOrder.Sinc;
                    pSql += " ," + salesOrder.IsPostedVoid;
                    pSql += " ," + salesOrder.IsUpdated;
                    pSql += " ," + salesOrder.PaymentTimesPrinted;
                    pSql += " ," + salesOrder.PaidToDate;
                    pSql += " ," + salesOrder.ToBill;
                    pSql += " ," + salesOrder.Authorized;
                    pSql += " ," + salesOrder.DetailQty;
                    pSql += ");";

                    request.query(pSql, function (errN1, recordsetsEncabezado, returnValue) {
                        if (errN1 === undefined) {
                            InsertAllSalesOrderDetail(salesOrder.SaleDetails, salesOrder.SalesOrderIdBo, salesOrder.SalesOrderId, function (pSql2) {
                                request.query(pSql2, function (errN2, recordsetsDetalle, returnValue) {
                                    if (errN2 !== undefined) {
                                        socket.emit("SendAllSalesOrderReceive", { "option": "fail", "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(errN2) });
                                        console.log("Error insertar detalle: " + GetErrorMessage(errN2), "error", "InsertAllSalesOrderDetail", salesOrder.PosTerminal, null, "SendAllSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 9);
                                        connection.close();
                                        pSqlInstance.close();
                                    } else {
                                        socket.emit('SendAllSalesOrderReceive', { "option": "success", 'SalesOrderId': salesOrder.SalesOrderId, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });

                                        connection.close();
                                        pSqlInstance.close();
                                    }
                                });
                            });
                        } else {
                            socket.emit("SendAllSalesOrderReceive", { "option": "fail", "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(errN1) });
                            connection.close();
                            pSqlInstance.close();
                            console.log("SendAllSalesOrder error insert encabezado: " + GetErrorMessage(errN1), "error", "SONDA_SALES_ORDER_HEADER_TEMP", salesOrder.PosTerminal, null, "SendAllSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 9);
                        }
                    });
                } else {
                    socket.emit("SendAllSalesOrderReceive", { "option": "fail", "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(errConnConsig) });
                    console.log("SendAllSalesOrderReceive error connection: " + GetErrorMessage(errConnConsig), "error", "SendAllSalesOrder", salesOrder.PosTerminal, null, "SendAllSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 9);
                }
            });

        } catch (err) {
            socket.emit("SendAllSalesOrderReceive", { "option": "fail", "SalesOrderId": salesOrder.SalesOrderId, "Message": GetErrorMessage(err) });
            console.log("SendAllSalesOrderReceive catch: " + GetErrorMessage(err), "error", "SendAllSalesOrder", salesOrder.PosTerminal, null, "SendAllSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 9);
        }
    }
    ,
    InsertAllNewClient: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;
                //--CUSTOMER
                request.input('CODE_CUSTOMER', pSqlInstance.VarChar, data.client.CodigoBo);
                request.input('NAME_CUSTOMER', pSqlInstance.VarChar, data.client.Nombre);
                request.input('PHONE_CUSTOMER', pSqlInstance.VarChar, data.client.Telefono);
                request.input('ADDRESS_CUSTOMER', pSqlInstance.VarChar, data.client.Direccion);
                request.input('CONTACT_CUSTOMER', pSqlInstance.VarChar, data.client.ContactCustomer);
                request.input('CODE_ROUTE', pSqlInstance.VarChar, data.client.Ruta);
                request.input('SELLER_CODE', pSqlInstance.VarChar, data.client.Seller_code);
                request.input('LAST_UPDATE_BY', pSqlInstance.VarChar, data.client.loginid);
                //request.input('HHID', pSqlInstance.VarChar, data.client.CodigoHH);
                request.input('SING', pSqlInstance.VarChar, data.client.Sign);
                request.input('PHOTO', pSqlInstance.VarChar, data.client.Photo);
                request.input('STATUS', pSqlInstance.VarChar, data.client.Status);
                request.input('NEW', pSqlInstance.VarChar, data.client.New);
                request.input('GPS', pSqlInstance.VarChar, data.client.Gps);
                request.input('REFERENCE', pSqlInstance.VarChar, data.client.Reference);

                request.input('POST_DATETIME', pSqlInstance.VarChar, data.client.PostDateTime);
                request.input('POS_SALE_NAME', pSqlInstance.VarChar, data.client.PosSaleName);
                request.input('INVOICE_NAME', pSqlInstance.VarChar, data.client.InvoiceName);
                request.input('INVOICE_ADDRESS', pSqlInstance.VarChar, data.client.InvoiceAddress);
                request.input('NIT', pSqlInstance.VarChar, data.client.Nit);
                request.input('CONTACT_ID', pSqlInstance.VarChar, data.client.ContactId);
                request.input('UPDATED_FROM_BO', pSqlInstance.Int, data.client.UpdatedFromBo);
                request.input('SYNC_ID', pSqlInstance.VarChar, data.client.SyncId);

                //--FREQUENCY
                request.input('MONDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Monday);
                request.input('TUESDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Tuesday);
                request.input('WEDNESDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Wednesday);
                request.input('THURSDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Thursday);
                request.input('FRIDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Friday);
                request.input('SATURDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Saturday);
                request.input('SUNDAY', pSqlInstance.VarChar, data.client.DiasVisita[0].Sunday);
                request.input('FREQUENCY_WEEKS', pSqlInstance.VarChar, data.client.DiasVisita[0].FrequencyWeeks);
                request.input('LAST_DATE_VISITED', pSqlInstance.VarChar(50), data.client.DiasVisita[0].LastDateVisited);

                request.input('IS_POSTED', pSqlInstance.Int, data.client.IsPosted);

                request.execute('SONDA_SP_INSERT_SCOUTING_TEMP', function (err, recordsets, returnValue) {
                    connection.close();
                    pSqlInstance.close();
                    if (err === undefined) {
                        if (recordsets.length > 0 && recordsets[0][0] !== undefined) {
                            data.client.CodigoBo = recordsets[0][0].ID;
                            socket.emit('InsertAllNewClient', { "option": "success" });
                            console.log('InsertAllNewClient success');
                        } else {
                            socket.emit("InsertAllNewClientReceive", { "option": "fail", "CodeCustomerIdBo": data.client.CodigoBo, "CodeCustomerIdHh": data.client.CodigoHH, "Message": "no genero id" });
                            console.log("InsertAllNewClient error insert: no genero id", "warn");
                        }
                    } else {
                        socket.emit("InsertAllNewClientReceive", { "option": "fail", "CodeCustomerIdBo": data.client.CodigoBo, "CodeCustomerIdHh": data.client.CodigoHH, "Message": GetErrorMessage(err) });
                        console.log("InsertAllNewClient error insert: " + err.message, "error", "SONDA_SP_INSERT_SCOUTING_TEMP", data.client.Ruta, null, "InsertAllNewClient", null, null, null, 10);
                    }
                });
            });
        } catch (e) {
            socket.emit("InsertAllNewClientReceive", { "option": "fail", "CodeCustomerIdBo": data.client.CodigoBo, "CodeCustomerIdHh": data.client.CodigoHH, "Message": GetErrorMessage(e) });
            console.log("InsertAllNewClient catch" + e.message, "error", "InsertAllNewClient", data.client.Ruta, null, "InsertAllNewClient", null, null, null, 10);
        }
    }
    ,
    InsertAllNewTagsXClient: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('TAG_COLOR', pSqlInstance.VarChar, data.tagscolor);
                request.input('CUSTOMER', pSqlInstance.VarChar, data.customer);

                request.execute('SWIFT_SP_INSERT_TAG_X_CUSTOMER_TEMP', function (err, recordsets, returnValue) {
                    connection.close();
                    pSqlInstance.close();
                    if (err === undefined) {
                        socket.emit('InsertAllNewTagsXClient', { "option": "success" });
                        console.log('InsertAllNewTagsXClient success');
                    } else {
                        socket.emit("InsertAllNewTagsXClient", { "option": "fail", "tagscolor": data.tagscolor, "customer": data.customer, "Message": GetErrorMessage(err) });
                        console.log("InsertAllNewTagsXClient error insert: " + err.message, "error", "SWIFT_SP_INSERT_TAG_X_CUSTOMER_TEMP", null, null, "InsertAllNewTagsXClient", null, null, null, 7);
                    }
                });
            });
        } catch (e) {
            console.log("InsertAllNewTagsXClient catch" + e.message, "error", "InsertAllNewTagsXClient", null, null, "InsertAllNewTagsXClient", null, null, null, 7);
        }
    }
    , UpdateTaskAccepted: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;
                request.input('TASK_ID', pSqlInstance.Int, data.taskid);
                //request.input('STATUS', pSqlInstance.VarChar, data.status);

                request.execute('SONDA_SP_UPDATE_TASK_ACCEPTED', function (err, recordsets, returnValue) {
                    connection.close();
                    pSqlInstance.close();

                    if (err === undefined) {
                        socket.emit('UpdateTaskAccepted_Request', { 'option': 'UpdateTaskAccepted_Incomplete' });

                    } else {
                        socket.emit('UpdateTaskAccepted_Request', { 'option': 'UpdateTaskAccepted_Error', 'error': err.message });
                        console.log("UpdateTaskAccepted_Request: " + GetErrorMessage(err), "error", "SONDA_SP_UPDATE_TASK_ACCEPTED", null, null, "UpdateTaskAccepted", null, null, null, 9);
                    }
                });
            });
        } catch (e) {
            socket.emit("UpdateTaskAccepted_Request", { 'option': 'UpdateTaskAccepted_Error', "error": GetErrorMessage(err) });
            console.log("UpdateTaskAccepted_Request catch: " + GetErrorMessage(e), "error", "UpdateTaskAccepted", null, null, "UpdateTaskAccepted", null, null, null, 9);
        }
    }
    ,
    obtenerInventarioDeSkuPorZona: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig === null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
                    request.input("CODE_SKU", pSqlInstance.VarChar, data.sku);

                    request.execute("[SWIFT_SP_GET_INVENTORY_BY_USER_ZONE]", function (err2, recordsets) {
                        if (err2 === undefined) {
                            if (recordsets[0][0] === undefined) {
                                connection.close();
                                pSqlInstance.close();
                                socket.emit("GetInventoryForSkuByZoneResponse", { "option": "inventory_for_sku_by_zone_not_found", "data": data });
                                console.log("GetInventoryForSkuByZoneResponse, informacion no encontrada...", "warn");
                            } else {
                                socket.emit("GetInventoryForSkuByZoneResponse", { "option": "inventory_for_sku_by_zone_found", "recordSet": recordsets[0] });
                                console.log("GetInventoryForSkuByZoneResponse, procesar informacion... ");
                            }
                        } else {
                            socket.emit("GetInventoryForSkuByZoneResponse", { "option": "inventory_for_sku_by_zone_error", "Message": "No se ha podido obtener el Inventario del SKU debido a: " + err2 });
                            console.log("No se ha podido obtener el Inventario del SKU debido a: " + JSON.stringify(err2), "error", "SWIFT_SP_GET_INVENTORY_BY_USER_ZONE", data.routeid, null, "obtenerInventarioDeSkuPorZona", null, null, null, 8);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    socket.emit("GetInventoryForSkuByZoneResponse", { "option": "inventory_for_sku_by_zone_error", "Message": GetErrorMessage(errConnConsig) });
                    console.log("GetInventoryForSkuByZoneResponse error connection: " + GetErrorMessage(errConnConsig), "error", "obtenerInventarioDeSkuPorZona", data.routeid, null, "obtenerInventarioDeSkuPorZona", null, null, null, 8);
                }
            });
        } catch (err) {
            socket.emit("ObtenerInformacionDeManifiesto", { "option": "inventory_for_sku_by_zone_error", "Message": "Error al intentar obtener el Inventario del SKU debido a: " + e.message });
            console.log("Error al intentar obtener el Inventario del SKU debido a: " + e.message, "error", "obtenerInventarioDeSkuPorZona", data.routeid, null, "obtenerInventarioDeSkuPorZona", null, null, null, 8);
        }
    }
    ,
    insertarLogDeBonificaciones: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
                if (errConnConsig === null) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    var xml = js2xmlparser.parse("Data", data.borradores);

                    request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
                    request.input("SOURCE", pSqlInstance.VarChar, data.Source);
                    request.input("XML", pSqlInstance.Xml, xml);
                    request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data.borradores));

                    request.execute("SONDA_SP_INSERT_LOG_BONUS", function (err2, recordsets) {
                        if (err2 === undefined) {
                            console.log("Log of bonus inserted successfully... ");
                        } else {
                            console.log("Log of bonus insert fail... " + JSON.stringify(err2));
                            console.log("Error al ejecutar SP" + GetErrorMessage(err2), "error", "SONDA_SP_INSERT_LOG_BONUS", data.routeid, null, "insertarLogDeBonificaciones", null, null, null, 10);
                            connection.close();
                            pSqlInstance.close();
                        }
                    });

                } else {
                    console.log("Log of bonus insert fail... " + JSON.stringify(errConnConsig));
                    console.log("Error de coneccion" + errConnConsig, "error", "insertarLogDeBonificaciones", data.routeid, null, "insertarLogDeBonificaciones", null, null, null, 10);
                }
            });
        } catch (err) {
            console.log("Log of bonus insert fail... " + JSON.stringify(err));
            console.log("Log of bonus insert fail... " + JSON.stringify(err), "error", "insertarLogDeBonificaciones", data.routeid, null, "insertarLogDeBonificaciones", null, null, null, 10);
        }
    }
    , insertarOrdenesDeVentaObtenidasDeRuta: function (data, callback,errorCallbak) {
        var dataObjectReturn = { "socketServerId": data.socketServerId, "routeId": data.routeid };
        try {
            var connection = _cnnServ.ConnectDb(data, function (errorDeAperturaDeBd, pSqlInstance) {
                if (!errorDeAperturaDeBd) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    var xml = js2xmlparser.parse("Data", data);
                    request.input("XML", pSqlInstance.Xml, xml);

                    request.execute("SONDA_SP_INSERT_SALES_ORDERS_REQUESTED_FROM_SWIFT", function (errorDeInsercionDeOrdenesDeVenta) {
                        connection.close();
                        pSqlInstance.close();
                        if (!errorDeInsercionDeOrdenesDeVenta) {
                            callback(dataObjectReturn);
                        } else {
                            errorCallbak(`No se ha podido guardar las &oacute;rdenes de venta en debido a: ${errorDeInsercionDeOrdenesDeVenta.message}`, dataObjectReturn);
                        }
                    });

                } else {
                    errorCallbak("No se ha podido conectar al servidor.", dataObjectReturn);
                }
            });
            
        } catch (err) {
            errorCallbak("Error al intentar guardar las &oacute;rdenes de venta obtenidas de del dispositivo m&oacute;vil.", dataObjectReturn);
            console.log(`Error al guardar las ordenes de venta obtenidas del m�vil... ${JSON.stringify(err)}`,
                "error",
                "insertarOrdenesDeVentaObtenidasDeRuta",
                data.routeid,
                null,
                "insertarOrdenesDeVentaObtenidasDeRuta",
                null,
                null,
                null,
                10);
        }
    }
    ,
    insertarHistoricoDePromociones: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errorDeAperturaDeBd, pSqlInstance) {
                if (!errorDeAperturaDeBd) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    var xml = js2xmlparser.parse("Data", data);
                    request.input("XML", pSqlInstance.Xml, xml);

                    request.execute("SONDA_ADD_HISTORY_BY_PROMO_BY_XML", function (errorDeInsercion, recordsetDeResultado) {
                        connection.close();
                        pSqlInstance.close();
                        if (!errorDeInsercion) {
                            socket.emit("insertHistoryOfPromo_response", { "option": "success", "recordset": recordsetDeResultado[0] });
                        } else {
                            socket.emit("insertHistoryOfPromo_response", { "option": "fail", "message": errorDeInsercion.message });
                        }
                    });

                } else {
                    socket.emit("insertHistoryOfPromo_response", { "option": "fail", "message": errorDeAperturaDeBd.message });
                }
            });
            
        } catch (err) {
            socket.emit("insertHistoryOfPromo_response", { "option": "fail", "message": err.message });
            console.log(`Error al guardar el historico de promociones del m�vil... ${JSON.stringify(err)}`,
                "error",
                "insertarHistoricoDePromociones",
                data.routeid,
                null,
                "insertarHistoricoDePromociones",
                null,
                null,
                null,
                10);
        }
    }
    ,
    insertarOrdenDeVenta: function (objetoData, objetoSocket) {
        var _this = this;
        var salesOrder = objetoData.salesOrder;
        try {
            if (salesOrder.DetailQty === salesOrder.SaleDetails.length) {
                objetoSocket.emit("SalesOrderReceive", { "SalesOrderId": salesOrder.SalesOrderId, 'DocSerie': salesOrder.DocSerie, 'DocNum': salesOrder.DocNum });
                var connection = _cnnServ.ConnectDb(objetoData, function (errConnConsig, pSqlInstance) {
                    if (errConnConsig == null) {

                        var insertSaleOrder = new pSqlInstance.Request(connection);
                        insertSaleOrder.verbose = _cnnServ.GetVerbose();
                        insertSaleOrder.stream = false;
                        var xml = js2xmlparser.parse("Data", objetoData);

                        insertSaleOrder.input('XML', pSqlInstance.Xml, xml);
                        insertSaleOrder.input('JSON', pSqlInstance.VarChar, "");
                        insertSaleOrder.execute('SONDA_SP_ADD_SALES_ORDER_BY_XML', function (errN1, recordsetsEncabezado) {
                            if (errN1 === undefined) {
                                objetoSocket.emit('SalesOrderReceiveComplete',
                                    {
                                        'pResult': 'OK',
                                        'SalesOrderIdBo': recordsetsEncabezado[0][0].ID,
                                        'ServerPostedDateTime': recordsetsEncabezado[0][0].SERVER_POSTED_DATETIME,
                                        'SalesOrderId': salesOrder.SalesOrderId,
                                        'DocSerie': salesOrder.DocSerie,
                                        'DocNum': salesOrder.DocNum
                                    });
                                _this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(objetoData, null);
                                connection.close();
                                pSqlInstance.close();
                            } else {
                                objetoSocket.emit("SalesOrderFail", { "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(errN1) });
                                connection.close();
                                pSqlInstance.close();
                                console.log("Error insertar encabezado: " + GetErrorMessage(errN1), "error", "SONDA_SP_ADD_SALES_ORDER_BY_XML", salesOrder.PosTerminal, null, "SendSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                                _this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(objetoData,null);
                            }
                        });
                    } else {
                        objetoSocket.emit("SalesOrderFail", { "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(errConnConsig) });
                        console.log("SalesOrder error connection: " + GetErrorMessage(errConnConsig), "error", "SalesOrder", salesOrder.PosTerminal, null, "SendSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                        _this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(objetoData,null);
                    }
                });
            } else {
                console.log("No es la misma cantidad del detalle.", "error", "SendSalesOrder", salesOrder.PosTerminal, null, "SendSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
                _this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(objetoData,null);
            }
        } catch (err) {
            objetoSocket.emit("SalesOrderFail", { "SalesOrderId": salesOrder.SalesOrderId, "message": GetErrorMessage(err) });
            console.log("En catch: " + GetErrorMessage(err), "error", "SendSalesOrder", salesOrder.PosTerminal, null, "SendSalesOrder", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
            _this.eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket(objetoData, null);
        }
    }
    ,
    eliminarRutaQueInsertoOrdenDeVentaMedianteIdDeSocket: function(objetoData, objetoSocket) {
        if (objetoData) {
            rutasInsertandoOrdenesDeVenta = rutasInsertandoOrdenesDeVenta.filter(function (objetoRuta) {
                return objetoData.codigoDeRuta !== objetoRuta.routeId;
            });
        } else {
            rutasInsertandoOrdenesDeVenta = rutasInsertandoOrdenesDeVenta.filter(function (objetoRuta) {
                return objetoRuta.idDeSocket !== objetoSocket.id;
            });
        }
    }
    ,
    insertarEncuestasPorCliente: function (data, socket) {
        try {
            var connection = _cnnServ.ConnectDb(data, function (errorDeAperturaDeBd, pSqlInstance) {
                if (!errorDeAperturaDeBd) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = _cnnServ.GetVerbose();
                    request.stream = false;

                    var xml = js2xmlparser.parse("Data", data);
                    request.input("XML", pSqlInstance.Xml, xml);
                    request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));

                    request.execute("SONDA_SP_INSERT_SURVEY_BY_XML", function (errorDeInsercion, recordsetDeResultado) {
                        connection.close();
                        pSqlInstance.close();
                        if (!errorDeInsercion) {
                            socket.emit("AddMicrosurveyByClientResponse", { "option": "success", "recordset": recordsetDeResultado[0] });
                        } else {
                            socket.emit("AddMicrosurveyByClientResponse", { "option": "fail", "message": errorDeInsercion.message });
                        }
                    });

                    request.on("done",function(){
                        connection.close();
                        pSqlInstance.close();
                    });
                } else {
                    socket.emit("AddMicrosurveyByClientResponse", { "option": "fail", "message": errorDeAperturaDeBd.message });
                }
            });
            
        } catch (err) {
            socket.emit("AddMicrosurveyByClientResponse", { "option": "fail", "message": err.message });
            console.log(`Error al guardar el registro de encuesta de cliente... ${JSON.stringify(err)}`,
                "error",
                "insertarEncuestasPorCliente",
                data.routeid,
                null,
                "insertarEncuestasPorCliente",
                null,
                null,
                null,
                10);
        }
    }
}

function ObtenerFormatoInsertarOrdeDeVenta(salesOrder, data) {
    try {
        var pSql = "";
        var from = "FROM [SONDA_SALES_ORDER_HEADER] where IS_ACTIVE_ROUTE = 1 AND POS_TERMINAL = '" + salesOrder.PosTerminal + "' and DOC_SERIE = '" + salesOrder.DocSerie + "' and DOC_NUM = " + salesOrder.DocNum;
        pSql = " DELETE FROM [SONDA_SALES_ORDER_DETAIL] WHERE SALES_ORDER_ID IN (SELECT SALES_ORDER_ID " + from + "); ";
        pSql += "DELETE " + from + "; ";

        pSql += "DECLARE @ID NUMERIC(18,0), @SERVER_POSTED_DATETIME DATETIME = GETDATE(); ";
        pSql += " INSERT INTO [SONDA_SALES_ORDER_HEADER] (";
        pSql += "[TERMS]";
        pSql += " ,[POSTED_DATETIME]";
        pSql += " ,[CLIENT_ID]";
        pSql += " ,[POS_TERMINAL]";
        pSql += " ,[GPS_URL]";
        pSql += " ,[TOTAL_AMOUNT]";
        pSql += " ,[STATUS]";
        pSql += " ,[POSTED_BY]";
        pSql += " ,[IMAGE_1]";
        pSql += " ,[IMAGE_2]";
        pSql += " ,[IMAGE_3]";
        pSql += " ,[DEVICE_BATTERY_FACTOR]";
        pSql += " ,[VOID_DATETIME]";
        pSql += " ,[VOID_REASON]";
        pSql += " ,[VOID_NOTES]";
        pSql += " ,[VOIDED]";
        pSql += " ,[CLOSED_ROUTE_DATETIME]";
        pSql += " ,[IS_ACTIVE_ROUTE]";
        pSql += " ,[GPS_EXPECTED]";
        pSql += " ,[DELIVERY_DATE]";
        pSql += " ,[SALES_ORDER_ID_HH]";
        pSql += " ,[IS_PARENT]";
        pSql += " ,[REFERENCE_ID]";
        pSql += " ,[WAREHOUSE]";
        pSql += " ,[TIMES_PRINTED]";
        pSql += " ,[DOC_SERIE]";
        pSql += " ,[DOC_NUM]";
        pSql += " ,[IS_VOID]";
        pSql += " ,[SALES_ORDER_TYPE]";
        pSql += " ,[DISCOUNT]";
        pSql += " ,[IS_DRAFT]";
        pSql += " ,[SERVER_POSTED_DATETIME]";
        pSql += " ,[DEVICE_NETWORK_TYPE]";
        pSql += " ,[IS_POSTED_OFFLINE]";
        pSql += ") VALUES (";
        if (salesOrder.Terms != null && salesOrder.Terms != "null") {
            pSql += "'" + salesOrder.Terms + "'";
        } else {
            pSql += "null";
        }
        pSql += " ,'" + salesOrder.PostedDatetime + "'";
        pSql += " ,'" + salesOrder.ClientId + "'";
        pSql += " ,'" + salesOrder.PosTerminal + "'";
        pSql += " ,'" + salesOrder.GpsUrl + "'";
        pSql += " ," + salesOrder.TotalAmount;
        pSql += " ,'" + salesOrder.Status + "'";
        pSql += " ,'" + salesOrder.PostedBy + "'";
        if (salesOrder.Image1 != null && salesOrder.Image1 != "null") {
            pSql += " ,'" + salesOrder.Image1 + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.Image2 != null && salesOrder.Image2 != "null") {
            pSql += " ,'" + salesOrder.Image2 + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.Image3 != null && salesOrder.Image3 != "null") {
            pSql += " ,'" + salesOrder.Image3 + "'";
        } else {
            pSql += ",null";
        }

        pSql += " ,'" + salesOrder.DeviceBatteryFactor + "'";
        if (salesOrder.VoidDatetime != null && salesOrder.VoidDatetime != "null") {
            pSql += " ,'" + salesOrder.VoidDatetime + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.VoidReason != null && salesOrder.VoidReason != "null") {
            pSql += " ,'" + salesOrder.VoidReason + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.VoidNotes != null && salesOrder.VoidNotes != "null") {
            pSql += " ,'" + salesOrder.VoidNotes + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.Voided != null && salesOrder.Voided != "null") {
            pSql += " ,'" + salesOrder.Voided + "'";
        } else {
            pSql += ",null";
        }
        if (salesOrder.ClosedRouteDatetime != null && salesOrder.ClosedRouteDatetime != "null") {
            pSql += " ,'" + salesOrder.ClosedRouteDatetime + "'";
        } else {
            pSql += ",null";
        }

        pSql += " ," + salesOrder.IsActiveRoute;
        if (salesOrder.GpsExpected != null && salesOrder.GpsExpected != "null") {
            pSql += " ,'" + salesOrder.GpsExpected + "'";
        } else {
            pSql += ",null";
        }

        if (salesOrder.DeliveryDate != null && salesOrder.DeliveryDate != "null") {
            pSql += " ,'" + salesOrder.DeliveryDate + "'";
        } else {
            pSql += ",null";
        }
        pSql += " ," + salesOrder.SalesOrderId;
        pSql += " ," + salesOrder.IsParent;
        pSql += " ,'" + salesOrder.ReferenceId + "'";
        pSql += " ,'" + data.warehouse + "'";
        pSql += " ," + salesOrder.TimesPrinted;
        pSql += " ,'" + salesOrder.DocSerie + "'";
        pSql += " ," + salesOrder.DocNum;
        pSql += " ," + salesOrder.IsVoid;
        pSql += " ,'" + salesOrder.SalesOrderType + "'";
        pSql += " ," + salesOrder.Discount;
        pSql += " ," + salesOrder.IsDraft;
        pSql += ", @SERVER_POSTED_DATETIME";
        pSql += " ,'" + salesOrder.DeviceNetworkType + "'";
        pSql += " ," + salesOrder.IsPostedOffLine;
            pSql += ");";
        pSql += " SET @ID = SCOPE_IDENTITY();";
        pSql += " SELECT @ID as ID, @SERVER_POSTED_DATETIME as SERVER_POSTED_DATETIME;";
        return pSql;
    } catch (e) {
        console.log("Error al ObtenerFormatoInsertarOrdeDeVenta " + GetErrorMessage(e), "error", "ObtenerFormatoInsertarOrdeDeVenta", salesOrder.PosTerminal, null, "ObtenerFormatoInsertarOrdeDeVenta", null, salesOrder.DocSerie, salesOrder.DocNum, 10);
    }

}

function ObtenerFormatoActualizarOrdeDeVenta(salesOrder, data) {
    var pSql = "";
    var from = "FROM [SONDA_SALES_ORDER_HEADER] where IS_ACTIVE_ROUTE = 1 AND POS_TERMINAL = '" + salesOrder.PosTerminal + "' and DOC_SERIE = '" + salesOrder.DocSerie + "' and DOC_NUM = " + salesOrder.DocNum;
    pSql = "DELETE FROM [SONDA_SALES_ORDER_DETAIL] WHERE SALES_ORDER_ID IN (SELECT SALES_ORDER_ID " + from + "); ";

    pSql += " UPDATE [SONDA_SALES_ORDER_HEADER] SET ";
    pSql += " [TERMS] = ";
    if (salesOrder.Terms != null && salesOrder.Terms != "null") {
        pSql += "'" + salesOrder.Terms + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[POSTED_DATETIME]  = '" + salesOrder.PostedDatetime + "'";
    pSql += " ,[CLIENT_ID] = '" + salesOrder.ClientId + "'";
    pSql += " ,[POS_TERMINAL] = '" + salesOrder.PosTerminal + "'";
    pSql += " ,[GPS_URL] = '" + salesOrder.GpsUrl + "'";
    pSql += " ,[TOTAL_AMOUNT] = " + salesOrder.TotalAmount;
    pSql += " ,[STATUS] = '" + salesOrder.Status + "'";
    pSql += " ,[POSTED_BY] = '" + salesOrder.PostedBy + "'";
    pSql += " ,[IMAGE_1] = ";
    if (salesOrder.Image1 != null && salesOrder.Image1 != "null") {
        pSql += "'" + salesOrder.Image1 + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[IMAGE_2] = ";
    if (salesOrder.Image2 != null && salesOrder.Image2 != "null") {
        pSql += "'" + salesOrder.Image2 + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[IMAGE_3] = ";
    if (salesOrder.Image3 != null && salesOrder.Image3 != "null") {
        pSql += "'" + salesOrder.Image3 + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[DEVICE_BATTERY_FACTOR] = '" + salesOrder.DeviceBatteryFactor + "'";
    pSql += " ,[VOID_DATETIME] = ";
    if (salesOrder.VoidDatetime != null && salesOrder.VoidDatetime != "null") {
        pSql += "'" + salesOrder.VoidDatetime + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[VOID_REASON] = ";
    if (salesOrder.VoidReason != null && salesOrder.VoidReason != "null") {
        pSql += "'" + salesOrder.VoidReason + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[VOID_NOTES] =";
    if (salesOrder.VoidNotes != null && salesOrder.VoidNotes != "null") {
        pSql += "'" + salesOrder.VoidNotes + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[VOIDED] = ";
    if (salesOrder.Voided != null && salesOrder.Voided != "null") {
        pSql += "'" + salesOrder.Voided + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[CLOSED_ROUTE_DATETIME] = ";
    if (salesOrder.ClosedRouteDatetime != null && salesOrder.ClosedRouteDatetime != "null") {
        pSql += "'" + salesOrder.ClosedRouteDatetime + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[IS_ACTIVE_ROUTE] = " + salesOrder.IsActiveRoute;
    pSql += " ,[GPS_EXPECTED] = ";
    if (salesOrder.GpsExpected != null && salesOrder.GpsExpected != "null") {
        pSql += "'" + salesOrder.GpsExpected + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[DELIVERY_DATE] = ";
    if (salesOrder.DeliveryDate != null && salesOrder.DeliveryDate != "null") {
        pSql += "'" + salesOrder.DeliveryDate + "'";
    } else {
        pSql += "null";
    }
    pSql += " ,[SALES_ORDER_ID_HH] = " + salesOrder.SalesOrderId;
    pSql += " ,[IS_PARENT] = " + salesOrder.IsParent;
    pSql += " ,[REFERENCE_ID] = '" + salesOrder.ReferenceId + "'";
    pSql += " ,[WAREHOUSE] = '" + data.warehouse + "'";
    pSql += " ,[TIMES_PRINTED] = " + salesOrder.TimesPrinted;
    pSql += " ,[IS_VOID] = " + salesOrder.IsVoid;
    pSql += " ,[SALES_ORDER_TYPE] = '" + salesOrder.SalesOrderType + "'";
    pSql += " ,[DISCOUNT] = " + salesOrder.Discount + "";
    pSql += " ,[IS_DRAFT] = " + salesOrder.IsDraft;
    pSql += " ,[DEVICE_NETWORK_TYPE] = '" + salesOrder.DeviceNetworkType + "'";
    pSql += " ,[IS_POSTED_OFFLINE] = " + salesOrder.IsPostedOffLine;
    pSql += " WHERE [SALES_ORDER_ID] = " + salesOrder.SalesOrderIdBo;
    pSql += " AND [DOC_SERIE] = '" + salesOrder.DocSerie + "'";
    pSql += " AND [DOC_NUM] = " + salesOrder.DocNum;

    return pSql;
}

function EjecutarSP(data, request, sql, index, callback, errCallback) {
    request.execute(sql, function (err, recordset) {
        if (err === undefined) {
            callback(index, recordset);
            console.log("Validacion correcta de orden de venta ruta: " + data.routeid);
        } else {
            errCallback(err);
            console.log("Error al ejecutar: " + GetErrorMessage(err), "error", "EjecutarSP", null, null, "EjecutarSP", null, null, null, 8);
        }

    });
}

function EjecutarSpTakeInvnetory(data, index, encabezadoId, callback, errCallback) {
    var takeInventory = data.takeInventory;
    if (index < takeInventory.TakeInventoryDetails.length) {
        var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
            if (errConnConsig == null) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                var det = takeInventory.TakeInventoryDetails[index];

                request.input('TAKE_INVENTORY_ID', pSqlInstance.Int, encabezadoId);
                request.input('CODE_SKU', pSqlInstance.VarChar, det.CodeSku);
                request.input('QTY', pSqlInstance.Int, det.Qty);
                request.input('POSTED_DATETIME', pSqlInstance.VarChar, takeInventory.PostedDatetime);
                request.input('CODE_PACK_UNIT', pSqlInstance.VarChar, det.CodePackUnit);
                request.input('LAST_QTY', pSqlInstance.Int, det.LastQty);
                request.execute("SONDA_SP_INSERT_TAKE_INVENTORY_DETAIL_IF_SKU_EXIST", function (err, recordsets) {
                    if (err === undefined) {
                        connection.close();
                        pSqlInstance.close();
                        if (recordsets[0][0].RESULT === 1) {
                            console.log("Detail insert correct, Sku:" + recordsets[0][0].CODE_SKU, "info");
                        }
                        else {
                            console.log("Sku inexistent: " + recordsets[0][0].CODE_SKU, "warn");
                        }

                        EjecutarSpTakeInvnetory(data, index + 1, encabezadoId, function () {
                            callback();
                        },
                            function () {
                                errCallback(err);
                            });
                    } else {
                        errCallback(err);
                        console.log("Error al ejecutar insertar detalle: " + GetErrorMessage(err), "error", "SONDA_SP_INSERT_TAKE_INVENTORY_DETAIL_IF_SKU_EXIST", null, null, "EjecutarSpTakeInvnetory", null, null, null, 8);
                    }
                });

            }
        });
    } else {
        callback();
    }
}

function ObtenerClientesParaGeocodingInverso(data, callback, errCallback) {
    try {
        console.log("ObtenerClientesParaGeocodingInverso");
        var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
            if (errConnConsig == null) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('IS_FOR_SCOUTING', pSqlInstance.Int, data.isForScouting);
                request.execute('SWIFT_SP_GET_CUSTOMER_TO_GEOCODING', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        var customers = Array();
                        for (var i = 0; i < recordsets[0].length; i++) {
                            var customer = {
                                CodeCustomer: recordsets[0][i].CODE_CUSTOMER,
                                Gps: recordsets[0][i].GPS,
                                Latitude: recordsets[0][i].LATITUDE,
                                Longitude: recordsets[0][i].LONGITUDE,
                                Departament: '',
                                Municipality: '',
                                Colony: '',
                                TypeCustomer: recordsets[0][i].TYPE_CUSTOMER
                            }
                            customers.push(customer);
                        }
                        callback(customers);
                        console.log("ObtenerClientesParaGeocodingInverso success");
                    } else {
                        errCallback({ 'code': -1, 'message': err.message });
                        console.log("ObtenerClientesParaGeocodingInverso error al obtener: " + err.message, "error", "SWIFT_SP_GET_CUSTOMER_TO_GEOCODING", null, null, "ObtenerClientesParaGeocodingInverso", null, null, null, 8);
                    }
                });
            } else {
                errCallback(errConnConsig);
                console.log("ObtenerClientesParaGeocodingInverso error connection: " + GetErrorMessage(errConnConsig), "error", "ObtenerClientesParaGeocodingInverso", null, null, "ObtenerClientesParaGeocodingInverso", null, null, null, 8);
            }
        });
    } catch (err) {
        errCallback(err);
        console.log("ObtenerClientesParaGeocodingInverso catch: " + GetErrorMessage(err), "error", "ObtenerClientesParaGeocodingInverso", null, null, "ObtenerClientesParaGeocodingInverso", null, null, null, 8);
    }
}

function ActualizarGeocodingInversoDeCliente(data, custmer, index, callback, errCallback) {
    try {
        console.log("ActualizarGeocodingInversoDeCliente");
        var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
            if (errConnConsig == null) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                request.input('CODE_CUSTOMER', pSqlInstance.VarChar, custmer.CodeCustomer);
                request.input('DEPARTAMENT', pSqlInstance.VarChar, custmer.Departament);
                request.input('MUNICIPALITY', pSqlInstance.VarChar, custmer.Municipality);
                request.input('COLONY', pSqlInstance.VarChar, custmer.Colony);
                request.input('TYPE_CUSTOMER', pSqlInstance.VarChar, custmer.TypeCustomer);

                request.input('IS_FOR_SCOUTING', pSqlInstance.Int, data.isForScouting);

                request.execute('SWIFT_SP_SET_GEOCODING', function (err, recordsets, returnValue) {
                    if (err === undefined) {
                        callback(custmer, index);
                        console.log("ActualizarGeocodingInversoDeCliente success");
                    } else {
                        errCallback({ 'code': -1, 'message': err.message });
                        console.log("ActualizarGeocodingInversoDeCliente error al actualizar: " + err.message, "error", "SWIFT_SP_SET_GEOCODING", nul, null, "ActualizarGeocodingInversoDeCliente", null, null, null, 8);
                    }
                });
            } else {
                errCallback(errConnConsig);
                console.log("ActualizarGeocodingInversoDeCliente error connection: " + GetErrorMessage(errConnConsig), "error", "ActualizarGeocodingInversoDeCliente", nul, null, "ActualizarGeocodingInversoDeCliente", null, null, null, 8);
            }
        });
    } catch (err) {
        errCallback(err);
        console.log("ActualizarGeocodingInversoDeCliente catch: " + GetErrorMessage(err), "error", "ActualizarGeocodingInversoDeCliente", nul, null, "ActualizarGeocodingInversoDeCliente", null, null, null, 8);
    }
}

function ObtenerGeocodingInverso(custmer, index, key, callback, errCallback) {
    try {
        console.log("ObtenerGeocodingInverso");
        var http = require('https');
        var options = {
            host: 'maps.googleapis.com',
            path: '/maps/api/geocode/json?latlng=' + custmer.Gps + '&key=' + key
        }
        var obtenerRespuesta = function (response) {
            // variable that will save the result
            var result = '';

            // every time you have a new piece of the result
            response.on('data', function (chunk) {
                result += chunk;
            });

            // when you get everything back
            response.on('end', function () {
                callback(custmer, index, JSON.parse(result));
                console.log("ObtenerGeocodingInverso success");
            });
        }

        http.request(options, obtenerRespuesta).end();
    } catch (err) {
        errCallback(err);
        console.log("ObtenerGeocodingInverso catch: " + GetErrorMessage(err), "error", "ObtenerGeocodingInverso", null, null, "ObtenerGeocodingInverso", null, null, null, 7);
    }
}

function ObtenerDeparamentoMunicipioColonia(customer, index, results, callback, errCallback) {
    try {
        console.log("ObtenerDeparamentoMunicipioColonia");

        var departamento = '';
        var municipio = '';
        var colonia = '';
        var calle = '';
        var ruta = '';
        var localida = '';
        var municipio2 = '';

        for (var i = 0; i < results.length; i++) {
            for (var j = 0; j < results[i].address_components.length; j++) {
                for (var k = 0; k < results[i].address_components[j].types.length; k++) {
                    if (departamento === '' && results[i].address_components[j].types[k] === "administrative_area_level_1") {
                        departamento = results[i].address_components[j].long_name;
                    }

                    if (municipio === '' && results[i].address_components[j].types[k] === "political") {
                        municipio = results[i].address_components[j].long_name;
                    }

                    if (municipio2 === '' && results[i].address_components[j].types[k] === "administrative_area_level_2") {
                        municipio2 = results[i].address_components[j].long_name;
                    }

                    if (colonia === '' && results[i].address_components[j].types[k] === "neighborhood") {
                        colonia = results[i].address_components[j].long_name;
                    }

                    if (calle === '' && results[i].address_components[j].types[k] === "street_number") {
                        calle = results[i].address_components[j].long_name;
                    }

                    if (ruta === '' && results[i].address_components[j].types[k] === "route") {
                        ruta = results[i].address_components[j].long_name;
                    }

                    if (localida === '' && results[i].address_components[j].types[k] === "locality") {
                        localida = results[i].address_components[j].long_name;
                    }
                }
                if (departamento !== '' && municipio !== '' && colonia !== '' && calle !== '' && ruta !== '' && localida !== '' && municipio2 !== '') {
                    k = results[i].address_components[j].types.length;
                }
            }
            if (departamento !== '' && municipio !== '' && colonia !== '' && calle !== '' && ruta !== '' && localida !== '' && municipio2 !== '') {
                i = results.length;
            }
        }

        customer.Departament = departamento;
        customer.Municipality = (municipio2 !== '') ? municipio2 : ((municipio !== '') ? municipio : 'NO ESPECIFICADO');
        customer.Colony = (colonia !== '') ? colonia : ((calle !== '') ? calle : ((ruta !== '') ? ruta : ((localida !== '') ? localida : 'NO ESPECIFICADO')));

        callback(customer, index);
    } catch (err) {
        errCallback(err);
        console.log("ObtenerDeparamentoMunicipioColonia catch: " + GetErrorMessage(err), "error", "ObtenerDeparamentoMunicipioColonia", null, null, "ObtenerDeparamentoMunicipioColonia", null, null, null, 7);
    }
}

function EjecutarSpTagsCustomerChange(data, index, customerId, postedServerDatetime, callback, errCallback) {
    var customerChange = data.customer;
    if (index < customerChange.TagsByCustomer.length) {
        var connection = _cnnServ.ConnectDb(data, function (errConnConsig, pSqlInstance) {
            if (errConnConsig == null) {
                var request = new pSqlInstance.Request(connection);
                request.verbose = _cnnServ.GetVerbose();
                request.stream = false;

                var tag = customerChange.TagsByCustomer[index];

                request.input('TAG_COLOR', pSqlInstance.VarChar, tag.TagColor);
                request.input('CUSTOMER', pSqlInstance.Int, customerId);
                request.input('DEVICE_NETWORK_TYPE', pSqlInstance.VarChar, tag.DeviceNetworkType);
                request.input('IS_POSTED_OFFLINE', pSqlInstance.Int, tag.IsPostedOffLine);

                request.execute("SWIFT_SP_INSERT_CUSTOMER_CHANGE_TAG", function (err, recordsets) {
                    if (err === undefined) {
                        connection.close();
                        pSqlInstance.close();
                        console.log("Tag insert correct");
                        EjecutarSpTagsCustomerChange(data, index + 1, customerId, postedServerDatetime, function () {
                            callback(customerId, postedServerDatetime);
                        },
                            function () {
                                errCallback(err);
                            });
                    } else {
                        errCallback(err);
                        console.log("Error al insertar tag: " + GetErrorMessage(err), "error", "SWIFT_SP_INSERT_CUSTOMER_CHANGE_TAG", data.customer.CodeRoute, nll, "EjecutarSpTagsCustomerChange", null, null, null, 8);
                    }
                });
            }
        });
    } else {
        callback(customerId, postedServerDatetime);
    }
}

function DecreaseInvetoryConsignmentSku(details, warehouse, callback) {
    var pSql = "";
    var detail;
    for (var i = 0; i < details.length; i++) {
        detail = details[i];

        pSql += "UPDATE SONDA_POS_SKUS SET ON_HAND = ON_HAND - " + detail.Qty + " WHERE ROUTE_ID = '" + warehouse + "' AND SKU = '" + detail.Sku + "';    ";

        pSql += "UPDATE SWIFT_INVENTORY SET ON_HAND = (ON_HAND - " + detail.Qty + ") WHERE WAREHOUSE = '" + warehouse + "'AND SKU = '" + detail.Sku + "';    ";
    }

    callback(pSql);
}

function InsertAllSalesOrderDetail(saleOrderDetails, idSaleOrderHeaderBo, idSaleOrderHeaderHh, callback) {
    var pSql = "";
    var det;
    for (var i = 0; i < saleOrderDetails.length; i++) {
        det = saleOrderDetails[i];

        pSql += "INSERT INTO [SONDA_SALES_ORDER_DETAIL_TEMP] (";
        pSql += "[SALES_ORDER_ID]";
        pSql += " ,[SKU]";
        pSql += " ,[LINE_SEQ]";
        pSql += " ,[QTY]";
        pSql += " ,[PRICE]";
        pSql += " ,[DISCOUNT]";
        pSql += " ,[TOTAL_LINE]";
        pSql += " ,[POSTED_DATETIME]";
        pSql += " ,[SERIE]";
        pSql += " ,[SERIE_2]";
        pSql += " ,[REQUERIES_SERIE]";
        pSql += " ,[COMBO_REFERENCE]";
        pSql += " ,[PARENT_SEQ]";
        pSql += " ,[IS_ACTIVE_ROUTE]";
        pSql += " ,[CODE_PACK_UNIT]";
        pSql += " ,[IS_BONUS]";
        pSql += " ,[SALES_ORDER_ID_BO]";
        pSql += " ,[IS_POSTED_VOID]";
        pSql += " ,[LONG]";
        pSql += ") VALUES (";
        pSql += idSaleOrderHeaderBo;
        pSql += " ,'" + det.Sku + "'";
        pSql += " ," + det.LineSeq;
        pSql += " ," + det.Qty;
        pSql += " ," + det.Price;
        pSql += " ," + det.Discount;
        pSql += " ," + det.TotalLine;
        pSql += " ,'" + det.PostedDatetime + "'";
        pSql += " ,'" + det.Serie + "'";
        pSql += " ,'" + det.Serie2 + "'";
        pSql += " ,'" + det.RequeriesSerie + "'";
        pSql += " ,'" + det.ComboReference + "'";
        pSql += " ,'" + det.ParentSeq + "'";
        pSql += " ," + det.IsActiveRoute;
        pSql += " ,'" + det.CodePackUnit + "'";
        pSql += " ," + det.IsBonus;
        pSql += " ," + idSaleOrderHeaderHh;
        pSql += " ," + det.IsPostedVoid;
        pSql += " ," + det.Long;
        pSql += ");";
    }

    callback(pSql);
}


function ValidateSalesOrders(data, socket) {
    try {
        var connection = _cnnServ.ConnectDb(data, function (err, pSqlInstance) {


            var xml = js2xmlparser.parse("Data", data);
            var dataSerializada = JSON.stringify(data);

            //---------------
            var request = new pSqlInstance.Request(connection);
            request.verbose = _cnnServ.GetVerbose();
            request.stream = false;

            request.input("XML", pSqlInstance.Xml, xml);
            request.input("JSON", pSqlInstance.VarChar, dataSerializada);

            request.execute("SONDA_SP_VALIDATE_SALES_ORDERS_BY_XML",
                function (errExecution, recordset) {
                    if (errExecution) {
                        socket.emit("ValidateSalesOrders_Request" + data.Source,
                            { 'option': "fail", 'reSend': 0, 'message': errExecution.message, 'data': data });
                        console.log("Error al ejecutar SP: " + errExecution.message, "error", "SONDA_SP_VALIDATE_SALES_ORDERS_BY_XML", data.routeid, null, "ValidateSalesOrders", null, 0, 0, 10);
                    } else {
                        if (recordset && recordset[0].length > 0) {
                            socket.emit("ValidateSalesOrders_Request" + data.Source,
                                { 'option': "fail", 'reSend': 1, 'reenviarOrdenes': recordset[0] });
                            console.log("Ruta: " + data.routeid + " ordenes de venta pendientes de validar", "error", "SONDA_SP_VALIDATE_SALES_ORDERS_BY_XML", data.routeid, null, "ValidateSalesOrders", null, 0, 0, 10);
                        } else {
                            socket.emit("ValidateSalesOrders_Request" + data.Source,
                                { 'option': "success", 'reSend': 0 });
                            console.log("Ruta: " + data.routeid + " no tiene ordenes de venta pendientes de validar", "error", "SONDA_SP_VALIDATE_SALES_ORDERS_BY_XML", data.routeid, null, "ValidateSalesOrders", null, null, null, 10);
                        }
                    }
                });

           
        });
    } catch (e) {
        socket.emit("ValidateSalesOrders_Request" + data.Source, { 'option': 'fail', 'reSend': 0, 'message': e.message, 'data': data });
        console.log("En catch: " + e.message, "error", "ValidateSalesOrders", data.routeid, null, "ValidateSalesOrders", null, null, null, 10);
    }
}

function arrayMin(arr) {
    var len = arr.length, min = Infinity, docSerie = "";

    while (len--) {
        if (arr[len].DocNum < min) {
            min = arr[len].DocNum;
            docSerie = arr[len].DocSerie;
        }
    }

    var obj = {
        docNum: min,
        docSerie: docSerie
    };
    return obj;
}
