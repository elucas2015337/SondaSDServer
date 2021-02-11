var _cnnServ = require("./ConnectionService.js");
var console = require("./LogService.js");
var poucDbService = require("./PouchDbService.js");

function ExecuteSP(
  data,
  socket,
  successCallback,
  errCallback,
  nameSQLObject,
  nameMethodObject,
  nameObject
) {
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = false;
      request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
      request.execute(nameSQLObject, function(err, recordsets, returnValue) {
        if (err === undefined) {
          socket.emit("GetRouteInfo_Send", {
            option: nameMethodObject,
            data: recordsets[0][0]
          });
          console.log(nameMethodObject);
          successCallback(data, socket);
        } else {
          errCallback(
            "Error al obtener " + nameObject + " : " + err.message,
            socket
          );
          connection.close();
          pSqlInstance.close();
        }
      });
    });
  } catch (err) {
    console.log("GetResolution_fail en catch: " + err.message, "error");
    errCallback("Error al obtener " + nameObject + " : " + e.message, socket);
  }
}

function GetUserInfo(data, socket, successCallback, errCallback) {
  ExecuteSP(
    data,
    socket,
    successCallback,
    errCallback,
    "SONDA_SP_GET_USER_BY_ROUTE",
    "GetUserInfo",
    "usuario"
  );
}

function GetResolution(data, socket, successCallback, errCallback) {
  ExecuteSP(
    data,
    socket,
    successCallback,
    errCallback,
    "SWIFT_SP_GET_RESOLUTION_INVOICE",
    "GetResolution",
    "resoluci�n"
  );
}

function GetDocumentsSequence(data, socket, successCallback, errCallback) {
  ExecuteSP(
    data,
    socket,
    successCallback,
    errCallback,
    "SWIFT_SP_GET_DOCUMENT_SEQUENCE_BY_ROUTE",
    "GetDocumentsSequence",
    "secuencia de documentos"
  );
}

function GetReviewTask(data, socket, successCallback, errCallback) {
  ExecuteSP(
    data,
    socket,
    successCallback,
    errCallback,
    "SWIFT_SP_GET_TASK_REVIEW_BY_ROUTE",
    "GetReviewTask",
    "resumen de tareas"
  );
}

function GetReviewQty(data, socket, successCallback, errCallback) {
  ExecuteSP(
    data,
    socket,
    successCallback,
    errCallback,
    "SWIFT_SP_GET_ROUTE_DATA_QUANTITY",
    "GetReviewQty",
    "resumen de cantidad"
  );
}

function GetTagsByTagColor(
  colorTags,
  data,
  operacion,
  socket,
  successCallback,
  errCallback
) {
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = true;
      var pSql =
        "SELECT * FROM SWIFT_FN_GET_TAGS_BY_TAG_COLOR('" + colorTags + "')";

      request.query(pSql, function(err, recordset) {
        if (err) {
          errCallback("GetTags.sql.err: " + err.message);
        }
        if (recordset.length === 0) {
          connection.close();
          pSqlInstance.close();
        }
      });
      request.on("row", function(row) {
        var dt = {
          AssignedTo: data.routeid,
          Id: row.TAG_COLOR,
          BroadcastOperacion: operacion,
          TagColor: row.TAG_COLOR,
          TagValueText: row.TAG_VALUE_TEXT,
          TagPriority: row.TAG_PRIORITY,
          TagComments: row.TAG_COMMENTS,
          dbuser: data.dbuser,
          dbuserpass: data.dbuserpass
        };
        socket.emit("sync_tag", dt);
      });
      request.on("done", function(returnValue) {
        connection.close();
        pSqlInstance.close();
        successCallback();
      });
    });
  } catch (e) {
    errCallback("Error al obtener etiqueta para ruta " + e.message);
  }
}

function GetTransferByTransferId(
  codeBroadcast,
  transferId,
  data,
  operacion,
  socket,
  successCallback,
  errCallback
) {
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = false;

      var encabezado = {};

      request.input("TRANSFER_ID", pSqlInstance.INT, transferId);

      request.execute("SWIFT_SP_GET_TRANSFER_HEADER_BY_TRANSFER_ID", function(
        error,
        recordSets
      ) {
        if (error === undefined) {
          if (recordSets[0][0] === undefined) {
            errCallback("No se encontro la transferencia " + transferId);
          } else {
            encabezado = {
              TRANSFER_ID: recordSets[0][0].TRANSFER_ID,
              SELLER_CODE: recordSets[0][0].SELLER_CODE,
              SELLER_ROUTE: recordSets[0][0].SELLER_ROUTE,
              CODE_WAREHOUSE_SOURCE: recordSets[0][0].CODE_WAREHOUSE_SOURCE,
              CODE_WAREHOUSE_TARGET: recordSets[0][0].CODE_WAREHOUSE_TARGET,
              STATUS: recordSets[0][0].STATUS,
              LAST_UPDATE: recordSets[0][0].LAST_UPDATE,
              LAST_UPDATE_BY: recordSets[0][0].LAST_UPDATE_BY,
              COMMENT: recordSets[0][0].COMMENT,
              IS_ONLINE: recordSets[0][0].IS_ONLINE,
              Detalles: []
            };

            var requestDetail = new pSqlInstance.Request(connection);
            requestDetail.verbose = _cnnServ.GetVerbose();
            requestDetail.stream = false;

            requestDetail.input("TRANSFER_ID", pSqlInstance.INT, transferId);

            requestDetail.execute(
              "SWIFT_SP_GET_TRANSFER_DETAIL_BY_TRANSFER_ID",
              function(errorDetail, recordsetDetail) {
                if (errorDetail === undefined) {
                  if (recordsetDetail[0].length === 0) {
                    errCallback(
                      "No se encontro el detalle para la transferencia " +
                        transferId
                    );
                  } else {
                    encabezado.Detalles = recordsetDetail[0];
                    socket.emit("new_broadcast", {
                      Id: codeBroadcast,
                      Type: "transfer",
                      AssignedTo: encabezado.SELLER_ROUTE,
                      data: encabezado,
                      BroadcastOperacion: operacion
                    });
                  }
                } else {
                  errCallback(
                    "No se encontro el detalle para la transferencia " +
                      transferId +
                      " debido a " +
                      errorDetail
                  );
                }
              }
            );
          }
        } else {
          errCallback("Error al obtener la transferencia " + transferId);
        }
      });
    });
  } catch (e) {
    errCallback("Error al obtener la transferencia  " + e.message);
  }
}

function GetReasons(data, socket, successCallback, errCallback) {
  try {
    var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
      var request = new pSqlInstance.Request(connection);
      request.verbose = _cnnServ.GetVerbose();
      request.stream = false;

      request.execute("[SWIFT_GET_CLASSIFICATION_ALTERNATE]", function(
        err,
        recordsets,
        returnValue
      ) {
        if (!err) {
          socket.emit("GetRouteInfo_Send", {
            option: "GetReasons_success",
            data: recordsets[0]
          });

          successCallback(data, socket);
        } else {
          console.log("GetReasonsFail.1: " + JSON.stringify(err), "error");
          errCallback("Error al obtener las razpnes: " + err.message, socket);
        }
      });
    });
  } catch (err) {
    console.log("GetReasonsFail.catch:" + err.message, "error");
    errCallback("Error al obtener las razpnes: " + err.message, socket);
  }
}

module.exports = {
  CreateMyRoutePlan: function(data, socket, successCallback, errCallback) {
    try {
      console.log("CreateMyRoutePlan.Service.01");

      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);

        request.verbose = _cnnServ.GetVerbose(); //_cnnServ.GetVerbose();
        request.stream = false;
        request.input("MANIFEST_ID", pSqlInstance.Int, data.manifestid);
        request.input("ASSIGNED_TO", pSqlInstance.VarChar(50), data.loginid);
        request.output("pRESULT", pSqlInstance.VarChar(250));
        var pReturned = "";

        console.log("CreateMyRoutePlan.Service.02");

        request.execute("SWIFT_SP_CREATE_DELIVERY_TASKS", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err) {
            errCallback(
              "Error al generar tareas en la ruta de entrega " + err,
              socket
            );
          } else {
            console.log("CreateMyRoutePlan: " + err.message, "error");

            pReturned = request.parameters.pRESULT.value;
            connection.close();
            pSqlInstance.close();

            if (pReturned === "OK") {
              successCallback(data, socket);
            } else {
              errCallback(
                "Error al generar tareas en la ruta de entrega " + pReturned,
                socket
              );
            }
          }
        });
      });
    } catch (err) {
      console.log("GetUserInfo_fail en catch: " + err.message, "error");
      errCallback(
        "Error al obtener informacion del usuario: " + e.message,
        socket
      );
    }
  },

  TransferSku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;
          request.input("Login", pSqlInstance.VarChar(15), data.loggeduser);
          request.input("Route", pSqlInstance.VarChar(15), data.routeid);
          request.output("pRESULT", pSqlInstance.VarChar(250));
          var pReturned = "";

          request.execute("SONDA_TRANSFER_SKU", function(
            err,
            recordsets,
            returnValue
          ) {
            pReturned = request.parameters.pRESULT.value;
            connection.close();
            pSqlInstance.close();
            if (pReturned === "OK") {
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            } else {
              if (errCallback != undefined)
                errCallback("Error al transferir los skus", socket);
              reject({
                Message: "Error al transferir los skus",
                socket: socket
              });
            }
          });
        });
      } catch (e) {
        if (errorCallBack != undefined)
          errCallback("Error al Preparar skus para ruta " + e.message, socket);
        reject({
          Message: "Error al Preparar skus para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  PrepareSkus: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        socket.emit("GetInitialRouteSend", {
          option: "GetInitialRouteStarted",
          pROUTE_ID: data.default_warehouse
        });

        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var requestTransfer = new pSqlInstance.Request(connection);
          requestTransfer.verbose = _cnnServ.GetVerbose();
          requestTransfer.stream = false;

          requestTransfer.input(
            "CODE_ROUTE",
            pSqlInstance.VarChar,
            data.routeid
          );

          requestTransfer.execute("SONDA_SP_TRANSFER_SKU_FOR_POS", function(
            errTransfer,
            recordsetsTransfer,
            returnValueTransfer
          ) {
            if (errTransfer === undefined) {
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

              request.execute("SONDA_SP_Stock", function(
                err,
                recordsets,
                returnValue
              ) {
                pReturned = request.parameters.pRESULT.value;

                socket.emit("GetInitialRouteSend", {
                  option: "getroute_inv_completed",
                  pResult: pReturned,
                  pROUTE_ID: data.default_warehouse
                });

                socket.emit("GetInitialRouteSend", {
                  option: "requested_skus",
                  routeid: data.default_warehouse
                });
                connection.close();
                pSqlInstance.close();
                if (pReturned === "OK") {
                  if (successCallback != undefined)
                    successCallback(data, socket);
                  resolve({ data: data, socket: socket });
                } else {
                  if (errCallback != undefined)
                    errCallback(
                      "Error al Preparar skus para ruta:" + pReturned,
                      socket
                    );
                  reject({
                    Message: "Error al Preparar skus para ruta:" + pReturned,
                    socket: socket
                  });
                }
              });
            } else {
              if (errCallback != undefined)
                errCallback(
                  "Error al transferir skus para ruta: " + errTransfer.message,
                  socket
                );
              reject({
                Message:
                  "Error al transferir skus para ruta: " + errTransfer.message,
                socket: socket
              });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al Preparar skus para ruta " + e.message, socket);
        reject({
          Message: "Error al Preparar skus para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSkus: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          var rowscount = 0;
          var sql = [];

          sql.push("SELECT SKU, SKU_NAME, 0 AS SKU_PRICE, REQUERIES_SERIE");
          sql.push(
            " , IS_KIT, ON_HAND, ROUTE_ID, IS_PARENT, PARENT_SKU, ISNULL(EXPOSURE,0) AS EXPOSURE"
          );
          sql.push(
            " , PRIORITY, QTY_RELATED, CODE_FAMILY_SKU, SALES_PACK_UNIT "
          );
          sql.push(" , ISNULL(TAX_CODE,'E') AS TAX_CODE ");
          sql.push(" , CODE_PACK_UNIT_STOCK");
          sql.push(
            " FROM SONDA_POS_SKUS WHERE ROUTE_ID = '" +
              data.default_warehouse +
              "' AND ON_HAND > 0"
          );

          request.query(sql.join(""), function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("getskus.sql.err: " + err, socket);
              reject({ Message: "getskus.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_skus_found",
                routeid: data.default_warehouse
              });
              poucDbService.addError(data, {
                option: "no_skus_found",
                routeid: data.default_warehouse
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_pos_sku",
              row: row
            });
            poucDbService.addSku(data, row);
            rowscount++;
          });

          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "pos_skus_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al obtener skus para ruta " + e.message, socket);
        reject({
          Message: "Error al obtener skus para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSeries: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_serie",
            routeid: data.default_warehouse
          });
          var pSql =
            "SELECT * FROM ferco.S_INVENTORY_SERIAL('" +
            data.default_warehouse +
            "')";
          var rowscount = 0;
          request.query(pSql, function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("getskuseries.sql.err: " + err, socket);
              reject({
                Message: "getskuseries.sql.err: " + err,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_series_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_series_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_series",
              row: row
            });
            poucDbService.addSkuSerie(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "series_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al obtener series para ruta " + e.message, socket);
        reject({
          Message: "Error al obtener series para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetTags: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_tags",
            routeid: data.default_warehouse
          });
          var pSql =
            " SELECT TAG_COLOR, TAG_VALUE_TEXT, TAG_PRIORITY, TAG_COMMENTS, [TYPE] FROM SWIFT_TAGS WHERE [TYPE] = 'CUSTOMER' ";
          var rowscount = 0;
          request.query(pSql, function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettags.sql.err: " + err, socket);
              reject({ Message: "gettags.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_tags_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_tags_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_tags",
              row: row
            });
            poucDbService.addTag(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "tags_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener etiquetas para ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener etiquetas para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetCustomer: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_get_customer",
            routeid: data.default_warehouse
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute("SWIFT_SP_GET_CUSTUMER_FOR_SCOUTING", function(
            err,
            recordset
          ) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettags.sql.err: " + err, socket);
              reject({ Message: "gettags.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_customer_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_customer_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_get_customer",
              row: row
            });
            poucDbService.addToCustomer(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_customer_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener clientes para ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener clientes para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetCustomerFrequency: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_get_customer_frequency",
            routeid: data.default_warehouse
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute(
            "SWIFT_SP_GET_CUSTUMER_FREQUENCY_FOR_SCOUTING",
            function(err, recordset) {
              // ... error checks
              if (err) {
                if (errCallback != undefined)
                  errCallback("gettags.sql.err: " + err, socket);
                reject({ Message: "gettags.sql.err: " + err, socket: socket });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "no_get_customer_frequency_found",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "no_get_customer_frequency_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_customer_frequency",
              row: row
            });
            poucDbService.addCustomerFrequency(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_customer_frequency_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener clientes para ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener clientes para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetTagsXCustomer: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_get_tags_x_customer",
            routeid: data.default_warehouse
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute("SWIFT_SP_GET_TAG_X_CUSTUMER_FOR_SCOUTING", function(
            err,
            recordset
          ) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettags.sql.err: " + err, socket);
              reject({ Message: "", socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_tags_x_customer_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_tags_x_customer_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_get_tags_x_customer",
              row: row
            });
            poucDbService.addTagXCustomer(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_tags_x_customer_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener clientes para ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener clientes para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetRules: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSend", {
            option: "requested_get_rules",
            routeid: data.default_warehouse
          });
          request.input("Route", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute("SWIFT_SP_GET_RULE", function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettags.sql.err: " + err, socket);
              reject({ Message: "gettags.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_rules_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_rules_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_rule",
              row: row
            });
            poucDbService.addRule(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_rules_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al obtener reglas para ruta " + e.message, socket);
        resolve({
          Message: "Error al obtener reglas para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetTasks: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSend", {
            option: "requested_get_tasks",
            routeid: data.default_warehouse
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute("SONDA_SP_GET_ROUTE_PLAN", function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettask.sql.err: " + err, socket);
              reject({ Message: "gettask.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_tasks_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_tasks_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_task",
              row: row
            });
            poucDbService.addToTask(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_tasks_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al obtener reglas para ruta " + e.message, socket);
        reject({
          Message: "Error al obtener reglas para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSkuPreSale: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_get_sku_presale",
            routeid: data.default_warehouse
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_SKU", function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettask.sql.err: " + err, socket);
              reject({ Message: "gettask.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_sku_presale_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_sku_presale_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_sku_presale",
              row: row
            });
            poucDbService.addSkuPresale(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_sku_presale_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener sku para las ordenes de venta " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener sku para las ordenes de venta " + e.message,
          socket: socket
        });
      }
    });
  },
  SetActiveRouteStart: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        socket.emit("GetInitialRouteSend", {
          option: "SetActiveRoute",
          RouteId: data.routeid
        });
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.input("IS_ACTIVE_ROUTE", pSqlInstance.Int, 1);

          request.execute("SWIFT_SP_ROUTE_CHANGE_ACTIVE", function(
            err,
            recordsets,
            returnValue
          ) {
            connection.close();
            pSqlInstance.close();

            if (err === undefined) {
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            } else {
              if (errCallback != undefined)
                errCallback("Error al activar ruta " + err.message, socket);
              reject({
                Message: "Error al activar ruta " + err.message,
                socket: socket
              });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al Preparar skus para ruta " + e.message, socket);
        reject({
          Message: "Error al Preparar skus para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  SendError: function(message, socket) {
    socket.emit("GetInitialRouteSend", {
      option: "error_message",
      message: message
    });
  },
  SyncTag: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_BROADCAST", pSqlInstance.VarChar, data.Id);
        request.input("SOURCE_TABLE", pSqlInstance.VarChar, "SWIFT_TAGS");
        request.input("SOURCE_KEY", pSqlInstance.VarChar, "TAG_COLOR");
        request.input("SOURCE_VALUE", pSqlInstance.VarChar, data.TagColor);
        request.input(
          "OPERATION_TYPE",
          pSqlInstance.VarChar,
          data.BroadcastOperacion
        );
        request.execute("SWIFT_SP_BROADCAST_NEW", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            socket.broadcast.emit("new_broadcast", {
              Type: "tag",
              AssignedTo: data.AssignedTo,
              data: data
            });
            console.log("sync_tag_success");
          } else {
            console.log("sync_tag_fail en BDD: " + err.message, "error");
            connection.close();
            pSqlInstance.close();
          }
        });
      });
    } catch (err) {
      console.log("sync_tag_fail en catch: " + err.Message, "error");
    }
  },
  UpdateBroadcast: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_BROADCAST", pSqlInstance.VarChar, data.Id);
        request.input("ADDRESSEE", pSqlInstance.VarChar, data.routeid);
        request.input("STATUS", pSqlInstance.VarChar, data.Status);
        request.execute("SWIFT_SP_BROADCAST_UPDATE", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            console.log("UpdateBroadcast_success");
          } else {
            console.log("UpdateBroadcast_fail en BDD: " + err.message, "error");
            connection.close();
            pSqlInstance.close();
          }
        });
      });
    } catch (err) {
      console.log("UpdateBroadcast_fail en catch: " + err.Message, "error");
    }
  },
  DeleteBroadcast: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_BROADCAST", pSqlInstance.VarChar, data.Id);
        request.input("ADDRESSEE", pSqlInstance.VarChar, data.routeid);
        request.execute("SWIFT_SP_BROADCAST_DELETE", function(
          err,
          recordsets,
          returnValue
        ) {
          if (err === undefined) {
            console.log("DeleteBroadcast_success");
          } else {
            console.log("DeleteBroadcast_fail en BDD: " + err.message, "error");
            connection.close();
            pSqlInstance.close();
          }
        });
      });
    } catch (err) {
      console.log("DeleteBroadcast_fail en catch: " + err.Message, "error");
    }
  },
  ValidateRoute: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SWIFT_SP_VALIDATE_ROUTE", function(
            err,
            recordsets,
            returnValue
          ) {
            if (err === undefined) {
              if (recordsets[0][0].RESULT === "Exito") {
                socket.emit("ValidateRoute_success", { data: data });
                resolve({ data: data, socket: socket });
              } else {
                socket.emit("ValidateRoute_fail", {
                  data: data,
                  message: recordsets[0][0].RESULT
                });
                console.log("ValidateRoute_fail", "warn");
                reject({ Message: recordsets[0][0].RESULT, socket: socket });
              }
            } else {
              console.log("ValidateRoute_fail en BDD: " + err.message, "error");
              socket.emit("ValidateRoute_fail", {
                data: data,
                message: err.Message
              });
              connection.close();
              pSqlInstance.close();
              reject({ Message: err.Message, socket: socket });
            }
          });
        });
      } catch (err) {
        console.log("ValidateRoute_fail en catch: " + err.Message, "error");
        socket.emit("ValidateRoute_fail", { data: data, message: err.Message });
        reject({ Message: err.Message, socket: socket });
      }
    });
  },
  GetRouteInfo: function(data, socket) {
    try {
      console.log("GetRouteInfo_Send_Start");
      socket.emit("GetRouteInfo_Send", {
        option: "GetRouteInfo_Send_Start",
        data: data
      });

      GetUserInfo(
        data,
        socket,
        function(data, socket) {
          GetResolution(
            data,
            socket,
            function(data, socket) {
              GetDocumentsSequence(
                data,
                socket,
                function(data, socket) {
                  //console.log("GetReviewTask_Start");
                  GetReviewTask(
                    data,
                    socket,
                    function(data, socket) {
                      socket.emit("GetRouteInfo_Send", {
                        option: "GetReviewTask",
                        data: data
                      });

                      GetReviewQty(
                        data,
                        socket,
                        function(data, socket) {
                          console.log("GetReasons.tostart");
                          GetReasons(
                            data,
                            socket,
                            function(data, socket) {
                              socket.emit("GetRouteInfo_Send", {
                                option: "GetRouteInfo_Send_success",
                                data: data
                              });
                            },
                            function(error, socket) {
                              socket.emit("GetRouteInfo_Send", {
                                option: "GetRouteInfo_Send_fail",
                                data: data,
                                message: message
                              });
                            }
                          );
                        },
                        function(message, socket) {
                          socket.emit("GetRouteInfo_Send", {
                            option: "GetRouteInfo_Send_fail",
                            data: data,
                            message: message
                          });
                          console.log(
                            "GetRouteInfo_Send_fail en GetReviewQty: " +
                              message,
                            "error"
                          );
                        }
                      );
                    },
                    function(message, socket) {
                      socket.emit("GetRouteInfo_Send", {
                        option: "GetRouteInfo_Send_fail",
                        data: data,
                        message: message
                      });
                      console.log(
                        "GetRouteInfo_Send_fail en GetReviewTask: " + message
                      );
                    }
                  );
                },
                function(message, socket) {
                  socket.emit("GetRouteInfo_Send", {
                    option: "GetRouteInfo_Send_fail",
                    data: data,
                    message: message
                  });
                  console.log(
                    "GetRouteInfo_Send_fail en GetDocumentsSequence: " +
                      message,
                    "error"
                  );
                }
              );
            },
            function(message, socket) {
              socket.emit("GetRouteInfo_Send", {
                option: "GetRouteInfo_Send_fail",
                data: data,
                message: message
              });
              console.log(
                "GetRouteInfo_Send_fail en GetResolution: " + message,
                "error"
              );
            }
          );
        },
        function(message, socket) {
          socket.emit("GetRouteInfo_Send", {
            option: "GetRouteInfo_Send_fail",
            data: data,
            message: message
          });
          console.log(
            "GetRouteInfo_Send_fail en GetUserInfo: " + message,
            "error"
          );
        }
      );
    } catch (err) {
      socket.emit("GetRouteInfo_Send", {
        option: "GetRouteInfo_Send_fail",
        data: data,
        message: err.Message
      });
      console.log("GetRouteInfo_Send_fail en catch: " + err.Message, "error");
    }
  },
  GetCompanies: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;
          request.execute("SWIFT_SP_GET_COMPANY", function(
            err,
            recordsets,
            returnValue
          ) {
            if (err === undefined) {
              var comps = [];
              for (var i = 0; i < recordsets[0].length; i++) {
                var comp = {
                  COMPANY_ID: recordsets[0][i].COMPANY_ID,
                  COMPANY_NAME: recordsets[0][i].COMPANY_NAME
                };
                comps.push(comp);
              }
              socket.emit("GetCompanies_Success", { data: comps });
              console.log("GetCompanies_Success");
              resolve({ data: data, socket: socket });
            } else {
              console.log("GetCompanies_fail en BDD: " + err.message, "error");
              reject({ Message: err.Message, socket: socket });
              connection.close();
              pSqlInstance.close();
            }
          });
        });
      } catch (err) {
        console.log("GetCompanies_fail en catch: " + err.Message, "error");
        reject({ Message: err.Message, socket: socket });
      }
    });
  },
  GetBroadcastLost: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
        request.execute("SWIFT_SP_GET_BROADCAST_BY_ROUTE", function(
          err,
          recordsets
        ) {
          if (err === undefined) {
            for (var i = 0; i < recordsets[0].length; i++) {
              switch (recordsets[0][i].SOURCE_TABLE) {
                case "SWIFT_TAGS":
                  GetTagsByTagColor(
                    recordsets[0][i].SOURCE_VALUE,
                    data,
                    recordsets[0][i].OPERATION_TYPE,
                    socket,
                    function() {},
                    function(message) {
                      console.log(
                        "GetTagsByTagColor_fail: " + message,
                        "error"
                      );
                    }
                  );
                  break;
                case "SWIFT_TRANSFER_HEADER":
                  GetTransferByTransferId(
                    recordsets[0][i].CODE_BROADCAST,
                    recordsets[0][i].SOURCE_VALUE,
                    data,
                    recordsets[0][i].OPERATION_TYPE,
                    socket,
                    function() {},
                    function(message) {
                      console.log(
                        "GetTransferByTransferId_fail: " + message,
                        "error"
                      );
                    }
                  );
                  break;
              }
            }
          } else {
            console.log(
              "GetBroadcastLost_fail en BDD: " + err.message,
              "error"
            );
            connection.close();
            pSqlInstance.close();
          }
        });
      });
    } catch (err) {
      console.log("GetBroadcastLost_fail en catch: " + err.Message, "error");
    }
  },
  GetDocumentSequence: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetDocumentSequence_start",
            routeid: data.routeid
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          var rowscount = 0;
          request.execute("SONDA_SP_GET_DOCUMENT_SEQUENCE", function(
            err,
            recordset
          ) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("GetDocumentSequence.sql.err: " + err, socket);
              reject({
                Message: "GetDocumentSequence.sql.err: " + err,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetDocumentSequence_NoFound",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "GetDocumentSequence_NoFound",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "GetDocumentSequence_AddDocument",
              row: row
            });
            poucDbService.addDocumentSequence(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetDocumentSequence_Completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las secuencias de documentos " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener las secuencias de documentos " + e.message,
          socket: socket
        });
      }
    });
  },
  GetPackUnit: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetPackUnit_start",
            routeid: data.routeid
          });

          var rowscount = 0;
          request.execute("SONDA_SP_GET_PACK_UNIT", function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("GetPackUnit.sql.err: " + err, socket);
              reject({
                Message: "GetPackUnit.sql.err: " + err,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetPackUnit_NoFound",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "GetPackUnit_NoFound",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackUnit_AddPackUnit",
              row: row
            });
            poucDbService.addPackUnit(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackUnit_Completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback("Error al obtener los paquetes " + e.message, socket);
        reject({
          Message: "Error al obtener los paquetes " + e.message,
          socket: socket
        });
      }
    });
  },
  GetPackConversion: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetPackConversion_start",
            routeid: data.routeid
          });

          var rowscount = 0;
          request.execute("SONDA_SP_GET_PACK_CONVERSION", function(
            err,
            recordset
          ) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("GetPackConversion.sql.err: " + err, socket);
              reject({
                Message: "GetPackConversion.sql.err: " + err,
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
              poucDbService.addError(data, {
                option: "GetPackConversion_NoFound",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackConversion_AddPackConversion",
              row: row
            });
            poucDbService.addPackConversion(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPackConversion_Completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
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
  GetFamilySku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          socket.emit("GetInitialRouteSends", {
            option: "requested_get_family_sku",
            routeid: data.default_warehouse
          });

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_FAMILY_SKU", function(err, recordset) {
            // ... error checks
            if (err) {
              if (errCallback != undefined)
                errCallback("gettags.sql.err: " + err, socket);
              reject({ Message: "gettags.sql.err: " + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_get_family_sku_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "no_get_family_sku_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_to_get_family_sku",
              row: row
            });
            poucDbService.addFamilySku(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_family_sku_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener familias por sku para ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener familias por sku para ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetInvoiceActive: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          if (data.codeCustomer !== undefined && data.codeCustomer !== null) {
            request.input(
              "CODE_CUSTOMER",
              pSqlInstance.VarChar,
              data.codeCustomer
            );
          }

          request.execute("SONDA_SP_GET_INVOICE_ACTIVE_HEADER", function(
            err,
            recordsets,
            returnValue
          ) {
            connection.close();
            pSqlInstance.close();
            var lstInvoice = Array();
            if (err === undefined) {
              if (!recordsets[0]) {
                socket.emit("GetInvoice_Request", {
                  option: "NoGetInvoiceFound"
                });
                poucDbService.addError(data, { option: "NoGetInvoiceFound" });
                if (successCallback != undefined)
                  successCallback(data, lstInvoice);
                resolve({ data: data, socket: socket });
              } else {
                for (var i = 0; i < recordsets[0].length; i++) {
                  var docRouteReturn = {
                    docEntry: recordsets[0][i].DOC_ENTRY,
                    invoiceId: recordsets[0][i].DOC_NUM,
                    totalAmount: recordsets[0][i].DOC_TOTAL,
                    paidToDate: recordsets[0][i].PAID_TO_DATE,
                    docDueDate: recordsets[0][i].DOC_DUE_DATE,
                    clientId: recordsets[0][i].CARD_CODE,
                    serie: recordsets[0][i].SERIE,
                    resolution: recordsets[0][i].RESOLUTION,
                    docDate: recordsets[0][i].DOC_DATE,
                    details: Array()
                  };
                  lstInvoice.push(docRouteReturn);
                }
                if (successCallback != undefined)
                  successCallback(data, lstInvoice);
                resolve({ data: data, socket: socket, extra1: lstInvoice });
              }
            } else {
              if (errCallback != undefined)
                errCallback(
                  "Error al obtener las facturas ruta " + err.message,
                  socket
                );
              reject({
                Message: "#Error al obtener las facturas ruta " + err.message,
                socket: socket
              });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las facturas ruta " + e.message,
            socket
          );
        reject({
          Message: "$Error al obtener las facturas ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  TravelListInvoice: function(
    data,
    socket,
    lstInvoice,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        if (lstInvoice.length !== 0) {
          var connection = _cnnServ.ConnectDb(data, function(
            err,
            pSqlInstance
          ) {
            var latest = 0;
            for (var i = 0; i < lstInvoice.length; i++) {
              if (i === lstInvoice.length - 1) {
                latest = 1;
              }
              GetInvoiceDetail(
                lstInvoice[i],
                latest,
                connection,
                pSqlInstance,
                socket,
                function(latestR) {
                  if (latestR === 1) {
                    connection.close();
                    pSqlInstance.close();
                    //---
                    socket.emit("GetInvoice_Request", {
                      option: "GetInvoiceComplete"
                    });
                    if (successCallback != undefined)
                      successCallback(data, socket);
                    resolve({ data: data, socket: socket });
                  }
                },
                function(err) {
                  if (errCallback != undefined)
                    errCallback(
                      "Error al obtener las facturas ruta " + err.message,
                      socket
                    );
                  reject({
                    Message:
                      "Error al obtener las facturas ruta " + err.message,
                    socket: socket
                  });
                }
              );
            }
          });
        } else {
          if (successCallback != undefined) successCallback(data, socket);
          resolve({ data: data, socket: socket });
        }
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las facturas ruta " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener las facturas ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetPriceListByCustomer: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_price_list_by_customer_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_PRICE_LIST_BY_CUSTOMER_FOR_ROUTE",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined) {
                  errCallback("GetInitialRouteSend" + err, socket);
                }
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "no_price_list_by_customer_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) {
                  successCallback(data, socket);
                }
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_price_list_by_customer",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_price_list_by_customer_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) {
              successCallback(data, socket);
            }
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Precios por Cliente para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Precios por Cliente para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetPriceListBySku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_price_list_by_sku_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_PRICE_LIST_BY_SKU_FOR_ROUTE", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_price_list_by_sku_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) {
                successCallback(data, socket);
              }
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_price_list_by_sku",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_price_list_by_sku_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) {
              successCallback(data, socket);
            }
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Precios por SKU para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Precios por SKU para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDefaultPriceList: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_price_list_default_received"
          });
          var login =
            data.loginid === undefined ? data.loggeduser : data.loginid;
          request.input("LOGIN", pSqlInstance.VarChar, login);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_DEFAULT_PRICE_LIST", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_default_price_list",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_default_price_list",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_price_list_default",
              row: row
            });
            poucDbService.addPriceListDefault(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_price_list_default_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Precios Default para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Precios Default para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetItemHistory: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_ITEM_HISTORY_BY_ROUTE", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_item_history",
                routeid: data.routeid
              });

              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_item_history",
              row: row
            });
            poucDbService.addItemHistory(data, row);
            rowscount++;
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "get_price_item_history_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el Historial de Pedidos de la ruta " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el Historial de Pedidos de la ruta " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSalesOrderDraft: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          socket.emit("GetInitialRouteSend", {
            option: "get_sales_order_draft_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_SALES_ORDER_DRAFT", function(
            err,
            recordset
          ) {
            connection.close();
            pSqlInstance.close();
            var lstSalesOrderDraft = Array();

            if (err === undefined) {
              if (recordset[0].length === 0) {
                socket.emit("GetInitialRouteSend", {
                  option: "not_found_sales_order_draft",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_found_sales_order_draft",
                  routeid: data.routeid
                });
                if (successCallback != undefined)
                  successCallback(data, socket, lstSalesOrderDraft);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstSalesOrderDraft
                });
              } else {
                for (var j = 0; j < recordset[0].length; j++) {
                  var salesOrderDraft = {
                    SALES_ORDER_ID: recordset[0][j].SALES_ORDER_ID,
                    TERMS: recordset[0][j].TERMS,
                    POSTED_DATETIME: recordset[0][j].POSTED_DATETIME,
                    CLIENT_ID: recordset[0][j].CLIENT_ID,
                    POS_TERMINAL: recordset[0][j].POS_TERMINAL,
                    GPS_URL: recordset[0][j].GPS_URL,
                    TOTAL_AMOUNT: recordset[0][j].TOTAL_AMOUNT,
                    STATUS: recordset[0][j].STATUS,
                    POSTED_BY: recordset[0][j].POSTED_BY,
                    IMAGE_1: recordset[0][j].IMAGE_1,
                    IMAGE_2: recordset[0][j].IMAGE_2,
                    IMAGE_3: recordset[0][j].IMAGE_3,
                    DEVICE_BATTERY_FACTOR:
                      recordset[0][j].DEVICE_BATTERY_FACTOR,
                    VOID_DATETIME: recordset[0][j].VOID_DATETIME,
                    VOID_REASON: recordset[0][j].VOID_REASON,
                    VOID_NOTES: recordset[0][j].VOID_NOTES,
                    VOIDED: recordset[0][j].VOIDED,
                    CLOSED_ROUTE_DATETIME:
                      recordset[0][j].CLOSED_ROUTE_DATETIME,
                    IS_ACTIVE_ROUTE: recordset[0][j].IS_ACTIVE_ROUTE,
                    GPS_EXPECTED: recordset[0][j].GPS_EXPECTED,
                    DELIVERY_DATE: recordset[0][j].DELIVERY_DATE,
                    SALES_ORDER_ID_HH: recordset[0][j].SALES_ORDER_ID_HH,
                    ATTEMPTED_WITH_ERROR: recordset[0][j].ATTEMPTED_WITH_ERROR,
                    IS_POSTED_ERP: recordset[0][j].IS_POSTED_ERP,
                    POSTED_ERP: recordset[0][j].POSTED_ERP,
                    POSTED_RESPONSE: recordset[0][j].POSTED_RESPONSE,
                    IS_PARENT: recordset[0][j].IS_PARENT,
                    REFERENCE_ID: recordset[0][j].REFERENCE_ID,
                    WAREHOUSE: recordset[0][j].WAREHOUSE,
                    TIMES_PRINTED: recordset[0][j].TIMES_PRINTED,
                    DOC_SERIE: recordset[0][j].DOC_SERIE,
                    DOC_NUM: recordset[0][j].DOC_NUM,
                    IS_VOID: recordset[0][j].IS_VOID,
                    SALES_ORDER_TYPE: recordset[0][j].SALES_ORDER_TYPE,
                    DISCOUNT: recordset[0][j].DISCOUNT,
                    IS_DRAFT: recordset[0][j].IS_DRAFT,
                    details: Array()
                  };
                  lstSalesOrderDraft.push(salesOrderDraft);
                }
                if (successCallback != undefined)
                  successCallback(data, socket, lstSalesOrderDraft);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstSalesOrderDraft
                });
              }
            } else {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el Listado de Ordenes de Venta Draft de la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el Listado de Ordenes de Venta Draft de la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  TravelListSalesOrderDraft: function(
    data,
    socket,
    lstSalesOrderDraft,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        if (lstSalesOrderDraft.length !== 0) {
          var connection = _cnnServ.ConnectDb(data, function(
            err,
            pSqlInstance
          ) {
            var latest = 0;
            for (var i = 0; i < lstSalesOrderDraft.length; i++) {
              if (i === lstSalesOrderDraft.length - 1) {
                latest = 1;
              }
              GetSalesOrderDetailDraft(
                lstSalesOrderDraft[i],
                latest,
                connection,
                pSqlInstance,
                socket,
                function(latestR) {
                  if (latestR === 1) {
                    connection.close();
                    pSqlInstance.close();
                    //-------------------------------------------------------------------
                    socket.emit("GetInitialRouteSend", {
                      option: "GetSalesOrderDraftComplete"
                    });
                    if (successCallback != undefined)
                      successCallback(data, socket);
                    resolve({ data: data, socket: socket });
                  }
                },
                function(err) {
                  if (errCallback != undefined)
                    errCallback(
                      "Error al obtener las Ordenes de Venta Draft para la ruta " +
                        err.message,
                      socket
                    );
                  reject({
                    Message:
                      "Error al obtener las Ordenes de Venta Draft para la ruta " +
                      err.message,
                    socket: socket
                  });
                }
              );
            }
          });
        } else {
          if (successCallback != undefined) successCallback(data, socket);
          resolve({ data: data, socket: socket });
        }
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Ordenes de Venta Draft para la ruta  " +
              e.message,
            socket
          );
        reject({ Message: "", socket: socket });
      }
    });
  },
  GetInvoiceDraft: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;

          socket.emit("GetInitialRouteSend", {
            option: "get_invoice_draft_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          //var rowscount = 0;
          request.execute("SONDA_SP_GET_INVOICE_DRAFT", function(
            err,
            recordset
          ) {
            connection.close();
            pSqlInstance.close();
            var lstInvoiceDraft = Array();

            if (err === undefined) {
              if (recordset[0].length === 0) {
                socket.emit("GetInitialRouteSend", {
                  option: "not_found_invoice_draft",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_found_invoice_draft",
                  routeid: data.routeid
                });
                if (successCallback != undefined)
                  successCallback(data, socket, lstInvoiceDraft);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstInvoiceDraft
                });
              } else {
                for (var i = 0; i < recordset[0].length; i++) {
                  var invoiceDraft = {
                    INVOICE_ID: recordset[0][i].INVOICE_ID,
                    TERMS: recordset[0][i].TERMS,
                    POSTED_DATETIME: recordset[0][i].POSTED_DATETIME,
                    CLIENT_ID: recordset[0][i].CLIENT_ID,
                    POS_TERMINAL: recordset[0][i].POS_TERMINAL,
                    GPS_URL: recordset[0][i].GPS_URL,
                    TOTAL_AMOUNT: recordset[0][i].TOTAL_AMOUNT,
                    STATUS: recordset[0][i].STATUS,
                    POSTED_BY: recordset[0][i].POSTED_BY,
                    IMAGE_1: recordset[0][i].IMAGE_1,
                    IMAGE_2: recordset[0][i].IMAGE_2,
                    IMAGE_3: recordset[0][i].IMAGE_3,
                    IS_POSTED_OFFLINE: recordset[0][i].IS_POSTED_OFFLINE,
                    INVOICED_DATETIME: recordset[0][i].INVOICED_DATETIME,
                    DEVICE_BATTERY_FACTOR:
                      recordset[0][i].DEVICE_BATTERY_FACTOR,
                    CDF_INVOICENUM: recordset[0][i].CDF_INVOICENUM,
                    CDF_DOCENTRY: recordset[0][i].CDF_DOCENTRY,
                    CDF_SERIE: recordset[0][i].CDF_SERIE,
                    CDF_NIT: recordset[0][i].CDF_NIT,
                    CDF_NOMBRECLIENTE: recordset[0][i].CDF_NOMBRECLIENTE,
                    CDF_RESOLUCION: recordset[0][i].CDF_RESOLUCION,
                    CDF_POSTED_ERP: recordset[0][i].CDF_POSTED_ERP,
                    IS_CREDIT_NOTE: recordset[0][i].IS_CREDIT_NOTE,
                    VOID_DATETIME: recordset[0][i].VOID_DATETIME,
                    CDF_PRINTED_COUNT: recordset[0][i].CDF_PRINTED_COUNT,
                    VOID_REASON: recordset[0][i].VOID_REASON,
                    VOID_NOTES: recordset[0][i].VOID_NOTES,
                    VOIDED_INVOICE: recordset[0][i].VOIDED_INVOICE,
                    CLOSED_ROUTE_DATETIME:
                      recordset[0][i].CLOSED_ROUTE_DATETIME,
                    CLEARING_DATETIME: recordset[0][i].CLEARING_DATETIME,
                    IS_ACTIVE_ROUTE: recordset[0][i].IS_ACTIVE_ROUTE,
                    SOURCE_CODE: recordset[0][i].SOURCE_CODE,
                    GPS_EXPECTED: recordset[0][i].GPS_EXPECTED,
                    ATTEMPTED_WITH_ERROR: recordset[0][i].ATTEMPTED_WITH_ERROR,
                    IS_POSTED_ERP: recordset[0][i].IS_POSTED_ERP,
                    POSTED_ERP: recordset[0][i].POSTED_ERP,
                    POSTED_RESPONSE: recordset[0][i].POSTED_RESPONSE,
                    IS_DRAFT: recordset[0][i].IS_DRAFT,
                    details: Array()
                  };
                  lstInvoiceDraft.push(invoiceDraft);
                }
                if (successCallback != undefined)
                  successCallback(data, socket, lstInvoiceDraft);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstInvoiceDraft
                });
              }
            } else {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el Listado de Facturas Draft de la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el Listado de Facturas Draft de la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  TravelListInvoiceDraft: function(
    data,
    socket,
    lstInvoiceDraft,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        if (lstInvoiceDraft.length !== 0) {
          var connection = _cnnServ.ConnectDb(data, function(
            err,
            pSqlInstance
          ) {
            var latest = 0;
            for (var i = 0; i < lstInvoiceDraft.length; i++) {
              if (i === lstInvoiceDraft.length - 1) {
                latest = 1;
              }
              GetInvoiceDetailDraft(
                lstInvoiceDraft[i],
                latest,
                connection,
                pSqlInstance,
                socket,
                function(latestR) {
                  if (latestR === 1) {
                    connection.close();
                    pSqlInstance.close();
                    //-------------------------------------------------------------------
                    socket.emit("GetInitialRouteSend", {
                      option: "GetInvoiceComplete"
                    });
                    if (successCallback != undefined)
                      successCallback(data, socket);
                    resolve({ data: data, socket: socket });
                  }
                },
                function(err) {
                  if (errCallback != undefined)
                    errCallback(
                      "Error al obtener los Detalles de las Facturas Draft para la ruta " +
                        err.message,
                      socket
                    );
                  reject({
                    Message:
                      "Error al obtener los Detalles de las Facturas Draft para la ruta ",
                    socket: socket
                  });
                }
              );
            }
          });
        } else {
          if (successCallback != undefined) successCallback(data, socket);
          resolve({ data: data, socket: socket });
        }
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener los Detalles de las Facturas Draft para la ruta  " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener los Detalles de las Facturas Draft para la ruta  " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetCalculationRules: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetCalculationRules_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "CALCULATION_RULES");

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER_GROUP", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_CalculationRules",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_CalculationRules",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetCalculationRules",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetCalculationRules_completed",
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
            "Error al obtener la secuencia de documentos: " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener la secuencia de documentos: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetDefaultPackSku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_default_pack_sku_received"
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_DEFAULT_PACK_SKU", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_default_pack_sku",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_default_pack_sku",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_default_pack_sku",
              row: row
            });
            poucDbService.addDefaultPackSku(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_default_pack_sku_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Unidades de Paquetes Default de la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Unidades de Paquetes Default de la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetPriceListBySkuPackScale: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetPriceListBySkuPackScale_received"
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PRICE_LIST_BY_SKU_PACK_SCALE", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetPriceListBySkuPackScale",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetPriceListBySkuPackScale",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetPriceListBySkuPackScale",
              row: row
            });
            poucDbService.addPriceXSkuScale(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPriceListBySkuPackScale_completed",
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
            "Error al obtener la lista de precios por escala y unidad de medidada: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener la lista de precios por escala y unidad de medidada: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetPrintUMParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetPrintUMParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input("PARAMETER_ID", pSqlInstance.VarChar, "PRINT_UM");

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetPrintUMParameter",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetPrintUMParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetPrintUMParameter",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetPrintUMParameter_completed",
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
            "Error al obtener el parametro de impresión: " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener el parametro de impresión: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetMaxDiscountParameter: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetMaxDiscountParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input(
            "PARAMETER_ID",
            pSqlInstance.VarChar,
            "USE_MAX_DISCOUNT"
          );

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetMaxDiscountParameter",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetMaxDiscountParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetMaxDiscountParameter",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetMaxDiscountParameter_completed",
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
            "Error al obtener el parametro de descuento maximo: " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de descuento maximo: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSkuByFilterForTakeInventory: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        socket.emit("GetSkuByFilterForTakeInventory", {
          option: "get_sku_by_filter_received"
        });
        request.input("FILTER", pSqlInstance.VarChar, data.sku);
        var rowscount = 0;
        request.execute("SONDA_SP_GET_SKU_BY_FILTER", function(err, recordset) {
          if (err) {
            //errCallback('GetInitialRouteSend' + err, socket);
            socket.emit("GetSkuByFilterForTakeInventory", {
              option: "get_sku_by_filter_error"
            });
          }
          if (recordset.length === 0) {
            connection.close();
            pSqlInstance.close();
            socket.emit("GetSkuByFilterForTakeInventory", {
              option: "get_sku_by_filter_not_found",
              sku: data.sku
            });
            //errCallback(data, socket);
          }
        });
        request.on("row", function(row) {
          socket.emit("GetSkuByFilterForTakeInventory", {
            option: "add_sku_by_filter_for_take_inventory",
            row: row
          });
          rowscount++;
        });
        request.on("done", function(returnValue) {
          socket.emit("GetSkuByFilterForTakeInventory", {
            option: "get_sku_by_filter_completed",
            rowcount: rowscount
          });
          console.log("Skus encontrados: " + rowscount, "info");
          rowscount = 0;
          connection.close();
          pSqlInstance.close();
          //successCallback(data, socket);
        });
      });
    } catch (err) {
      console.log(
        "GetSkuByFilterForTakeInventory en catch: " + err.message,
        "error"
      );
      //errCallback("Error al obtener el parametro de impresión: " + e.message, socket);
    }
  },
  GetBonusListByCustomer: function(data, socket, successCallback, errCallback) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        socket.emit("GetInitialRouteSend", {
          option: "get_bonus_list_by_customer_received",
          routeid: data.routeid
        });
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

        var rowscount = 0;
        request.execute(
          "SONDA_SP_GET_BONUS_LIST_BY_CUSTOMER_FOR_ROUTE",
          function(err, recordset) {
            if (err) {
              errCallback("GetInitialRouteSend" + err, socket);
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_bonus_list_by_customer_found",
                routeid: data.routeid
              });
              successCallback(data, socket);
            }
          }
        );
        request.on("row", function(row) {
          socket.emit("GetInitialRouteSend", {
            option: "add_bonus_list_by_customer",
            row: row
          });
          rowscount++;
        });
        request.on("done", function(returnValue) {
          socket.emit("GetInitialRouteSend", {
            option: "get_bonus_list_by_customer_completed",
            rowcount: rowscount
          });
          rowscount = 0;
          connection.close();
          pSqlInstance.close();
          successCallback(data, socket);
        });
      });
    } catch (e) {
      errCallback(
        "Error al obtener las Listas de Bonos por Cliente para la ruta " +
          e.message,
        socket
      );
    }
  },
  GetBonusListBySku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_bonus_list_by_sku_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_BONUS_LIST_BY_SKU_FOR_ROUTE", function(
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
              socket.emit("GetInitialRouteSend", {
                option: "not_bonus_list_by_sku_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_bonus_list_by_sku_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_bonus_list_by_sku",
              row: row
            });
            poucDbService.addBonusListBySku(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_bonus_list_by_sku_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Bonos por SKU para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Bonos por SKU para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDiscountListByCustomer: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = true;

        socket.emit("GetInitialRouteSend", {
          option: "get_discount_list_by_customer_received",
          routeid: data.routeid
        });
        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

        var rowscount = 0;
        request.execute(
          "SONDA_SP_GET_DISCOUNT_LIST_BY_CUSTOMER_FOR_ROUTE",
          function(err, recordset) {
            if (err) {
              errCallback("GetInitialRouteSend" + err, socket);
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "no_discount_list_by_customer_found",
                routeid: data.routeid
              });
              successCallback(data, socket);
            }
          }
        );
        request.on("row", function(row) {
          socket.emit("GetInitialRouteSend", {
            option: "add_discount_list_by_customer",
            row: row
          });
          rowscount++;
        });
        request.on("done", function(returnValue) {
          socket.emit("GetInitialRouteSend", {
            option: "get_discount_list_by_customer_completed",
            rowcount: rowscount
          });
          rowscount = 0;
          connection.close();
          pSqlInstance.close();
          successCallback(data, socket);
        });
      });
    } catch (e) {
      errCallback(
        "Error al obtener las Listas de Descuento por Cliente para la ruta " +
          e.message,
        socket
      );
    }
  },
  GetDiscountListBySku: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_discount_list_by_sku_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_DISCOUNT_LIST_BY_SKU_FOR_ROUTE",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined)
                  errCallback("GetInitialRouteSend" + err, socket);
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "not_discount_list_by_sku_found",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_discount_list_by_sku_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_discount_list_by_sku",
              row: row
            });
            poucDbService.addDiscountListBySku(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_discount_list_by_sku_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Descuento por SKU para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Descuento por SKU para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDiscountByGeneralAmountList: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_discount_by_general_amount_list_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_DISCOUNTS_BY_GENERAL_AMOUNT_LIST",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined)
                  errCallback("GetInitialRouteSend" + err, socket);
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "not_discount_by_general_amount_list_found",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_discount_by_general_amount_list_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_discount_by_general_amount_list",
              row: row
            });
            poucDbService.addDiscountXGeneralAmountList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_discount_by_general_amount_list_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Descuento por SKU para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Descuento por SKU para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetConsignmentsByRoute: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          //var rowscount = 0;
          request.execute("SONDA_SP_GET_CONSIGNMENTS_BY_ROUTE", function(
            err,
            recordset
          ) {
            connection.close();
            pSqlInstance.close();
            var lstConsignments = Array();

            if (err === undefined) {
              if (recordset[0].length === 0) {
                socket.emit("GetInitialRouteSend", {
                  option: "not_found_consignments",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_found_consignments",
                  routeid: data.routeid
                });
                if (successCallback != undefined)
                  successCallback(data, socket, lstConsignments);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstConsignments
                });
              } else {
                for (var j = 0; j < recordset[0].length; j++) {
                  var Consignment = {
                    ConsignmentId: recordset[0][j].CONSIGNMENT_ID,
                    CustomerId: recordset[0][j].CUSTOMER_ID,
                    DateCreate: recordset[0][j].DATE_CREATE,
                    DATE_UPDATE: recordset[0][j].DATE_UPDATE,
                    Status: recordset[0][j].STATUS,
                    PostedBy: recordset[0][j].POSTED_BY,
                    IsPosted: recordset[0][j].IS_POSTED,
                    Pos_terminal: recordset[0][j].POS_TERMINAL,
                    Gps: recordset[0][j].GPS_URL,
                    DocDate: recordset[0][j].DOC_DATE,
                    ClosedRouteDateTime: recordset[0][j].CLOSED_ROUTE_DATETIME,
                    IsActiveRoute: recordset[0][j].IS_ACTIVE_ROUTE,
                    DueDate: recordset[0][j].DUE_DATE,
                    ConsignmentHhNum: recordset[0][j].CONSIGNMENT_HH_NUM,
                    DocSerie: recordset[0][j].DOC_SERIE,
                    DocNum: recordset[0][j].DOC_NUM,
                    TotalAmount: recordset[0][j].TOTAL_AMOUNT,
                    IsClosed: recordset[0][j].IS_CLOSED,
                    Image: recordset[0][j].IMG,
                    ConsignmentType: recordset[0][j].CONSIGNMENT_TYPE,
                    detalle: Array()
                  };
                  lstConsignments.push(Consignment);
                }
                if (successCallback != undefined)
                  successCallback(data, socket, lstConsignments);
                resolve({
                  data: data,
                  socket: socket,
                  extra1: lstConsignments
                });
              }
            } else {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el Listado de Consignaciones de la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el Listado de Consignaciones de la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetConsignmentsDetailsByRoute: function(
    data,
    socket,
    lstConsignments,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        if (lstConsignments.length !== 0) {
          var connection = _cnnServ.ConnectDb(data, function(
            err,
            pSqlInstance
          ) {
            var latest = 0;
            for (var i = 0; i < lstConsignments.length; i++) {
              if (i === lstConsignments.length - 1) {
                latest = 1;
              }
              GetConsignmentsDetail(
                lstConsignments[i],
                latest,
                connection,
                pSqlInstance,
                socket,
                function(latestR) {
                  if (latestR === 1) {
                    connection.close();
                    pSqlInstance.close();
                    if (successCallback != undefined)
                      successCallback(data, socket);
                    resolve({ data: data, socket: socket });
                  }
                },
                function(err) {
                  if (errCallback != undefined)
                    errCallback(
                      "Error al obtener las Consignaciones para la ruta " +
                        err.message,
                      socket
                    );
                  reject({
                    Message:
                      "GetConsignments_Details_Error catch: " + err.message,
                    socket: socket
                  });
                }
              );
            }
          });
        } else {
          if (successCallback != undefined) successCallback(data, socket);
          resolve({ data: data, socket: socket });
        }
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Consignaciones para la ruta  " + e.message,
            socket
          );
        console.log(
          "GetConsignments_Detail_Request_Error catch: " + e.message,
          "error"
        );
        reject({
          Message: "GetConsignments_Detail_Request_Error catch: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetParameters: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("send_parameter_from_bo", {
            option: "send_parameter_from_bo_received",
            routeid: data.routeid
          });
          socket.emit("GetInitialRouteSend", {
            option: "send_parameter_from_bo_received",
            routeid: data.routeid
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "CONSIGNMENT");

          var rowscount = 0;
          request.execute("SONDA_SP_GET_PARAMETER_BY_GROUP", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("send_parameter_from_bo", {
                option: "send_parameter_from_bo_fail",
                routeid: data.routeid,
                message: err
              });
              if (errCallback != undefined) errCallback(data, socket);
              reject({ Message: err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("send_parameter_from_bo", {
                option: "send_parameter_from_bo_not_found",
                routeid: data.routeid
              });
              socket.emit("GetInitialRouteSend", {
                option: "send_parameter_from_bo_not_found",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "send_parameter_from_bo_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("send_parameter_from_bo", {
              option: "send_parameter_from_bo_add_row",
              row: row
            });
            socket.emit("GetInitialRouteSend", {
              option: "send_parameter_from_bo_add_row",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("send_parameter_from_bo", {
              option: "send_parameter_from_bo_complete",
              rowcount: rowscount
            });
            socket.emit("GetInitialRouteSend", {
              option: "send_parameter_from_bo_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("send_parameter_from_bo", {
          option: "send_parameter_from_bo_fail",
          routeid: data.routeid,
          message: e.message
        });
        socket.emit("GetInitialRouteSend", {
          option: "send_parameter_from_bo_fail",
          routeid: data.routeid,
          message: e.message
        });
        if (errCallback != undefined) errCallback(e.message, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetInvoiceParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("send_parameter_from_bo", {
            option: "GetInvoiceParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "INVOICE");

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
                option: "not_found_GetInvoiceParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("send_parameter_from_bo", {
              option: "add_GetInvoiceParameter",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("send_parameter_from_bo", {
              option: "GetInvoiceParameter_completed",
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
            "Error al obtener el parametro de factura: " + e.message,
            socket
          );
        reject({
          Message: "Error al obtener el parametro de factura: " + e.message,
          socket: socket
        });
      }
    });
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
              row: row
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
  GetTaxInformationForSkus: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          var rowscount = 0;
          request.execute("SONDA_SP_GET_TAX_FOR_SKU", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("GetInitialRouteSend", {
                option: "tax_information_for_skus_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_tax_for_sku",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_tax_information_for_skus_completed",
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
            "Error al obtener la informacion de impuestos para los skus: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener la informacion de impuestos para los skus: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetNoInvoiceReasons: function(data, socket, successCallBack, errorCallBack) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetNoInvoiceReasonsResponse", {
            option: "get_not_invoice_reasons_request_reived",
            data: data
          });
          socket.emit("GetInitialRouteSend", {
            option: "get_not_invoice_reasons_request_reived",
            data: data
          });
          request.input("GROUP", pSqlInstance.VarChar, "NO_INVOICE_REASON_POS");

          var rowscount = 0;
          request.execute("SWIFT_GET_CLASSIFICATION", function(err, recordset) {
            if (err) {
              socket.emit("GetNoInvoiceReasonsResponse", {
                option: "fail",
                error: err,
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: err,
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: err,
                data: data
              });
              if (errorCallBack != undefined)
                errorCallBack(
                  "No se pudieron obtener las Razones de NO FACTURACION debido a: " +
                    JSON.stringify(err),
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener las Razones de NO FACTURACION debido a: " +
                  JSON.stringify(err),
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetNoInvoiceReasonsResponse", {
                option: "fail",
                error: "No se encontraron razones de NO FACTURACION",
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: "No se encontraron razones de NO FACTURACION",
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: "No se encontraron razones de NO FACTURACION",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetNoInvoiceReasonsResponse", {
              option: "add_reason",
              row: row
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_reason",
              row: row
            });
            poucDbService.addClassification(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetNoInvoiceReasonsResponse", {
              option: "add_reasons_complete",
              rowcount: rowscount
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_reasons_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetNoInvoiceReasonsResponse", {
          option: "fail",
          error: e.message,
          data: data
        });
        socket.emit("GetInitialRouteSend", {
          option: "fail",
          error: e.message,
          data: data
        });
        poucDbService.addError(data, {
          option: "fail",
          error: e.message,
          data: data
        });
        if (errorCallBack != undefined)
          errorCallBack(
            "No se pudieron obtener las Razones de NO FACTURACION debido a: " +
              e.message
          );
        reject({
          Message:
            "No se pudieron obtener las Razones de NO FACTURACION debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetReasonsForVoidConsignment: function(
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

          socket.emit("GetReasonsForVoidConsignmentResponse", {
            option: "get_not_invoice_reasons_request_reived",
            data: data
          });
          socket.emit("GetInitialRouteSend", {
            option: "get_not_invoice_reasons_request_reived",
            data: data
          });
          request.input(
            "GROUP",
            pSqlInstance.VarChar,
            "ANNULMENT_CONSIGNMENT_REASON_POS"
          );

          var rowscount = 0;
          request.execute("SWIFT_GET_CLASSIFICATION", function(err, recordset) {
            if (err) {
              socket.emit("GetReasonsForVoidConsignmentResponse", {
                option: "fail_get_reasons_void_consignment",
                error: err,
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail_get_reasons_void_consignment",
                error: err,
                data: data
              });
              poucDbService.addError(data, {
                option: "fail_get_reasons_void_consignment",
                error: err,
                data: data
              });
              if (errorCallBack != undefined)
                errorCallBack(
                  "No se pudieron obtener las Razones de ANULACION DE CONSIGNACION debido a: " +
                    JSON.stringify(err),
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener las Razones de ANULACION DE CONSIGNACION debido a: " +
                  JSON.stringify(err),
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetReasonsForVoidConsignmentResponse", {
                option: "fail_get_reasons_void_consignment",
                error: "No se encontraron razones de ANULACION DE CONSIGNACION",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetReasonsForVoidConsignmentResponse", {
              option: "add_reason_void_consignment",
              row: row
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_reason_void_consignment",
              row: row
            });
            poucDbService.addClassification(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetReasonsForVoidConsignmentResponse", {
              option: "add_reasons_void_consignment_complete",
              rowcount: rowscount
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_reasons_void_consignment_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetReasonsForVoidConsignmentResponse", {
          option: "fail_get_reasons_void_consignment",
          error: e.message,
          data: data
        });
        socket.emit("GetInitialRouteSend", {
          option: "fail_get_reasons_void_consignment",
          error: e.message,
          data: data
        });
        poucDbService.addError(data, {
          option: "fail_get_reasons_void_consignment",
          error: e.message,
          data: data
        });
        if (errorCallBack != undefined)
          errorCallBack(
            "No se pudieron obtener las Razones de ANULACION DE CONSIGNACION debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudieron obtener las Razones de ANULACION DE CONSIGNACION debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetBonusListBySkuMultiple: function(
    data,
    socket,
    successCallback,
    errorCallBack
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_bonus_list_by_sku_multiple_received",
            data: data
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_BONUS_LIST_BY_SKU_MULTIPLE_FOR_ROUTE",
            function(err, recordset) {
              if (err) {
                socket.emit("GetInitialRouteSend", {
                  option: "get_bonus_list_by_sku_multiple_fail",
                  error: err,
                  data: data
                });
                poucDbService.addError(data, {
                  option: "get_bonus_list_by_sku_multiple_fail",
                  error: err,
                  data: data
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "get_bonus_list_by_sku_multiple_not_found",
                  error: "No se encontro Lista de Bonificaciones por Multiplo",
                  data: data
                });
                poucDbService.addError(data, {
                  option: "get_bonus_list_by_sku_multiple_not_found",
                  error: "No se encontro Lista de Bonificaciones por Multiplo",
                  data: data
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_bonus_sku_multiple",
              row: row
            });
            poucDbService.addBonusSkuMultiple(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_bonus_sku_multiple_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "get_bonus_list_by_sku_multiple_fail",
          error: e.message,
          data: data
        });
        if (errCallback != undefined)
          errorCallBack("error" + e.message, socket);
        reject({ Message: "error" + e.message, socket: socket });
      }
    });
  },
  GetDefaultCurrency: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_currency_received",
            data: data
          });

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_DEFAULT_CURRENCY", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("GetInitialRouteSend", {
                option: "get_currency_fail",
                error: err,
                data: data
              });
              poucDbService.addError(data, {
                option: "get_currency_fail",
                error: err,
                data: data
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "get_currency_not_found",
                error: "No se encontro la moneda por defecto",
                data: data
              });
              poucDbService.addError(data, {
                option: "get_currency_not_found",
                error: "No se encontro la moneda por defecto",
                data: data
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_currency",
              row: row
            });
            poucDbService.addCurrency(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_currency_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "get_currency_fail",
          error: e.message,
          data: data
        });
        if (errCallback != undefined) errCallback(e.message, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetReadyToStartRoute: function(data, socket, successCallBack, errorCallBack) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_READY_TO_START_ROUTE", function(
            err,
            recordsets,
            returnValue
          ) {
            if (err === undefined) {
              if (successCallBack != undefined) {
                successCallBack(data, socket);
              }
              console.log("GetReadyToStartRoute_success");
              resolve({ dat: data, socket: socket });
            } else {
              if (errorCallBack != undefined) {
                errorCallBack(err.message, socket);
              }
              reject({ Message: err.message, socket: socket });
              console.log(
                "GetReadyToStartRoute_fail en BDD: " + err.message,
                "error"
              );
              connection.close();
              pSqlInstance.close();
            }
          });
        });
      } catch (err) {
        if (errorCallBack != undefined) {
          errorCallBack(err.Message, socket);
        }
        reject({ Message: err.Message, socket: socket });
        console.log("UpdateBroadcast_fail en catch: " + err.Message, "error");
      }
    });
  },
  GetPriceListBySkuUsingCustomerId: function(data, socket) {
    try {
      var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
        var request = new pSqlInstance.Request(connection);
        request.verbose = _cnnServ.GetVerbose();
        request.stream = false;

        request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
        request.input(
          "CODE_CUSTOMER",
          pSqlInstance.VarChar,
          data.cliente.clientId
        );

        request.execute(
          "SWIFT_SP_GET_PRICE_LIST_BY_SKU_USING_CUSTOMER_ID",
          function(err, recordset) {
            if (err) {
              socket.emit("GetPriceListBySkuUsingCustomerId", {
                option: "get_price_list_by_sku_using_customerId_fail",
                message: err
              });
            }
            if (recordset[0].length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetPriceListBySkuUsingCustomerId", {
                option: "no_found_price_list_by_sku_using_customerid",
                clientId: data.cliente.clientId
              });
            } else {
              socket.emit("GetPriceListBySkuUsingCustomerId", {
                option: "add_price_list_by_sku_using_customerid",
                recordset: recordset[0],
                cliente: data.cliente,
                tarea: data.tarea
              });
              connection.close();
              pSqlInstance.close();
            }
          }
        );
      });
    } catch (e) {
      socket.emit("GetPriceListBySkuUsingCustomerId", {
        option: "get_price_list_by_sku_using_customerId_fail",
        message: e.message
      });
    }
  },
  GetBusinessRival: function(data, socket, successCallBack, errorCallBack) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetBusinessRivalResponse", {
            option: "start",
            data: data
          });
          socket.emit("GetInitialRouteSend", { option: "start", data: data });
          request.input("GROUP", pSqlInstance.VarChar, "BUSINESS_RIVAL");

          var rowscount = 0;
          request.execute("SWIFT_GET_CLASSIFICATION", function(err, recordset) {
            if (err) {
              socket.emit("GetBusinessRivalResponse", {
                option: "fail",
                error: err,
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: err,
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: err,
                data: data
              });
              if (errorCallBack != undefined)
                errorCallBack(
                  "No se pudieron obtener los nombres de la competencia debido a: " +
                    JSON.stringify(err),
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener los nombres de la competencia debido a: " +
                  JSON.stringify(err),
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetBusinessRivalResponse", {
                option: "fail",
                error: "No se encontraron nombres de la competencia",
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: "No se encontraron nombres de la competencia",
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: "No se encontraron nombres de la competencia",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetBusinessRivalResponse", {
              option: "add_business_rival",
              row: row
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_business_rival",
              row: row
            });
            poucDbService.addClassification(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetBusinessRivalResponse", {
              option: "add_business_rival_complete",
              rowcount: rowscount
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_business_rival_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetBusinessRivalResponse", {
          option: "fail",
          error: e.message,
          data: data
        });
        socket.emit("GetInitialRouteSend", {
          option: "fail",
          error: e.message,
          data: data
        });
        poucDbService.addError(data, {
          option: "fail",
          error: e.message,
          data: data
        });
        if (errorCallBack != undefined)
          errorCallBack(
            "No se pudieron obtener los nombres de la competencia debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudieron obtener los nombres de la competencia debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetBusinessRivalComment: function(
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

          request.input(
            "GROUP",
            pSqlInstance.VarChar,
            "BUSINESS_RIVAL_COMMENT"
          );

          var rowscount = 0;
          request.execute("SWIFT_GET_CLASSIFICATION", function(err, recordset) {
            if (err) {
              socket.emit("GetBusinessRivalCommentResponse", {
                option: "fail",
                error: err,
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: err,
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: err,
                data: data
              });
              if (errorCallBack != undefined)
                errorCallBack(
                  "No se pudieron obtener los comentarios de la competencia debido a: " +
                    JSON.stringify(err),
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener los comentarios de la competencia debido a: " +
                  JSON.stringify(err),
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetBusinessRivalCommentResponse", {
                option: "fail",
                error: "No se encontraron comentarios de la competencia",
                data: data
              });
              socket.emit("GetInitialRouteSend", {
                option: "fail",
                error: "No se encontraron comentarios de la competencia",
                data: data
              });
              poucDbService.addError(data, {
                option: "fail",
                error: "No se encontraron comentarios de la competencia",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetBusinessRivalCommentResponse", {
              option: "add_business_rival_comment",
              row: row
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_business_rival_comment",
              row: row
            });
            poucDbService.addClassification(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetBusinessRivalCommentResponse", {
              option: "add_business_rival_comment_complete",
              rowcount: rowscount
            });
            socket.emit("GetInitialRouteSend", {
              option: "add_business_rival_comment_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetBusinessRivalCommentResponse", {
          option: "fail",
          error: e.message,
          data: data
        });
        socket.emit("GetInitialRouteSend", {
          option: "fail",
          error: e.message,
          data: data
        });
        poucDbService.addError(data, {
          option: "fail",
          error: e.message,
          data: data
        });
        if (errorCallBack != undefined)
          errorCallBack(
            "No se pudieron obtener los comentarios de la competencia debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudieron obtener los comentarios de la competencia debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetTaxPercentParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetTaxPercentParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input("PARAMETER_ID", pSqlInstance.VarChar, "TAX_PERCENT");

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetTaxPercentParameter",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetTaxPercentParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetTaxPercentParameter",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetTaxPercentParameter_completed",
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
            "Error al obtener el parametro de Porcentaje de Impuesto devido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de Porcentaje de Impuesto devido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDefaultBonusAndDiscountListId: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = false;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute(
            "[SONDA_SP_GET_DEFAULT_BONUS_AND_DISCOUNT_LIST]",
            function(err, recordset, returnValue) {
              if (err) {
                socket.emit("GetInitialRouteSend", { option: "failGetInfo" });
                poucDbService.addError(data, { option: "failGetInfo" });
                connection.close();
                pSqlInstance.close();
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              } else {
                socket.emit("GetInitialRouteSend", {
                  option: "GetDefaultBonusAndDiscountListId_AddInfo",
                  recordset: recordset[0][0]
                });
                poucDbService.addDefaultBonusAndDiscountListId(
                  data,
                  recordset[0][0]
                );
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
        });
      } catch (ex) {
        socket.emit("GetInitialRouteSend", { option: "failGetInfo" });
        if (errCallback != undefined) errCallback(ex.message, socket);
        reject({ Message: ex.message, socket: socket });
      }
    });
  },
  SyncTransfer: function(data, socket) {
    try {
      socket.sockets.emit("new_broadcast", {
        Id: data.CODE_BROADCAST,
        Type: "transfer",
        AssignedTo: data.AssignedTo,
        data: data.Transfer,
        BroadcastOperacion: data.BroadcastOperacion
      });
      console.log(
        "Id:" +
          data.CODE_BROADCAST +
          "\nType: transfer\nAssignedTo:" +
          data.AssignedTo +
          "\nOperacion:" +
          data.BroadcastOperacion +
          "\n",
        "info"
      );
      console.log("sync_transfer_success");
    } catch (err) {
      console.log("sync_transfer_fail catch: " + err.Message, "error");
    }
  },
  GetSkuSalesByMultipleList: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_sales_skus_by_multiple_list_received"
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_SKU_SALES_BY_MULTIPLE_LIST_BY_SKU_FOR_ROUTE",
            function(err, recordset) {
              if (err) {
                socket.emit("GetInitialRouteSend", {
                  option: "no_found_sales_skus_by_multiple_list"
                });
                poucDbService.addError(data, {
                  option: "no_found_sales_skus_by_multiple_list"
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "no_found_sales_skus_by_multiple_list"
                });
                poucDbService.addError(data, {
                  option: "no_found_sales_skus_by_multiple_list"
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_sales_skus_by_multiple_list",
              row: row
            });
            poucDbService.addSalesSkuXMultipleList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_sales_skus_by_multiple_list_completed",
              rowsCount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (exception) {
        socket.emit("GetInitialRouteSend", { option: "failGetInfo" });
        if (errCallback != undefined) errCallback(exception.message, socket);
        reject({ Message: exception.message, socket: socket });
      }
    });
  },
  GetCombosByRoute: function(data, socket, successCallBack, errorCallBack) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetCombosByRoute_received"
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_COMBOS_BY_ROUTE", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("GetInitialRouteSend", {
                option: "GetCombosByRoute_fail",
                error: err
              });
              poucDbService.addError(data, {
                option: "GetCombosByRoute_fail",
                error: err
              });
              if (errCallBack != undefined) errorCallBack(data, socket);
              reject({ Message: err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetCombosByRoute_not_found",
                error: "No se encontraron combos",
                data: data
              });
              poucDbService.addError(data, {
                option: "GetCombosByRoute_not_found",
                error: "No se encontraron combos",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_combo",
              row: row
            });
            poucDbService.addCombo(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_combo_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetCombosByRoute_fail",
          error: e.message,
          data: data
        });
        if (errCallBack != undefined) errorCallBack(data, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetSkuForCombosByRoute: function(
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

          socket.emit("GetInitialRouteSend", {
            option: "GetSkuForCombosByRoute_received"
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_SKU_FOR_COMBOS_BY_ROUTE", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("GetInitialRouteSend", {
                option: "GetSkuForCombosByRoute_fail",
                error: err
              });
              poucDbService.addError(data, {
                option: "GetSkuForCombosByRoute_fail",
                error: err
              });
              if (errCallBack != undefined) errorCallBack(data, socket);
              reject({ Message: err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetSkuForCombosByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              poucDbService.addError(data, {
                option: "GetSkuForCombosByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_sku_for_combo",
              row: row
            });
            poucDbService.addSku4Combo(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_sku_for_combo_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetSkuForCombosByRoute_fail",
          error: e.message,
          data: data
        });
        if (errCallBack != undefined) errorCallBack(data, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetBonusListCombosByRoute: function(
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

          socket.emit("GetInitialRouteSend", {
            option: "GetBonusListCombosByRoute_received"
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_BONUS_LIST_BY_COMBO", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusListCombosByRoute_fail",
                error: err
              });
              poucDbService.addError(data, {
                option: "GetBonusListCombosByRoute_fail",
                error: err
              });
              if (errCallBack != undefined) errorCallBack(data, socket);
              reject({ Message: err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusListCombosByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              poucDbService.addError(data, {
                option: "GetBonusListCombosByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_combo_to_bonus_list",
              row: row
            });
            poucDbService.addComboBonusList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_combo_to_bonus_list_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetBonusListCombosByRoute_fail",
          error: e.message,
          data: data
        });
        if (errCallBack != undefined) errorCallBack(data, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetBonusListCombosSkuByRoute: function(
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

          socket.emit("GetInitialRouteSend", {
            option: "GetBonusListCombosSkuByRoute_received"
          });

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute("SONDA_SP_GET_BONUS_LIST_BY_COMBO_SKU", function(
            err,
            recordset
          ) {
            if (err) {
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusListCombosSkuByRoute_fail",
                error: err
              });
              poucDbService(data, {
                option: "GetBonusListCombosSkuByRoute_fail",
                error: err
              });
              if (errCallBack != undefined) errorCallBack(data, socket);
              reject({ Message: err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusListCombosSkuByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              poucDbService(data, {
                option: "GetBonusListCombosSkuByRoute_not_found",
                error: "No se encontraron productos para los combos asociados",
                data: data
              });
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_sku_combo_to_bonus_list",
              row: row
            });
            poucDbService.addSkuComboBonusList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "add_sku_combo_to_bonus_list_complete",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetBonusListCombosSkuByRoute_fail",
          error: e.message,
          data: data
        });
        if (errCallBack != undefined) errorCallBack(data, socket);
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetMaxBonusParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetMaxBonusParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input("PARAMETER_ID", pSqlInstance.VarChar, "USE_MAX_BONUS");

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetMaxBonusParameter",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetMaxBonusParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetMaxBonusParameter",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetMaxBonusParameter_completed",
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
            "Error al obtener el parametro de bonificacion maxima: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de bonificacion maxima: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetLabelParameter: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetLabelParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "LABEL");

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
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetLabelParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetLabelParameter",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetLabelParameter_completed",
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
            "Error al obtener el parametro de bonificacion maxima: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de bonificacion maxima: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetBankAccounts: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;

          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          var pSql = "SELECT * FROM SONDA_VIEW_BANK_ACCOUNTS";

          request.query(pSql, function(err, recordset) {
            if (err) {
              poucDbService.addError(data, {
                message: "getbankaccts.sql.err: " + err
              });
            }
          });

          request.on("row", function(row) {
            poucDbService.addBankAccount(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            resolve({ data: data, socket: socket });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
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
                poucDbService.addError(data, {
                  message: "getauthinfo.sql.err: " + err
                });
              }
            });
            request.on("row", function(row) {
              poucDbService.addAuth(data, row);
              rowscount++;
            });
            request.on("done", function(returnValue) {
              connection.close();
              pSqlInstance.close();
              rowscount = 0;
              resolve({ data: data, socket: socket });
            });
          } catch (ex) {
            reject({ Message: e.message, socket: socket });
          }
        });
      } catch (e) {
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetVoidReasons: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;

          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          var pSql = "SELECT * FROM SONDA_VIEW_VOID_REASONS";

          request.query(pSql, function(err, recordset) {
            if (err) {
              poucDbService.addError(data, {
                message: "getvoidreasons.sql.err: " + err
              });
            }
            if (recordset.length === 0) {
              poucDbService.addError(data, {
                message: "void_reasons_not_found"
              });
            }
          });

          request.on("row", function(row) {
            poucDbService.addVoidrReason(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            rowscount = 0;
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
  GetAlertLimit: function(data, socket) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          var pSql =
            "SELECT ALERT_ID ,ALERT_NAME ,ALERT_PERC ,ALERT_MESSAGE FROM SONDA_ALERTS";

          request.query(pSql, function(err, recordset) {
            // ojo
            if (err) {
              poucDbService.addError(data, {
                message: "getalertlimit.sql.err: " + err
              });
            }
            if (recordset.length === 0) {
              poucDbService.addError(data, {
                message: "getalertlimit_not_found"
              });
            }
          });

          request.on("row", function(row) {
            poucDbService.addAlertLimit(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            poucDbService.addNotification(data, "getalertlimit_completed");
            rowscount = 0;
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
  GetTagsByType: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("TYPE_TAGS", pSqlInstance.VarChar, "CUSTOMER");

          request.execute("SONDA_SP_GET_TAGS_BY_TYPE", function(
            errReturn,
            recordset
          ) {
            if (errReturn) {
              socket.emit("GetInitialRouteSend", {
                option: "GetTagsByTypeFail",
                error: errReturn.message
              });
              poucDbService.addError(data, {
                message: "getTagsByType.sql.err: " + err
              });
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("GetInitialRouteSend", {
                option: "GetTagsByTypeNotFound"
              });
              //poucDbService.addError(data, { 'message': 'GetTagByTypeNotFound' });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "AddTagByType",
              tag: row
            });
            //poucDbService.addTagByType(data, row);
            rowscount++;
          });

          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetTagsByTypeCompleted"
            });
            //poucDbService.addNotification(data, "GetTagsByTypeCompleted");
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetTagsByTypeFail",
          error: e.message
        });
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las etiquetas por tipo debido a: " + e.message,
            socket
          );
        reject({ Message: e.message, socket: socket });
      }
    });
  },
  GetBonusByGeneralAmountList: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var rowscount = 0;
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_BONUS_BY_GENERAL_AMOUNT_LIST", function(
            errReturn,
            recordset
          ) {
            if (errReturn) {
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusByGeneralAmountListFail",
                error: errReturn.message
              });
              console.log(
                "GetBonusByGeneralAmountListFail:" + err.message,
                "error",
                "SONDA_SP_GET_BONUS_BY_GENERAL_AMOUNT_LIST",
                data.routeid,
                null,
                "GetBonusByGeneralAmountList",
                null,
                null,
                null,
                5
              );
              if (errCallback) errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("GetInitialRouteSend", {
                option: "GetBonusByGeneralAmountListNotFound"
              });
              if (successCallback) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });

          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "AddBonusByGeneralAmountList",
              row: row
            });
            rowscount++;
          });

          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetBonusByGeneralAmountListCompleted"
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        socket.emit("GetInitialRouteSend", {
          option: "GetBonusByGeneralAmountListFail",
          error: e.message
        });
        if (errCallback)
          errCallback(
            `Error al obtener las bonificaciones por monto general: ${
              e.message
            }`,
            socket
          );
        reject({
          Message: `Error al obtener las bonificaciones por monto general: ${
            e.message
          }`,
          socket: socket
        });
      }
    });
  },
  GetSynchronizationTimeParameter: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input(
            "GROUP_ID",
            pSqlInstance.VarChar,
            "SONDA_SYNCHRONIZATION_TIME"
          );

          request.execute("SWIFT_SP_GET_PARAMETER_GROUP", function(
            err,
            recordset
          ) {
            if (err) {
              console.log(
                "GetSynchronizationTimeParameterFail:" + err.message,
                "error",
                "SWIFT_SP_GET_PARAMETER_GROUP",
                null,
                null,
                "GetSynchronizationTimeParameter",
                null,
                null,
                null,
                5
              );
              if (errCallback) errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("GetInitialRouteSend", {
                option: "ParameterOfSecondsForSynchronizationOfDataNotFound",
                routeid: data.routeid
              });
              if (successCallback) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_ParameterOfSecondsForSynchronizationOfData",
              row: row
            });
          });
          request.on("done", function(returnValue) {
            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        console.log(
          "GetSynchronizationTimeParameter fail:" + err.message,
          "error",
          "SWIFT_SP_GET_PARAMETER_GROUP",
          null,
          null,
          "GetSynchronizationTimeParameter",
          null,
          null,
          null,
          9
        );
        if (errCallback)
          errCallback(
            "Error al obtener el parametro de descuento máximo: " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de descuento máximo: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetHistoryByPromoForRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          request.execute("SONDA_SP_GET_HISTORY_BY_PROMO_FOR_ROUTE", function(
            err,
            recordset
          ) {
            if (err) {
              console.log(
                "GetHistoryByPromoForRouteFail:" + err.message,
                "error",
                "SONDA_SP_GET_HISTORY_BY_PROMO_FOR_ROUTE",
                data.routeid,
                null,
                "GetHistoryByPromoForRoute",
                null,
                null,
                null,
                5
              );
              if (errCallback) errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              socket.emit("GetInitialRouteSend", {
                option: "GetHistoryByPromoForRouteFailNotFound",
                routeid: data.routeid
              });
              if (successCallback) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "AddHistoryByPromoForRoute",
              row: row
            });
          });
          request.on("done", function(returnValue) {
            connection.close();
            pSqlInstance.close();
            if (successCallback) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (err) {
        console.log(
          "GetHistoryByPromoForRouteFail:" + err.message,
          "error",
          "SONDA_SP_GET_HISTORY_BY_PROMO_FOR_ROUTE",
          data.routeid,
          null,
          "GetSynchronizationTimeParameter",
          null,
          null,
          null,
          9
        );
        if (errCallback)
          errCallback(
            "Error al obtener el historico por promo de ruta: " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el historico por promo de ruta: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetNotDeliveryReasons: function(
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

          request.execute("SONDA_SP_GET_NOT_DELIVERY_REASONS", function(
            errExec,
            recordset
          ) {
            if (errExec) {
              if (errorCallBack != undefined)
                errorCallBack(
                  "No se pudieron obtener las razones de no entrega debido a: " +
                    JSON.stringify(errExec),
                  socket
                );
              reject({
                Message:
                  "No se pudieron obtener las razones de no entrega debido a: " +
                  errExec.message,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              if (successCallBack != undefined) successCallBack(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_not_delivery_reason",
              row: row
            });
          });
          request.on("done", function() {
            connection.close();
            pSqlInstance.close();
            if (successCallBack != undefined) successCallBack(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errorCallBack != undefined)
          errorCallBack(
            "No se pudieron obtener las razones de no entrega debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "No se pudieron obtener las razones de no entrega debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDiscountByGeneralAmountAndFamilyList: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_discount_by_general_amount_and_familiy_list_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_DISCOUNTS_BY_GENERAL_AMOUNT_AND_FAMILY",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined)
                  errCallback("GetInitialRouteSend" + err, socket);
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option:
                    "not_discount_by_general_amount_and_family_list_found",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option:
                    "not_discount_by_general_amount_and_family_list_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_discount_by_general_amount_and_family_list",
              row: row
            });
            poucDbService.addDiscountXGeneralAmountList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option:
                "get_discount_by_general_amount_and_family_list_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Descuento por monto general y familia para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Descuento por monto general y familia para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetDiscountByFamilyAndPaymentTypeList: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "get_discount_by_familiy_and_payment_type_list_received",
            routeid: data.routeid
          });
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_DISCOUNTS_BY_FAMILY_AND_PAYMENT_TYPE",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined)
                  errCallback("GetInitialRouteSend" + err, socket);
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "not_discount_by_family_and_payment_type_list_found",
                  routeid: data.routeid
                });
                poucDbService.addError(data, {
                  option: "not_discount_by_family_and_payment_type_list_found",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_discount_by_family_and_payment_type_list",
              row: row
            });
            poucDbService.addDiscountXGeneralAmountList(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "get_discount_by_family_and_payment_type_list_completed",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de Descuento por familia y tipo de pago para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de Descuento por familia y tipo de pago para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetApplyDiscountParameter: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          socket.emit("GetInitialRouteSend", {
            option: "GetApplyDiscountParameter_received"
          });
          request.input("GROUP_ID", pSqlInstance.VarChar, "SALES_ORDER");
          request.input(
            "PARAMETER_ID",
            pSqlInstance.VarChar,
            "APPLY_DISCOUNT_PERCENTAGE_AND_THEN_THE_MONETARY"
          );

          var rowscount = 0;
          request.execute("SWIFT_SP_GET_PARAMETER", function(err, recordset) {
            if (err) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend" + err, socket);
              reject({ Message: "GetInitialRouteSend" + err, socket: socket });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "not_found_GetApplyDiscountParameter",
                routeid: data.routeid
              });
              poucDbService.addError(data, {
                option: "not_found_GetApplyDiscountParameter",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_GetApplyDiscountParameter",
              row: row
            });
            poucDbService.addParameter(data, row);
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetApplyDiscountParameter_completed",
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
            "Error al obtener el parametro de aplicar desuento: " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el parametro de aplicar descuento: " + e.message,
          socket: socket
        });
      }
    });
  },
  GetSaleStatisticBySeller: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_SALE_STATISTIC_BY_SELLER", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "statistics_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_statistic",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "statistics_of_usser_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las estadisticas de venta para la ruta debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las estadisticas de venta para la ruta debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetListsOfSpecialPriceByScaleForRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;
          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);

          var rowscount = 0;
          request.execute(
            "SONDA_SP_GET_LIST_OF_SPECIAL_PRICE_BY_SCALE_FOR_ROUTE",
            function(err, recordset) {
              if (err) {
                if (errCallback != undefined)
                  errCallback("GetInitialRouteSend" + err, socket);
                reject({
                  Message: "GetInitialRouteSend" + err,
                  socket: socket
                });
              }
              if (recordset.length === 0) {
                connection.close();
                pSqlInstance.close();
                socket.emit("GetInitialRouteSend", {
                  option: "ListsOfSpecialPriceByScaleForRouteNotFound",
                  routeid: data.routeid
                });
                if (successCallback != undefined) successCallback(data, socket);
                resolve({ data: data, socket: socket });
              }
            }
          );
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "AddListsOfSpecialPriceByScaleForRoute",
              row: row
            });
            rowscount++;
          });
          request.on("done", function(returnValue) {
            socket.emit("GetInitialRouteSend", {
              option: "GetListsOfSpecialPriceByScaleForRouteCompleted",
              rowcount: rowscount
            });
            rowscount = 0;
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las Listas de precios especiales para la ruta " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las Listas de precios especiales para la ruta " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetOrderForDiscountForApply: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_ORDER_FOR_DISCOUNT_FOR_APPLY", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "order_discount_apply_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_order_discount_apply",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "order_discount_apply_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener el orden de descuento para aplicar para la ruta debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener el orden de descuento para aplicar para la ruta debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetMicroSurveyByRoute: function(data, socket, successCallback, errCallback) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_QUIZ_BY_ROUTE", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "microsurvey_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_microsurvey",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "microsurvey_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener la microencuesta para la ruta debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener la microencuesta para la ruta debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetQuestionsOfMicroSurveyByRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_QUESTIONS_BY_ROUTE", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "question_by_microsurvey_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_question_by_microsurvey",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "question_by_microsurvey_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las preguntas para la ruta debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las preguntas para la ruta debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetAnswersOfMicroSurveyByRoute: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_ANSWERS_BY_ROUTE", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "answer_by_microsurvey_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_answer_by_microsurvey",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "answer_by_microsurvey_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener las respuestas para la ruta debido a: " +
              e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener las respuestas para la ruta debido a: " +
            e.message,
          socket: socket
        });
      }
    });
  },
  GetMicroSurveyByChannel: function(
    data,
    socket,
    successCallback,
    errCallback
  ) {
    return new Promise((resolve, reject) => {
      try {
        var connection = _cnnServ.ConnectDb(data, function(err, pSqlInstance) {
          var request = new pSqlInstance.Request(connection);
          request.verbose = _cnnServ.GetVerbose();
          request.stream = true;

          request.input("CODE_ROUTE", pSqlInstance.VarChar, data.routeid);
          request.execute("SONDA_SP_GET_QUIZ_BY_CHANNEL", function(
            executionError,
            recordset
          ) {
            if (executionError) {
              if (errCallback != undefined)
                errCallback("GetInitialRouteSend " + executionError, socket);
              reject({
                Message: "GetInitialRouteSend " + executionError,
                socket: socket
              });
            }
            if (recordset.length === 0) {
              connection.close();
              pSqlInstance.close();
              socket.emit("GetInitialRouteSend", {
                option: "channel_by_microsurvey_not_found",
                routeid: data.routeid
              });
              if (successCallback != undefined) successCallback(data, socket);
              resolve({ data: data, socket: socket });
            }
          });
          request.on("row", function(row) {
            socket.emit("GetInitialRouteSend", {
              option: "add_channel_by_microsurvey",
              row: row
            });
          });
          request.on("done", function() {
            socket.emit("GetInitialRouteSend", {
              option: "channel_by_microsurvey_completed"
            });
            connection.close();
            pSqlInstance.close();
            if (successCallback != undefined) successCallback(data, socket);
            resolve({ data: data, socket: socket });
          });
        });
      } catch (e) {
        if (errCallback != undefined)
          errCallback(
            "Error al obtener los canales para la ruta debido a: " + e.message,
            socket
          );
        reject({
          Message:
            "Error al obtener los canales para la ruta debido a: " + e.message,
          socket: socket
        });
      }
    });
  }
};

function GetInvoiceDetail(
  dataHeader,
  latest,
  connection,
  pSqlInstance,
  socket,
  successCallback,
  errCallback
) {
  try {
    var request = new pSqlInstance.Request(connection);

    request.input("DOC_ENTRY", pSqlInstance.VarChar, dataHeader.docEntry);

    request.execute("SONDA_SP_GET_INVOICE_ACTIVE_DETAIL", function(
      err,
      recordsets,
      returnValue
    ) {
      if (err === undefined) {
        for (var i = 0; i < recordsets[0].length; i++) {
          var detalle = {
            invoiceId: recordsets[0][i].DOC_NUM,
            lineSeq: recordsets[0][i].LINE_NUM,
            sku: recordsets[0][i].ITEM_CODE,
            skuName: recordsets[0][i].ITEM_DSCRIPTION,
            qty: recordsets[0][i].QUANTITY,
            price: recordsets[0][i].PRICE,
            totalLine: recordsets[0][i].LINE_TOTAL
          };
          dataHeader.details.push(detalle);
        }
        socket.emit("GetInvoice_Request", {
          option: "AddInvoice",
          data: dataHeader
        });
        successCallback(latest);
        console.log(
          "InsertRouteReturnDetail_Request Complete -" + dataHeader.invoiceId,
          "info"
        );
      } else {
        errCallback(err);
      }
    });
  } catch (e) {
    errCallback(e);
    console.log("GetInvoiceDetail en catch: " + e.message, "error");
  }
}

function GetSalesOrderDetailDraft(
  lstSalesOrderDraft,
  latest,
  connection,
  pSqlInstance,
  socket,
  successCallback,
  errCallback
) {
  try {
    var request = new pSqlInstance.Request(connection);

    request.input(
      "SALES_ORDER_ID",
      pSqlInstance.VarChar,
      lstSalesOrderDraft.SALES_ORDER_ID
    );

    request.execute("SONDA_SP_GET_SALES_ORDER_DETAIL", function(
      err,
      recordsets,
      returnValue
    ) {
      if (err === undefined) {
        for (var i = 0; i < recordsets[0].length; i++) {
          var detalle = {
            SALES_ORDER_ID: recordsets[0][i].SALES_ORDER_ID,
            SKU: recordsets[0][i].SKU,
            LINE_SEQ: recordsets[0][i].LINE_SEQ,
            QTY: recordsets[0][i].QTY,
            PRICE: recordsets[0][i].PRICE,
            DISCOUNT: recordsets[0][i].DISCOUNT,
            TOTAL_LINE: recordsets[0][i].TOTAL_LINE,
            POSTED_DATETIME: recordsets[0][i].POSTED_DATETIME,
            SERIE: recordsets[0][i].SERIE,
            SERIE_2: recordsets[0][i].SERIE_2,
            REQUERIES_SERIE: recordsets[0][i].REQUERIES_SERIE,
            COMBO_REFERENCE: recordsets[0][i].COMBO_REFERENCE,
            PARENT_SEQ: recordsets[0][i].PARENT_SEQ,
            IS_ACTIVE_ROUTE: recordsets[0][i].IS_ACTIVE_ROUTE,
            CODE_PACK_UNIT: recordsets[0][i].CODE_PACK_UNIT
          };
          lstSalesOrderDraft.details.push(detalle);
        }
        socket.emit("GetInitialRouteSend", {
          option: "AddSalesOrderDraft",
          data: lstSalesOrderDraft
        });
        //poucDbService.addSaleOrderDraft(data, lstSalesOrderDraft);
        successCallback(latest);
        console.log(
          "InsertSalesOrderDraft_Request Complete -" +
            lstSalesOrderDraft.SALES_ORDER_ID,
          "info"
        );
      } else {
        errCallback(err);
      }
    });
  } catch (e) {
    errCallback(e);
    console.log("GetSalesOrderDetailDraft en catch: " + e.message, "error");
  }
}

function GetInvoiceDetailDraft(
  lstInvoiceDraft,
  latest,
  connection,
  pSqlInstance,
  socket,
  successCallback,
  errCallback
) {
  try {
    var request = new pSqlInstance.Request(connection);

    request.input(
      "RESOLUCION",
      pSqlInstance.VarChar,
      lstInvoiceDraft.CDF_RESOLUCION
    );
    request.input("SERIE", pSqlInstance.VarChar, lstInvoiceDraft.CDF_SERIE);
    request.input("INVOICE_ID", pSqlInstance.INT, lstInvoiceDraft.INVOICE_ID);

    request.execute("SONDA_SP_GET_INVOICE_DETAIL", function(
      err,
      recordsets,
      returnValue
    ) {
      if (err === undefined) {
        for (var i = 0; i < recordsets[0].length; i++) {
          var detalle = {
            INVOICE_ID: recordsets[0][i].INVOICE_ID,
            INVOICE_SERIAL: recordsets[0][i].INVOICE_SERIAL,
            SKU: recordsets[0][i].SKU,
            LINE_SEQ: recordsets[0][i].LINE_SEQ,
            QTY: recordsets[0][i].QTY,
            PRICE: recordsets[0][i].PRICE,
            DISCOUNT: recordsets[0][i].DISCOUNT,
            TOTAL_LINE: recordsets[0][i].TOTAL_LINE,
            POSTED_DATETIME: recordsets[0][i].POSTED_DATETIME,
            SERIE: recordsets[0][i].SERIE,
            SERIE_2: recordsets[0][i].SERIE_2,
            REQUERIES_SERIE: recordsets[0][i].REQUERIES_SERIE,
            COMBO_REFERENCE: recordsets[0][i].COMBO_REFERENCE,
            INVOICE_RESOLUTION: recordsets[0][i].INVOICE_RESOLUTION,
            PARENT_SEQ: recordsets[0][i].PARENT_SEQ,
            IS_ACTIVE_ROUTE: recordsets[0][i].IS_ACTIVE_ROUTE
          };
          lstInvoiceDraft.details.push(detalle);
        }
        socket.emit("GetInitialRouteSend", {
          option: "AddInvoiceDraft",
          data: lstInvoiceDraft
        });
        poucDbService.addInvoiceDraft(data, lstInvoiceDraft);
        successCallback(latest);
        console.log(
          "InsertInvoiceDraft_Request Complete -" + lstInvoiceDraft.INVOICE_ID,
          "info"
        );
      } else {
        errCallback(err);
      }
    });
  } catch (e) {
    errCallback(e);
    console.log("GetInvoiceDetailDraft en catch: " + e.message, "error");
  }
}

function GetConsignmentsDetail(
  Consignment,
  latest,
  connection,
  pSqlInstance,
  socket,
  successCallback,
  errCallback
) {
  try {
    var request = new pSqlInstance.Request(connection);

    request.input(
      "CONSIGNMENT_ID",
      pSqlInstance.VarChar,
      Consignment.ConsignmentId
    );

    request.execute("SONDA_SP_GET_CONSIGNMENTS_DETAILS_BY_ROUTE", function(
      err,
      recordsets,
      returnValue
    ) {
      if (err === undefined) {
        for (var i = 0; i < recordsets[0].length; i++) {
          var detalle = {
            ConsignmentId: recordsets[0][i].CONSIGNMENT_ID,
            SKU: recordsets[0][i].SKU,
            LINE_NUM: recordsets[0][i].LINE_NUM,
            QTY_CONSIGNMENT: recordsets[0][i].QTY,
            PRICE: recordsets[0][i].PRICE,
            DISCOUNT: recordsets[0][i].DISCOUNT,
            TOTAL_LINE: recordsets[0][i].TOTAL_LINE,
            POSTED_DATETIME: recordsets[0][i].POSTED_DATETIME,
            PAYMENT_ID: recordsets[0][i].PAYMENT_ID,
            HANDLE_SERIAL: recordsets[0][i].HANDLE_SERIAL,
            SERIAL_NUMBER: recordsets[0][i].SERIAL_NUMBER
          };
          Consignment.detalle.push(detalle);
        }

        socket.emit("GetInitialRouteSend", {
          option: "add_consignment",
          Consignment: Consignment
        });
        successCallback(latest);
        console.log(
          "InsertConsignments_Request Complete -" + Consignment.ConsignmentId,
          "info"
        );
      } else {
        errCallback(err);
      }
    });
  } catch (e) {
    errCallback(e);
    console.log("GetConsignmentsDetail en catch: " + e.message, "error");
  }
}
