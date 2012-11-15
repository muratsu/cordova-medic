var path = require('path'),
    shell = require('shelljs'),
    error_writer = require('../error_writer'),
    cp = require('child_process');

var root = path.join(__dirname, '..', '..', '..');
var fruitstrap = path.join(root, 'node_modules', 'fruitstrap', 'fruitstrap');
// current fruitstrap dependency has two binaries, uninstall exists under the "listdevices" one
var listdevices = path.join(root, 'node_modules', 'fruitstrap', 'listdevices');

function should_we_kill(process, buf, sha, device_id) {
    if (buf.indexOf('>>> DONE <<<') > -1) {
        process.kill();
        return true;
    } else if (buf.indexOf('AMDeviceInstallApplication failed') > -1) {
        // Deployment failed.
        error_writer('ios', sha, 'unknown', device_id, 'Deployment failed.', 'AMDeviceInstallApplication failed');
        process.kill();
        return true;
    }
    return false;
}

function run_through(sha, devices, bundlePath, bundleId) {
    var d = devices.shift();
    if (d) {

    }
}

// deploy and run a specified bundle to specified devices
module.exports = function deploy(sha, devices, bundlePath, bundleId) {
    function log(msg) {
        console.log('[IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    if (devices.length > 0) {
        log('Devices: ' + devices.join(', '));
        devices.forEach(function(d) {
            log('Uninstalling app on ' + d);
            var cmd = listdevices + ' uninstall --id=' + d + ' --bundle-id=org.apache.cordova.example';
            shell.exec(cmd, {silent:true,async:true}, function(code, output) {
                if (code > 0) log('Uninstall on ' + d + ' failed, continuing anyways.');
                log('Install + deploy on ' + d);
                var args = ['--id=' + d, '--bundle=' + bundlePath, '--debug'];
                var buf = '';
                var fruit = cp.spawn(fruitstrap, args);
                fruit.stdout.on('data', function(stdout) {
                    console.log(stdout.toString());
                    buf += stdout.toString();
                    should_we_kill(fruit, buf, sha, d);
                });
                fruit.stderr.on('data', function(stderr) {
                    console.log(stderr.toString());
                    buf += stderr.toString();
                    should_we_kill(fruit, buf, sha, d);
                });
            });
        });
    } else log('No iOS devices detected.');
};
