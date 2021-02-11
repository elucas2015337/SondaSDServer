var http = require("http");
var MySocket = require('socket.io');
var os = require('os');
var path = require('path');

var puser       =   '';
var ppassword   =   '';
var pdb         =   'SWIFT_EXPRESS';

var domain = require('domain');
var modSec;
modSec = require('./modSecurity.js');
var xdb = require('./moddb.js');
var xscanner = require('./modScanner.js');
var xtrans = require('./modTrans.js');
var _sondaService = require('./SondaService.js');
var _qrCodeService = require('./QrCodeService.js');
var _sondaRouteService = require('./SondaRouteService.js');
var _sondaPresaleService = require('./SondaPresaleService.js');

var gschema     =   '';
var dbserver = xdb.GetDBServer();
var gdbPort = xdb.GetDBPort();
var pListenPort = xdb.GetSocketPort();

var gVersion	= 	'express.201504.32';
var pActiveClients = 0;
var pSqlConfig;
var pSqlInstance;
var pSQL='';

var serverDomain = domain.create();
var interfaces = os.networkInterfaces();
var addresses = [];

serverDomain.on('error', function (er) {
    
    console.log('ServerDomain Error '+ er.message);
});

serverDomain.run(function() {
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
        var now     = new Date();
        var year    = now.getFullYear();
        var month   = now.getMonth()+1;
        var day     = now.getDate();
        var hour    = now.getHours();
        var minute  = now.getMinutes();
        var second  = now.getSeconds();
        if(month.toString().length == 1) {
            var month = '0'+month;
        }
        if(day.toString().length == 1) {
            var day = '0'+day;
        }
        if(hour.toString().length == 1) {
            var hour = '0'+hour;
        }
        if(minute.toString().length == 1) {
            var minute = '0'+minute;
        }
        if(second.toString().length == 1) {
            var second = '0'+second;
        }
        return  year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second;

    }

    /*
     var connector = http.request(options, function(res) {
     res.pipe(response, {end:true});//tell 'response' end=true
     });
     request.pipe(connector, {end:true});
     */


    var server = http.createServer(function(request, response){
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('<b>Welcome to Swift Express Server</b> '+gVersion);
        response.end();
    }).listen(pListenPort);

    var serv_io = MySocket.listen(server);
    console.log("SwiftExpress Server Ver. "+gVersion+" \nrunning @ ["+addresses+"] on port["+pListenPort+"] dbserver["+dbserver+"]\n");


    serv_io.sockets.on('connection', function(socket) {
        try {
            pActiveClients++;
            console.log("connected: " + socket.id + " : " + getDateTime() + "\n Active connections:" + pActiveClients);

            d = domain.create();
            d.add(socket);

            d.on('error', function(err) {
                console.error('Server Error ', err.message);
                try {
                    socket.emit('error_message', { 'message': 'connection: ' + err.message });
                    
                } catch (e) {
                    console.error('ServerError.catch: ', e.message);
                }


            });
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
			
            //************************************************FIN QRCODES*********************************************

            //************************************************INICIO SONDA*********************************************
			
			socket.on('GetManifestHeader', function (data) {
                _sondaRouteService.GetManifestHeader(data, socket);
            });
			
			socket.on('CreateMyRoutePlan', function (data) {
                _sondaRouteService.CreateMyRoutePlan(data, socket);
            });
			
			socket.on('GetInvoice', function (data) {
                _sondaRouteService.GetInvoice(data, socket);
            });
           
            socket.on('finish_route', function(data) {
                _sondaService.FinishRoute(data, socket);
            });
            socket.on('getalertlimit', function(data) {
                _sondaService.GetAlertLimit(data, socket);
            });
            socket.on('getauthinfo', function(data) {
                _sondaService.GetAuthInfo(data, socket);
            });
            socket.on('getbankaccounts', function(data) {
                _sondaService.GetBankAccounts(data, socket);
            });
            socket.on('getroute_inv', function(data) {
                _sondaService.GetRouteInv(data, socket);
            });
            socket.on('getskus', function(data) {
                _sondaService.GetSkus(data,socket);
            });
            socket.on('getskuseries', function(data) {
                _sondaService.GetSkuSeries(data, socket);
            });
            socket.on('getvoidreasons', function(data) {
                _sondaService.GetVoidReasons(data, socket);
            });
            socket.on('post_deposit', function(data) {
                _sondaService.PostDeposit(data, socket);
            });
            socket.on('post_deposit_offline', function(data) {
                _sondaService.PostDepositOffline(data, socket);
            });
            socket.on('post_invoice', function(data) {
                _sondaService.PostInvoice(data, socket);
            });
            socket.on('post_invoice_offline', function(data) {
                _sondaService.PostInvoiceOffline(data, socket);
            });
            socket.on('getbankaccounts',function(data) {
                _sondaService.GetBankaAcounts(data, socket);
            });
            socket.on('void_invoice', function(data) {
                _sondaService.VoidInvoice(data, socket);
            });
            
            //************************************************FIN SONDA*********************************************

            socket.on('disconnect', function ()
            {
                pActiveClients--;
                console.log('disconnected:' + socket.id + " : " + getDateTime()+ "\n Active connections:"+pActiveClients);
            });

            socket.on('sync_tasks',
                function(data)
                {
                    console.log("sync_tasks.has.arrived");
                    socket.broadcast.emit('you_got_a_task',{ASSIGNED_TO:  data.loginid, serviceid:  data.serviceid});
                }
            );

            socket.on('sync_allow_diff_reception',
                function(data)
                {
                    console.log("sync_allow_diff_reception");
                    socket.broadcast.emit('allow_diff_reception',{ASSIGNED_TO:  data.loginid, taskid:  data.taskid, allowdiff: data.allowdiff});
                }
            );

            socket.on("broadcast_response",
                function(data){
                    socket.emit('draw_marker', { data: data });
                }
            );

            socket.on('report_status',
                function(data)
                {
                    console.log("report_status");
                    socket.broadcast.emit('report_status',{users:  data.users});
                }
            );

            socket.on('validatecredentials',
                function (data)
                {
                    modSec.checklogin(data, socket);
                }
            );
            
            socket.on('get_task_series',
                function(data){
                    console.log("get_task_series");
                    var pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',
                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    };

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err)
                    {
                        var rowscount   = 0;

                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        pSQL = "SELECT * FROM [SWIFT_FUNC_GET_TASK_SERIAL]("+ data.txnid +",'"+ data.sku+"') ORDER BY TXN_SERIE";
                        console.log(pSQL);

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                // ... error checks
                                if (err)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'get_task_series.sql.err: ' + err });
                                }
                                if (recordset.length == 0)
                                {
                                    socket.emit('get_task_series_found', { 'taskid': data.taskid });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('get_task_series.emited');
                            socket.emit('add_to_get_task_series', { 'row': row });
                            rowscount++;
                        });


                        request.on('done', function (returnValue)
                        {
                            console.log("get_task_series_completed:"+rowscount);
                            socket.emit('get_task_series_completed', { 'rowcount': rowscount });
                            rowscount = 0;
                            connection.close();
                        });


                    });

                }
            );

            socket.on('getmyrouteplan',
                function(data)
                {
                    console.log("getmyrouteplan");

                    var pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',
                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    };

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err)
                    {
                        var rowscount   = 0;

                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        pSQL = "SELECT * FROM [SWIFT_FUNC_GET_MY_TODAY_ROUTE_PLAN]('"+ data.loginid +"') ORDER BY TASK_SEQ ASC";
                        console.log(pSQL);

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                // ... error checks
                                if (err)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'getmyPRplan.sql.err: ' + err });
                                }
                                if (recordset.length == 0)
                                {
                                    socket.emit('no_getmyrouteplan_found', { 'courierid': data.courierid });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('add_to_getmyrouteplan.emited');
                            socket.emit('add_to_getmyrouteplan', { 'row': row });
                            rowscount++;
                        });


                        request.on('done', function (returnValue)
                        {
                            socket.emit('getmyrouteplan_completed', { 'rowcount': rowscount });
                            rowscount = 0;
                            connection.close();

                        });


                    });
                }

            );

            socket.on('process_inv_init', function(data){
                try{
                    console.log('process_inv_init');
                    xtrans.process_inv_init(data, socket);
                }catch(e){
                    notify(e.message);
                }
            });

            socket.on('process_putaway_series',
                function (data)
                {
                    console.log('process_putaway_series');
                    xtrans.process_putaway_series(data, socket);
                }
            );

            socket.on('process_realloc',
                function (data)
                {
                    console.log('process_realloc');
                    xtrans.process_realloc(data, socket);
                }
            );


            socket.on('process_putaway',
                function (data)
                {
                    console.log('process_putaway');
                    xtrans.process_putaway(data, socket);
                }
            );

            socket.on('process_picking',
                function (data)
                {
                    console.log('process_picking');
                    xtrans.process_picking(data, socket);
                }
            );

            socket.on('finish_reception_task',
                function (data)
                {
                    console.log('finish_reception_task');

                    xtrans.finish_reception_task(data, socket);
                }
            );


            socket.on('finish_picking_task',
                function (data)
                {
                    console.log('finish_picking_task');

                    xtrans.finish_picking_task(data, socket);
                }
            );



            socket.on('process_sku',
                function(data) {
                    try
                    {
                        var pSQL = '';

                        var pSqlConfig ={
                            server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                            user	: data.dbuser,
                            password: data.dbuserpass,
                            port    : gdbPort,
                            database: 'SWIFT_EXPRESS',
                            options: {
                                encrypt: false // Use this if you're on Windows Azure
                            }
                        };


                        var connection = new pSqlInstance.Connection(pSqlConfig, function (err) {

                            var request1 = new pSqlInstance.Request(connection);
                            request1.verbose = true;
                            request1.stream = false;

                            var pReturned 	= 	'';


                            switch(data.serviceid){
                                case 'RECEPTION_DETAIL':
                                    request1.input('pTASK_ID', pSqlInstance.Int, data.taskid);
                                    request1.input('pQTY', pSqlInstance.Decimal(18,2), data.qty);
                                    request1.input('pBARCODE', pSqlInstance.VarChar(75), data.barcode);
                                    request1.input('pLOGIN_ID', pSqlInstance.VarChar(50), data.loginid);
                                    request1.output('pRESULT', pSqlInstance.VarChar(250));

                                    request1.execute('[SWIFT_SP_PROCESS_SKU_RECEPTION_TASK]', function (err, recordsets, returnValue)
                                    {


                                        switch(returnValue){
                                            case 0:
                                                socket.emit('sku_processed_ok',{'serviceid' : data.serviceid});
                                                break;
                                            case -8:    //user not found
                                                socket.emit('sku_processed_fail',{'serviceid' :data.serviceid, 'error': returnValue, 'msg': 'Codigo de barras no existe'});
                                                break;
                                            case -9:    //user found but pass not exist
                                                socket.emit('sku_processed_fail',{'serviceid' :data.serviceid, 'error': returnValue, 'msg': 'Codigo de barras no existe'});
                                                break;
                                            case -0:    //user found but pass not exist
                                                socket.emit('sku_processed_fail',{'serviceid' :data.serviceid, 'error': returnValue, 'msg': recordsets[0][0].pRESULT});
                                                break;
                                            case -6:
                                                socket.emit('sku_processed_fail',{'serviceid' :data.serviceid, 'error': returnValue, 'msg': 'SP Retorno -6'});
                                                break;
                                        }

                                    });
                                    break;
                            }

                        });

                    } catch (e) { console.log("process_sku.catch:" + e.message); }

                }
            );

            socket.on('get_my_tasks',
                function(data)
                {

                    var rowscount   = 0;

                    socket.emit('tasks_being_query',{'tasktype':'all'});

                    //console.clear();
                    pSQL = "select * from [OP_WMS_FUNC_GET_MY_PENDING_TASKS]('"+data.loginid+"') order by created_stamp, task_seq";
                    console.log(pSQL);
                    pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',

                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    };

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err){
                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        if(err != undefined){
                            socket.emit('error_message', { 'message': 'getmytasks.err: ' + err.message });
                            return;
                        }

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                // ... error checks
                                if (err != undefined)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                                }
                                if (recordset.length == 0)
                                {
                                    socket.emit('user_tasks_not_found', { 'loginid': data.loginid });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('add_to_tasks.emited');

                            socket.emit('add_to_tasks', { 'row': row });
                            rowscount++;

                        });


                        request.on('done', function (returnValue)
                        {
                            try
                            {
                                console.log('add_to_tasks.done');
                                socket.emit('tasks_query_completed', { 'rowcount': rowscount, 'tasktype':data.tasktype });

                                rowscount = 0;
                            }
                            catch(e)
                            {
                                console.log('catch');
                            }

                        });

                    });

                }

            );

            socket.on('get_inv_x_loc',
                function(data)
                {

                    var rowscount   = 0;

                    socket.emit('get_inv_x_loc_received',{'location': data.barcode});

                    pSQL = "select * from [SWIFT_VIEW_LOCATION_INVENTORY] WHERE LOCATION = '"+data.barcode+"'";
                    console.log(pSQL);


                    pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',

                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    }

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err){
                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('get_inv_x_loc.emited');

                            socket.emit('add_to_get_inv_x_loc', { 'row': row});
                            rowscount++;

                        });

                        request.on('done', function (returnValue)
                        {
                            console.log('get_inv_x_loc.done:'+ rowscount);
                            //console.log(rowscount);
                            try
                            {
                                socket.emit('get_inv_x_loc_completed', { 'rowcount': rowscount});
                                rowscount = 0;
                            }
                            catch(e)
                            {
                                console.log('get_inv_x_loc.catch');
                            }
                        });

                    });

                }

            );
            socket.on('get_inv_x_sku',
                function(data)
                {

                    var rowscount   = 0;

                    socket.emit('get_inv_x_sku_received',{'sku': data.barcode});

                    pSQL = "select * from [SWIFT_VIEW_LOCATION_INVENTORY] WHERE (SKU = '"+data.barcode+"' OR BARCODE = '"+ data.barcode+"')";
                    console.log(pSQL);


                    pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',

                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    }

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err){
                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'get_inv_x_sku.sql.err: ' + err.message });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('get_inv_x_sku.emited');

                            socket.emit('add_to_get_inv_x_sku', { 'row': row});
                            rowscount++;

                        });

                        request.on('done', function (returnValue)
                        {
                            console.log('get_inv_x_sku.done:'+ rowscount);
                            //console.log(rowscount);
                            try
                            {
                                socket.emit('get_inv_x_sku_completed', { 'rowcount': rowscount});
                                rowscount = 0;
                            }
                            catch(e)
                            {
                                console.log('get_inv_x_sku.catch');
                            }
                        });

                    });

                }

            );

            socket.on('get_task',
                function(data)
                {

                    var rowscount   = 0;
                    socket.emit('tasks_being_query',{'tasktype': data.tasktype});

                    switch(data.tasktype){
                        case "RECEPTION":
                            pSQL = "select * from [OP_WMS_FUNC_GET_RECEPTION_TASK]('"+data.taskid+"') order by description_sku";
                            break;
                        case "PICKING":
                            pSQL = "select * from [OP_WMS_FUNC_GET_PICKING_TASK]('"+data.taskid+"') order by description_sku";
                            break;
                    }

                    //console.log(pSQL);

                    pSqlConfig ={
                        server	: dbserver, // You can use 'localhost\\instance' to connect to named instance
                        user	: data.dbuser,
                        password: data.dbuserpass,
                        port    : gdbPort,
                        database: 'SWIFT_EXPRESS',

                        options: {
                            encrypt: false // Use this if you're on Windows Azure
                        }
                    }

                    var connection = new pSqlInstance.Connection(pSqlConfig, function (err){
                        var request     = new pSqlInstance.Request(connection);
                        request.verbose = true;
                        request.stream  = true;

                        request.query(pSQL,
                            function (err, recordset)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    socket.emit('error_message', { 'message': 'getmytasks.sql.err: ' + err.message });
                                }
                            }
                        );

                        request.on('row', function (row)
                        {
                            console.log('get_task_info.emited');

                            socket.emit('get_task_info', { 'row': row, 'tasktype': data.tasktype });
                            rowscount++;

                        });

                        request.on('done', function (returnValue)
                        {
                            console.log('get_task_info.done:'+ rowscount);
                            //console.log(rowscount);
                            try
                            {
                                socket.emit('tasks_query_completed', { 'rowcount': rowscount, 'tasktype': data.tasktype });
                                rowscount = 0;
                            }
                            catch(e)
                            {
                                console.log('catch');
                            }
                        });

                    });

                }

            );

            socket.on('get_barcode_info',
                function(data)
                {
                    xscanner.BarcodeIsScanned(data, socket)
                }
            );

            socket.on('get_next_location',
                function(data)
                {
                    xtrans.get_next_location(data, socket)
                }
            );

            socket.on('remove_scanned_serie',
                function(data){
                    xtrans.remove_scanned_serie(data,socket);
                }
            );
            socket.on('validate_serie',
                function(data)
                {
                    console.error("validate_serie:"+data.page);

                    switch(data.page){
                        case 'init':
                            xtrans.process_inv_init(data,socket);
                            break;
                        default:
                            xscanner.ValidateSerie(data, socket);
                            break;
                    }

                }
            );

        }
        catch (e)
        {
            console.log('connection.catch: ' + e.message);
            socket.emit('error_message', { 'message': 'connection.catch: ' + e.message });
        }

    });


});

/*
process.on('uncaughtException', function (err) {
	console.log(pSqlConfig);
    console.error(err.message);
	console.error(err.stack);
});
*/
