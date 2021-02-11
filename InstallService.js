var Service = require('node-windows').Service;

var svc = new Service({
    name: 'Swift Express Service',
    description: 'Swift Express Service',
    script: require('path').join(__dirname, 'SwiftExpressServer.js')
});


svc.on('install', function () {
    svc.start();
});

svc.install();

//Para opciones de logging: https://github.com/kohsuke/winsw/blob/master/doc/loggingAndErrorReporting.md