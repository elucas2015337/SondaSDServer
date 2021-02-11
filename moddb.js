module.exports = {

    GetDBServer: function () { return "10.0.0.4" }, 
    GetSQLConfig: function () {
        var xconfig = {
            server: '10.0.0.4', 
            user: 'sa',
            port: 1433,
            password: 'D1pr0c0m2o',
            database: 'SWIFT_EXPRESS',
            options: { encrypt: false }
        };
        return xconfig;
    },
    GetLoginSQLConfig: function () {
        var xconfig = {
            server: '10.0.0.4', 
            user: 'sa',
            port: 1433,
            password: 'D1pr0c0m2o',
            database: 'SWIFT_EXPRESS',
            options: { encrypt: false }
        };
        return xconfig;
    },
    GetDBPort: function () { return "1433"; },
    GetSocketPort: function () { return "8085"; },
    GetLogSchema: function () {
        return "DIPROCOM";   
    }
  
}
