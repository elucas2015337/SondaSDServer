const path = require('path');
const os = require('os');
const http = require("http");
const Hapi = require('Hapi');
const server = new Hapi.Server();
const port = 3357;
const domain = require('domain');
server.connection({ port: port, routes: { cors: true } });


const io = require('socket.io')(server.listener);
const SocketIoJwt = require('socketio-jwt');
const _ = require('lodash');
const chalk = require('chalk');
let connections = [];
var puser = '';
var ppassword = '';
var pdb = 'SWIFT_EXPRESS';


var modSec = require('./modSecurity.js');
var xdb = require('./moddb.js');
var xscanner = require('./modScanner.js');
var xtrans = require('./modTrans.js');
var _sondaService = require('./SondaService.js');
var _qrCodeService = require('./QrCodeService.js');
var _sondaRouteService = require('./SondaRouteService.js');
var _sondaPresaleService = require('./SondaPresaleService.js');
var _sondaCore = require('./SondaCoreService.js');
var _routeService = require('./RouteService.js');
var _priorityService = require('./PriorityService.js');
var poucDbService = require('./PouchDbService.js')


server.route(require('./routes/api'));

var gschema = '';
var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();
var pListenPort = xdb.GetSocketPort();

var gVersion = '2.1.5';
var pActiveClients = 0;
var pSqlConfig;
var pSqlInstance;
var pSQL = '';

var serverDomain = domain.create();
var interfaces = os.networkInterfaces();
var addresses = [];
var console = require("./LogService.js");
var PouchDB = require('pouchdb-node');





serverDomain.on('error', function (er) {

    console.log('Swift ServerDomain Error ' + er.message, "error");
    console.dir(er);
});

serverDomain.run(function () {
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);                
            }
        }
    }

    pSqlInstance = require('mssql');

    function getDateTime() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth() + 1;
        var day = now.getDate();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        if (month.toString().length == 1) {
            month = '0' + month;
        }
        if (day.toString().length == 1) {
            day = '0' + day;
        }
        if (hour.toString().length == 1) {
            hour = '0' + hour;
        }
        if (minute.toString().length == 1) {
            minute = '0' + minute;
        }
        if (second.toString().length == 1) {
            second = '0' + second;
        }
        return year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;

    }

    server.start(() => {
        console.log(chalk.green('Server running at port', port));
    });


    io.sockets.on('connection', SocketIoJwt.authorize({
        secret: 'MobilityScmSockeIoToken!!',
        timeout: 15000
    })).on('authenticated', (socket) => {

        pActiveClients++;
        console.log("connected: " + socket.id + " : " + getDateTime() + "\n Active connections:" + pActiveClients, "info");
        const d = domain.create();
        d.add(socket);
        d.on('error', function (err) {
            console.log('Server Error ', err.message, "error");
            try {
                console.dir(err);
                socket.emit('error_message', { 'message': 'connection: ' + err.message });

            } catch (e) {
                console.log('ServerError.catch: ', e.message, "error");
            }
        });


        socket.id = socket.decoded_token.id;
        socket.name = socket.decoded_token.name;
        socket.avatar = socket.decoded_token.avatar;
        connections.push(socket);
        console.log(chalk.green('User', socket.name, '(' + socket.id + ') connected.'));
        
        emitOnlineUsers();

        socket.on('disconnect', () => {
            console.log(chalk.red('User', socket.name, '(' + socket.id + ') disconnected'));
            connections.splice(connections.indexOf(socket), 1);
            emitOnlineUsers();
        });

        socket.on('sendMessage', (msg, cb) => {
            console.log(chalk.blue('msg', msg));
            let index = _.findIndex(connections, (c) => { return c.id === msg.recipient.id });
            connections[index].emit('onMessage', msg);
            return cb({ status: true });
        });

        function emitOnlineUsers() {
            connections.forEach((socket) => {
                socket.emit('onlineUsers', onlineUsers(socket));
            });
        }

        function onlineUsers(socket) {
            let friends = connections.slice();
            friends = _.remove(friends, (friend) => {
                return friend.id !== socket.id;
            });
            return _.map(friends, (obj) => { return _.pick(obj, 'id', 'name', 'avatar'); });
        }


        /***************************************************INICIO SONDA CORE***********************************************/

        socket.on("ValidateSalesOrders", function (data) {
            console.log("ValidateSalesOrders");
            _sondaCore.ValidateSalesOrders(data, socket);
        });

        socket.on("CheckInventory", function (data) {
            _sondaCore.CheckInventory(data, socket);
        });

        socket.on("SendTask", function (data) {
            _sondaCore.SendTask(data, socket);
        });

        socket.on("SendInvoice", function (data) {
            _sondaCore.SendInvoice(data, socket);
        });

        socket.on("SendPayment", function (data) {
            _sondaCore.SendPayment(data, socket);
        });

        socket.on("SendConsignment", function (data) {
            _sondaCore.SendConsignment(data, socket);
        });

        socket.on("SendSalesOrder", function (data) {
            console.log("SendSalesOrder");
            _sondaCore.SendSalesOrder(data, socket);
        });

        socket.on("SendAllSalesOrder", function (data) {
            console.log("SendAllSalesOrder");
            _sondaCore.SendAllSalesOrder(data, socket);
        });

        socket.on("SendSalesOrderTimesPrinted", function (data) {
            console.log("SendSalesOrderTimesPrinted");
            _sondaCore.SendSalesOrderTimesPrinted(data, socket);
        });

        socket.on("SendDocumentSecuence", function (data) {
            console.log("SendDocumentSecuence");
            _sondaCore.SendDocumentSecuence(data, socket);
        });

        socket.on("SendSalesOrderVoid", function (data) {
            console.log("SendSalesOrderVoid");
            _sondaCore.SendSalesOrderVoid(data, socket);
        });

        socket.on("SendCommitedInventoryVoid", function (data) {
            console.log("SendCommitedInventoryVoid");
            _sondaCore.SendCommitedInventoryVoid(data, socket);
        });

        socket.on("GetCurrentAccountByCustomer", function (data) {
            console.log("GetCurrentAccountByCustomer");
            _sondaCore.GetCurrentAccountByCustomer(data, socket);
        });

        socket.on("SetActiveRoute", function (data) {
            _sondaCore.SetActiveRoute(data, socket);
        });
        socket.on('insert_new_client', function (data) {
            _sondaCore.InsertNewClient(data, socket);
        });
        socket.on('insert_tags_x_client', function (data) {
            _sondaCore.InsertNewTagsXClient(data, socket);
        });

        socket.on('InsertAllNewClient', function (data) {
            console.log("InsertAllNewClient");
            _sondaCore.InsertAllNewClient(data, socket);
        });
        socket.on('InsertAllNewTagsXClient', function (data) {
            console.log("InsertAllNewTagsXClient");
            _sondaCore.InsertAllNewTagsXClient(data, socket);
        });

        socket.on('sync_tag', function (data) {
            console.log("sync_tag");
            console.log(JSON.stringify(data));
            _routeService.SyncTag(data, socket);
        }
        );
        socket.on('UpdateBroadcast', function (data) {
            console.log("UpdateBroadcast");
            _routeService.UpdateBroadcast(data, socket);
        }
        );
        socket.on('DeleteBroadcast', function (data) {
            console.log("DeleteBroadcast");
            _routeService.DeleteBroadcast(data, socket);
        }
        );
        socket.on('ValidateRoute', function (data) {
            console.log("ValidateRoute");
            _routeService.ValidateRoute(data, socket);
        }
        );
        socket.on('GetRouteInfo', function (data) {
            console.log("GetRouteInfo");
            _routeService.GetRouteInfo(data, socket);
        }
        );
        socket.on('GetBroadcastLost', function (data) {
            console.log("GetBroadcastLost");
            _routeService.GetBroadcastLost(data, socket, serv_io.sockets);
        }
        );

        socket.on('GetReviewTask',
            function (data) {
                console.log("GetReviewTask");
                _routeService.GetReviewTask(data, socket);
            }
        );

        socket.on('GetInvoiceByCustomer', function (data) {
            console.log("GetInvoiceByCustomer");
            _routeService.GetInvoiceActive(data, socket, function (dataR, lstInvoice) {
                _routeService.TravelListInvoice(dataR, lstInvoice, socket, function () {
                    //--
                }, function (err) {
                    socket.emit("GetInvoice_Request", { 'option': 'GetInvoiceError', "error": err });
                });
            }, function (err) {
                socket.emit("GetInvoice_Request", { 'option': 'GetInvoiceError', "error": err });
            });
        });

        socket.on('SendInsertSalesOrderDraft', function (data) {
            console.log("SendInsertSalesOrderDraft");
            _sondaCore.SendInsertSalesOrderDraft(data, socket);
        }
        );

        socket.on('SendUpdateSalesOrderDraft', function (data) {
            console.log("SendUpdateSalesOrderDraft");
            _sondaCore.SendUpdateSalesOrderDraft(data, socket);
        }
        );

        socket.on("GetSkuByFilterForTakeInventory", function (data) {
            console.log("Buscando SKU para toma de inventario...");
            _routeService.GetSkuByFilterForTakeInventory(data, socket);
        });

        socket.on("SendTakesInventory", function (data) {
            _sondaCore.SendTakesInventory(data, socket);
        });

        socket.on("SendDeliveryTask", function (data) {
            console.log("SendDeliveryTask");
            _sondaCore.SendDeliveryTask(data, socket);
        });

        socket.on("task_accepted", function (data) {
            console.log("task_accepted");
            _sondaCore.UpdateTaskAccepted(data, socket);
        });

        socket.on("GetReverseGetGeoCode", function (data) {
            console.log("GetReverseGetGeoCode");
            _sondaCore.GetReverseGetGeoCode(data, socket);
        });

        socket.on("SendCustomerChange", function (data) {
            console.log("SendCustomerChange");
            _sondaCore.SendCustomerChange(data, socket);
        });

        socket.on("obtenerInformacionManifiesto", function (data) {
            console.log("obtenerInformacionManifiesto");
            _sondaCore.obtenerInformacionManifiesto(data, socket);
        });

        socket.on("GetInventoryForSkuByZone", function (data) {
            console.log("ObtenerInformacionDeInventarioDeSkuPorZona...");
            _sondaCore.obtenerInventarioDeSkuPorZona(data, socket);
        });

        socket.on("GetPriceListBySkuUsingCustomerId", function (data) {
            console.log("ObtenerInformacionDeListaDePreciosPorSkuUsandoCustomerId...");
            _routeService.GetPriceListBySkuUsingCustomerId(data, socket);
        });

        /*******************************************************************************************************************/

        /***************************************************INICIO SWIFTEXPRESS PRIORITY***********************************************/
        socket.on("SendBatch", function (data) {
            console.log("SendBatch SWS-P");
            _priorityService.SendBatch(data, socket);
        });

        socket.on("SendPallet", function (data) {
            console.log("SendPallet");
            _priorityService.SendPallet(data, socket);
        });

        socket.on("CloseBatch", function (data) {
            console.log("CloseBatch");
            _priorityService.CloseBatch(data, socket);
        });

        socket.on("GetPalletstByTask", function (data) {
            console.log("GetPalletstByTask");
            _priorityService.GetPalletstByTask(data, socket);
        });

        socket.on("GetLastBatchByTask", function (data) {
            console.log("GetLastBatchByTask");
            _priorityService.GetLastBatchByTask(data, socket);
        });

        socket.on("ValidateLocationReception", function (data) {
            console.log("ValidateLocationReception");
            _priorityService.ValidateLocationReception(data, socket);
        });

        socket.on("AllocatedPallet", function (data) {
            console.log("AllocatedPallet");
            _priorityService.AllocatedPallet(data, socket);
        });

        socket.on("AdjustPallet", function (data) {
            console.log("AdjustPallet SES");
            _priorityService.AdjustPallet(data, socket);
        });

        socket.on("ValidatedStatusBatchAndPallet", function (data) {
            console.log("ValidatedStatusBatchAndPallet");
            _priorityService.ValidatedStatusBatchAndPallet(data, socket);
        });

        socket.on("GetBatch", function (data) {
            console.log("GetBatch");
            _priorityService.GetBatch(data, socket);
        });

        socket.on("SerchSku", function (data) {
            console.log("SerchSku SWS-P");
            _priorityService.SerchSku(data, socket);
        });

        socket.on("GetPallet", function (data) {
            console.log("GetPallet");
            _priorityService.GetPallet(data, socket);
        });

        socket.on("MakeAdjustment", function (data) {
            console.log("MakeAdjustment");
            _priorityService.MakeAdjustment(data, socket);
        });

        socket.on("ValidateLocationByRelocate", function (data) {
            console.log("ValidateLocationByRelocate");
            _priorityService.ValidateLocationByRelocate(data, socket);
        });

        socket.on("ValidatePalletByRelocate", function (data) {
            console.log("ValidatePalletByRelocate");
            _priorityService.ValidatePalletByRelocate(data, socket);
        });

        socket.on("RelocatePallet", function (data) {
            console.log("RelocatePallet");
            _priorityService.RelocatePallet(data, socket);
        });

        socket.on("GetWarehouse", function (data) {
            console.log("GetWarehouse");
            _priorityService.GetWarehouse(data, socket);
        });

        socket.on("SerchLocation", function (data) {
            console.log("SerchLocation");
            _priorityService.SerchLocation(data, socket);
        });

        socket.on("GetPalletPickingByBatch", function (data) {
            console.log("GetPalletPickingByBatch");
            _priorityService.GetPalletPickingByBatch(data, socket);
        });

        socket.on("PickingForPallet", function (data) {
            console.log("PickingForPallet");
            _priorityService.PickingForPallet(data, socket);
        });

        socket.on("GetTypeLocation", function (data) {
            console.log("GetTypeLocation");
            _priorityService.GetTypeLocation(data, socket);
        });

        /********************************/

        socket.on("GetExpirationPallet", function (data) {
            console.log("GetExpirationPallet");
            _priorityService.GetExpirationPallet(data, socket);
        });

        socket.on("ValidateSkuUbication", function (data) {
            console.log("ValidateSkuUbication");
            _priorityService.ValidateSkuUbication(data, socket);
        });

        socket.on("PickingPallet", function (data) {
            console.log("PickingPallet");
            _priorityService.PickingPallet(data, socket);
        });



        socket.on("ValidateSkuQuantity", function (data) {
            console.log("ValidateSkuQuantity");
            _priorityService.ValidateSkuQuantity(data, socket);
        });

        socket.on("ValidateSkuData", function (data) {
            console.log("ValidateSkuData");
            _priorityService.ValidateSkuData(data, socket);
        });

        socket.on("ValidateSkuPalletQuantityUbication", function (data) {
            console.log("ValidateSkuPalletQuantityUbication");
            _priorityService.ValidateSkuPalletQuantityUbication(data, socket);
        });

        socket.on("GetMobileLocations", function (data) {
            console.log("GetMobileLocations");
            _priorityService.GetMobileLocations(data, socket);
        });

        socket.on("GetPalletsByLocation", function (data) {
            console.log("GetPalletsByLocation");
            _priorityService.GetPalletsByLocation(data, socket);
        });

        socket.on("SerchLocation", function (data) {
            console.log("SerchLocation");
            _priorityService.SerchLocation(data, socket);
        });

        socket.on("SendReturnFromPicking", function (data) {
            console.log("SendReturnFromPicking");
            _priorityService.SendReturnFromPicking(data, socket);
        });

        socket.on("GetSkuByPicking", function (data) {
            console.log("GetSkuByPicking");
            _priorityService.GetSkuByPicking(data, socket);
        });

        socket.on("ValidateReceptionByPicking", function (data) {
            console.log("ValidateReceptionByPicking");
            _priorityService.ValidateReceptionByPicking(data, socket);
        });

        socket.on("Get_Series_Scanned", function (data) {
            console.log("Get_Series_Scanned");
            _priorityService.Get_Series_Scanned(data, socket);
        });

        /*******************************************************************************************************************/

        //************************************************INICIO SONDA PREVENTA*********************************************
        socket.on('process_signature', function (data) {
            _sondaPresaleService.process_signature(data, socket);
        });

        socket.on('post_order', function (data) {
            _sondaPresaleService.post_order(data, socket);
        });

        socket.on('process_pickup_image', function (data) {
            _sondaPresaleService.process_pickup_image(data, socket);
        });

        socket.on('get_all_skus', function (data) {
            _sondaPresaleService.get_all_skus(data, socket);
        });

        socket.on('get_all_branches', function (data) {
            _sondaPresaleService.get_all_branches(data, socket);
        });

        socket.on('get_all_novisit', function (data) {
            _sondaPresaleService.get_all_novisit(data, socket);
        });


        //************************************************FIN SONDA PREVENTA*********************************************


        //************************************************INICIO QRCODES*********************************************
        socket.on('get_qr_codes', function (data) {

            _qrCodeService.GetQrCodes(data, socket);

        });

        socket.on('DeliverySku', function (data) {

            _qrCodeService.DeliverySku(data, socket);

        });

        socket.on('get_repair_reception_labels', function (data) {

            _qrCodeService.GetRrLabels(data, socket);

        });

        //************************************************FIN QRCODES*********************************************

        //************************************************INICIO SONDA POS*********************************************

        socket.on("get_basic_invoice_info", function (data) {
            _sondaService.GetBasicInvoiceInfo(data, socket);
        });
        socket.on("process_invoice_image", function (data) {
            _sondaService.ProcessInvoiceImage(data);
        });
        socket.on("update_invoice_image", function (data) {
            _sondaService.UpdateInvoiceImage(data);
        });

        socket.on('get_initial_route', function (data) {
            _sondaService.GetInitialRouteFullStack(data, socket);/////// GetInitialRoute para Sonda Core -Ionic`
        });

        socket.on('GetManifestHeader', function (data) {
            _sondaRouteService.GetManifestHeader(data, socket);
        });

        socket.on('CreateMyRoutePlan', function (data) {
            console.log("CreateMyRoutePlan.Server.01");

            _routeService.CreateMyRoutePlan(data, socket,
                function (data, socket) {
                    console.log("CreateMyRoutePlan.SUCCESS");
                    socket.emit('CreateMyRoutePlanCompleted', data);
                },
                function (err, socket) {
                    console.log("GetRouteInfo ERROR: " + JSON.stringify(err), "error");
                    socket.emit('GetRouteInfo_Send', { option: "DeliveryTaskError", msg: err });
                }
            );
        });

        socket.on('GetInvoice', function (data) {
            _sondaRouteService.GetInvoice(data, socket);
        });

        socket.on('create_new_task_by_customer', function (data) {
            _sondaRouteService.CreateTaskByNewCustomer(data, socket);
        });

        socket.on('finish_route', function (data) {
            _sondaService.FinishRoute(data, socket);
        });
        socket.on('getalertlimit', function (data) {
            _sondaService.GetAlertLimit(data, socket);
        });
        socket.on('getauthinfo', function (data, cb) {
            _sondaService.GetAuthInfo(data, socket);
        });
        socket.on('getbankaccounts', function (data, cb) {
            _sondaService.GetBankAccounts(data, socket);
            return cb({ status: true });
        });
        socket.on('getroute_inv', function (data) {
            _sondaService.GetRouteInv(data, socket);
        });
        socket.on('getskus', function (data) {
            _sondaService.GetSkus(data, socket);
        });
        socket.on('getskuseries', function (data) {
            //_sondaService.GetSkuSeries(data, socket);
        });
        socket.on('getvoidreasons', function (data, cb) {
            _sondaService.GetVoidReasons(data, socket);
            return cb({ status: true });
        });
        socket.on('post_deposit', function (data) {
            _sondaService.PostDeposit(data, socket);
        });
        socket.on('post_deposit_offline', function (data) {
            _sondaService.PostDepositOffline(data, socket);
        });
        socket.on('post_invoice', function (data) {
            _sondaService.PostInvoice(data, socket);
        });
        socket.on('post_invoice_offline', function (data) {
            _sondaService.PostInvoiceOffline(data, socket);
        });
        //socket.on('getbankaccounts', function (data) {
        //    _sondaService.GetBankaAcounts(data, socket);
        //});

        socket.on('void_invoice', function (data) {
            _sondaService.VoidInvoice(data, socket);
        });

        socket.on('get_sales_route', function (data) {
            _sondaService.GetSalesRoutePlan(data, socket);
        });

        socket.on('get_sales_inventory', function (data, cb) {
            _sondaService.GetSalesInventory(data, socket,
                function (data, socket) {
                    return cb({ status: true });
                },
                function (e, socket) {
                    socket.emit('error_message', { 'message': 'connection: ' + err.message });
                    return cb({ status: false });
                }
            );
        });

        socket.on('get_sales_skus', function (data, cb) {
            _sondaService.GetSalesSkus(data, socket);
            return cb({ status: true });
        });

        socket.on('UpdateStatusInvoice', function (data) {
            console.log("UpdateStatusInvoice");
            _sondaService.UpdateStatusInvoice(data, socket);
        });

        socket.on('AddInventoryByVoidInvoice', function (data) {
            console.log("AddInventoryByVoidInvoice");
            _sondaService.AddInventoryByVoidInvoice(data, socket);
        });

        socket.on('SendResolution', function (data) {
            console.log("SendResolution");
            _sondaService.SendResolution(data, socket);
        });

        socket.on('GetReasons', function (data) {
            _sondaService.GetReasons(data, socket);
        });

        socket.on('SendReturnSku', function (data) {
            console.log("SendReturnSku");
            _sondaService.InsertRouteReturnHeader(data, socket, function (dataR) {
                _sondaService.TravelListSkuReturn(dataR, socket, function (dataRe) {
                    _sondaService.UpdateStatusRouteReturn(dataRe, socket);
                });
            });
        });

        socket.on('GetDocRouteReturn', function (data) {
            console.log("GetDocRouteReturn");
            _sondaService.GetDocRouteReturn(data, socket, function (dataR) {
                _sondaService.GetDocRouteReturnDetails(dataR, socket);
            });
        });

        socket.on('GetCredentials', function (data) {
            console.log("GetCredentials");
            _sondaService.GetCredentials(data, socket);
        });

        socket.on('UpdateErpRouteReturn', function (data) {
            console.log("UpdateErpRouteReturn");
            _sondaService.UpdateErpRouteReturn(data, socket);
        });

        socket.on('ValidateReturnSku', function (data) {
            console.log("ValidateReturnSku");
            _sondaService.ValidateRouteReturn(data, socket);
        });

        socket.on("GetPriceLists", function (data) {
            console.log("Enviando Listas de Precios...");
            _sondaService.GetPriceLists(data, socket);
        });

        socket.on("SendConsignmentPaid", function (data) {
            console.log("Reciviendo Consignacion pagada...");
            _sondaService.ChangeStatusConsignment(data, socket);
        });

        socket.on("SendDevolutionInventoryDocuments", function (data) {
            console.log("Recibiendo Documentos de Devolucion de Inventario Recogido de Consignaciones...");
            _sondaService.InsertDevolutionInventoryDocuments(data, socket);
        });

        socket.on("InsertTraceabilityConsignments", function (data) {
            console.log("Recibiendo trazabilidad de consignaciones....");
            _sondaService.InsertTraceabilityConsignment(data, socket);
        });

        socket.on("SendTaskPos", function (data) {
            console.log("Recibiendo tareas....");
            _sondaService.UpdateTaskPos(data, socket);
        });

        socket.on("SendConsignmentVoid", function (data) {
            console.log("Recibiendo Consignaciones Anuladas....");
            _sondaService.UpdateConsignmentToVoid(data, socket);
        });

        socket.on("SendBusinessRivalPoll", function (data) {
            console.log("SendBusinessRivalPoll");
            _sondaService.SendBusinessRivalPoll(data, socket);
        });

        socket.on("sync_transfer",
            function (data) {
                console.log("Sincronizando Broadcast de Transferencias...");
                _routeService.SyncTransfer(data, serv_io);
            });

        socket.on("SendAcceptedTransfer", function (data) {
            console.log("SendAcceptedTransfer");
            _sondaService.SendAcceptedTransfer(data, socket);
        });

        socket.on("GetClientsForTaskOutsideTheRoutePlan", function (data) {
            console.log("GetClientsForTaskOutsideTheRoutePlan");
            _sondaService.GetClientsForTaskOutsideTheRoutePlan(data, socket);
        });

        socket.on("CreateTaskOutsideTheRoutePlan", function (data) {
            console.log("CreateTaskOutsideTheRoutePlan");
            _sondaService.CreateTaskOutsideTheRoutePlan(data, socket);
        });
        //************************************************FIN SONDA*********************************************

        socket.on('disconnect', function () {
            pActiveClients--;
            console.log('disconnected:' + socket.id + " : " + getDateTime() + "\n Active connections:" + pActiveClients, "info");
        });

        socket.on('sync_tasks',
            function (data) {
                console.log("sync_tasks.has.arrived");
                socket.broadcast.emit('you_got_a_task', { ASSIGNED_TO: data.loginid, serviceid: data.serviceid });
            }
        );

        socket.on('sync_allow_diff_reception',
            function (data) {
                console.log("sync_allow_diff_reception");
                socket.broadcast.emit('allow_diff_reception', { ASSIGNED_TO: data.loginid, taskid: data.taskid, allowdiff: data.allowdiff });
            }
        );

        socket.on("broadcast_response",
            function (data) {
                socket.emit('draw_marker', { data: data });
            }
        );

        socket.on('report_status',
            function (data) {
                console.log("report_status");
                socket.broadcast.emit('report_status', { users: data.users });
            }
        );

        socket.on('validatecredentials',
            function (data, cb) {
                console.log("validatecredentials");
                modSec.checklogin(data, socket).then(() => {
                    return cb({ status: true });
                }).catch(reason => {
                    return cb({ status: false, message: reason.message });
                });
            }
        );

        socket.on('get_task_series',
            function (data) {
                console.log("get_task_series");
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
                    var rowscount = 0;

                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    pSQL = "SELECT * FROM [SWIFT_FUNC_GET_TASK_SERIAL](" + data.txnid + ",'" + data.sku + "') ORDER BY TXN_SERIE";
                    console.log(pSQL, "info"); //Log SQL

                    request.query(pSQL,
                        function (err, recordset) {
                            // ... error checks
                            if (err) {
                                console.log("get_tasks_series.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'get_task_series.sql.err: ' + err });
                            }
                            if (recordset.length == 0) {
                                socket.emit('get_task_series_found', { 'taskid': data.taskid });
                            }
                        }
                    );

                    request.on('row', function (row) {
                        //console.log('get_task_series.emited');
                        //socket.emit('add_to_get_task_series', { 'row': row });
                        rowscount++;
                    });

                    request.on('done', function (returnValue) {
                        console.log("get_task_series_completed:" + rowscount, "INFO");
                        socket.emit('get_task_series_completed', { 'rowcount': rowscount });
                        rowscount = 0;
                        connection.close();
                    });

                });

            }
        );

        socket.on('getmyrouteplan',
            function (data) {
                console.log("getmyrouteplan");

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
                    var rowscount = 0;

                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    pSQL = "SELECT * FROM [SWIFT_FUNC_GET_MY_TODAY_ROUTE_PLAN]('" + data.loginid + "') ORDER BY TASK_SEQ ASC";
                    console.log(pSQL, "info"); //Log SQL

                    request.query(pSQL,
                        function (err, recordset) {
                            // ... error checks
                            if (err) {
                                console.log("getmyrouteplan.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'getmyPRplan.sql.err: ' + err });
                            }
                            if (recordset.length === 0) {
                                socket.emit('getmyrouteplan_completed', { 'rowcount': 0 });
                                console.log('getmyrouteplan_cero_rows');
                            }
                        }
                    );

                    request.on('row', function (row) {
                        console.log('add_to_getmyrouteplan.emited');
                        socket.emit('add_to_getmyrouteplan', { 'row': row, 'rowcount': rowscount });
                        rowscount++;

                    });

                });
            }

        );

        socket.on('process_inv_init', function (data) {
            try {
                xtrans.process_inv_init(data, socket);
            } catch (e) {
                notify(e.message);
            }
        });

        socket.on('process_putaway_series',
            function (data) {
                xtrans.process_putaway_series(data, socket);
            }
        );

        socket.on('process_realloc',
            function (data) {
                console.log('process_realloc');
                xtrans.process_realloc(data, socket);
            }
        );


        socket.on('process_putaway',
            function (data) {
                console.log('process_putaway');
                xtrans.process_putaway(data, socket);
            }
        );

        socket.on('process_picking',
            function (data) {
                console.log('process_picking');
                xtrans.process_picking(data, socket);
            }
        );

        socket.on('finish_reception_task',
            function (data) {
                console.log('finish_reception_task');

                xtrans.finish_reception_task(data, socket);
            }
        );


        socket.on('finish_picking_task',
            function (data) {
                console.log('finish_picking_task');

                xtrans.finish_picking_task(data, socket);
            }
        );

        socket.on('cancel_scan',
            function (data) {
                console.log('cancel_scan');

                xtrans.CancelScan(data, socket);
            }
        );

        socket.on('validar_qty_picking',
            function (data) {
                xscanner.ValidateQtyPicking(data, socket);
            }
        );


        socket.on('process_sku',
            function (data) {
                try {
                    
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

                       // switch (data.serviceid) {
                       //     case 'RECEPTION_DETAIL':
                       If (data.serviceid=='RECEPTION_DETAIL')
                       {
                                request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                                request1.input('pQTY', pSqlInstance.Decimal(18, 2), data.qty);
                                request1.input('pBARCODE', pSqlInstance.VarChar(75), data.barcode);
                                request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);
                                request1.output('pResult', pSqlInstance.VarChar(250));

                                request1.execute('[SWIFT_SP_PROCESS_SKU_RECEPTION_TASK]', function (err, recordsets, returnValue) {


                                    switch (returnValue) {
                                        case 0:
                                            socket.emit('sku_processed_ok', { 'serviceid': data.serviceid });
                                            break;
                                        case -8:    //user not found
                                            socket.emit('sku_processed_fail', { 'serviceid': data.serviceid, 'error': returnValue, 'msg': 'Codigo de barras no existe' });
                                            break;
                                        case -9:    //user found but pass not exist
                                            socket.emit('sku_processed_fail', { 'serviceid': data.serviceid, 'error': returnValue, 'msg': request1.parameters.pResult.value });
                                            break;
                                        case -0:    //user found but pass not exist
                                            socket.emit('sku_processed_fail', { 'serviceid': data.serviceid, 'error': returnValue, 'msg': request1.parameters.pResult.value });
                                            break;
                                        case -6:
                                            socket.emit('sku_processed_fail', { 'serviceid': data.serviceid, 'error': returnValue, 'msg': 'SP Retorno -6' });
                                            break;
                                    }

                                });
                        //        break;
                        }

                    });

                } catch (e) { console.log("process_sku.catch:" + e.message, "error"); }

            }
        );

        socket.on('get_my_tasks',
            function (data) {

                var rowscount = 0;

                socket.emit('tasks_being_query', { 'tasktype': 'all' });

                //console.clear();
                pSQL = "select * from [OP_WMS_FUNC_GET_MY_PENDING_TASKS]('" + data.loginid + "') order by created_stamp, task_seq";
                console.log(pSQL, "info"); //Log SQL
                pSqlConfig = {
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
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    if (err != undefined) {
                        socket.emit('error_message', { 'message': 'getmytasks.err: ' + err.message });
                        return;
                    }

                    request.query(pSQL,
                        function (err, recordset) {
                            // ... error checks
                            if (err != undefined) {
                                console.log("get_my_tasks.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                            }
                            if (recordset.length == 0) {
                                socket.emit('user_tasks_not_found', { 'loginid': data.loginid });
                            }
                        }
                    );

                    request.on('row', function (row) {
                        console.log('add_to_tasks.emited');

                        socket.emit('add_to_tasks', { 'row': row });
                        rowscount++;

                    });


                    request.on('done', function (returnValue) {
                        try {
                            console.log('add_to_tasks.done');
                            socket.emit('tasks_query_completed', { 'rowcount': rowscount, 'tasktype': data.tasktype });

                            rowscount = 0;
                        }
                        catch (e) {
                            console.log('add_to_tasks.failed:' + e.message, "error");
                        }

                    });

                });

            }

        );

        socket.on('get_inv_x_loc',
            function (data) {

                var rowscount = 0;

                socket.emit('get_inv_x_loc_received', { 'location': data.barcode });

                pSQL = "select * from [SWIFT_VIEW_LOCATION_INVENTORY] WHERE LOCATION = '" + data.barcode + "'";
                console.log(pSQL, "info"); //Log SQL


                pSqlConfig = {
                    server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                    user: data.dbuser,
                    password: data.dbuserpass,
                    port: gdbPort,
                    database: 'SWIFT_EXPRESS',

                    options: {
                        encrypt: false // Use this if you're on Windows Azure
                    }
                }

                var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    request.query(pSQL,
                        function (err, recordset) {
                            if (err) {
                                console.log("get_inv_x_loc.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                            }
                        }
                    );

                    request.on('row', function (row) {
                        console.log('get_inv_x_loc.emited');

                        socket.emit('add_to_get_inv_x_loc', { 'row': row });
                        rowscount++;

                    });

                    request.on('done', function (returnValue) {
                        console.log('get_inv_x_loc.done:' + rowscount, "info");
                        //console.log(rowscount);
                        try {
                            socket.emit('get_inv_x_loc_completed', { 'rowcount': rowscount });
                            rowscount = 0;
                        }
                        catch (e) {
                            console.log('get_inv_x_loc.catch:' + e.message, "error");
                        }
                    });

                });

            }

        );
        socket.on('get_inv_x_sku',
            function (data) {

                var rowscount = 0;

                socket.emit('get_inv_x_sku_received', { 'sku': data.barcode });

                pSQL = "select * from [SWIFT_VIEW_LOCATION_INVENTORY] WHERE (SKU = '" + data.barcode + "' OR BARCODE = '" + data.barcode + "')";
                console.log(pSQL, "info"); //Log SQL


                pSqlConfig = {
                    server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                    user: data.dbuser,
                    password: data.dbuserpass,
                    port: gdbPort,
                    database: 'SWIFT_EXPRESS',

                    options: {
                        encrypt: false // Use this if you're on Windows Azure
                    }
                }

                var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    request.query(pSQL,
                        function (err, recordset) {
                            if (err) {
                                console.log("get_inv_x_sku.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'get_inv_x_sku.sql.err: ' + err.message });
                            }
                        }
                    );

                    request.on('row', function (row) {
                        console.log('get_inv_x_sku.emited');

                        socket.emit('add_to_get_inv_x_sku', { 'row': row });
                        rowscount++;

                    });

                    request.on('done', function (returnValue) {
                        console.log('get_inv_x_sku.done:' + rowscount, "info");
                        //console.log(rowscount);
                        try {
                            socket.emit('get_inv_x_sku_completed', { 'rowcount': rowscount });
                            rowscount = 0;
                        }
                        catch (e) {
                            console.log('get_inv_x_sku.catch:' + e.message, "error");
                        }
                    });

                });

            }

        );

        socket.on('get_task',
            function (data) {

                var rowscount = 0;
                socket.emit('tasks_being_query', { 'tasktype': data.tasktype });

                switch (data.tasktype) {
                    case "RECEPTION":
                        pSQL = "select * from [OP_WMS_FUNC_GET_RECEPTION_TASK]('" + data.taskid + "') order by description_sku";
                        break;
                    case "PICKING":
                        pSQL = "select * from [OP_WMS_FUNC_GET_PICKING_TASK]('" + data.taskid + "') order by description_sku";
                        break;
                }

                //console.log(pSQL);

                pSqlConfig = {
                    server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                    user: data.dbuser,
                    password: data.dbuserpass,
                    port: gdbPort,
                    database: 'SWIFT_EXPRESS',

                    options: {
                        encrypt: false // Use this if you're on Windows Azure
                    }
                }

                var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                    var request = new pSqlInstance.Request(connection);
                    request.verbose = true;
                    request.stream = true;

                    request.query(pSQL,
                        function (err, recordset) {
                            if (err) {
                                console.log("get_task.sql.err:" + JSON.stringify(err), "error");
                                socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                            }
                        }
                    );

                    request.on('row', function (row) {
                        console.log('get_task_info.emited');

                        socket.emit('get_task_info', { 'row': row, 'tasktype': data.tasktype });
                        rowscount++;

                    });

                    request.on('done', function (returnValue) {
                        console.log('get_task_info.done:' + rowscount, "info");
                        //console.log(rowscount);
                        try {
                            socket.emit('tasks_query_completed', { 'rowcount': rowscount, 'tasktype': data.tasktype });
                            rowscount = 0;
                        }
                        catch (e) {
                            console.log('tasks_query_failed:' + e.message, "error");
                        }
                    });

                });

            }

        );

        socket.on('get_barcode_info',
            function (data) {
                xscanner.BarcodeIsScanned(data, socket);
            }
        );

        socket.on('get_next_location',
            function (data) {
                xtrans.get_next_location(data, socket);
            }
        );

        socket.on('remove_scanned_serie',
            function (data) {
                xtrans.remove_scanned_serie(data, socket);
            }
        );
        socket.on('validate_serie',
            function (data) {
                console.log("validate_serie:" + data.page, "info");
                if (data.page=='init')
                {
                    xtrans.process_inv_init(data, socket);
                }
                else
                {
                    xscanner.ValidateSerie(data, socket);
                }
            }
        );

        socket.on('save_devolution',
            function (data) {
                console.log("save_devolution:");
                try {
                    pSqlConfig = {
                        server: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user: data.dbuser,
                        password: data.dbuserpass,
                        port: gdbPort,
                        database: 'SWIFT_EXPRESS',

                        options:
                        {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    }

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {
                        var request1 = new pSqlInstance.Request(connection);
                        request1.verbose = true;
                        request1.stream = false;
                        request1.input('TASK_ID', pSqlInstance.Int, data.TaskId);
                        request1.input('SKU_CODE', pSqlInstance.VarChar(50), data.ScannedSKU);
                        request1.input('CODE_LOCATION', pSqlInstance.VarChar(50), data.ScannedLoc);
                        request1.input('SERIE', pSqlInstance.VarChar(150), data.ScannedSer);
                        request1.input('QTY', pSqlInstance.Float, data.ScannedQty);
                        request1.input('HANDLE_SERIAL', pSqlInstance.VarChar(10), data.HandleSerie);
                        request1.input('OPERATOR_ID', pSqlInstance.VarChar(25), data.loginid);
                        request1.output('pRESULT', pSqlInstance.VarChar(250));

                        request1.execute('[SWIFT_SP_PROCESS_DEVOLUTION]', function (err, recordsets, returnValue) {
                            if (returnValue == 0)
                            {
                                socket.emit('save_devolution_ok', { 'data': data });
                            }
                            else
                            {
                                socket.emit('save_devolution_fail', { 'sku': data.ScannedSKU, 'error': returnValue, 'msg': request1.parameters.pRESULT.value });
                                connection.close();
                            }                            
                        });
                    });

                } catch (e) {
                    socket.emit('save_devolution', { 'error': -1, 'msg': e.message });
                    return 0;
                }

            socket.on('post_documents',
                function (data,cb) {
                    console.log("post_documents");
                    _sondaService.PostDocuments(data, socket).then(()=>{
                        return cb({status: true});
                    }).catch(err => {
                        return cb(err);
                    });
                }
            );

            socket.on('validate_documents',
                function (data,cb) {
                    console.log("validate_documents");
                    _sondaService.ValidateDocuments(data, socket).then((data)=>{
                        return cb(data);
                    }).catch(err => {
                        return cb(err);
                    });
                }
            );
});

        socket.on('validate_documents',
            function (data, cb) {
                console.log("validate_documents");
                // _sondaService.ValidateDocuments(data, socket);
                return cb({ status: true });
            }
        );
    });



});


// io.sockets.on('connection', SocketIoJwt.authorize({
//   secret: 'MobilityScmSockeIoToken!!',
//   timeout: 15000
// })).on('authenticated', (socket) => {
//   socket.id = socket.decoded_token.id;
//   socket.name = socket.decoded_token.name;
//   socket.avatar = socket.decoded_token.avatar;
//   connections.push(socket);
//   console.log(chalk.green('User', socket.name, '(' + socket.id + ') connected.'));

//   emitOnlineUsers();

//   socket.on('disconnect', () => {
//     console.log(chalk.red('User', socket.name, '(' + socket.id + ') disconnected'));
//     connections.splice(connections.indexOf(socket), 1);
//     emitOnlineUsers();
//   });

//   socket.on('sendMessage', (msg, cb) => {
//     console.log(chalk.blue('msg',msg));
//     let index = _.findIndex(connections, (c) => { return c.id === msg.recipient.id });
//     connections[index].emit('onMessage', msg);
//     return cb({status: true});
//   });

//   function emitOnlineUsers() {
//     connections.forEach((socket) => {
//       socket.emit('onlineUsers', onlineUsers(socket));
//     });
//   }

//   function onlineUsers(socket) {
//     let friends = connections.slice();
//     friends = _.remove(friends, (friend) => {
//       return friend.id !== socket.id;
//     });
//     return _.map(friends, (obj) => { return _.pick(obj, 'id', 'name', 'avatar'); });
//   }

// });

// server.start(() => {
//   console.log(chalk.green('Server running at port', port));
// });

