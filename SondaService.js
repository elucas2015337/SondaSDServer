var _cnnServ = require("./ConnectionService.js");
var _routeSrv = require("./RouteService.js");
var js2xmlparser = require("js2xmlparser");
var console = require("./LogService.js");
var poucDbService = require("./PouchDbService.js");

function InsertInvoiceDetail(details, pAutSerial, callback) {
  var pSql = "";
  var detail;
  for (var i = 0; i < details.length; i++) {
    detail = details[i];

    pSql += "INSERT INTO [SONDA_POS_INVOICE_DETAIL]";
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
    pSql +=
      ",[COMBO_REFERENCE], PARENT_SEQ, INVOICE_SERIAL, LINE_SEQ, INVOICE_RESOLUTION)";

    pSql += " VALUES(" + detail.INVOICE_NUM;
    pSql += ",'" + detail.SKU + "'";
    pSql += "," + detail.QTY;
    pSql += "," + detail.PRICE;
    pSql += ",0";
    pSql += "," + detail.TOTAL_LINE;
    pSql += ",CURRENT_TIMESTAMP";
    if (detail.REQUERIES_SERIE === 1) {
      pSql += ",'" + detail.SERIE + "'";
      pSql += ",'" + detail.SERIE_2 + "'";
    } else {
      pSql += ",NULL";
      pSql += ",NULL";
    }
    pSql += "," + detail.REQUERIES_SERIE;
    pSql += ",'" + detail.COMBO_REFERENCE + "'";
    pSql += "," + detail.PARENT_SEQ;
    pSql += ", '" + pAutSerial + "'";
    pSql += ", " + detail.LINE_SEQ;
    pSql += ",'" + detail.INVOICE_RESOLUTION + "');    ";
  }
  callback(pSql);
}

function DecreaseInvetoryPreparetedSku(details, warehouse, callback) {
  var pSql = "";
  var detail;
  for (var i = 0; i < details.length; i++) {
    detail = details[i];

    pSql +=
      "UPDATE SONDA_POS_SKUS SET ON_HAND = ON_HAND - " +
      detail.QTY +
      " WHERE ROUTE_ID = '" +
      warehouse +
      "' AND SKU = '" +
      detail.SKU +
      "';    ";
  }

  callback(pSql);
}

function DecreaseInvetory(defaultWarehouse, details, login, callback) {
  var pSql = "";
  var detail;
  for (var i = 0; i < details.length; i++) {
    detail = details[i];
    if (detail.REQUERIES_SERIE === 1) {
      pSql +=
        " UPDATE SWIFT_INVENTORY SET ON_HAND = 0 WHERE SKU = '" +
        detail.SKU +
        "' AND SERIAL_NUMBER = '" +
        detail.SERIE +
        "' AND WAREHOUSE = '" +
        defaultWarehouse +
        "';";
    } else {
      pSql += "UPDATE I SET I.ON_HAND = (I.ON_HAND - " + detail.QTY + ")";
      pSql += " FROM [SWIFT_INVENTORY] I";
      pSql +=
        " INNER JOIN [USERS] U ON (I.WAREHOUSE = U.DEFAULT_WAREHOUSE AND I.LOCATION = U.DEFAULT_WAREHOUSE)";
      pSql += " WHERE I.[SKU] = '" + detail.SKU + "'";
      pSql += " AND U.LOGIN = '" + login + "';    ";
    }
  }
  callback(pSql);
}

function ExecuteProcess(process, idx, data, socket, extra1, resolve, reject) {
  var currentProc = process[idx];
  currentProc
    .exec(data, socket, extra1)
    .then(res => {
      idx += 1;
      if (idx < process.length) {
        console.log(
          `[${new Date().toISOString()}] : Process:${
            currentProc.name
          } its ok for ${data.routeid}`
        );
        ExecuteProcess(process, idx, data, socket, res.extra1, resolve, reject);
      } else {
        console.log(
          `[${new Date().toISOString()}] : Process:${
            currentProc.name
          } its ok for ${data.routeid}`
        );
        resolve({
          status: true,
          Message: "Every little thing gonna be all right!",
          data: data
        });
      }
    })
    .catch(err => {
      console.log(
        "Process: " + err.Message,
        "error",
        currentProc.name,
        data.routeid,
        null,
        "GetInitialRoute",
        null,
        null,
        null,
        10
      );
      reject({ status: false, Message: err.Message || "Server error" });
    });
}

module.exports = {
  GetInitialRouteFullStack: function(data, socket) {
    try {
      var process = [
        { exec: _routeSrv.ValidateRoute, name: "ValidateRoute" },
        { exec: _routeSrv.GetReadyToStartRoute, name: "GetReadyToStartRoute" },
        { exec: _routeSrv.GetRules, name: "GetRules" },
        { exec: _routeSrv.TransferSku, name: "TransferSku" },
        { exec: _routeSrv.PrepareSkus, name: "PrepareSkus" },
        { exec: _routeSrv.GetSkus, name: "GetSkus" },
        { exec: _routeSrv.GetTags, name: "GetTags" },
        { exec: _routeSrv.GetCustomer, name: "GetCustomer" },
        { exec: _routeSrv.GetCustomerFrequency, name: "GetCustomerFrequency" },
        { exec: _routeSrv.GetTagsXCustomer, name: "GetTagsXCustomer" },
        { exec: _routeSrv.GetTasks, name: "GetTasks" },
        { exec: _routeSrv.GetSkuPreSale, name: "GetSkuPreSale" },
        { exec: _routeSrv.SetActiveRouteStart, name: "SetActiveRouteStart" },
        { exec: _routeSrv.GetDocumentSequence, name: "GetDocumentSequence" },
        { exec: _routeSrv.GetPackUnit, name: "GetPackUnit" },
        { exec: _routeSrv.GetPackConversion, name: "GetPackConversion" },
        { exec: _routeSrv.GetFamilySku, name: "GetFamilySku" },
        { exec: _routeSrv.GetInvoiceActive, name: "GetInvoiceActive" },
        { exec: _routeSrv.TravelListInvoice, name: "TravelListInvoice" },
        { exec: _routeSrv.GetDefaultPriceList, name: "GetDefaultPriceList" },
        { exec: _routeSrv.GetItemHistory, name: "GetItemHistory" },
        { exec: _routeSrv.GetSalesOrderDraft, name: "GetSalesOrderDraft" },
        {
          exec: _routeSrv.TravelListSalesOrderDraft,
          name: "TravelListSalesOrderDraft"
        },
        { exec: _routeSrv.GetInvoiceDraft, name: "GetInvoiceDraft" },
        {
          exec: _routeSrv.TravelListInvoiceDraft,
          name: "TravelListInvoiceDraft"
        },
        { exec: _routeSrv.GetCalculationRules, name: "GetCalculationRules" },
        { exec: _routeSrv.GetDefaultPackSku, name: "GetDefaultPackSku" },
        {
          exec: _routeSrv.GetPriceListBySkuPackScale,
          name: "GetPriceListBySkuPackScale"
        },
        { exec: _routeSrv.GetPrintUMParameter, name: "GetPrintUMParameter" },
        { exec: _routeSrv.GetBonusListBySku, name: "GetBonusListBySku" },
        { exec: _routeSrv.GetDiscountListBySku, name: "GetDiscountListBySku" },
        {
          exec: _routeSrv.GetBonusListBySkuMultiple,
          name: "GetBonusListBySkuMultiple"
        },
        { exec: _routeSrv.GetDefaultCurrency, name: "GetDefaultCurrency" },
        {
          exec: _routeSrv.GetTaxPercentParameter,
          name: "GetTaxPercentParameter"
        },
        {
          exec: _routeSrv.GetDefaultBonusAndDiscountListId,
          name: "GetDefaultBonusAndDiscountListId"
        },
        {
          exec: _routeSrv.GetSkuSalesByMultipleList,
          name: "GetSkuSalesByMultipleList"
        },
        { exec: _routeSrv.GetCombosByRoute, name: "GetCombosByRoute" },
        {
          exec: _routeSrv.GetSkuForCombosByRoute,
          name: "GetSkuForCombosByRoute"
        },
        {
          exec: _routeSrv.GetBonusListCombosByRoute,
          name: "GetBonusListCombosByRoute"
        },
        {
          exec: _routeSrv.GetBonusListCombosSkuByRoute,
          name: "GetBonusListCombosSkuByRoute"
        },
        {
          exec: _routeSrv.GetMaxDiscountParameter,
          name: "GetMaxDiscountParameter"
        },
        {
          exec: _routeSrv.GetDiscountByGeneralAmountList,
          name: "GetDiscountByGeneralAmountList"
        },
        { exec: _routeSrv.GetMaxBonusParameter, name: "GetMaxBonusParameter" },
        { exec: _routeSrv.GetParameters, name: "GetParameters" },
        {
          exec: _routeSrv.GetConsignmentsByRoute,
          name: "GetConsignmentsByRoute"
        },
        {
          exec: _routeSrv.GetConsignmentsDetailsByRoute,
          name: "GetConsignmentsDetailsByRoute"
        },
        { exec: _routeSrv.GetNoInvoiceReasons, name: "GetNoInvoiceReasons" },
        {
          exec: _routeSrv.GetReasonsForVoidConsignment,
          name: "GetReasonsForVoidConsignment"
        },
        { exec: _routeSrv.GetSeries, name: "GetSeries" },
        { exec: _routeSrv.GetBusinessRival, name: "GetBusinessRival" },
        {
          exec: _routeSrv.GetBusinessRivalComment,
          name: "GetBusinessRivalComment"
        }
      ];

      ExecuteProcess(
        process,
        0,
        data,
        socket,
        undefined,
        function(res) {
          console.log("Fin de GetInitialRoute");
          socket.emit("GetInitialRouteSend", {
            option: "GetInitialRouteCompleted"
          });
        },
        function(err) {
          _routeSrv.SendError(err.Message, socket);
          console.log(err.Message);
        }
      );
    } catch (e) {
      socket.emit("GetInitialRouteSend", {
        option: "error_message",
        message: "GetInitialRoute.catch: " + e.message
      });
      console.log("GetInitialRoute.catch" + e.message, "info");
    }
  },
  GetInitialRoute: function(data, socket) {
    try {
      var process = [
        { exec: _routeSrv.GetReadyToStartRoute, name: "GetReadyToStartRoute" },
        { exec: _routeSrv.GetRules, name: "GetRules" },
        { exec: _routeSrv.TransferSku, name: "TransferSku" },
        { exec: _routeSrv.PrepareSkus, name: "PrepareSkus" },
        { exec: _routeSrv.GetSkus, name: "GetSkus" },
        { exec: _routeSrv.GetTags, name: "GetTags" },
        { exec: _routeSrv.GetCustomer, name: "GetCustomer" },
        { exec: _routeSrv.GetCustomerFrequency, name: "GetCustomerFrequency" },
        { exec: _routeSrv.GetTagsXCustomer, name: "GetTagsXCustomer" },
        { exec: _routeSrv.GetTasks, name: "GetTasks" },
        { exec: _routeSrv.GetSkuPreSale, name: "GetSkuPreSale" },
        { exec: _routeSrv.SetActiveRouteStart, name: "SetActiveRouteStart" },
        { exec: _routeSrv.GetDocumentSequence, name: "GetDocumentSequence" },
        { exec: _routeSrv.GetPackUnit, name: "GetPackUnit" },
        { exec: _routeSrv.GetPackConversion, name: "GetPackConversion" },
        { exec: _routeSrv.GetFamilySku, name: "GetFamilySku" },
        { exec: _routeSrv.GetInvoiceActive, name: "GetInvoiceActive" },
        { exec: _routeSrv.TravelListInvoice, name: "TravelListInvoice" },
        { exec: _routeSrv.GetDefaultPriceList, name: "GetDefaultPriceList" },
        { exec: _routeSrv.GetItemHistory, name: "GetItemHistory" },
        { exec: _routeSrv.GetSalesOrderDraft, name: "GetSalesOrderDraft" },
        {
          exec: _routeSrv.TravelListSalesOrderDraft,
          name: "TravelListSalesOrderDraft"
        },
        { exec: _routeSrv.GetInvoiceDraft, name: "GetInvoiceDraft" },
        {
          exec: _routeSrv.TravelListInvoiceDraft,
          name: "TravelListInvoiceDraft"
        },
        { exec: _routeSrv.GetCalculationRules, name: "GetCalculationRules" },
        { exec: _routeSrv.GetDefaultPackSku, name: "GetDefaultPackSku" },
        {
          exec: _routeSrv.GetPriceListBySkuPackScale,
          name: "GetPriceListBySkuPackScale"
        },
        { exec: _routeSrv.GetPrintUMParameter, name: "GetPrintUMParameter" },
        { exec: _routeSrv.GetBonusListBySku, name: "GetBonusListBySku" },
        { exec: _routeSrv.GetDiscountListBySku, name: "GetDiscountListBySku" },
        {
          exec: _routeSrv.GetBonusListBySkuMultiple,
          name: "GetBonusListBySkuMultiple"
        },
        { exec: _routeSrv.GetDefaultCurrency, name: "GetDefaultCurrency" },
        {
          exec: _routeSrv.GetTaxPercentParameter,
          name: "GetTaxPercentParameter"
        },
        {
          exec: _routeSrv.GetDefaultBonusAndDiscountListId,
          name: "GetDefaultBonusAndDiscountListId"
        },
        {
          exec: _routeSrv.GetSkuSalesByMultipleList,
          name: "GetSkuSalesByMultipleList"
        },
        { exec: _routeSrv.GetCombosByRoute, name: "GetCombosByRoute" },
        {
          exec: _routeSrv.GetSkuForCombosByRoute,
          name: "GetSkuForCombosByRoute"
        },
        {
          exec: _routeSrv.GetBonusListCombosByRoute,
          name: "GetBonusListCombosByRoute"
        },
        {
          exec: _routeSrv.GetBonusListCombosSkuByRoute,
          name: "GetBonusListCombosSkuByRoute"
        },
        {
          exec: _routeSrv.GetMaxDiscountParameter,
          name: "GetMaxDiscountParameter"
        },
        {
          exec: _routeSrv.GetDiscountByGeneralAmountList,
          name: "GetDiscountByGeneralAmountList"
        },
        { exec: _routeSrv.GetMaxBonusParameter, name: "GetMaxBonusParameter" },
        { exec: _routeSrv.GetLabelParameter, name: "GetLabelParameter" },
        {
          exec: _routeSrv.GetSynchronizationTimeParameter,
          name: "GetSynchronizationTimeParameter"
        },
        {
          exec: _routeSrv.GetBonusByGeneralAmountList,
          name: "GetBonusByGeneralAmountList"
        },
        {
          exec: _routeSrv.GetHistoryByPromoForRoute,
          name: "GetHistoryByPromoForRoute"
        },
        {
          exec: _routeSrv.GetDiscountByGeneralAmountAndFamilyList,
          name: "GetDiscountByGeneralAmountAndFamilyList"
        },
        {
          exec: _routeSrv.GetDiscountByFamilyAndPaymentTypeList,
          name: "GetDiscountByFamilyAndPaymentTypeList"
        },
        {
          exec: _routeSrv.GetApplyDiscountParameter,
          name: "GetApplyDiscountParameter"
        },
        {
          exec: _routeSrv.GetSaleStatisticBySeller,
          name: "GetSaleStatisticBySeller"
        },
        {
          exec: _routeSrv.GetOrderForDiscountForApply,
          name: "GetOrderForDiscountForApply"
        },
        {
          exec: _routeSrv.GetListsOfSpecialPriceByScaleForRoute,
          name: "GetListsOfSpecialPriceByScaleForRoute"
        },
        {
          exec: _routeSrv.GetMicroSurveyByRoute,
          name: "GetMicroSurveyByRoute"
        },
        {
          exec: _routeSrv.GetQuestionsOfMicroSurveyByRoute,
          name: "GetQuestionsOfMicroSurveyByRoute"
        },
        {
          exec: _routeSrv.GetAnswersOfMicroSurveyByRoute,
          name: "GetAnswersOfMicroSurveyByRoute"
        },
        {
          exec: _routeSrv.GetMicroSurveyByChannel,
          name: "GetMicroSurveyByChannel"
        },
        {
          exec: this.GetBankAccounts,
          name: "GetBankAccounts"
        },
        {
          exec: this.GetOverdueInvoiceByCustomerForRoute,
          name: "GetOverdueInvoiceByCustomerForRoute"
        },
        {
          exec: this.GetPaymentParametersForRoute,
          name: "GetPaymentParametersForRoute"
        },
        {
          exec: this.GetGoalsModuleParameter,
          name: "GetGoalsModuleParameter"
        },
        {
          exec: this.GetImageBySku,
          name: "GetImageBySku"
        }
      ];

      ExecuteProcess(
        process,
        0,
        data,
        socket,
        undefined,
        function(res) {
          console.log(
            "Inicio de ruta",
            "error",
            "GetInitialRoute",
            data.routeid,
            data.loggeduser,
            "GetInitialRoute",
            null,
            null,
            null,
            -90
          );
          socket.emit("GetInitialRouteSend", {
            option: "GetInitialRouteCompleted"
          });
        },
        function(err) {
          _routeSrv.SendError(err.Message, socket);
          console.log(err.Message);
        }
      );
    } catch (e) {
      socket.emit("GetInitialRouteSend", {
        option: "error_message",
        message: "GetInitialRoute.catch: " + e.message
      });
      console.log("GetInitialRoute.catch" + e.message, "info");
    }
  },

  VoidInvoice: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        if (err !== null) {
          socket.emit("error_message", {
            message: "VoidInvoice.ConnectDb: " + err
          });
        } else {
          console.log("void_invoice.1: " + data.routeid, "error");

          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;

          request.input(
            "pINVOICE_NUM",
            pSqlInstance.VarChar(50),
            data.invoiceid
          );
          request.input(
            "pVOID_REASON",
            pSqlInstance.VarChar(50),
            data.reasonid
          );
          request.input("pVOID_NOTES", pSqlInstance.VarChar(50), data.reasonid);
          request.input("pAUTH", pSqlInstance.VarChar(50), data.authid);
          request.input("pAUTH_SERIE", pSqlInstance.VarChar(50), data.serie);

          request.output("pRESULT", pSqlInstance.VarChar(250));

          var pReturned = "";
          console.log("void_invoice.2: " + data.routeid, "error");
          request.execute("SONDA_SP_VOID_INVOICE", function(
            errN1,
            recordsets,
            returnValue
          ) {
            if (errN1 !== undefined) {
              socket.emit("error_message", {
                message: "VoidInvoice.SONDA_SP_VOID_INVOICE: " + errN1
              });
              connection.close();
              pSqlInstance.close();
            } else {
              pReturned = request.parameters.pRESULT.value;
              console.log("errN1: " + JSON.stringify(errN1), "error");

              console.log("SONDA_SP_VOID_INVOICE.RETURN=" + pReturned, "error");

              socket.emit("void_invoice_completed", {
                pResult: pReturned,
                pINVOICE_ID: data.invoiceid
              });

              connection.close();
              pSqlInstance.close();
            }
          });
        }
      });
    } catch (e) {
      console.log("VoidInvoice.catch" + e.message, "error");
    }
  },
  PostInvoice: function(data, socket) {
    var invoice = data.invoice;
    try {
      if (invoice.DetailQty === invoice.InvoiceDetail.length) {
        socket.emit("PostInvoiceReceive", { InvoiceId: invoice.InvoiceId });

        var connection = _cnnServ.ConnectDb(data, function(
          errConnConsig,
          pSqlInstance
        ) {
          if (errConnConsig == null) {
            var insertInvoice = new pSqlInstance.Request(connection);
            insertInvoice.verbose = _cnnServ.GetVerbose();
            insertInvoice.stream = false;
            var xml = js2xmlparser.parse("Data", data);

            insertInvoice.input("XML", pSqlInstance.Xml, xml);
            insertInvoice.input(
              "JSON",
              pSqlInstance.VarChar,
              JSON.stringify(data)
            );

            insertInvoice.execute("SONDA_SP_ADD_INVOICE_BY_XML", function(
              errN1,
              recordsetsEncabezado
            ) {
              connection.close();
              pSqlInstance.close();
              if (errN1 === undefined) {
                socket.emit("PostInvoiceReceiveCompleted", {
                  pResult: "OK",
                  IdBo: recordsetsEncabezado[0][0].ID,
                  InvoiceId: invoice.InvoiceId
                });
                console.log("PostInvoice success");
              } else {
                socket.emit("PostInvoiceFail", {
                  InvoiceId: invoice.InvoiceId,
                  message: errN1
                });
                console.log("PostInvoice error insert encabezado: " + errN1);
              }
            });
          } else {
            socket.emit("PostInvoiceFail", {
              InvoiceId: invoice.InvoiceId,
              message: errConnConsig
            });
            console.log("Invoice error connection: " + errConnConsig);
          }
        });
      } else {
        console.log(
          "PostInvoiceFail: No es la misma cantidad del detalle. InvoiceId: " +
            invoice.InvoiceId
        );
      }
    } catch (err) {
      socket.emit("PostInvoiceFail", {
        InvoiceId: invoice.InvoiceId,
        message: err
      });
      console.log("PostInvoice catch: " + err);
    }
  },
  ValidateInvoices: function(data, socket) {
    try {
      if (data.Invoices.length < 1 || data.Invoices.length === undefined) {
        socket.emit("ValidateInvoices_Request" + data.Source, {
          option: "success",
          reSend: 0
        });
        console.log(
          "ValidateInvoices_Request" + data.Source + " success sin facturas"
        );
        return;
      }

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var reenviarFacturas = Array();

        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        var xml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, xml);
        request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));

        request.execute("SONDA_SP_VALIDATE_INVOICE_IS_POSTED", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err) {
            socket.emit("ValidateInvoices_Request", {
              option: "fail",
              message: err.message,
              data: data
            });
            console.log("ValidateInvoices Fail" + err.message);
          }
        });

        request.on("row", function(row) {
          if (row) {
            if (row.RESULT === 0 || data.Source === "InRoute") {
              reenviarFacturas.push(row);
            }
          }
        });

        request.on("done", function() {
          if (reenviarFacturas.length === 0) {
            socket.emit("ValidateInvoices_Request" + data.Source, {
              option: "success",
              reSend: 0
            });
            console.log("ValidateInvoices_Request" + data.Source + " success");
          } else {
            socket.emit("ValidateInvoices_Request" + data.Source, {
              option: "fail",
              reSend: 1,
              reenviarFacturas: reenviarFacturas
            });
            console.log(
              "ValidateInvoices_Request" +
                data.Source +
                " fail faltan facturas por sincronizar"
            );
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      socket.emit("ValidateInvoices_Request" + data.Source, {
        option: "fail",
        reSend: 0,
        message: e.message,
        data: data
      });
      console.log(
        "ValidateInvoices_Request" +
          data.Source +
          " Error al validar facturas en el servidor " +
          e.message,
        socket
      );
    }
  },
  PostDeposit: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input(
          "pBANK_ACCOUNT",
          pSqlInstance.VarChar(50),
          data.accountid
        );
        request.input("pGPS", pSqlInstance.VarChar(150), data.gps);
        request.input("pAMT", pSqlInstance.Money, data.amount);
        request.input("pPOS_ID", pSqlInstance.VarChar(25), data.routeid);
        request.input(
          "pDEPOSIT_DATETIME",
          pSqlInstance.VarChar(25),
          data.processdate
        );
        request.input("pLOGIN_ID", pSqlInstance.VarChar(25), data.loginid);
        request.input("pOFFLINE", pSqlInstance.Int, 0);
        request.input("pTRANS_REF", pSqlInstance.Int, data.transid);
        request.output("pRESULT", pSqlInstance.VarChar(250));
        request.input("DOC_SERIE", pSqlInstance.VarChar(50), data.docSerie);
        request.input("DOC_NUM", pSqlInstance.Int, data.docNum);
        request.input("IMAGE_1", pSqlInstance.VarChar, data.image1);
        request.input("DEVICE_ID", pSqlInstance.VarChar, data.deviceId);

        var pReturned = "";

        request.execute("SONDA_SP_POST_DEPOSIT", function(
          err,
          recordsets,
          returnValue
        ) {
          pReturned = request.parameters.pRESULT.value;

          try {
            console.log("TO EMIT:post_deposit_completed");
            socket.emit("post_deposit_completed", {
              pResult: pReturned,
              transid: data.transid
            });
            console.log("EMITED:post_deposit_completed");
          } catch (ex) {
            console.log("SERVER.ERROR:" + ex.message, "error");
          }
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log("PostDeposit.catch" + e.message, "error");
    }
  },
  GetVoidReasons: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        console.log("getvoidreasons: " + data.routeid, "info");
        socket.emit("requested_void_reasons", { routeid: data.routeid });

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;
          console.log("getvoidreasons.1: " + data.routeid, "info");

          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          var pSql = "SELECT * FROM SONDA_VIEW_VOID_REASONS";

          request.query(pSql, function(err, recordset) {
            if (err) {
              console.log(
                "GetVoidReasons.query:" + JSON.stringify(err),
                "error"
              );
              socket.emit("error_message", {
                message: "getvoidreasons.sql.err: " + err
              });
              poucDbService.addError(data, {
                message: "getvoidreasons.sql.err: " + err
              });
            }
            if (recordset.length === 0) {
              socket.emit("void_reasons_not_found", { routeid: data.routeid });
              poucDbService.addError(data, {
                message: "void_reasons_not_found"
              });
            }
          });

          request.on("row", function(row) {
            socket.emit("add_to_void_reasons", { row: row });
            poucDbService.addVoidrReason(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            socket.emit("void_reasons_completed", {
              data: data,
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
          });
        });

        resolve(data);
      } catch (e) {
        reject(new Error("GetVoidReasons.catch" + e.message));
        console.log("GetVoidReasons.catch" + e.message, "error");
      }
    });
  },
  GetSkuSeries: function(data, socket) {
    try {
      //console.log("getskuseries: " + data.default_warehouse);
      socket.emit("requested_series", { routeid: data.default_warehouse });
      //console.log("requested_series emited: " + data.default_warehouse);

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var rowscount = 0;

        var request = new pSqlInstance.Request();
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;
        //console.log(data);
        var pSql =
          "SELECT * FROM S_INVENTORY_SERIAL('" + data.default_warehouse + "')";
        //var pSQL = "SELECT * FROM SONDA_POS_SKU_SERIES";

        request.query(pSql, function(err, recordset) {
          // ... error checks
          if (err) {
            console.log("GetSkuSeries.query:" + JSON.stringify(err), "error");
            socket.emit("error_message", {
              message: "getskuseries.sql.err: " + err
            });
          }
          if (recordset.length === 0) {
            socket.emit("no_series_found", { routeid: data.routeid });
          }
        });

        request.on("row", function(row) {
          socket.emit("add_to_series", { row: row });
          //console.log('add_to_series_row:' + row.SKU + ', ' + row.SKU_SERIE);
          rowscount++;
        });

        request.on("done", function(returnValue) {
          socket.emit("series_completed", { rowcount: rowscount });
          rowscount = 0;
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log("GetSkuSeries.catch" + e.message, "error");
    }
  },
  GetRouteInv: function(data, socket) {
    try {
      console.log("getroute_inv: " + data.routeid, "info");

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input(
          "Warehouse",
          pSqlInstance.VarChar(15),
          data.default_warehouse
        );
        request.output("pRESULT", pSqlInstance.VarChar(250));

        var pReturned = "";
        console.log("getroute_inv.2: " + data.default_warehouse, "info");
        //socket.emit('getroute_inv_completed', { 'pResult': 'OK', 'pWAREHOUSE': data.default_warehouse });

        request.execute("SONDA_SP_Stock", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err) {
            console.log("Sonda stock failed with code " + returnValue, "error");
            pReturned = err;
          } else {
            pReturned = request.parameters.pRESULT.value;
            console.log("SONDA_SP_Stock.RETURN=" + pReturned, "info");

            socket.emit("getroute_inv_completed", {
              pResult: pReturned,
              pROUTE_ID: data.default_warehouse
            });

            console.log("SONDA_SP_Stock.completed");
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log("GetRouteInv.catch" + e.message, "error");
    }
  },
  GetBankAccounts: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          var pSql = "SELECT * FROM SONDA_VIEW_BANK_ACCOUNTS";

          request.query(pSql, function(err, recordset) {
            if (err) {
              socket.emit("error_message", {
                message:
                  err && err.message
                    ? err.message
                    : "Error al obtener cuentas bancarias."
              });
              reject({ Message: e.message, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("bankaccounts_not_found", { routeid: data.routeid });
            }
          });

          request.on("row", function(row) {
            socket.emit("add_to_bank_accounts", { row: row });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetAuthInfo: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        socket.emit("requested_authinfo", { routeid: data.routeid });

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          try {
            var rowscount = 0;

            var request = new pSqlInstance.Request();
            request.verbose = _cnnServ.GetVerbose();
            request.stream = true;

            request.input(
              "AUTH_ASSIGNED_TO",
              pSqlInstance.VarChar,
              data.routeid
            );
            request.input("AUTH_DOC_TYPE", pSqlInstance.VarChar, data.doctype);
            request.input("AUTH_STATUS", pSqlInstance.VarChar, "1");

            request.execute("SONDA_SP_GET_AUTH_INFO", function(
              err,
              recordset,
              returnValue
            ) {
              if (err) {
                console.log(
                  "GetAuthInfo.sql.err" + JSON.stringify(err),
                  "error"
                );
                socket.emit("error_message", {
                  message: "getauthinfo.sql.err: " + err
                });
                poucDbService.addError(data, {
                  message: "getauthinfo.sql.err: " + err
                });
              }
            });
            request.on("row", function(row) {
              socket.emit("add_to_auth", { row: row, doctype: data.doctype });
              poucDbService.addAuth(data, row);
              rowscount++;
            });
            request.on("done", function(returnValue) {
              console.log("getauthinfo.done");
              if (rowscount === 0) {
                console.log("auth_not_found", "warn");
                socket.emit("auth_not_found", { rowscount: rowscount });
              } else {
                socket.emit("auth_found", { rowscount: rowscount });
              }
              connection.close();
              pSqlInstance.close();
              rowscount = 0;
            });
          } catch (ex) {
            console.log(
              "Error al obtener informacion de la resolucion 2: " + ex.message,
              "error"
            );
            socket.emit("error_message", {
              message:
                "Error al obtener informacion de la resolucion 2: " + ex.message
            });
          }
        });

        resolve(data);
      } catch (e) {
        console.log(
          "Error al obtener informacion de la resolucion 1: " + e.message,
          "error"
        );
        reject(
          new Error(
            "Error al obtener informacion de la resolucion 1: " + e.message
          )
        );
        socket.emit("error_message", {
          message:
            "Error al obtener informacion de la resolucion 1: " + e.message
        });
      }
    });
  },
  GetBankaAcounts: function(data, socket) {
    try {
      console.log("getbankaccounts: " + data.routeid, "info");
      socket.emit("requested_bank_accounts", { routeid: data.routeid });
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        if (err !== null) {
          socket.emit("error_message", {
            message: "add_to_bank_accounts.ConnectDb: " + err
          });
          poucDbService.addError(data, {
            message: "add_to_bank_accounts.ConnectDb: " + err
          });
        } else {
          var rowscount = 0;
          console.log("getbankaccounts.1: " + data.routeid, "error");

          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          //BANK_ACCOUNTS(ACCOUNT_BASE, ACCOUNT_NAME, ACCOUNT_NUMBER, ACCOUNT_BANK)
          var pSql = "SELECT * FROM SONDA_VIEW_BANK_ACCOUNTS";

          request.query(pSql, function(errN1, recordset) {
            if (errN1) {
              console.log(
                "GetBankAccounts.query:" + JSON.stringify(errN1),
                "error"
              );
              socket.emit("error_message", {
                message: "getbankaccts.sql.errN1: " + errN1
              });
              poucDbService.addError(data, {
                message: "getbankaccts.sql.errN1: " + errN1
              });
            }
            if (recordset.length === 0) {
              socket.emit("bankaccounts_not_found", { routeid: data.routeid });
            }
          });

          request.on("row", function(row) {
            socket.emit("add_to_bank_accounts", { row: row });
            poucDbService.addBankAccount(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            socket.emit("add_to_bank_completed", { rowcount: rowscount });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
          });
        }
      });
    } catch (e) {
      console.log("GetBankaAcounts.catch" + e.message, "error");
    }
  },
  PostInvoiceOffline: function(data, socket) {
    try {
      console.log("post_invoice_offline_receive");
      var pDataDetail = [];
      var pDataHeader = [];

      try {
        pDataDetail = JSON.parse(data.data_detail);
        pDataHeader = JSON.parse(data.data_header);
      } catch (e) {
        console.log("ERROR ON PARSING:" + e.message, "error");
      }
      var pAutId = pDataHeader.AUTH_ID;
      var pAutSerial = pDataHeader.SAT_SERIE;

      socket.emit("post_invoice_offline_received", {
        invoiceid: pDataHeader.INVOICE_NUM
      });

      if (pDataHeader.length <= 0) {
        socket.emit("post_invoice_offline_failed", {
          invoiceid: pDataHeader.INVOICE_NUM,
          sku: null,
          msg: "Encabezado sin informacion",
          source: 6
        });
        return -6;
      }

      if (pDataDetail.length <= 0) {
        socket.emit("post_invoice_offline_failed", {
          invoiceid: pDataHeader.INVOICE_NUM,
          sku: null,
          msg: "Factura sin detalle",
          source: 7
        });
        return -7;
      }

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        if (err !== null) {
          socket.emit("error_message", {
            message: "PostInvoiceOffline.ConnectDb: " + err
          });
        } else {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;
          var pSql = "";
          var pHeaderInvoiceId = pDataHeader.INVOICE_NUM;

          pSql = "DECLARE @RESULT INT = 0";
          pSql += "SELECT TOP 1 @RESULT = 1";
          pSql += "FROM SONDA_POS_INVOICE_HEADER ";
          pSql += "WHERE CDF_RESOLUCION = '" + pAutId + "'";
          pSql += "AND CDF_SERIE = '" + pDataHeader.SAT_SERIE + "'";
          pSql += "AND INVOICE_ID = " + pDataHeader.INVOICE_NUM;
          pSql += "SELECT @RESULT AS RESULT";

          request.query(pSql, function(errN9, recordsets, returnValue) {
            if (errN9 === undefined) {
              if (recordsets[0].RESULT === 1) {
                socket.emit("post_invoice_completed", {
                  pResult: "OK",
                  invoiceid: pHeaderInvoiceId,
                  autid: pAutId,
                  autserie: pAutSerial
                });
                return 0;
              } else {
                pSql = "INSERT INTO [SONDA_POS_INVOICE_HEADER]";
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
                if (pDataHeader.IMG1 != undefined) {
                  pSql += ",IMAGE_1" + ",IMAGE_2" + ",IMAGE_3";
                }
                pSql += ",[CONSIGNMENT_ID]";
                if (pDataHeader.INITIAL_TASK_IMAGE != undefined) {
                  pSql += ",[INITIAL_TASK_IMAGE]";
                }
                pSql += ",[IN_ROUTE_PLAN]";
                pSql += ")";

                pSql += " VALUES(" + pDataHeader.INVOICE_NUM;
                pSql += ",'CASH'";
                pSql += ", CURRENT_TIMESTAMP";
                pSql += ",'" + pDataHeader.CLIENT_ID + "'";
                pSql += ",'" + pDataHeader.POS_TERMINAL + "'";
                pSql += ",'" + pDataHeader.GPS + "'";
                pSql += "," + pDataHeader.TOTAL_AMOUNT;
                pSql += ",1";
                pSql +=
                  ", (ferco.SWIFT_FN_GET_LOGIN_BY_ROUTE ('" +
                  data.routeid +
                  "') )";
                pSql += ",1"; //IS POSTED OFFLINE
                pSql += ",'" + pDataHeader.POSTED_DATETIME + "'";
                pSql += "," + data.batt;
                pSql += ",NULL";
                pSql += ",'" + pDataHeader.SAT_SERIE + "'";
                pSql += ",'" + pDataHeader.CDF_NIT + "'"; //NIT
                pSql += ",'" + pDataHeader.CLIENT_NAME + "'";
                pSql += ",'" + pAutId + "'";
                pSql += ",NULL";
                pSql += ",0";
                pSql += ",NULL";
                pSql += ",1";
                pSql += ",NULL";
                pSql += ",NULL";
                pSql += ",NULL";
                if (pDataHeader.IMG1 != undefined) {
                  pSql +=
                    ",'" +
                    pDataHeader.IMG1 +
                    "'" +
                    ",'" +
                    pDataHeader.IMG2 +
                    "'" +
                    ",'" +
                    pDataHeader.IMG3 +
                    "'";
                }
                if (pDataHeader.CONSIGNMENT_ID === null) {
                  pSql += ",NULL";
                } else {
                  pSql += "," + pDataHeader.CONSIGNMENT_ID;
                }
                if (pDataHeader.INITIAL_TASK_IMAGE != undefined) {
                  pSql += ",'" + pDataHeader.INITIAL_TASK_IMAGE + "'";
                }
                pSql += ",'" + pDataHeader.IN_ROUTE_PLAN + "'";
                pSql += ")";

                request.query(pSql, function(errN1, recordsets, returnValue) {
                  if (errN1 !== undefined) {
                    socket.emit("error_message", {
                      message: "PostInvoice.SONDA_POS_INVOICE_HEADER: " + errN1
                    });
                  } else {
                    // insert detail
                    InsertInvoiceDetail(pDataDetail, pAutSerial, function(
                      pSqlN2
                    ) {
                      request.query(pSqlN2, function(
                        errN2,
                        recordsets,
                        returnValue
                      ) {
                        if (errN2 === undefined) {
                          console.log(
                            "PostInvoiceOffline.add_detaile_line.RETURN=OK"
                          );

                          if (parseInt(pDataHeader.IS_PAID_CONSIGNMENT) === 1) {
                            socket.emit("post_invoice_completed", {
                              pResult: "OK",
                              invoiceid: pHeaderInvoiceId,
                              autid: pAutId,
                              autserie: pAutSerial
                            });

                            connection.close();
                            pSqlInstance.close();
                          } else {
                            DecreaseInvetoryPreparetedSku(
                              pDataDetail,
                              data.default_warehouse,
                              function(pSqlN3) {
                                request.query(pSqlN3, function(
                                  errN3,
                                  recordsets,
                                  returnValue
                                ) {
                                  if (errN3 === undefined) {
                                    console.log(
                                      "PostInvoiceOffline.sku.pos_skus.updated.RETURN=OK"
                                    );
                                    DecreaseInvetory(
                                      data.default_warehouse,
                                      pDataDetail,
                                      data.loginid,
                                      function(pSqlN4) {
                                        request.query(pSqlN4, function(
                                          errN4,
                                          recordsets,
                                          returnValue
                                        ) {
                                          if (errN4 === undefined) {
                                            console.log(
                                              "PostInvoiceOffline.sku.pos_skus.updated.RETURN=OK"
                                            );

                                            socket.emit(
                                              "post_invoice_completed",
                                              {
                                                pResult: "OK",
                                                invoiceid: pHeaderInvoiceId,
                                                autid: pAutId,
                                                autserie: pAutSerial
                                              }
                                            );

                                            connection.close();
                                            pSqlInstance.close();
                                          } else {
                                            socket.emit("error_message", {
                                              message:
                                                "PostInvoiceOffline.SONDA_POS_INVOICE_HEADER: " +
                                                errN4
                                            });
                                            console.log(
                                              "errN4:" + JSON.stringify(errN4),
                                              "error"
                                            );
                                            connection.close();
                                            pSqlInstance.close();
                                          }
                                        });
                                      }
                                    );
                                  } else {
                                    socket.emit("error_message", {
                                      message:
                                        "PostInvoiceOffline.SONDA_POS_INVOICE_HEADER: " +
                                        errN3
                                    });
                                    console.log(
                                      "errN3:" + JSON.stringify(errN3),
                                      "error"
                                    );
                                    connection.close();
                                    pSqlInstance.close();
                                  }
                                });
                              }
                            );
                          }
                        } else {
                          socket.emit("error_message", {
                            message:
                              "PostInvoiceOffline.SONDA_POS_INVOICE_HEADER: " +
                              errN2
                          });
                          console.log(
                            "errN2:" + JSON.stringify(errN2),
                            "error"
                          );
                          connection.close();
                          pSqlInstance.close();
                        }
                      });
                    });
                  }
                });
              }
            } else {
              socket.emit("error_message", {
                message: "PostInvoiceOffline.SONDA_POS_INVOICE_HEADER: " + errN9
              });
              console.log("errN9: " + JSON.stringify(errN9), "error");
              connection.close();
              pSqlInstance.close();
            }
          });
        }
      });
    } catch (e) {
      socket.emit("error_message", {
        message: "PostInvoiceOffline.SONDA_POS_INVOICE_HEADER: " + e.message
      });
      console.log("PostInvoiceOffline.catch" + e.message, "error");
    }
  },
  GetAlertLimit: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        console.log("GetAlertLimit");

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;
          console.log("getalertlimit.3:");
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          var pSql =
            "SELECT ALERT_ID ,ALERT_NAME ,ALERT_PERC ,ALERT_MESSAGE FROM SONDA_ALERTS";

          request.query(pSql, function(err, recordset) {
            // ojo
            if (err) {
              console.log(
                "GetAlertLimit.sql.err:" + JSON.stringify(err),
                "error"
              );
              socket.emit("error_message", {
                message: "getalertlimit.sql.err: " + err
              });
              poucDbService.addError(data, {
                message: "getalertlimit.sql.err: " + err
              });
            }
            if (recordset.length === 0) {
              socket.emit("getalertlimit_not_found");
              console.log("getalertlimit_not_found.sql:" + pSql, "error");
              poucDbService.addError(data, {
                message: "getalertlimit_not_found"
              });
            }
          });

          request.on("row", function(row) {
            console.log("add_to_getalertlimit");

            socket.emit("add_to_getalertlimit", { row: row });
            poucDbService.addAlertLimit(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            console.log("getalertlimit_completed");

            socket.emit("getalertlimit_completed", { rowcount: rowscount });
            poucDbService.addNotification(data, "getalertlimit_completed");
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
          });
        });
        resolve(data);
      } catch (e) {
        reject(new Error("FinishRoute.catch" + e.message));
        console.log("FinishRoute.catch" + e.message, "error");
      }
    });
  },
  FinishRoute: function(data, socket) {
    try {
      console.log("process_putaway_series.received");

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        console.log("finish_route.1: " + data.routeid, "info");

        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("pPOS_ID", pSqlInstance.VarChar(25), data.routeid);
        request.input("pLOGIN_ID", pSqlInstance.VarChar(25), data.loginid);
        request.input("pLAST_INVOICE", pSqlInstance.INT, data.lastinvoice);

        request.output("pRESULT", pSqlInstance.VarChar(250));

        var pReturned = "";

        request.execute("SONDA_SP_FINISH_ROUTE", function(
          err,
          recordsets,
          returnValue
        ) {
          pReturned = request.parameters.pRESULT.value;
          console.log("SONDA_SP_FINISH_ROUTE.RETURN=" + pReturned, "info");

          //if (err === undefined) {
          //    socket.emit('finish_route_completed', { 'pResult': pReturned, 'routeid': data.routeid });
          //    console.log('EMITED:finish_route_completed');
          //} else {
          //    console.log('SERVER.ERROR:' + err.message);
          //}

          try {
            socket.emit("finish_route_completed", {
              pResult: pReturned,
              routeid: data.routeid
            });
            console.log("EMITED:finish_route_completed");
          } catch (ex) {
            console.log("SERVER.ERROR:" + ex.message, "error");
            socket.emit("finish_route_error", { error: ex.message });
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log("FinishRoute.catch" + e.message, "error");
      socket.emit("finish_route_error", { error: e.message });
    }
  },
  InsertNewClient: function(data, socket) {
    try {
      console.log("insert_new_client.received");

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input(
          "CODE_CUSTOMER",
          pSqlInstance.VarChar(50),
          data.client.CodigoHH
        );
        request.input(
          "NAME_CUSTOMER",
          pSqlInstance.VarChar(50),
          data.client.Nombre
        );
        request.input(
          "PHONE_CUSTOMER",
          pSqlInstance.VarChar(50),
          data.client.Telefono
        );
        request.input(
          "ADDRESS_CUSTOMER",
          pSqlInstance.VarChar(255),
          data.client.Direccion
        );
        request.input(
          "CONTACT_CUSTOMER",
          pSqlInstance.VarChar(50),
          data.client.Nombre
        );
        request.input("CODE_ROUTE", pSqlInstance.VarChar(50), data.client.Ruta);
        request.input(
          "SELLER_CODE",
          pSqlInstance.VarChar(50),
          data.client.Seller_code
        );
        request.input(
          "LAST_UPDATE_BY",
          pSqlInstance.VarChar(50),
          data.client.loginid
        );
        request.input("HHID", pSqlInstance.VarChar(50), data.client.CodigoHH);
        request.output("ResultCode", pSqlInstance.VarChar(50));

        request.execute("SWIFT_SP_INSERTCUSTOMER", function(
          err,
          recordsets,
          returnValue
        ) {
          try {
            data.client.CodigoBo = request.parameters.ResultCode.value;
            console.log(
              "Insert customer result" + request.parameters.ResultCode.value,
              "info"
            );
            socket.emit("insert_new_client_completed", data);
            console.log("insert_new_client_completed");
          } catch (ex) {
            console.log("insert_new_client.fail:" + ex.message, "error");
          }

          connection.close();
          pSqlInstance.close();
        });

        var request2 = new pSqlInstance.Request(connection);
        request2.verbose = _cnnServ.GetVerbose();
        request2.stream = false;

        request2.input(
          "MONDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Monday
        );
        request2.input(
          "TUESDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Tuesday
        );
        request2.input(
          "WEDNESDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Wednesday
        );
        request2.input(
          "THURSDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Thursday
        );
        request2.input(
          "FRIDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Friday
        );
        request2.input(
          "SATURDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Saturday
        );
        request2.input(
          "SUNDAY",
          pSqlInstance.VarChar(2),
          data.client.DiasVisita.Sunday
        );
        request2.input(
          "CODE_CUSTOMER",
          pSqlInstance.VarChar(100),
          data.client.CodeCustiner
        );
        request2.input(
          "FREQUENCY_WEEKS",
          pSqlInstance.VarChar(2),
          data.client.FrequencyWeeks
        );
        //request2.input('LAST_DATE_VISITED', pSqlInstance.VarChar(50), data.loginid);

        request2.execute("SWIFT_UPDATE_FREQUENCY", function(
          err,
          recordsets,
          returnValue
        ) {
          try {
            socket.emit("update_frequency_completed", { data: data });
            console.log("update_frequency_completed");
          } catch (ex) {
            console.log("update_frequency.fail:" + ex.message, "error");
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log("insert_new_client.catch" + e.message, "error");
    }
  },
  ProcessInvoiceImage: function(data) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var pSql =
          "update SONDA_POS_INVOICE_HEADER set IMAGE_" +
          data.imgid +
          " = '" +
          data.img +
          "' WHERE INVOICE_ID = " +
          data.invoiceid;
        request.query(pSql, function(err, recordsets, returnValue) {
          connection.close();
        });
      });
    } catch (e) {
      console.log("ProcessInvoiceImage.catch" + e.message, "error");
    }
  },
  UpdateInvoiceImage: function(data) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var pSql =
          "update SONDA_POS_INVOICE_HEADER set IMAGE_" +
          data.imgid +
          " = '" +
          data.img +
          "' WHERE INVOICE_ID = " +
          data.invoiceid;
        pSql += " and CDF_SERIE='" + data.autserie + "'";
        pSql += " and CDF_RESOLUCION='" + data.autid + "'";
        request.query(pSql, function(err, recordsets, returnValue) {
          connection.close();
        });
      });
    } catch (e) {
      console.log("ProcessInvoiceImage.catch" + e.message, "error");
    }
  },
  GetBasicInvoiceInfo: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var sql =
          "SELECT * FROM SONDA_FUNC_GET_BASIC_INVOICE_INFO(" +
          data.invoiceid +
          ",'" +
          data.serial +
          "','" +
          data.terminal +
          "')";

        request.query(sql, function(err, recordset) {
          // ... error checks
          if (err) {
            console.log(
              "GetBasicInvoiceInfo.sql.err:" + JSON.stringify(err),
              "error"
            );
            socket.emit("error_message", {
              message: "get_basic_invoice_info.err: " + err
            });
          }

          if (recordset.length === 0) {
            socket.emit("error_message", {
              message: "Factura no existe " + data.invoiceid
            });
          } else {
            socket.emit("set_basic_invoice_info", { rows: recordset });
          }
        });
      });
    } catch (e) {
      console.log("GetBasicInvoiceInfo.catch" + e.message, "error");
    }
  },
  GetSalesRoutePlan: function(data, socket) {
    this.GetTasksForSalesRoutePlan(
      data,
      socket,
      function(data) {
        //success
        console.log("GetSalesRoutePlan");
      },
      function(err) {
        //fail
        console.log(
          "GetSalesRoutePlan finished with error" + err.message,
          "error"
        );
      }
    );
  },
  GetSalesInventory: function(data, socket) {
    _routeSrv.PrepareSkus(
      data,
      socket,
      function(data) {
        //success
        console.log("GetSalesInventory");
      },
      function(err) {
        //fail
        console.log(
          "GetSalesInventory finished with error" + err.message,
          "error"
        );
      }
    );
  },
  GetSalesSkus: function(data, socket) {
    _routeSrv.GetSkus(
      data,
      socket,
      function(data) {
        //success
        console.log("skus sales done");
      },
      function(err) {
        //fail
        console.log("GetSalesSkus finished with error" + err.message, "error");
      }
    );
  },
  UpdateStatusInvoice: function(data, socket) {
    try {
      console.log(
        "Actualizar estado por factura" +
          data.invoice +
          "-" +
          data.serie +
          "-" +
          data.resolution,
        "info"
      );

      //socket.emit('GetInitialRouteSend', { 'option': 'GetInitialRouteStarted', 'pROUTE_ID': data.default_warehouse });

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        //request.verbose = _cnnServ.GetVerbose();
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("INVOICE_ID", pSqlInstance.VarChar, data.invoice);
        request.input("CDF_SERIE", pSqlInstance.VarChar, data.serie);
        request.input("CDF_RESOLUCION", pSqlInstance.VarChar, data.resolution);
        request.input("STATUS", pSqlInstance.INT, data.status);
        request.input("VOID_REASON", pSqlInstance.VarChar, data.voidReason);
        request.execute("SWIFT_SP_UPDATE_STATUS_INVOICE_HEADER", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            var errno = recordsets[0][0].ERROR;
            if (errno === 0) {
              socket.emit("UpdateStatusInvoice_Request_Complete", {
                option: "requested_UpdateStatusInvoice_Complete",
                invoiceid: data.invoice,
                serie: data.serie,
                resolution: data.resolution,
                status: data.status,
                reason: data.reason,
                paidconsignment: data.paidconsignment,
                imgconsignment: data.imgconsignment
              });
              console.log("UpdateStatusInvoice_Request Complete");
            } else {
              socket.emit("UpdateStatusInvoice_Request_Fail", {
                error: recordsets[0][0].ERRMESSAGE,
                option: "requested_UpdateStatusInvoice_Complete",
                invoiceid: data.invoice,
                serie: data.serie,
                resolution: data.resolution,
                status: data.status,
                reason: data.reason,
                paidconsignment: data.paidconsignment,
                imgconsignment: data.imgconsignment
              });
              console.log(
                "UpdateStatusInvoice_Request Fail " +
                  recordsets[0][0].ERRMESSAGE,
                "error"
              );
            }
          } else {
            //socket.emit("UpdateStatusInvoice_Request" , { 'option': 'error_UpdateStatusInvoice', 'error': err.message });
            console.log(
              "UpdateStatusInvoice_Request Fail" + err.message,
              "error"
            );
          }
        });
      });
    } catch (e) {
      console.log(
        "Error al actualizar el estado de la factura" + e.message,
        "error"
      );
    }
  },

  AddInventoryByVoidInvoice: function(data, socket) {
    try {
      console.log(
        "Actualizar inventario por fatrura" +
          data.default_warehouse +
          "-" +
          data.qty,
        "info"
      );

      //socket.emit('GetInitialRouteSend', { 'option': 'GetInitialRouteStarted', 'pROUTE_ID': data.default_warehouse });

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        //request.verbose = _cnnServ.GetVerbose();
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input(
          "WAREHOUSE",
          pSqlInstance.VarChar,
          data.default_warehouse
        );
        request.input("LOCATION", pSqlInstance.VarChar, data.default_warehouse);
        request.input("SKU", pSqlInstance.VarChar, data.sku);
        request.input("QTY", pSqlInstance.INT, data.qty);
        request.input("SERIAL_NUMBER", pSqlInstance.VarChar, data.serie);

        request.execute("SWIFT_SP_INVENTORY_QTY_UPDATE_BY_INVOICE", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            //socket.emit("AddInventoryByVoidInvoice_Request" , { 'option': 'requested_AddInventoryByVoidInvoice__Request' });
            console.log("AddInventoryByVoidInvoice_Request Complete");
          } else {
            //socket.emit("AddInventoryByVoidInvoice_Request" , { 'option': 'error_AddInventoryByVoidInvoice', 'error': err.message });
            console.log(
              "AddInventoryByVoidInvoice_Request Fail" + err.message,
              "error"
            );
          }
        });
      });
    } catch (e) {
      console.log(
        "Error al actualizar el inventario por factura " + e.message,
        "error"
      );
    }
  },
  SendResolution: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var pSql =
          "UPDATE SONDA_POS_RES_SAT set AUTH_CURRENT_DOC = " +
          data.InvoiceId +
          " WHERE AUTH_ID = '" +
          data.AuthId +
          "' AND AUTH_SERIE = '" +
          data.AuthSerial +
          "' AND AUTH_STATUS = '1'";

        request.query(pSql, function(err, recordsets, returnValue) {
          if (err === undefined) {
            if (data.request === "CloseBox") {
              var requestSeActiveRoute = new pSqlInstance.Request(connection);
              requestSeActiveRoute.verbose = true;
              requestSeActiveRoute.stream = false;

              requestSeActiveRoute.input(
                "LOGIN",
                pSqlInstance.VarChar,
                data.loginid
              );
              requestSeActiveRoute.input(
                "DEVICE_ID",
                pSqlInstance.VarChar,
                data.deviceId
              );

              requestSeActiveRoute.execute("SONDA_SP_CLOSE_BOX", function(
                errSeActiveRoute,
                recordsetsSeActiveRoute,
                returnValueSeActiveRoute
              ) {
                if (errSeActiveRoute === undefined) {
                  socket.emit("SendResolution_Request", {
                    option: "success",
                    request: data.request
                  });
                  console.log("SendResolution_Request Complete");
                } else {
                  socket.emit("SendResolution_Request", {
                    option: "fail",
                    request: data.request,
                    error: errSeActiveRoute
                  });
                  console.log(
                    "SendResolution Fail al marcar la ruta como inactiva" +
                      errSeActiveRoute.message,
                    "error"
                  );
                }
              });
            } else {
              socket.emit("SendResolution_Request", {
                option: "success",
                request: data.request
              });
              console.log("SendResolution_Request Complete");
            }
          } else {
            socket.emit("SendResolution_Request", {
              option: "fail",
              request: data.request,
              error: err
            });
            console.log("SendResolution Fail" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("SendResolution_Request", {
        option: "fail",
        request: data.request,
        error: e
      });
      console.log("Error al actualizar la resolucion " + e.message, "error");
    }
  },
  InsertRouteReturnHeader: function(data, socket, callback) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("USER_LOGIN", pSqlInstance.VarChar, data.loginid);
        request.input(
          "WAREHOUSE_SOURCE",
          pSqlInstance.VarChar,
          data.codeWarehouse
        );
        request.input(
          "WAREHOUSE_TARGET",
          pSqlInstance.VarChar,
          data.codeWarehouseReturn
        );
        request.input("STATUS_DOC", pSqlInstance.VarChar, data.status);

        request.execute("SONDA_SP_INSERT_RETURN_RECEPTION_HEADER", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();
          if (err === undefined) {
            data.DocEntry = recordsets[0][0].ID;

            GetWarehouseErpByWarehouse(
              data,
              data.codeWarehouse,
              function(data, erpCodeWareHouse) {
                data.FromWarehouse = erpCodeWareHouse;
                GetWarehouseErpByWarehouse(
                  data,
                  data.codeWarehouseReturn,
                  function(data, erpCodeWareHouse) {
                    data.CardCode = erpCodeWareHouse;
                    callback(data);
                    console.log(
                      "SendReturnSku_InsertRouteReturnHeader_Request Complete"
                    );
                  },
                  function(err) {
                    socket.emit("SendReturnSku_Request", {
                      option: "SendRouteReturn_Error",
                      error: err.message
                    });
                    console.log(
                      "SendReturnSku_InsertRouteReturnHeader_Error-" +
                        err.message,
                      "error"
                    );
                  }
                );
              },
              function(err) {
                socket.emit("SendReturnSku_Request", {
                  option: "SendRouteReturn_Error",
                  error: err.message
                });
                console.log(
                  "SendReturnSku_InsertRouteReturnHeader_Error-" + err.message,
                  "error"
                );
              }
            );
          } else {
            socket.emit("SendReturnSku_Request", {
              option: "SendRouteReturn_Error",
              error: err.message
            });
            console.log(
              "SendReturnSku_InsertRouteReturnHeader_Error-" + err.message,
              "error"
            );
          }
        });
      });
    } catch (e) {
      socket.emit("SendReturnSku_Request", {
        option: "SendRouteReturn_Error",
        error: GetErrorMessage(e)
      });
      console.log(
        "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
          GetErrorMessage(e),
        "error"
      );
    }
  },

  TravelListSkuReturn: function(data, socket, callback) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var latest = 0;
        for (var i = 0; i < data.Detalle.length; i++) {
          var sku = data.Detalle[i];
          if (i === data.Detalle.length - 1) {
            latest = 1;
          }
          InsertRouteReturnDetail(
            data.DocEntry,
            sku,
            latest,
            connection,
            pSqlInstance,
            function(latestR) {
              if (latestR === 1) {
                connection.close();
                pSqlInstance.close();
                //---
                data.status = "COMPLETE";
                callback(data);
              }
            },
            function(err) {
              socket.emit("SendReturnSku_Request", {
                option: "SendRouteReturn_Error",
                error: GetErrorMessage(err)
              });
              console.log(
                "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
                  GetErrorMessage(err),
                "error"
              );
            }
          );
        }
      });
    } catch (e) {
      socket.emit("SendReturnSku_Request", {
        option: "SendRouteReturn_Error",
        error: GetErrorMessage(e)
      });
      console.log(
        "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
          GetErrorMessage(e),
        "error"
      );
    }
  },

  UpdateStatusRouteReturn: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("IDENTITY_HEADER", pSqlInstance.VarChar, data.DocEntry);
        request.input("STATUS", pSqlInstance.VarChar, data.status);

        request.execute("SONDA_SP_UPDATE_STATUS_ROUTE_RETURN", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();
          if (err === undefined) {
            socket.emit("SendReturnSku_Request", {
              option: "SendRouteReturn_Complete",
              data: data
            });
            console.log(
              "SendReturnSku_Request Complete -" + data.status,
              "info"
            );
            //--
            socket.broadcast.emit("NewDocRouteReturn", { doc: data });
            console.log(
              "SendReturnSku_Interface Complete -" + data.DocEntry,
              "info"
            );
          } else {
            socket.emit("SendReturnSku_Request", {
              option: "SendRouteReturn_Error",
              error: GetErrorMessage(err)
            });
            console.log(
              "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
                GetErrorMessage(err),
              "error"
            );
          }
        });
      });
    } catch (e) {
      socket.emit("SendReturnSku_Request", {
        option: "SendRouteReturn_Error",
        error: GetErrorMessage(e)
      });
      console.log(
        "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
          GetErrorMessage(e),
        "error"
      );
    }
  },

  ValidateRouteReturn: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input(
          "IDENTITY_HEADER",
          pSqlInstance.VarChar,
          data.idRouteReturnHeader
        );
        //request.input('STATUS', pSqlInstance.VarChar, data.status);

        request.execute("SONDA_SP_VALIDATE_STATUS_ROUTE_RETURN", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();

          if (err === undefined) {
            if (recordsets[0][0].STATE === 1) {
              socket.emit("ValidateRouteReturn_Request", {
                option: "ValidateRouteReturn_Complet"
              });
              console.log("ValidateRouteReturn_Request Complete");
            } else {
              socket.emit("ValidateRouteReturn_Request", {
                option: "ValidateRouteReturn_Incomplete"
              });
              console.log("ValidateRouteReturn_Request Incomplete", "warn");
            }
          } else {
            socket.emit("ValidateRouteReturn_Request", {
              option: "ValidateRouteReturn_Error",
              error: err.message
            });
            console.log("ValidateRouteReturn_Error-" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("ValidateRouteReturn_Request", {
        option: "ValidateRouteReturn_Error",
        error: GetErrorMessage(err)
      });
      console.log(
        "ValidateRouteReturn_Error catch: " + GetErrorMessage(e),
        "error"
      );
    }
  },

  GetDocRouteReturn: function(data, socket, callback) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input(
          "ID_RETURN_HEADER",
          pSqlInstance.VarChar,
          data.idSolicitud
        );

        request.execute("SONDA_SP_GET_RETURN_RECEPCION_HEADER", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();

          if (err === undefined) {
            if (recordsets[0][0] !== undefined) {
              var docRouteReturn = {
                FromWarehouse: recordsets[0][0].WAREHOUSE_SOURCE,
                loginid: recordsets[0][0].USER_LOGIN,
                Detalle: Array(),
                CardCode: recordsets[0][0].WAREHOUSE_TARGET,
                status: recordsets[0][0].STATUS_DOC,
                DocEntry: recordsets[0][0].ID_DOC_RETURN_HEADER,
                dbuser: data.dbuser,
                dbuserpass: data.dbuserpass,
                CrearDocEntradaErp: "",
                MarcarEntradaErp: ""
              };
              if (data.CrearDocEntradaErp === undefined) {
                docRouteReturn.CrearDocEntradaErp = data.CrearDocEntradaErp;
                docRouteReturn.MarcarEntradaErp = data.MarcarEntradaErp;
              }

              GetWarehouseErpByWarehouse(
                data,
                docRouteReturn.FromWarehouse,
                function(data, erpCodeWareHouse) {
                  docRouteReturn.FromWarehouse = erpCodeWareHouse;
                  GetWarehouseErpByWarehouse(
                    data,
                    docRouteReturn.CardCode,
                    function(data, erpCodeWareHouse) {
                      docRouteReturn.CardCode = erpCodeWareHouse;
                      callback(docRouteReturn);
                      console.log("GetDocRouteReturnHeader_Request Complete");
                      callback(docRouteReturn);
                    },
                    function(err) {
                      console.log(
                        "SendReturnSku_InsertRouteReturnHeader_Error-" +
                          err.message,
                        "error"
                      );
                    }
                  );
                },
                function(err) {
                  console.log(
                    "SendReturnSku_InsertRouteReturnHeader_Error-" +
                      err.message,
                    "error"
                  );
                }
              );
            }
          } else {
            socket.emit("GetDocRouteReturn_Request", {
              option: "GetDocRouteReturn_Error",
              error: err.message
            });
            console.log("GetDocRouteReturn_Error-" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("ValidateRouteReturn_Request", {
        option: "GetDocRouteReturn_Error",
        error: GetErrorMessage(err)
      });
      console.log(
        "ValidateRouteReturn_Error catch: " + GetErrorMessage(e),
        "error"
      );
    }
  },

  GetDocRouteReturnDetails: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("ID_RETURN_HEADER", pSqlInstance.VarChar, data.DocEntry);

        request.execute("SONDA_SP_GET_RETURN_RECEPCION_DETAIL", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();

          if (err === undefined) {
            if (recordsets[0][0] !== undefined) {
              for (var i = 0; i < recordsets[0].length; i++) {
                var sku = {
                  ItemCode: recordsets[0][i].CODE_SKU,
                  ItemDescription: recordsets[0][i].DESCRIPTION_SKU,
                  Quantity: recordsets[0][i].QTY
                };
                data.Detalle.push(sku);
              }
              if (data.MarcarEntradaErp === "") {
                socket.emit("GetDocRouteReturn_Request", {
                  option: "GetDocRouteReturn_Complete",
                  doc: data
                });
              } else {
                socket.emit("GetDocRouteReturn_Request", {
                  option: "GetDocRouteReturn_Complete_Process",
                  doc: data
                });
              }
              console.log(
                "GetDocRouteReturnDetails Complete-" + JSON.stringify(data),
                "info"
              );
            }
          } else {
            socket.emit("GetDocRouteReturn_Request", {
              option: "GetDocRouteReturn_Error",
              error: err.message
            });
            console.log("GetDocRouteReturn_Error-" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("GetDocRouteReturn_Request", {
        option: "GetDocRouteReturn_Error",
        error: GetErrorMessage(err)
      });
      console.log(
        "GetDocRouteReturnDetails_Error catch: " + GetErrorMessage(e),
        "error"
      );
    }
  },

  GetCredentials: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("USER", pSqlInstance.VarChar, data.userLogin);
        request.input("PASSWORD", pSqlInstance.VarChar, data.passwordLogin);
        request.input("IPADDRESS", pSqlInstance.VarChar, data.DocEntry);

        request.execute("SWIFT_LOGIN", function(err, recordsets, returnValue) {
          connection.close();
          pSqlInstance.close();

          if (err === undefined) {
            if (recordsets[0][0] !== undefined) {
              var credentials = {
                DBUser: recordsets[0][0].DB_USER,
                DbUserPass: recordsets[0][0].DB_USER_PASS
              };
              socket.emit("GetCredentials_Request", {
                option: "GetCredentials_Complete",
                credentials: credentials
              });
              console.log(
                "GetCredentials Complete-" + JSON.stringify(data),
                "info"
              );
            }
          } else {
            socket.emit("GetCredentials_Request", {
              option: "GetCredentials_Error",
              error: err.message
            });
            console.log("GetCredentials_Error-" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("GetCredentials_Request", {
        option: "GetCredentials_Error",
        error: GetErrorMessage(err)
      });
      console.log("GetCredentials_Error catch: " + GetErrorMessage(e), "error");
    }
  },

  UpdateErpRouteReturn: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("ID_HEADER", pSqlInstance.VarChar, data.docId);

        if (
          data.codeError != undefined &&
          data.codeError != null &&
          data.codeError !== "null"
        ) {
          request.input(
            "ATTEMPTED_WITH_ERROR",
            pSqlInstance.VarChar,
            data.codeError
          );
        }

        request.input("POSTED_RESPONSE", pSqlInstance.VarChar, data.mensaje);

        request.input(
          "ERP_REFERENCE",
          pSqlInstance.VarChar,
          data.referenciaErp
        );

        request.execute("SONDA_SP_UPDATE_DOC_ROUTE_RETURN_HEADER", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();
          if (err === undefined) {
            socket.emit("UpdateErpRouteReturn_Request", {
              option: "UpdateErpRouteReturn_Complete",
              data: data
            });
            console.log(
              "UpdateErpRouteReturn_Request Complete -" + data.status,
              "info"
            );

            //socket.broadcast.emit('NewDocRouteReturn', { "doc": data });
            console.log(
              "UpdateErpRouteReturn_Request Complete -" + data.DocEntry,
              "info"
            );
          } else {
            socket.emit("UpdateErpRouteReturn_Request", {
              option: "UpdateErpRouteReturn_Error",
              error: GetErrorMessage(err)
            });
            console.log(
              "UpdateErpRouteReturn_Request_Error catch: " +
                GetErrorMessage(err),
              "error"
            );
          }
        });
      });
    } catch (e) {
      socket.emit("SendReturnSku_Request", {
        option: "UpdateErpRouteReturn_Error",
        error: GetErrorMessage(e)
      });
      console.log(
        "SendReturnSku_InsertRouteReturnHeader_Error catch: " +
          GetErrorMessage(e),
        "error"
      );
    }
  },
  GetPriceLists: function(data, socket) {
    try {
      var process = [
        {
          exec: this.GetPriceListBySkuForRoute,
          name: "GetPriceListBySkuForRoute"
        },
        { exec: _routeSrv.GetDefaultPriceList, name: "GetDefaultPriceList" },
        { exec: _routeSrv.GetRules, name: "GetRules" },
        {
          exec: _routeSrv.GetConsignmentsByRoute,
          name: "GetConsignmentsByRoute"
        },
        {
          exec: _routeSrv.GetConsignmentsDetailsByRoute,
          name: "GetConsignmentsDetailsByRoute"
        },
        { exec: _routeSrv.GetParameters, name: "GetParameters" },
        { exec: _routeSrv.GetDocumentSequence, name: "GetDocumentSequence" },
        { exec: _routeSrv.GetNoInvoiceReasons, name: "GetNoInvoiceReasons" },
        {
          exec: _routeSrv.GetReasonsForVoidConsignment,
          name: "GetReasonsForVoidConsignment"
        },
        { exec: _routeSrv.GetSeries, name: "GetSeries" },
        { exec: _routeSrv.GetBusinessRival, name: "GetBusinessRival" },
        {
          exec: _routeSrv.GetBusinessRivalComment,
          name: "GetBusinessRivalComment"
        },
        { exec: _routeSrv.GetDefaultCurrency, name: "GetDefaultCurrency" },
        { exec: _routeSrv.GetTagsByType, name: "GetTagsByType" },
        { exec: _routeSrv.GetInvoiceParameter, name: "GetInvoiceParameter" },
        { exec: _routeSrv.GetDeliveryParameter, name: "GetDeliveryParameter" },
        {
          exec: _routeSrv.GetTaxInformationForSkus,
          name: "GetTaxInformationForSkus"
        },
        { exec: _routeSrv.GetCalculationRules, name: "GetCalculationRules" },
        {
          exec: _routeSrv.GetNotDeliveryReasons,
          name: "GetNotDeliveryReasons"
        },
        {
          exec: this.GetOverdueInvoiceOfCustomer,
          name: "GetOverdueInvoiceOfCustomer"
        },
        {
          exec: this.GetCustomerAccountingInformation,
          name: "GetCustomerAccountingInformation"
        },
        { exec: _routeSrv.GetPackUnit, name: "GetPackUnit" },
        {
          exec: this.GetPackConversionForRoute,
          name: "GetPackConversionForRoute"
        },
        {
          exec: _routeSrv.GetSaleStatisticBySeller,
          name: "GetSaleStatisticBySeller"
        },
        {
          exec: this.GetSaleStatisticByCustomer,
          name: "GetSaleStatisticByCustomer"
        }
      ];
      ExecuteProcess(
        process,
        0,
        data,
        socket,
        undefined,
        function(res) {
          console.log("GetInitialRouteComplete");
          socket.emit("GetInitialRouteSend", {
            option: "GetInitialRouteComplete"
          });
        },
        function(err) {
          _routeSrv.SendError(err.Message, socket);
          console.log(err.Message);
        }
      );
    } catch (e) {
      console.log(
        "Error al obtener las Listas de Precios: " + e.message,
        "error"
      );
    }
  },
  ChangeStatusConsignment: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.XML, infoXml);

        request.execute("SWIFT_SP_UPDATE_CONSIGNMENT_STATUS_BY_XML", function(
          err,
          recordsets,
          returnValue
        ) {
          connection.close();
          pSqlInstance.close();
          if (err) {
            socket.emit("SendConsignmentPaidResponse", {
              option: "fail",
              error: err.message,
              data: data
            });
          } else {
            if (recordsets[0].length > 0) {
              if (recordsets[0][0].RESULTADO == -1) {
                socket.emit("SendConsignmentPaidResponse", {
                  option: "fail",
                  error: recordsets[0][0].Mensaje,
                  data: data
                });
              } else {
                socket.emit("SendConsignmentPaidResponse", {
                  option: "completed",
                  consignaciones: recordsets[0] ? recordsets[0] : []
                });
              }
            } else {
              socket.emit("SendConsignmentPaidResponse", {
                option: "fail",
                error: "Procedimiento no devolvio registros",
                data: data
              });
            }
          }
        });
      });
    } catch (e) {
      console.log(
        "La Consignacion: " +
          data.consignment.ConsignmentId +
          " no pudo ser actualizada debido a: " +
          e.message,
        "error"
      );
      socket.emit("SendConsignmentPaidResponse", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  InsertDevolutionInventoryDocuments: function(data, socket) {
    try {
      var verificarSiElProcesoFueExitoso = function(resultadoOperacion) {
        // ReSharper disable once CoercedEqualsUsing
        return resultadoOperacion == 1;
      };

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute("SONDA_SP_INSERT_DEVOLUTION_INVENTORY_BY_XML", function(
          errorExec
        ) {
          if (errorExec) {
            socket.emit("SendDevolutionInventoryDocumentsResponse", {
              option: "fail",
              error: errorExec.message,
              data: data
            });
          }
        });

        request.on("row", function(row) {
          if (verificarSiElProcesoFueExitoso(row.Resultado)) {
            socket.emit("SendDevolutionInventoryDocumentsResponse", {
              option: "insertHeaderComplete",
              ID: row.DbData,
              documento: data.documentoDeDevolucion,
              documentoYaEsistiaEnServidor: row.DocumentoYaExistiaEnServidor
            });
          } else {
            socket.emit("SendDevolutionInventoryDocumentsResponse", {
              option: "fail",
              error: row.Mensaje,
              data: data
            });
          }
        });

        request.on("done", function() {
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log(
        "La devolucion no pudo ser insertada debido a: " + e.message,
        "error"
      );
      socket.emit("SendDevolutionInventoryDocumentsResponse", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  InsertTraceabilityConsignment: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        var documento = data.documentoDeTrazabilidad;

        request.input(
          "CONSIGNMENT_ID",
          pSqlInstance.INT,
          documento.CONSIGNMENT_ID
        );
        request.input(
          "DOC_SERIE",
          pSqlInstance.VarChar,
          documento.DOC_SERIE_SOURCE
        );
        request.input("DOC_NUM", pSqlInstance.INT, documento.DOC_NUM_SOURCE);
        request.input("CODE_SKU", pSqlInstance.VarChar, documento.SKU);
        request.input("QTY_SKU", pSqlInstance.INT, documento.QTY);
        request.input("ACTION", pSqlInstance.VarChar, documento.ACTION);
        request.input(
          "DOC_SERIE_TARGET",
          pSqlInstance.VarChar,
          documento.DOC_SERIE_TARGET
        );
        request.input(
          "DOC_NUM_TARGET",
          pSqlInstance.INT,
          documento.DOC_NUM_TARGET
        );
        request.input(
          "DATE_TRANSACTION",
          pSqlInstance.VarChar,
          documento.DATE_TRANSACTION
        );
        request.input("POSTED_BY", pSqlInstance.VarChar, data.routeid);
        request.input(
          "SERIAL_NUMBER",
          pSqlInstance.VarChar,
          documento.SERIAL_NUMBER
        );
        request.input(
          "HANDLE_SERIAL",
          pSqlInstance.INT,
          documento.HANDLE_SERIAL
        );

        request.execute("[SONDA_SP_INSERT_TRACEABILITY_CONSIGMENT]", function(
          err2,
          recordsets,
          returnValue
        ) {
          if (err2 === undefined) {
            console.log("El Registro de Trazabilidad Agregado Exitosamente...");
            socket.emit("InsertTraceabilityConsignmentsResponse", {
              option: "success",
              data: data,
              documento: documento
            });
          } else {
            console.log(
              "El Registro de Trazabilidad no pudo ser insertado debido a: " +
                JSON.stringify(err),
              "error"
            );
            socket.emit("InsertTraceabilityConsignmentsResponse", {
              option: "fail",
              error: err2,
              data: data
            });
          }
        });
      });
    } catch (e) {
      console.log(
        "El Registro de Trazabilidad no pudo ser insertado debido a: " +
          e.message,
        "error"
      );
      socket.emit("InsertTraceabilityConsignmentsResponse", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  UpdateTaskPos: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute("SWIFT_SP_UPDATE_TASKS_BY_XML", function(
          errorExec,
          recordsets
        ) {
          connection.close();
          pSqlInstance.close();

          if (errorExec) {
            socket.emit("SendTaskResponse", {
              option: "fail",
              error: errorExec
            });
          } else {
            socket.emit("SendTaskResponse", {
              option: "success",
              tareas: recordsets[0] ? recordsets[0] : []
            });
          }
        });
      });
    } catch (e) {
      console.log(
        "Las Tareas no pudieron ser actualizadas debido a: " + e.message,
        "error"
      );
      socket.emit("SendTaskResponse", { option: "fail", error: e.message });
    }
  },
  UpdateConsignmentToVoid: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        var documento = data.consignacion;

        request.input("DOC_SERIE", pSqlInstance.VarChar, documento.DocSerie);
        request.input("DOC_NUM", pSqlInstance.INT, documento.DocNum);
        request.input("REASON", pSqlInstance.VarChar, documento.Reason);
        request.input(
          "DEFAULT_WAREHOUSE",
          pSqlInstance.VarChar,
          data.default_warehouse
        );

        request.execute("[SWIFT_SP_VOID_CONSIGNMENT]", function(
          err2,
          recordsets,
          returnValue
        ) {
          if (err2 === undefined) {
            console.log(
              "La Consignación " +
                documento.ConsignmentId +
                " ha sido actualizada  Exitosamente...",
              "info"
            );
            socket.emit("SendConsignmentVoidResponse", {
              option: "success",
              data: data,
              consignacion: documento
            });
          } else {
            console.log(
              "La Consignación " +
                documento.ConsignmentId +
                " no pudo ser actualizada debido a: " +
                err2,
              "error"
            );
            socket.emit("SendConsignmentVoidResponse", {
              option: "fail",
              error: err2,
              data: data
            });
          }
        });
      });
    } catch (e) {
      console.log(
        "La Consignación no pudo ser actualizada debido a: " + e.message,
        "error"
      );
      socket.emit("SendConsignmentVoidResponse", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  SendBusinessRivalPoll: function(data, socket) {
    try {
      socket.emit("SendBusinessRivalPoll_Request", {
        option: "receive",
        data: data.encuesta
      });

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input(
          "INVOICE_RESOLUTION",
          pSqlInstance.VarChar,
          data.encuesta.invoiceResolution
        );
        request.input(
          "INVOICE_SERIE",
          pSqlInstance.VarChar,
          data.encuesta.invoiceSerie
        );
        request.input(
          "INVOICE_NUM",
          pSqlInstance.Int,
          data.encuesta.invoiceNum
        );
        request.input(
          "CODE_CUSTOMER",
          pSqlInstance.VarChar,
          data.encuesta.codeCustomer
        );
        request.input(
          "BUSSINESS_RIVAL_NAME",
          pSqlInstance.VarChar,
          data.encuesta.bussinessRivalName
        );
        request.input(
          "BUSSINESS_RIVAL_TOTAL_AMOUNT",
          pSqlInstance.FLOAT,
          data.encuesta.bussinessRivalTotalAmount
        );
        request.input(
          "CUSTOMER_TOTAL_AMOUNT",
          pSqlInstance.FLOAT,
          data.encuesta.customerTotalAmount
        );
        request.input("COMMENT", pSqlInstance.VarChar, data.encuesta.comment);
        request.input(
          "CODE_ROUTE",
          pSqlInstance.VarChar,
          data.encuesta.codeRoute
        );
        request.input(
          "POSTED_DATETIME",
          pSqlInstance.VarChar,
          data.encuesta.postedDatetime
        );

        request.execute("SONDA_SP_ADD_BUSINESS_RIVAL_POLL", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            socket.emit("SendBusinessRivalPoll_Request", {
              option: "success",
              data: data.encuesta
            });
            console.log("SendBusinessRivalPoll_Request success");
          } else {
            socket.emit("SendBusinessRivalPoll_Request", {
              option: "fail",
              message: err.message,
              data: data.encuesta
            });
            console.log("SendBusinessRivalPoll Fail" + err.message, "error");
          }
        });
      });
    } catch (e) {
      socket.emit("SendBusinessRivalPoll_Request", {
        option: "fail",
        message: e.message,
        data: data
      });
      console.log(
        "Error al enviar la encuesta de compra de competencia " + e.message,
        "error"
      );
    }
  },
  SendAcceptedTransfer: function(data, socket) {
    try {
      InsertPosSkusOutsideRoute(data, socket, function(
        parameter,
        socketEmit,
        listaSkus,
        listasConversiones,
        connection,
        pSqlInstance
      ) {
        //
        //var connection = _cnnServ.ConnectDb(parameter, function (err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);

        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_ROUTE", pSqlInstance.VarChar, parameter.routeid);
        request.input("IS_ONLINE", pSqlInstance.Int, 1);
        request.input("TRANSFER_ID", pSqlInstance.Int, parameter.transferId);

        request.execute("SONDA_SP_TRANSFER_SKU_FOR_POS", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            if (recordsets[0][0].RESULT === "Exito") {
              socketEmit.emit(
                "SendAcceptedTransfer_Request" + parameter.Source,
                {
                  option: "success",
                  data: parameter,
                  skus: listaSkus,
                  conversiones: listasConversiones
                }
              );
              console.log(
                "SendAcceptedTransfer_Request" + parameter.Source + " success",
                "info"
              );
            } else {
              socketEmit.emit(
                "SendAcceptedTransfer_Request" + parameter.Source,
                {
                  option: "fail",
                  data: parameter,
                  message: recordsets[0][0].RESULT
                }
              );
              console.log(
                "SendAcceptedTransfer_Request" + parameter.Source + " fail",
                "error"
              );
            }
          } else {
            console.log(
              "SendAcceptedTransfer_Request" +
                parameter.Source +
                " fail en BDD: " +
                err.message,
              "error"
            );
            socketEmit.emit("SendAcceptedTransfer_Request" + parameter.Source, {
              option: "fail",
              data: parameter,
              message: err.Message
            });
            connection.close();
            pSqlInstance.close();
          }
        });
        //});

        //
      });
    } catch (err) {
      console.log(
        "SendAcceptedTransfer_fail en catch: " + err.Message,
        "error"
      );
      socket.emit("SendAcceptedTransfer_Request", {
        option: "fail",
        data: data,
        message: err.Message
      });
    }
  },
  GetClientsForTaskOutsideTheRoutePlan: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
        request.input("FILTER", pSqlInstance.VarChar, data.filter);

        request.execute("SONDA_SP_GET_CUSTOMERS_OUT_OF_ROUTE_PLAN", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            if (recordsets[0][0] !== undefined) {
              var clientes = [];
              for (var i = 0; i < recordsets[0].length; i++) {
                var cliente = {
                  CODE_CUSTOMER: recordsets[0][i].CODE_CUSTOMER,
                  NAME_CUSTOMER: recordsets[0][i].NAME_CUSTOMER,
                  PHONE_CUSTOMER: recordsets[0][i].PHONE_CUSTOMER,
                  ADRESS_CUSTOMER: recordsets[0][i].ADRESS_CUSTOMER,
                  CONTACT_CUSTOMER: recordsets[0][i].CONTACT_CUSTOMER,
                  NIT: recordsets[0][i].NIT,
                  RGA_CODE: recordsets[0][i].RGA_CODE
                };
                clientes.push(cliente);
              }

              socket.emit("GetClientsForTaskOutsideTheRoutePlan_Response", {
                option: "GetClientsForTaskOutsideTheRoutePlan_Response",
                clientes: clientes
              });
              console.log(
                "GetClientsForTaskOutsideTheRoutePlan Complete-" +
                  JSON.stringify(data),
                "info"
              );
            } else {
              var vacio = [];
              socket.emit("GetClientsForTaskOutsideTheRoutePlan_Response", {
                option: "GetClientsForTaskOutsideTheRoutePlan_Response",
                clientes: vacio
              });
              console.log(
                "GetClientsForTaskOutsideTheRoutePlan Complete-" + data,
                "info"
              );
            }
          } else {
            socket.emit("GetClientsForTaskOutsideTheRoutePlan_Response", {
              option: "GetClientsForTaskOutsideTheRoutePlan_Error",
              error: err.message
            });
            console.log(
              "GetClientsForTaskOutsideTheRoutePlan_Error-" + err.message,
              "error"
            );
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (err) {
      console.log(
        "GetClientsForTaskOutsideTheRoutePlan_fail en catch: " + err.Message,
        "error"
      );
      socket.emit("GetCustomersOutsideOfRoutePlan_Response", {
        option: "fail",
        data: data,
        message: err.Message
      });
    }
  },
  CreateTaskOutsideTheRoutePlan: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(
        errInstance,
        pSqlInstance
      ) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
        request.input("CODE_CUSTOMER", pSqlInstance.VarChar, data.customer);
        request.input("TASK_TYPE", pSqlInstance.VarChar, data.type);

        request.execute("SONDA_SP_CREATE_TASK_OUTSIDE_OF_ROUTE_PLAN", function(
          err,
          recordsets
        ) {
          if (err === undefined) {
            var task,
              priceList = [],
              consignmentHeaders = [],
              consignmentDetails = [],
              overdueInvoices = [],
              accountingInformation,
              statisticByCustomer = [];

            var recordsetTask = recordsets[0][0],
              recordsetPriceList = recordsets[1],
              recordPriceList = recordsets[1][0],
              recordsetConsignmentHeaders = recordsets[2],
              recordConsignmentHeaders = recordsets[2][0],
              recordsetConsignmentDetails = recordsets[3],
              recordConsignmentDetails = recordsets[3][0],
              recordsetOverdueInvoices = recordsets[4],
              recordOverdueInvoices = recordsets[4][0],
              recordsetAccountingInformation = recordsets[5][0],
              recordsetStatisticByCustomer = recordsets[6];

            if (recordsetTask) {
              task = {
                TASK_ID: recordsetTask.TASK_ID,
                CODE_FREQUENCY: recordsetTask.CODE_FREQUENCY,
                SCHEDULE_FOR: recordsetTask.SCHEDULE_FOR,
                ASSIGNED_BY: recordsetTask.ASSIGNED_BY,
                DOC_PARENT: recordsetTask.DOC_PARENT,
                EXPECTED_GPS: recordsetTask.EXPECTED_GPS,
                TASK_COMMENTS: recordsetTask.TASK_COMMENTS,
                TASK_SEQ: recordsetTask.TASK_SEQ,
                TASK_ADDRESS: recordsetTask.TASK_ADDRESS,
                RELATED_CLIENT_PHONE_1: recordsetTask.RELATED_CLIENT_PHONE_1,
                EMAIL_TO_CONFIRM: recordsetTask.EMAIL_TO_CONFIRM,
                RELATED_CLIENT_CODE: recordsetTask.RELATED_CLIENT_CODE,
                RELATED_CLIENT_NAME: recordsetTask.RELATED_CLIENT_NAME,
                TASK_PRIORITY: recordsetTask.TASK_PRIORITY,
                TASK_STATUS: recordsetTask.TASK_STATUS,
                SYNCED: recordsetTask.SYNCED,
                NO_PICKEDUP: recordsetTask.NO_PICKEDUP,
                NO_VISIT_REASON: recordsetTask.NO_VISIT_REASON,
                IS_OFFLINE: recordsetTask.IS_OFFLINE,
                DOC_NUM: recordsetTask.DOC_NUM,
                TASK_TYPE: recordsetTask.TASK_TYPE,
                TASK_DATE: recordsetTask.TASK_DATE,
                CREATED_STAMP: recordsetTask.CREATED_STAMP,
                ASSIGEND_TO: recordsetTask.ASSIGEND_TO,
                CODE_ROUTE: recordsetTask.CODE_ROUTE,
                TARGET_DOC: recordsetTask.TARGET_DOC,
                IN_PLAN_ROUTE: recordsetTask.IN_PLAN_ROUTE,
                CREATE_BY: recordsetTask.CREATE_BY,
                NIT: recordsetTask.NIT,
                CODE_PRICE_LIST: recordsetTask.CODE_PRICE_LIST
              };
            }

            if (recordPriceList) {
              for (var k = 0; k < recordsetPriceList.length; k++) {
                var price = {
                  CODE_PRICE_LIST: recordsetPriceList[k].CODE_PRICE_LIST,
                  CODE_SKU: recordsetPriceList[k].CODE_SKU,
                  CODE_PACK_UNIT: recordsetPriceList[k].CODE_PACK_UNIT,
                  PRIORITY: recordsetPriceList[k].PRIORITY,
                  LOW_LIMIT: recordsetPriceList[k].LOW_LIMIT,
                  HIGH_LIMIT: recordsetPriceList[k].HIGH_LIMIT,
                  PRICE: recordsetPriceList[k].PRICE
                };
                priceList.push(price);
              }
            }

            if (recordConsignmentHeaders) {
              for (var l = 0; l < recordsetConsignmentHeaders.length; l++) {
                var consignment = {
                  ConsignmentId: recordsetConsignmentHeaders[l].CONSIGNMENT_ID,
                  CustomerId: recordsetConsignmentHeaders[l].CUSTOMER_ID,
                  DateCreate: recordsetConsignmentHeaders[l].DATE_CREATE,
                  DateUpdate: recordsetConsignmentHeaders[l].DATE_UPDATE,
                  Status: recordsetConsignmentHeaders[l].STATUS,
                  PostedBy: recordsetConsignmentHeaders[l].POSTED_BY,
                  IsPosted: recordsetConsignmentHeaders[l].IS_POSTED,
                  Pos_terminal: recordsetConsignmentHeaders[l].POS_TERMINAL,
                  Gps: recordsetConsignmentHeaders[l].GPS_URL,
                  DocDate: recordsetConsignmentHeaders[l].DOC_DATE,
                  ClosedRouteDateTime:
                    recordsetConsignmentHeaders[l].CLOSED_ROUTE_DATETIME,
                  IsActiveRoute: recordsetConsignmentHeaders[l].IS_ACTIVE_ROUTE,
                  DueDate: recordsetConsignmentHeaders[l].DUE_DATE,
                  TotalAmount: recordsetConsignmentHeaders[l].TOTAL_AMOUNT,
                  DocSerie: recordsetConsignmentHeaders[l].DOC_SERIE,
                  DocNum: recordsetConsignmentHeaders[l].DOC_NUM,
                  Image: recordsetConsignmentHeaders[l].IMG,
                  IsClosed: recordsetConsignmentHeaders[l].IS_CLOSED,
                  IsReconsign: recordsetConsignmentHeaders[l].IS_RECONSIGN,
                  REASON: recordsetConsignmentHeaders[l].REASON,
                  InRoute: recordsetConsignmentHeaders[l].IN_ROUTE
                };
                consignmentHeaders.push(consignment);
              }
            }
            if (recordConsignmentDetails) {
              for (var m = 0; m < recordsetConsignmentDetails.length; m++) {
                var detail = {
                  idConsignacion: recordsetConsignmentDetails[m].CONSIGNMENT_ID,
                  SKU: recordsetConsignmentDetails[m].SKU,
                  numeroLinea: recordsetConsignmentDetails[m].LINE_NUM,
                  QTY_CONSIGNMENT: recordsetConsignmentDetails[m].QTY,
                  PRICE: recordsetConsignmentDetails[m].PRICE,
                  DISCOUNT: recordsetConsignmentDetails[m].DISCOUNT,
                  TOTAL_LINE: recordsetConsignmentDetails[m].TOTAL_LINE,
                  POSTED_DATETIME:
                    recordsetConsignmentDetails[m].POSTED_DATETIME,
                  PAYMENT_ID: recordsetConsignmentDetails[m].PAYMENT_ID,
                  HANDLE_SERIAL: recordsetConsignmentDetails[m].HANDLE_SERIAL,
                  SERIAL_NUMBER: recordsetConsignmentDetails[m].SERIAL_NUMBER
                };
                consignmentDetails.push(detail);
              }
            }

            if (recordOverdueInvoices) {
              for (var j = 0; j < recordsetOverdueInvoices.length; j++) {
                var overdueInvoice = {
                  ID: recordsetOverdueInvoices[j].ID,
                  INVOICE_ID: recordsetOverdueInvoices[j].INVOICE_ID,
                  DOC_ENTRY: recordsetOverdueInvoices[j].DOC_ENTRY,
                  CODE_CUSTOMER: recordsetOverdueInvoices[j].CODE_CUSTOMER,
                  CREATED_DATE: recordsetOverdueInvoices[j].CREATED_DATE,
                  DUE_DATE: recordsetOverdueInvoices[j].DUE_DATE,
                  TOTAL_AMOUNT: recordsetOverdueInvoices[j].TOTAL_AMOUNT,
                  PENDING_TO_PAID: recordsetOverdueInvoices[j].PENDING_TO_PAID,
                  IS_EXPIRED: recordsetOverdueInvoices[j].IS_EXPIRED
                };
                overdueInvoices.push(overdueInvoice);
              }
            }

            if (recordsetAccountingInformation) {
              accountingInformation = recordsetAccountingInformation;
            }

            if (recordsetStatisticByCustomer) {
              for (var s = 0; s < recordsetStatisticByCustomer.length; s++) {
                var statis = {
                  ID: recordsetStatisticByCustomer[s].ID,
                  CLIENT_ID: recordsetStatisticByCustomer[s].CLIENT_ID,
                  CODE_SKU: recordsetStatisticByCustomer[s].CODE_SKU,
                  SKU_NAME: recordsetStatisticByCustomer[s].SKU_NAME,
                  QTY: recordsetStatisticByCustomer[s].QTY,
                  SALE_PACK_UNIT: recordsetStatisticByCustomer[s].SALE_PACK_UNIT
                };
                statisticByCustomer.push(statis);
              }
            }

            var taskInformation = {
              tarea: task,
              lista: priceList,
              consignaciones: consignmentHeaders,
              detalleconsignaciones: consignmentDetails,
              cliente: recordsets[0][0].RELATED_CLIENT_CODE,
              facturasVencidas: overdueInvoices,
              cuentaCorriente: accountingInformation,
              estadisticaPorCliente: statisticByCustomer
            };

            socket.emit("CreateTaskOutsideTheRoutePlan_Response", {
              option: "CreateTaskOutsideTheRoutePlan_Response",
              data: taskInformation
            });

            console.log(
              "CreateTaskOutsideTheRoutePlan Complete-" + JSON.stringify(data),
              "info"
            );
          } else {
            socket.emit("CreateTaskOutsideTheRoutePlan_Response", {
              option: "CreateTaskOutsideTheRoutePlan_Error",
              error: err.message
            });
            console.log(
              "CreateTaskOutsideTheRoutePlan_Error-" + err.message,
              "error"
            );
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log(
        "CreateTaskOutsideTheRoutePlan_fail en catch: " + e.Message,
        "error"
      );
      socket.emit("CreateTaskOutsideTheRoutePlan_Response", {
        option: "fail",
        data: data,
        message: e.Message
      });
    }
  },
  GetPosTaxParameters: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("GROUP_ID", pSqlInstance.VarChar, "POS_LABEL");

        request.execute("[SONDA_SP_GET_PARAMETER_BY_GROUP]", function(
          errReturn,
          recordsets,
          returnValue
        ) {
          if (errReturn === undefined) {
            if (recordsets[0] !== undefined) {
              socket.emit("GetPosTaxParametersResponse", {
                option: "GetPosTaxParametersFound",
                parameters: recordsets[0]
              });
              console.log(
                "GetPosTaxParameters Found " + JSON.stringify(data),
                "info"
              );
            } else {
              socket.emit("GetPosTaxParametersResponse", {
                option: "GetPosTaxParametersNotFound"
              });
              console.log("GetPosTaxParameters Not Found " + data, "info");
            }
          } else {
            socket.emit("GetPosTaxParametersResponse", {
              option: "GetPosTaxParametersFail"
            });
            console.log(
              "GetPosTaxParameters Fail" + errReturn.message,
              "error"
            );
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (err) {
      console.log(
        "GetClientsForTaskOutsideTheRoutePlan_fail en catch: " + err.Message,
        "error"
      );
      socket.emit("GetCustomersOutsideOfRoutePlan_Response", {
        option: "fail",
        data: data,
        message: err.Message
      });
    }
  },
  PostDocuments: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(
          errConnConsig,
          pSqlInstance
        ) {
          if (errConnConsig == null) {
            var request = new pSqlInstance.Request(connection);
            request.verbose = false;
            request.stream = false;
            var xml = js2xmlparser.parse("Data", data);
            var rowscount = 0;

            request.input("XML", pSqlInstance.Xml, xml);
            request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));
            request.execute("SONDA_SP_ADD_DOCUMENTS_BY_XML", function(
              err,
              recordset
            ) {
              if (err) {
                reject({ status: false, message: err.message, xml: xml });
                // socket.emit('PostDocumentsFail',  { "message": err });
                console.log("PostDocumentsFail" + err.message);
              }
              if (recordset.length === 0) {
                resolve({ status: true, data: data, message: "Empty" });
                // socket.emit('PostDocumentsFail',  { "message": "Empty" });
                // console.log("PostDocumentsFail");
              } else {
                resolve({ status: true, data: data, message: "Good" });
              }
              connection.close();
              pSqlInstance.close();
            });

            request.on("row", function(row) {
              socket.emit("PostDocumentsSuccess", {
                option: "document_posted",
                row: row
              });
              rowscount++;
            });

            request.on("done", function(returnValue) {
              socket.emit("PostDocumentsSuccess", {
                option: "done_posting",
                rowcount: rowscount
              });
              rowscount = 0;
              connection.close();
              pSqlInstance.close();
            });
          } else {
            reject({ status: false, message: errConnConsig });
            // socket.emit("PostDocumentsFail", { "message": errConnConsig });
            console.log("PostDocuments error connection: " + errConnConsig);
          }
        });
      } catch (err) {
        reject({ status: false, message: err });
        // socket.emit("PostDocumentsFail", { "message": err });
        console.log("PostDocuments catch: " + err);
      }
    });
  },
  ValidateDocuments: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        if (data.documents.length < 1 || data.documents.length === undefined) {
          resolve({ status: true, message: "Empty" });
          return;
        }

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var reenviarDoctos = Array();

          var request = new pSqlInstance.Request(connection);
          request.verbose = false;
          request.stream = true;

          var xml = js2xmlparser.parse("Data", data);
          request.input("XML", pSqlInstance.Xml, xml);
          request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));

          request.execute("SONDA_SP_VALIDATE_DOCUMENTS_IS_POSTED", function(
            err,
            recordsets,
            returnValue
          ) {
            if (err) {
              reject({ status: false, message: err.message });
              // socket.emit("ValidateDocuments_Request", { 'option': 'fail', 'message': err.message, 'data': data });
              console.log("ValidateDocuments Fail" + err.message);
            } else {
              resolve({ status: true, data: data, message: "Good" });
            }
          });

          request.on("row", function(row) {
            if (row) {
              if (row.RESULT === 0 || data.Source === "InRoute") {
                reenviarDoctos.push(row);
              }
            }
          });

          request.on("done", function() {
            if (reenviarDoctos.length === 0) {
              socket.emit("ValidateDocuments_Request" + data.Source, {
                option: "success",
                reSend: 0
              });
              console.log(
                "ValidateDocuments_Request" + data.Source + " success"
              );
            } else {
              socket.emit("ValidateDocuments_Request" + data.Source, {
                option: "fail",
                reSend: 1,
                reenviarDoctos: reenviarDoctos
              });
              console.log(
                "ValidateDocuments_Request" +
                  data.Source +
                  " fail faltan facturas por sincronizar"
              );
            }

            connection.close();
            pSqlInstance.close();
          });
        });
      } catch (e) {
        reject({ status: false, reSend: 0, message: e.message });
        // socket.emit("ValidateDocuments_Request" + data.Source, { 'option': 'fail', 'reSend': 0, 'message': e.message, 'data': data });
        console.log(
          "ValidateDocuments_Request" +
            data.Source +
            " Error al validar facturas en el servidor " +
            e.message,
          socket
        );
      }
    });
  },
  InsertScoutingFromSondaPos: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var xml = js2xmlparser.parse("Data", data);
        var dataJson = JSON.stringify(data);
        request.input("XML", pSqlInstance.Xml, xml);
        request.input("JSON", pSqlInstance.VarChar, dataJson);

        request.execute("SONDA_SP_INSERT_SCOUTING_BY_XML", function(
          errReturn,
          recordsets,
          returnValue
        ) {
          if (errReturn) {
            socket.emit("InsertScoutingFromSondaPosResponse", {
              option: "fail",
              message: errReturn.message,
              data: data
            });
            console.log(
              "Insert Scouting from Sonda Pos fail" + errReturn.message
            );
            connection.close();
            pSqlInstance.close();
          } else {
            socket.emit("InsertScoutingFromSondaPosResponse", {
              option: "success",
              clients: recordsets[0]
            });
            //console.log("Insert Scouting from Sonda Pos Success");
            console.dir(recordsets);
            connection.close();
            pSqlInstance.close();
          }
        });
      });
    } catch (e) {
      socket.emit("InsertScoutingFromSondaPosResponse", {
        option: "fail",
        message: e.message,
        data: data
      });
      console.log("Insert Scouting from Sonda Pos fail: " + e.message);
    }
  },
  ValidateScoutingFromSondaPos: function(data, socket) {
    try {
      //if (data.scouting.length < 1 || data.scouting.length === undefined) {
      //    socket.emit("ValidateScoutingsPOS_Request" + data.Source, { 'option': 'success', 'reSend': 0 });
      //    console.log("ValidateScoutingsPOS_Request" + data.Source + " success sin clientes");
      //    return;
      //}

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var reenviarScoutings = Array();

        var request = new pSqlInstance.Request(connection);
        request.verbose = false;
        request.stream = true;

        var xml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, xml);
        request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));

        request.execute("SONDA_SP_VALIDATE_SCOUTING_BY_XML", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err) {
            socket.emit("ValidateScoutingsPOS_Request", {
              option: "fail",
              message: err.message,
              data: data
            });
            console.log("ValidateScoutingsPOS Fail" + err.message);
          }
        });

        request.on("row", function(row) {
          if (row) {
            if (row.RESULT === 0 || data.Source === "InRoute") {
              reenviarScoutings.push(row);
            }
          }
        });

        request.on("done", function() {
          if (reenviarScoutings.length === 0) {
            socket.emit("ValidateScoutingsPOS_Request" + data.Source, {
              option: "success",
              reSend: 0
            });
            console.log(
              "ValidateScoutingsPOS_Request" + data.Source + " success"
            );
          } else {
            socket.emit("ValidateScoutingsPOS_Request" + data.Source, {
              option: "fail",
              reSend: 1,
              reenviarScoutings: reenviarScoutings
            });
            console.log(
              "ValidateScoutingsPOS_Request" +
                data.Source +
                " fail faltan scoutings por sincronizar"
            );
          }

          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      socket.emit("ValidateScoutingsPOS_Request" + data.Source, {
        option: "fail",
        reSend: 0,
        message: e.message,
        data: data
      });
      console.log(
        "ValidateScoutingsPOS_Request" +
          data.Source +
          " Error al validar scoutings en el servidor " +
          e.message,
        socket
      );
    }
  },
  InsertConnectionLog: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("LOGIN_USER", pSqlInstance.VarChar, data.user);
        request.input("ROUTE_USER", pSqlInstance.VarChar, data.routeId);
        request.input("DEVICE_USER", pSqlInstance.VarChar, data.deviceId);
        request.input("MESSAGE", pSqlInstance.VarChar, data.message);

        request.execute("[SONDA_SP_INSERT_LOG_CONNECTION]", function(
          errReturn,
          recordsets,
          returnValue
        ) {
          if (errReturn === undefined) {
            console.log(
              "Register connection of user: " + data.toString(),
              "info"
            );
          } else {
            console.log(
              "Register connection of user fail: " +
                (errReturn ? errReturn.toString() : "mala ejecucion"),
              "info"
            );
          }
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (err) {
      console.log("Register connection of user fail: " + err.message, "info");
    }
  },
  UpdateTelephoneNumberToInvoice: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var xml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, xml);
        request.input("JSON", pSqlInstance.VarChar, JSON.stringify(data));

        request.execute(
          "SONDA_SP_ASSOCIATE_TELEPHONE_NUMBER_TO_INVOICE_BY_XML",
          function(errReturn, recordsets, returnValue) {
            if (errReturn === undefined) {
              console.log("Update telephone number on invoice success", "info");
              connection.close();
              pSqlInstance.close();
            } else {
              console.log(
                "Update telephone number on invoice fail: " + errReturn.message,
                "info"
              );
              connection.close();
              pSqlInstance.close();
            }
          }
        );
      });
    } catch (err) {
      console.log(
        "Update telephone number on invoice fail: " + err.message,
        "info"
      );
    }
  },
  Process3PlManifestFromSondaSd: function(data, socket) {
    try {
      // ReSharper disable once InconsistentNaming
      var _this = this;
      var processes = [
        {
          exec: _this.ProcessManifestFromSondaSD,
          name: "ProcessManifestFromSondaSD"
        },
        {
          exec: _this.GetManifestHeaderForSondaSd,
          name: "GetManifestHeaderForSondaSd"
        },
        {
          exec: _this.GetManifestDetailForSondaSd,
          name: "GetManifestDetailForSondaSd"
        },
        {
          exec: _this.GetDeliveryTasksForSondaSd,
          name: "GetDeliveryTasksForSondaSd"
        },
        {
          exec: _this.GetNextPickingDemandHeaderByManifiestForSondaSd,
          name: "GetNextPickingDemandHeaderByManifiestForSondaSd"
        },
        {
          exec: _this.GetNextPickingDemandDetailByManifiestForSondaSd,
          name: "GetNextPickingDemandDetailByManifiestForSondaSd"
        },
        {
          exec: _this.GetSerialNumberByManifiestForSondaSd,
          name: "GetSerialNumberByManifiestForSondaSd"
        },
        {
          exec: _this.GetBasketsInformationByManifestForSondaSd,
          name: "GetBasketsInformationByManifestForSondaSd"
        }
      ];

      _this.ExecuteAllProcessesOfLoadManifest(
        processes,
        0,
        data,
        socket,
        function(result) {
          console.log(result.Message, "info");
          socket.emit("process_manifest_from_sonda_sd_response", {
            option: "all_processes_has_been_completed",
            manifestId: data.manifestId
          });
        },
        function(error) {
          console.dir(error);
        }
      );
    } catch (err) {
      console.log(
        "Process 3PL manifest from Sonda SD fail: " + err.message,
        "info"
      );
      socket.emit("process_manifest_from_sonda_sd_response", {
        option: "fail",
        manifestId: data.manifestId,
        message: err.message
      });
    }
  },
  ProcessManifestFromSondaSD: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var verificarSiElProcesoFueExitoso = function(resultadoOperacion) {
          return resultadoOperacion == 1;
        };

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFES_HEADER_ID",
            pSqlInstance.VarChar,
            data.manifestId
          );
          request.input("LOGIN_ID", pSqlInstance.VarChar, data.loginid);
          request.input(
            "CURRENT_GPS_USER",
            pSqlInstance.VarChar,
            data.currentGpsUser
          );

          request.execute("SONDA_SP_PROCESS_MANIFEST", function(errReturn) {
            if (errReturn) {
              socket.emit("process_manifest_from_sonda_sd_response", {
                option: "fail",
                manifestId: data.manifestId,
                message: errReturn.message
              });
              reject({
                Message: "ProcessManifestFromSondaSD " + errReturn.message,
                socket: socket,
                data: data
              });
            }
          });

          request.on("row", function(row) {
            if (verificarSiElProcesoFueExitoso(row.Resultado)) {
              socket.emit("process_manifest_from_sonda_sd_response", {
                option: "success",
                manifestId: data.manifestId
              });
            } else {
              socket.emit("process_manifest_from_sonda_sd_response", {
                option: "fail",
                manifestId: data.manifestId,
                message: row.Mensaje
              });
              reject({
                Message: "ProcessManifestFromSondaSD " + row.Mensaje,
                socket: socket,
                data: data
              });
            }
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("process_manifest_from_sonda_sd_response", {
          option: "fail",
          manifestId: data.manifestId,
          message: err.message
        });
        reject({
          Message: "Process 3PL manifest from Sonda SD fail: " + err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  GetManifestHeaderForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.VarChar,
            data.manifestId
          );

          request.execute(
            "SONDA_SP_GET_3PL_MANIFEST_HEADER_BY_MANIFEST_HEADER_ID",
            function(errReturn) {
              if (errReturn) {
                socket.emit("get_manifest_for_sonda_sd_response", {
                  option: "fail",
                  manifestId: data.manifestId,
                  message: errReturn.message
                });
                reject({
                  Message: "GetManifestHeaderForSondaSd " + errReturn.Mensaje,
                  socket: socket,
                  data: data
                });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit("get_manifest_for_sonda_sd_response", {
              option: "add_header",
              manifestHeader: row
            });
          });

          request.on("done", function() {
            socket.emit("get_manifest_for_sonda_sd_response", {
              option: "get_manifest_header_completed",
              manifestId: data.manifestId
            });
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("get_manifest_for_sonda_sd_response", {
          option: "fail",
          manifestId: data.manifestId,
          message: err.message
        });
        reject({
          Message: "Get 3PL manifest for Sonda SD fail: " + err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  GetManifestDetailForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.VarChar,
            data.manifestId
          );

          request.execute(
            "SONDA_SP_GET_3PL_MANIFEST_DETAIL_BY_MANIFEST_HEADER_ID",
            function(errReturn) {
              if (errReturn) {
                socket.emit("get_manifest_for_sonda_sd_response", {
                  option: "fail",
                  manifestId: data.manifestId,
                  message: errReturn.message
                });
                reject({
                  Message: "GetManifestDetailForSondaSd " + errReturn.Mensaje,
                  socket: socket,
                  data: data
                });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit("get_manifest_for_sonda_sd_response", {
              option: "add_detail",
              manifestDetail: row
            });
          });

          request.on("done", function() {
            socket.emit("get_manifest_for_sonda_sd_response", {
              option: "get_manifest_detail_completed",
              manifestId: data.manifestId
            });
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("get_manifest_for_sonda_sd_response", {
          option: "fail",
          manifestId: data.manifestId,
          message: err.message
        });
        reject({
          Message: "Get 3PL manifest for Sonda SD fail: " + err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  GetDeliveryTasksForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("LOGIN_ID", pSqlInstance.VarChar, data.loginid);

          request.execute("SONDA_SP_GET_DELIVERY_TASKS", function(errReturn) {
            if (errReturn) {
              socket.emit("get_delivery_tasks_for_sonda_sd_response", {
                option: "fail",
                message: errReturn.message
              });
              reject({
                Message: "GetDeliveryTasksForSondaSd " + errReturn.Mensaje,
                socket: socket,
                data: data
              });
            }
          });

          request.on("row", function(row) {
            socket.emit("get_delivery_tasks_for_sonda_sd_response", {
              option: "add_deliver_task",
              row: row
            });
          });

          request.on("done", function() {
            socket.emit("get_delivery_tasks_for_sonda_sd_response", {
              option: "get_delivery_tasks_completed"
            });
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("get_delivery_tasks_for_sonda_sd_response", {
          option: "fail",
          message: err.message
        });
        reject({
          Message: "Get delivery tasks for Sonda SD fail: " + err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  ChangeManifestStatusFromSondaSd: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("MANIFEST_HEADER_ID", pSqlInstance.INT, data.manifestId);
        request.input("STATUS", pSqlInstance.VarChar, data.manifestStatus);

        request.execute("SWIFT_SP_CHANGE_STATUS_OF_3PL_MANIFEST", function(
          errReturn
        ) {
          if (errReturn) {
            socket.emit("change_manifest_status_from_sonda_sd_response", {
              option: "fail",
              message: errReturn.message
            });
          } else {
            console.log("Se ha actualizado el estado del manifiesto");
            socket.emit("change_manifest_status_from_sonda_sd_response", {
              option: "updateManifest",
              manifestId: data.manifestId
            });
          }
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (err) {
      console.log(
        "Get delivery tasks for Sonda SD fail: " + err.message,
        "info"
      );
      socket.emit("change_manifest_status_from_sonda_sd_response", {
        option: "fail",
        message: err.message
      });
    }
  },

  GetNextPickingDemandHeaderByManifiestForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.INT,
            data.manifestId
          );

          request.execute(
            "SWIFT_SP_GET_NEXT_PICKING_DEMAND_HEADER_BY_MANIFEST",
            function(errReturn) {
              if (errReturn) {
                socket.emit(
                  "get_next_picking_demand_header_by_manifest_for_sonda_sd_response",
                  {
                    option: "fail",
                    manifestId: data.manifestId,
                    message: errReturn.message
                  }
                );
                reject({
                  Message:
                    "GetNextPickingDemandHeaderByManifiestForSondaSd " +
                    errReturn.Mensaje,
                  socket: socket,
                  data: data
                });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit(
              "get_next_picking_demand_header_by_manifest_for_sonda_sd_response",
              { option: "add_header", nextPickingHeader: row }
            );
          });

          request.on("done", function() {
            socket.emit(
              "get_next_picking_demand_header_by_manifest_for_sonda_sd_response",
              { option: "complete", manifestId: data.manifestId }
            );
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit(
          "get_next_picking_demand_header_by_manifest_for_sonda_sd_response",
          { option: "fail", manifestId: data.manifestId, message: err.message }
        );
        reject({
          Message:
            "Get next picking demand header by manifest for Sonda SD fail: " +
            err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  GetNextPickingDemandDetailByManifiestForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.INT,
            data.manifestId
          );

          request.execute(
            "SWIFT_SP_GET_NEXT_PICKING_DEMAND_DETAIL_BY_MANIFEST",
            function(errReturn) {
              if (errReturn) {
                socket.emit(
                  "get_next_picking_demand_detail_by_Manifest_for_sonda_sd_response",
                  {
                    option: "fail",
                    manifestId: data.manifestId,
                    message: errReturn.message
                  }
                );
                reject({
                  Message:
                    "GetNextPickingDemandDetailByManifiestForSondaSd " +
                    errReturn.Mensaje,
                  socket: socket,
                  data: data
                });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit(
              "get_next_picking_demand_detail_by_Manifest_for_sonda_sd_response",
              { option: "add_detail", nextPickingDetail: row }
            );
          });

          request.on("done", function() {
            socket.emit(
              "get_next_picking_demand_detail_by_Manifest_for_sonda_sd_response",
              { option: "complete", manifestId: data.manifestId }
            );
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit(
          "get_next_picking_demand_detail_by_Manifest_for_sonda_sd_response",
          { option: "fail", manifestId: data.manifestId, message: err.message }
        );
        reject({
          Message:
            "Get next picking demand detail by manifest for Sonda SD fail: " +
            err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  GetSerialNumberByManifiestForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.INT,
            data.manifestId
          );

          request.execute("SWIFT_SP_GET_SERIAL_NUMBER_BY_MANIFEST", function(
            errReturn
          ) {
            if (errReturn) {
              socket.emit(
                "get_serial_number_by_Manifest_for_sonda_sd_response",
                {
                  option: "fail",
                  manifestId: data.manifestId,
                  message: errReturn.message
                }
              );
              reject({
                Message:
                  "GetSerialNumberByManifiestForSondaSd " + errReturn.Mensaje,
                socket: socket,
                data: data
              });
            }
          });

          request.on("row", function(row) {
            socket.emit("get_serial_number_by_Manifest_for_sonda_sd_response", {
              option: "add",
              serial_number: row
            });
          });

          request.on("done", function() {
            socket.emit("get_serial_number_by_Manifest_for_sonda_sd_response", {
              option: "complete",
              manifestId: data.manifestId
            });
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("get_serial_number_by_Manifest_for_sonda_sd_response", {
          option: "fail",
          manifestId: data.manifestId,
          message: err.message
        });
        reject({
          Message:
            "Get serial number by manifest for Sonda SD fail: " + err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  InsertDeliveryNoteFromSondaSd: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute("SONDA_SP_ADD_DELIVERY_NOTE_BY_XML", function(
          errorExec,
          recordsets
        ) {
          connection.close();
          pSqlInstance.close();

          if (errorExec) {
            socket.emit("InsertDeliveryNotesFromSondaSd_Response", {
              option: "fail",
              error: errorExec.message,
              data: data
            });
          } else {
            socket.emit("InsertDeliveryNotesFromSondaSd_Response", {
              option: "success",
              deliveryNotes: recordsets[0] ? recordsets[0] : [],
              data: data
            });
          }
        });
      });
    } catch (e) {
      console.log(
        "La nota de entrega no pudo ser insertada debido a: " + e.message,
        "error"
      );
      socket.emit("InsertDeliveryNotesFromSondaSd_Response", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  InsertCanceledDeliveryFromSondaSd: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute("SONDA_SP_ADD_CANCELED_DELIVERY_BY_XML", function(
          errorExec,
          recordsets
        ) {
          connection.close();
          pSqlInstance.close();

          if (errorExec) {
            socket.emit("InsertCanceledDeliveryFromSondaSd_Response", {
              option: "fail",
              error: errorExec.message,
              data: data
            });
          } else {
            if (recordsets.length > 0) {
              if (recordsets[0][0].RESULTADO == -1) {
                socket.emit("InsertCanceledDeliveryFromSondaSd_Response", {
                  option: "fail",
                  error: recordsets[0][1].Mensaje,
                  data: data
                });
              } else {
                socket.emit("InsertCanceledDeliveryFromSondaSd_Response", {
                  option: "success",
                  deliveriesCanceled: recordsets[0] ? recordsets[0] : [],
                  data: data
                });
              }
            } else {
              socket.emit("InsertCanceledDeliveryFromSondaSd_Response", {
                option: "fail",
                error: "Sp no devolvio registros",
                data: data
              });
            }
          }
        });
      });
    } catch (e) {
      console.log(
        "La entrega cancelada no pudo ser insertada debido a: " + e.message,
        "error"
      );
      socket.emit("InsertCanceledDeliveryFromSondaSd_Response", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  GetBasketsInformationByManifestForSondaSd: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "MANIFEST_HEADER_ID",
            pSqlInstance.INT,
            data.manifestId
          );

          request.execute("SWIFT_SP_GET_BASKET_BARCODE_BY_MANIFEST", function(
            errReturn
          ) {
            if (errReturn) {
              socket.emit("get_baskets_information_for_manifest_response", {
                option: "fail",
                manifestId: data.manifestId,
                message: errReturn.message
              });
              reject({
                Message:
                  "GetBasketsInformationByManifestForSondaSd " +
                  errReturn.Mensaje,
                socket: socket,
                data: data
              });
            }
          });

          request.on("row", function(row) {
            socket.emit("get_baskets_information_for_manifest_response", {
              option: "add",
              basket_information: row
            });
          });

          request.on("done", function() {
            socket.emit("get_baskets_information_for_manifest_response", {
              option: "complete",
              manifestId: data.manifestId
            });
            connection.close();
            pSqlInstance.close();
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        socket.emit("get_baskets_information_for_manifest_response", {
          option: "fail",
          manifestId: data.manifestId,
          message: err.message
        });
        reject({
          Message:
            "Get baskets information by manifest for Sonda SD fail: " +
            err.message,
          socket: socket,
          data: data
        });
      }
    });
  },
  InsertPickingDemandByTaskFromSondaSd: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute(
          "SONDA_SP_UPDATE_PICKING_DEMAND_BY_TASK_BY_XML",
          function(errorExec, recordsets) {
            connection.close();
            pSqlInstance.close();

            if (errorExec) {
              socket.emit("InsertPickingDemandByTaskFromSondaSd_Response", {
                option: "fail",
                error: errorExec.message,
                data: data
              });
            } else {
              if (recordsets.length > 0) {
                if (recordsets[0][0].RESULTADO == -1) {
                  socket.emit("InsertPickingDemandByTaskFromSondaSd_Response", {
                    option: "fail",
                    error: recordsets[0][1].Mensaje,
                    data: data
                  });
                } else {
                  socket.emit("InsertPickingDemandByTaskFromSondaSd_Response", {
                    option: "success",
                    demandasDespachoPorTarea: recordsets[0]
                      ? recordsets[0]
                      : [],
                    data: data
                  });
                }
              } else {
                socket.emit("InsertPickingDemandByTaskFromSondaSd_Response", {
                  option: "fail",
                  error: "Sp no devolvio registros",
                  data: data
                });
              }
            }
          }
        );
      });
    } catch (e) {
      console.log(
        "La demanda de despacho por tarea no pudo ser insertada debido a: " +
          e.message,
        "error"
      );
      socket.emit("InsertPickingDemandByTaskFromSondaSd_Response", {
        option: "fail",
        error: e.message,
        data: data
      });
    }
  },
  GetDeliveryParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("GROUP_ID", pSqlInstance.VarChar, "DELIVERY");

          var rowscount = 0;
          request.execute("SONDA_SP_GET_PARAMETER_BY_GROUP", function(
            err,
            recordset
          ) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("send_parameter_from_bo", {
                option: "not_found_GetDeliveryParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("send_parameter_from_bo", {
              option: "add_GetDeliveryParameter",
              row: row,
              inLogin: data.inLogin
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("send_parameter_from_bo", {
              option: "GetDeliveryParameter_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el parametros de entrega: " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener el parametros de entrega: " + e.message,
          socket: socket
        });
      }
    });
  },
  InsertDeliveryNoteCanceledFromSondaSd: function(data, socket) {
    try {
      var verificarSiElProcesoFueExitoso = function(resultadoOperacion) {
        // ReSharper disable once CoercedEqualsUsing
        return resultadoOperacion == 1;
      };

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        var infoXml = js2xmlparser.parse("Data", data);
        request.input("XML", pSqlInstance.Xml, infoXml);

        request.execute("SONDA_SP_ADD_DELIVERY_NOTE_CANCELED_BY_XML", function(
          errorExec
        ) {
          if (errorExec) {
            socket.emit("InsertDeliveryNoteCanceledFromSondaSd_Response", {
              option: "fail",
              error: errorExec.message
            });
          }
        });

        request.on("row", function(row) {
          if (verificarSiElProcesoFueExitoso(row.Resultado)) {
            socket.emit("InsertDeliveryNoteCanceledFromSondaSd_Response", {
              option: "success",
              data: data
            });
          } else {
            socket.emit("InsertDeliveryNoteCanceledFromSondaSd_Response", {
              option: "fail",
              error: row.Mensaje
            });
          }
        });

        request.on("done", function() {
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      console.log(
        "Las notas de entrega canceladas no pudieron ser insertadas debido a: " +
          e.message,
        "error"
      );
      socket.emit("InsertDeliveryNoteCanceledFromSondaSd_Response", {
        option: "fail",
        error: e.message
      });
    }
  },

  ExecuteAllProcessesOfLoadManifest: function(
    processes,
    indexCurrentProcess,
    data,
    socket,
    resolve,
    reject
  ) {
    // ReSharper disable once InconsistentNaming
    var _this = this;
    var currentProc = processes[indexCurrentProcess];
    currentProc
      .exec(data, socket)
      .then(res => {
        indexCurrentProcess += 1;
        if (indexCurrentProcess < processes.length) {
          console.log(
            `[${new Date().toISOString()}] : Process:${
              currentProc.name
            } its ok for ${data.routeid}`
          );
          _this.ExecuteAllProcessesOfLoadManifest(
            processes,
            indexCurrentProcess,
            data,
            socket,
            resolve,
            reject
          );
        } else {
          console.log(
            `[${new Date().toISOString()}] : Process:${
              currentProc.name
            } its ok for ${data.routeid}`
          );
          resolve({
            status: true,
            Message:
              "All processes of load manifest has been completed successfully",
            data: data
          });
        }
      })
      .catch(err => {
        console.log(
          `[${new Date().toISOString()}] : Process:${
            currentProc.name
          } its wrong! ${err.Message || "Server error"} ${data.routeid} `
        );
        console.log(
          "Process: " + err.Message,
          "error",
          currentProc.name,
          data.routeid,
          null,
          "ExecuteAllProcessesOfLoadManifest",
          null,
          null,
          null,
          10
        );
        reject({ status: false, Message: err.Message || "Server error" });
      });
  },
  GetOverdueInvoiceByCustomerForRoute: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute(
            "SONDA_SP_GET_OVERDUE_INVOICE_BY_CUSTOMER_FOR_ROUTE",
            function(errExec, recordset) {
              if (errExec) {
                if (errorCallBack)
                  errorCallBack(
                    "No se pudieron obtener las Facturas Vencidas debido a: " +
                      errExec.message,
                    socket
                  );
                reject({
                  Message:
                    "No se pudieron obtener las Facturas Vencidas debido a: " +
                    errExec.message,
                  socket: socket
                });
              }

              if (recordset.length === 0) {
                if (successCallBack) successCallBack(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_overdue_invoice_by_customer_for_route",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack) {
          errorCallBack(
            "No se pudieron obtener las Facturas Vencidas debido a: " +
              e.message,
            socket
          );
        }

        reject({
          Message:
            "No se pudieron obtener las Facturas Vencidas debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetPaymentParametersForRoute: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("GROUP_ID", pSqlInstance.VarChar, "INVOICE");
          request.input(
            "PARAMETER_ID",
            pSqlInstance.VarChar,
            "MINIMUM_PERCENT_OF_PAID"
          );

          request.execute("SWIFT_SP_GET_PARAMETER", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack) {
                errorCallBack(
                  "No se ha podido obtener el parámetro de porcentaje de pago mínimo. " +
                    errExec.message,
                  socket
                );
              }

              reject({
                Message:
                  "No se ha podido obtener el parámetro de porcentaje de pago mínimo. " +
                  errExec.message,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              if (successCallBack) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_parameter_minimum_percentage_of_payment",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack) {
          errorCallBack(
            "No se ha podido obtener el parámetro de porcentaje de pago mínimo. " +
              e.message,
            socket
          );
        }

        reject({
          Message:
            "No se ha podido obtener el parámetro de porcentaje de pago mínimo. " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetOverdueInvoiceOfCustomer: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.input(
            "CODE_CUSTOMER",
            pSqlInstance.VarChar,
            data.codeCustomer ? data.codeCustomer : null
          );

          request.execute("SONDA_SP_GET_OVERDUE_INVOICE_BY_CUSTOMER", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack)
                errorCallBack(
                  "No se pudieron obtener las Facturas Vencidas debido a: " +
                    errExec.message,
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener las Facturas Vencidas debido a: " +
                  errExec.message,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              if (successCallBack) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_overdue_invoice_of_customer",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack)
          errorCallBack(
            "No se pudieron obtener las Facturas Vencidas debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudieron obtener las Facturas Vencidas debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetCustomerAccountingInformation: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.input(
            "CODE_CUSTOMER",
            pSqlInstance.VarChar,
            data.codeCustomer ? data.codeCustomer : null
          );

          request.execute(
            "SONDA_SP_GET_CUSTOMER_ACCOUNTING_INFORMATION",
            function(errExec, recordset) {
              if (errExec) {
                if (errorCallBack)
                  errorCallBack(
                    "No se pudo obtener la Cuenta Corriente de Clientes debido a: " +
                      errExec.message,
                    socket
                  );
                reject({
                  Message:
                    "No se pudo obtener la Cuenta Corriente de Clientes debido a: " +
                    errExec.message,
                  socket: socket
                });
              }

              if (recordset.length === 0) {
                if (successCallBack) successCallBack(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_accounting_information_of_customer",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack)
          errorCallBack(
            "No se pudo obtener la Cuenta Corriente de Clientes debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudo obtener la Cuenta Corriente de Clientes debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  AddOverdueInvoicePayment: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(
        connectionError,
        sqlInstance
      ) {
        if (!connectionError) {
          var addOverdueInvoicePaymentRequest = new sqlInstance.Request(
            connection
          );
          addOverdueInvoicePaymentRequest.verbose = _cnnServ.GetVerbose();
          addOverdueInvoicePaymentRequest.stream = false;
          var xml = js2xmlparser.parse("Data", data);

          addOverdueInvoicePaymentRequest.input("XML", sqlInstance.Xml, xml);

          addOverdueInvoicePaymentRequest.execute(
            "SONDA_SP_ADD_OVERDUE_INVOICE_PAYMENT_BY_XML",
            function(executionError, recordsets) {
              if (!executionError) {
                var recordsetResults = recordsets[0];
                socket.emit("AddOverdueInvoicePaymentResponse", {
                  option: "success",
                  recordsets: recordsetResults
                });
                console.log("AddOverdueInvoicePayment success", "info");
              } else {
                socket.emit("AddOverdueInvoicePaymentResponse", {
                  option: "fail",
                  recordsets: [],
                  message: executionError.message
                });
                console.log(
                  "AddOverdueInvoicePayment fail: " + executionError.message,
                  "error",
                  "SONDA_SP_ADD_OVERDUE_INVOICE_PAYMENT_BY_XML",
                  data.routeId,
                  "",
                  "AddOverdueInvoicePayment"
                );
              }
            }
          );

          addOverdueInvoicePaymentRequest.on("done", function() {
            console.log(
              "Add overdue invoice payment request completed.",
              "info"
            );
            connection.close();
            sqlInstance.close();
          });
        } else {
          socket.emit("AddOverdueInvoicePaymentResponse", {
            option: "fail",
            recordsets: [],
            message: connectionError.message
          });

          console.log(
            "AddOverdueInvoicePayment fail: " + connectionError.message,
            "error",
            "SONDA_SP_ADD_OVERDUE_INVOICE_PAYMENT_BY_XML",
            data.routeId,
            "",
            "AddOverdueInvoicePayment"
          );
        }
      });
    } catch (err) {
      socket.emit("AddOverdueInvoicePaymentResponse", {
        option: "fail",
        recordsets: [],
        message: err.message
      });
      console.log(
        "AddOverdueInvoicePayment fail: " + err.message,
        "error",
        "SONDA_SP_ADD_OVERDUE_INVOICE_PAYMENT_BY_XML",
        data.routeId,
        "",
        "AddOverdueInvoicePayment"
      );
    }
  },
  GetPackConversionForRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(
          connectionError,
          pSqlInstance
        ) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_PACK_CONVERSION_FOR_ROUTE", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback)
                errCallback(
                  "Error al obtener los paquetes de conversión para la ruta debido a: " +
                    executionError,
                  socket
                );
              reject({
                Message:
                  "Error al obtener los paquetes de conversión para la ruta debido a: " +
                  executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetPackConversion_NoFound",
                routeid: data.routeid
              });

              if (successCallback) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackConversion_AddPackConversion",
              row: row
            });
          });

          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackConversion_Completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback)
          errCallback(
            "Error al obtener las converciones de los paquetes " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las converciones de los paquetes " + e.message,
          socket: socket
        });
      }
    });
  },
  GetTasksForSalesRoutePlan: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(
          connectionError,
          pSqlInstance
        ) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_TASKS_FOR_SALE_ROUTE_PLAN", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback)
                errCallback(
                  "Error al obtener las tareas para la ruta debido a: " +
                    executionError,
                  socket
                );
              reject({
                Message:
                  "Error al obtener las tareas para la ruta debido a: " +
                  executionError,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_tasks_found",
                routeid: data.routeid
              });

              if (successCallback) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_task",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "get_tasks_completed"
            });

            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback)
          errCallback(
            "Error al obtener las tareas para la ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener las tareas para la ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetPriceListBySkuForRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(
          connectionError,
          pSqlInstance
        ) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute(
            "SONDA_SP_GET_PRICE_LIST_BY_SKU_PACK_SCALE_FOR_ROUTE",
            function(executionError, recordset) {
              if (executionError) {
                if (errCallback)
                  errCallback(
                    "Error al obtener los productos para la ruta " +
                      executionError,
                    socket
                  );
                reject({
                  Message:
                    "Error al obtener los productos para la ruta " +
                    executionError,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "price_list_by_sku_pack_scale_not_found",
                  routeid: data.routeid
                });

                if (successCallback) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_price_list_by_sku",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "get_price_list_by_sku_pack_scale_completed"
            });

            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback)
          errCallback(
            "Error al obtener los productos por escala para ruta " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener los productos por escala para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  UpdateUserImage: function(data, socket, errCallback) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(
        connectionError,
        pSqlInstance
      ) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
        request.input("IMAGE", pSqlInstance.VarChar, data.image);

        request.execute("SONDA_SP_UPDATE_USER_IMAGE", function(executionError) {
          if (executionError) {
            errCallback(
              "Error al actualizar la imagen del operador: " + executionError
            );
          }
        });
        request.on("done", function() {
          connection.close();
          pSqlInstance.close();
        });
      });
    } catch (e) {
      errCallback("Error al actualizar la imagen del operador: " + e.message);
    }
  },
  GetGoalsModuleParameter: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input(
            "PARAMETER_ID",
            pSqlInstance.VarChar,
            "USE_GOAL_MODULE"
          );

          request.execute("SWIFT_SP_GET_PARAMETER", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack) {
                errorCallBack(
                  "No se ha podido obtener el parámetro de uso de modulo de metas. " +
                    errExec.message,
                  socket
                );
              }

              reject({
                Message:
                  "No se ha podido obtener el parámetro de uso de modulo de metas. " +
                  errExec.message,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              if (successCallBack) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_parameter_use_goal_module",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack) {
          errorCallBack(
            "No se ha podido obtener el parámetro de uso de modulo de metas. " +
              e.message,
            socket
          );
        }

        reject({
          Message:
            "No se ha podido obtener el parámetro de porcentaje de pago mínimo. " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetImageBySku: function(data, socket, successCallBack, errorCallBack) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_IMAGE_BY_SKU", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack) {
                errorCallBack(
                  "No se ha podido obtener el listado de imagenes de productos. " +
                    errExec.message,
                  socket
                );
              }

              reject({
                Message:
                  "No se ha podido obtener el listado de imagenes de productos. " +
                  errExec.message,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              if (successCallBack) {
                successCallBack(data, socket);
              }
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_image_by_sku",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) {
              successCallBack(data, socket);
            }
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack) {
          errorCallBack(
            "No se ha podido obtener el listado de imagenes de productos. " +
              e.message,
            socket
          );
        }

        reject({
          Message:
            "No se ha podido obtener el listado de imagenes de productos. " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetSaleStatisticByCustomer: function(
    data,
    socket,
    successCallBack,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_STATISTIC_SALES_BY_CUSTOMER", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack) {
                errorCallBack(
                  "No se ha podido obtener los datos de estadistica de venta por cliente. " +
                    errExec.message,
                  socket
                );
              }

              reject({
                Message:
                  "No se ha podido obtener los datos de estadistica de venta por cliente." +
                  errExec.message,
                socket: socket
              });
            }

            if (recordset.length === 0) {
              if (successCallBack) {
                successCallBack(data, socket);
              }
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_statistic_costumer",
              row: row
            });
          });

          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack) {
              successCallBack(data, socket);
            }
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack) {
          errorCallBack(
            "No se ha podido obtener los datos de estadistica de venta por cliente. " +
              e.message,
            socket
          );
        }

        reject({
          Message:
            "No se ha podido obtener los datos de estadistica de venta por cliente. " +
            e.message,
          socket: socket
        });
      }
    });
  },

  GetSaleStatisticByCustomerOutRoutePlan: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("CLIENT_ID", pSqlInstance.VarChar, data.clientid);

        request.execute(
          "SONDA_SP_STATISTIC_SALES_BY_CUSTOMER_OUT_OF_ROUTE_PLAN",
          function(err, recordsets, returnValue) {
            if (err === undefined) {
              if (recordsets[0][0] !== undefined) {
                var statistic = [];
                for (var i = 0; i < recordsets[0].length; i++) {
                  var statistic = {
                    ID: recordsets[0][i].ID,
                    CLIENT_ID: recordsets[0][i].CLIENT_ID,
                    CODE_SKU: recordsets[0][i].CODE_SKU,
                    DESCRIPTION_SKU: recordsets[0][i].DESCRIPTION_SKU,
                    QTY: recordsets[0][i].QTY,
                    ON_HAND: recordsets[0][i].ON_HAND,
                    SALE_PACK_UNIT: recordsets[0][i].SALE_PACK_UNIT
                  };
                  statistic.push(statistic);
                }

                socket.emit("GetSaleStatisticByCustomerOutRoutePlan_Response", {
                  option: "GetSaleStatisticByCustomerOutRoutePlan_Response",
                  statistic: statistic
                });
                console.log(
                  "GetSaleStatisticByCustomerOutRoutePlan Complete-" +
                    JSON.stringify(data),
                  "info"
                );
              } else {
                var vacio = [];
                socket.emit("GetSaleStatisticByCustomerOutRoutePlan_Response", {
                  option: "GetSaleStatisticByCustomerOutRoutePlan_Response",
                  statistic: vacio
                });
                console.log(
                  "GetSaleStatisticByCustomerOutRoutePlan Complete-" + data,
                  "info"
                );
              }
            } else {
              socket.emit("GetSaleStatisticByCustomerOutRoutePlan_Response", {
                option: "GetSaleStatisticByCustomerOutRoutePlan_Error",
                error: err.message
              });
              console.log(
                "GetSaleStatisticByCustomerOutRoutePlan_Error-" + err.message,
                "error"
              );
            }

            connection.close();
            pSqlInstance.close();
          }
        );
      });
    } catch (err) {
      console.log(
        "GetClientsForTaskOutsideTheRoutePlan_fail en catch: " + err.Message,
        "error"
      );
      socket.emit("GetCustomersOutsideOfRoutePlan_Response", {
        option: "fail",
        data: data,
        message: err.Message
      });
    }
  },
  InsertNewTasksSD: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, (err, pSqlInstance) => {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        var xml = js2xmlparser.parse("Data", data);
        var dataJson = JSON.stringify(data);
        request.input("XML", pSqlInstance.Xml, xml);
        request.input("JSON", pSqlInstance.VarChar, dataJson);
        console.log(xml);
        console.log(dataJson);

        request.execute(
          "SONDA_SP_INSERT_NEW_TASKING_BY_XML",
          (err, recordsets) => {
            if (err === undefined) {
              var tasks = [];
              var recordsetTasks = recordsets[0];
              if (recordsetTasks) {
                recordsetTasks.forEach(tarea => {
                  var task = {
                    taskId: tarea.TASK_ID,
                    taskIdHh: tarea.TASK_ID_HH
                  };
                  task.taskId != task.taskIdHh ? tasks.push(task) : null;
                });
              }
              console.log(
                "InsertNewTasksSD complete-" + JSON.stringify(tasks)
              );
              if (tasks.length > 0) {
                socket.emit("InsertNewTasksSD_Response", {
                  option: "InsertNewTasksSD_Success",
                  data: tasks
                });
              }
            } else {
              socket.emit("InsertNewTasksSD_Response", {
                option: "InsertNewTasksSD_Error",
                error: err.message
              });
              console.log("InsertNewTasksSD_Error-" + err.message, "error");
            }
            connection.close();
            pSqlInstance.close();
          }
        );
      });
    } catch (err) {
      socket.emit("InsertNewTasksSD", {
        option: "fail",
        message: err.message,
        data: data
      });
      console.log("Insert new task from Sonda SD fail: " + err.message);
    }
  }
};

function InsertPosSkusOutsideRoute(data, socket, callback) {
  //Get SKU XML form SONDA SD and insert the registers on SONDA_POS_SKU
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = false;

      var xml = js2xmlparser.parse("skus", data.listadoSkus);
      request.input("XML", pSqlInstance.Xml, xml); ///console.dir
      request.input("ROUTE_ID", pSqlInstance.VarChar, data.routeid);
      request.input("TRANSFER_ID", pSqlInstance.Int, data.transferId);

      request.execute("SONDA_SP_GET_PRICE_LIST_OUTSIDE_ROUTE", function(
        errReturn,
        recordsets,
        returnValue
      ) {
        if (errReturn === undefined) {
          callback(
            data,
            socket,
            recordsets[0],
            recordsets[1],
            connection,
            pSqlInstance
          );
        } else {
          console.log("Insert of Skus fail: " + errReturn.message, "info");
        }
      });
    });
  } catch (err) {
    console.log(
      "Update telephone number on invoice fail: " + err.message,
      "info"
    );
  }
}

function InsertRouteReturnDetail(
  idRouteReturnHeader,
  dataDetail,
  latest,
  connection,
  pSqlInstance,
  successCallback,
  errCallback
) {
  try {
    var request = new pSqlInstance.Request(connection);
    request.verbose = _cnnServ.GetVerbose();
    request.stream = false;
    request.input(
      "ID_DOC_RETURN_HEADER",
      pSqlInstance.INT,
      idRouteReturnHeader
    );
    request.input("CODE_SKU", pSqlInstance.VarChar, dataDetail.ItemCode);
    request.input("QTY", pSqlInstance.INT, dataDetail.Quantity);
    request.input(
      "DESCRIPTION_SKU",
      pSqlInstance.VarChar,
      dataDetail.ItemDescription
    );

    request.execute("SONDA_SP_INSERT_RETURN_RECEPTION_DETAIL", function(
      err,
      recordsets,
      returnValue
    ) {
      if (err === undefined) {
        successCallback(latest);
        console.log(
          "SendReturnSku_InsertRouteReturnHeader_Request Complete -" +
            dataDetail.sku,
          "info"
        );
      } else {
        errCallback(err);
      }
    });
  } catch (e) {
    errCallback(e);
  }
}

function GetWarehouseErpByWarehouse(
  data,
  codeWarehouse,
  successCallback,
  errCallback
) {
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = false;
      request.input("CODE_WAREHOUSE", pSqlInstance.VarChar, codeWarehouse);

      request.execute("SWIFT_SP_GET_ERP_WAREHOUSE_BY_WAREHOUSE", function(
        err,
        recordsets,
        returnValue
      ) {
        connection.close();
        pSqlInstance.close();

        if (err === undefined) {
          if (recordsets[0][0] !== undefined) {
            successCallback(data, recordsets[0][0].ERP_WAREHOUSE);
          } else {
            errCallback({ error: "No se encontro la codigo erp de warehouse" });
          }
        } else {
          errCallback(err);
        }
      });
    });
  } catch (e) {
    errCallback(e);
  }
}
