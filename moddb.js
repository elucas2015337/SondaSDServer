var ipAddress = "190.56.115.27";//"190.56.115.27";//;
module.exports = {

    GetDBServer: function () { return ipAddress }, 
    GetSQLConfig: function () {
        var xconfig = {
            server: ipAddress, 
            user: 'sa',
            port: 1433,
            password: 'SQ1MSCM!9',
            database: 'SWIFT_EXPRESS',
            options: { encrypt: false }
        };
        return xconfig;
    },
    GetLoginSQLConfig: function () {
        var xconfig = {
            server: ipAddress, // You can use 'localhost\\instance' to connect to named instance
            user: 'sa',
            port: 1433,//1433,
            password: 'SQ1MSCM!9',
            database: 'SWIFT_EXPRESS',
            options: { encrypt: false }
        };
        return xconfig;
    },
    GetDBPort: function () { return "1433"; },
    GetSocketPort: function () { return "8596"; },
    GetLogSchema: function () {
        return "ferco";
    }
  
}
