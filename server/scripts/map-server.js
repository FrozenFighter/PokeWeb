var fileSys = require('fs');

exports.MapServer = {
    init: function() {
        mySQL.query('SELECT id,code FROM objects', [], function(error, result) {
            if (result && result.length) {
                var i;
                for (i = result.length - 1; i >= 0; i -= 1) {
                    exports.MapServer.object[result[i].id] = result[i].code;
                }
            }
        });
    },
    compile: function(map) {
        mySQL.query('SELECT * FROM maps WHERE id=?', [map], function(error, result) {
            if (result && result.length) {
                result = result[0];
                var data = 'Map.data=function(){var s=Map.object.set;' + 'Map.file=' + mySQL.escape(result.pms) + ';' + 'Map.name=' + mySQL.escape(result.name) + ';';
                if (!result.name_display) {
                    data += 'Map.nameHide=true;';
                }
                // The audio
                if (result.audio) {
                    data += 'Map.audio=' + mySQL.escape(result.audio) + ';';
                }
                // Map's background
                if (result.background) {
                    data += 'Map.background=' + mySQL.escape(result.background) + ';';
                    if (result.background_frames) {
                        data += 'Map.backgroundFrames=' + result.background_frames + ';';
                    }
                    if (result.background_speed) {
                        data += 'Map.backgroundSpeed=' + result.background_speed + ';';
                    }
                }
                // Map's lighting
                if (result.light) {
                    var light = result.light.split(',');
                    data += 'Map.light=[' + (256 * 256 * light[0] + 256 * light[1] + light[2]) + ',' + (light[3] || '.8') + '];';
                }
                // Which region the map belongs to
                if (result.region) {
                    data += 'Map.region=' + result.region + ';';
                }
                // Whether the map is an inside map
                if (result.interior) {
                    data += 'Map.interior=true;';
                }
                // Cave or no cave!
                if (result.cave) {
                    data += 'Map.cave=true;';
                }
                // Is it a race map?
                if (result.race) {
                    data += 'Map.race=true;';
                }
                // Retro map?
                if (result.retro) {
                    data += 'Map.retro=true;';
                }
                data += 'Map.current=' + map + ';';
                mySQL.query('SELECT * FROM objects_placed WHERE map=?', [map], function(error, result) {
                    if (result && result.length) {
                        var i,
                            j,
                            code;
                        for (i = result.length - 1; i >= 0; i -= 1) {
                            exports.MapServer.position = [0, 0];
                            code = result[i].code.split('\n');
                            data += exports.MapServer.jCoad(exports.MapServer.object[result[i].obj], result[i].x, result[i].y);
                            for (j in code) {
                                if (code.hasOwnProperty(j) && code[j]) {
                                    data += exports.MapServer.jCoad(code[j], result[i].x, result[i].y);
                                }
                            }
                        }
                        data += '}';
                        console.log(data);
                        console.log('Compiled map #' + map + '!');
                        // Save file
                        fileSys.writeFile(__dirname + '/../scripts/data/maps/' + map + '.js', data);
                    }
                });
            }
        });
    },
    jCoad: function(code, x, y) {
        var check;
        x = x + this.position[0];
        y = y + this.position[1];
        if (code.substr(0, 2) === '//') {
            return '';
        }
        // Position
        if (check = code.match(/xy\(([0-9\-]*),?([0-9\-]*)\)/)) {
            this.position = [parseInt(check[1], 10), parseInt(check[2], 10)];
        }
        // Solid
        if (check = code.match(/solid\(([a-z]*)\)/)) {
            check[1] = check[1].replace('down', 0).replace('up', 1).replace('right', 2).replace('left', 3).replace('race', 5);
            return 's(0,' + x + (check[1] && parseInt(check[1], 10) >= 0 ? '.' + check[1] : '') + ',' + y + ');';
        }
        return '';
    },
    position: [0, 0],
    object: {}
};

exports.MapServer.compile.all = function() {
    mySQL.query('SELECT * FROM maps', [], function(error, result) {
        if (result && result.length) {
            var i;
            for (i = result.length - 1; i >= 0; i -= 1) {
                exports.MapServer.compile(result[i].id);
            }
        }
    });
};