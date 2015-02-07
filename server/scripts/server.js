/*jslint node: true, sloppy: true, nomen: true */
/*global Action, Clients, Users, Data */

// Include a few scripts
var WebSocket = require('ws').Server,
    Server = new WebSocket({
        port: process.argv[2] === 'test' ? 9008 : 9876
    }),
    fileSys = require('fs'),
    moment = require('moment'),
    mySQL = require('mysql'),
    crypto = require('crypto'),
    Rank = require('./ranks').Rank;

// Load the battle server
Server.battles = require('./battle-server').BattleServer;

// Load the map server
Server.maps = require('./map-server').MapServer;

// Determine whether we're running the test server
Server.test = process.argv[2] === 'test';

// Set the server mode
Server.mode = '';

// Define what happens when a user connects
Server.on('connection', function(socket) {
    var ip = socket.upgradeReq.connection.remoteAddress;
    // Set up what to do when receiving data from the game client
    socket.on('message', function(data) {
        try {
            data = JSON.parse('[' + data + ']');
        } catch (error) {
            return;
        }
        // Don't display these packets
        if ([0, 1, 4, 8, 9, 11, 12, 15, 18, 19, 20, 22, 23, 25, 51, 52, 54, 55, 56].indexOf(data[0]) < 0) {
            console.log('<' + ip + '> [' + data + ']');
        }
        var i,
            client,
            inChannel;
        // Battle data
        if (data[0] === 56) {
            console.log(data[1]);
            socket.ip = ip;
            Server.battles.receive(data[1], socket);
        }
        // Kick a player
        if (data[0] === 0 && data.length === 3 && socket.rank.canKick && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'string']
        ])) {
            Action.kick(data[1], socket, data[2]);
        }
        // User tries to log in
        if (data[0] === 1 && data.length === 8 && !socket.id && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'string', ''],
            [data[3], 'object'],
            [data[4], 'string'],
            [data[5], 'string', '']
        ])) {
            fileSys.readFile(__dirname + '/../text/version.txt', function(error, content) {
                if (data[5] !== content.toString()) {
                    Server.send(socket, [3, -1, '==notice', 'You are being kicked from the server due to using an outdated version!']);
                    Server.send(socket, [0, '[console]']);
                    socket.reason = ' (wrong version)';
                    socket.close();
                } else {
                    pass = crypto.createHash('md5').update(data[2]).digest('hex');
                    mySQL.query('SELECT * FROM players WHERE username=? AND password=?', [data[1], pass], function(error, result) {
                        if (result && result.length) {
                            var client,
                                player = result[0];
                            if (data[6] && Clients.get(player.id)) {
                                client = Clients.get(player.id);
                                Server.send(client, [3, -1, '==notice', 'You are being kicked from the server due to another account logging in as you!']);
                                Server.send(client, [0, '[console]']);
                                client.reason = ' (multiple logins)';
                                client.close();
                            }
                            if (!data[6] && Clients.get(player.id, 1)) {
                                client = Clients.get(player.id, 1);
                                Server.send(client, [3, -1, '==notice', 'You are being kicked from the server due to another account logging in as you!']);
                                Server.send(client, [0, '[console]']);
                                client.reason = ' (multiple logins)';
                                client.close();
                            }
                            mySQL.query('SELECT * FROM players_banned WHERE (id=? OR id=?) AND type<2', [player.username, ip], function(error, result) {
                                if (result && result.length) {
                                    Server.send(socket, [3, -1, '==notice', 'You are being kicked from the server due to being banned!']);
                                    Server.send(socket, [0, '[console]']);
                                    socket.reason = ' (banned user)';
                                    socket.close();
                                } else {
                                    if (player.beta) {
                                        fileSys.readFile(__dirname + '/../text/motd.txt', function(error, content) {
                                            player.user_color = player.user_color.match(/[A-Fa-f0-9]{6}/) ? player.user_color : '';
                                            var players,
                                                cache = [],
                                                client,
                                                time = Math.floor((Date.now() / 1000) / 86400) * 86400,
                                                initial = [
                                                    1,
                                                    content.toString(), [],
                                                    player.map,
                                                    player.x,
                                                    player.y,
                                                    player.facing,
                                                    parseFloat(player.skin),
                                                    player.money,
                                                    player.checkpoint,
                                                    player.skin_color,
                                                    '',
                                                    player.health, [],
                                                    [],
                                                    player.user_color,
                                                    new Rank(player.rank).symbol + player.username,
                                                    player.rank,
                                                    player.id,
                                                    player.password
                                                ];
                                            if (Server.clients.length > 1) {
                                                players = [
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    [],
                                                    []
                                                ];
                                                Clients.forEach(function(client) {
                                                    if (client.id && !cache[client.id]) {
                                                        players[0].push(client.id);
                                                        players[1].push(client.nick);
                                                        players[2].push(client.idle);
                                                        players[3].push(client.userColor);
                                                        players[4].push(parseInt(client.flags.join(''), 2));
                                                        players[5].push(client.rank.id);
                                                        if (data[6]) {
                                                            players[6].push(client.skin);
                                                            players[7].push(client.skinColor);
                                                            players[8].push(client.icon);
                                                            players[9].push(client.ally);
                                                        }
                                                    }
                                                });
                                                initial[2] = players;
                                            }
                                            if (data[7]) {
                                                for (i = 0; i < data[3].length; i += 1) {
                                                    if (Server.log.messages[data[3][i]]) {
                                                        initial[13].push(Server.log.messages[data[3][i]]);
                                                    }
                                                }
                                            }
                                            if (Users.messages[player.id]) {
                                                initial[14] = Users.messages[player.id];
                                                delete Users.messages[player.id];
                                            }
                                            Server.send(socket, initial);
                                            socket.id = player.id;
                                            socket.rank = new Rank(player.rank);
                                            socket.nick = socket.rank.symbol + player.username;
                                            if (!Clients[player.id]) {
                                                Server.send.all([7, player.id, socket.nick, parseFloat(player.skin), player.skin_color, player.user_color, player.rank], socket);
                                            } else {
                                                client = Clients[player.id];
                                                for (i = client.length - 1; i >= 0; i -= 1) {
                                                    if (client[i].idle) {
                                                        socket.idle = 1;
                                                        socket.idleSince = client[i].idleSince;
                                                        Server.send(socket, [2, player.id, 1]);
                                                        break;
                                                    }
                                                }
                                            }
                                            if (data[6]) {
                                                Server.send.data(socket, 'maps', player.map, [12, player.id, player.x, player.y, player.map, player.facing]);
                                                Server.send.party(socket);
                                            }
                                            if (Users.mutedUntil[player.id]) {
                                                Server.send(socket, [27, 1, 1]);
                                            }
                                            if (Server.mode) {
                                                Server.send(socket, [17, Server.mode]);
                                            }
                                            socket.channels = data[3];
                                            socket.status = data[4];
                                            socket.idle = socket.idle || 0;
                                            socket.idleSince = socket.idleSince || 0;
                                            socket.chat = data[6] ? 0 : 1;
                                            socket.map = player.map;
                                            socket.x = player.x;
                                            socket.y = player.y;
                                            socket.facing = player.facing;
                                            socket.skin = parseFloat(player.skin);
                                            socket.money = player.money;
                                            socket.userColor = player.user_color;
                                            socket.skinColor = player.skin_color;
                                            socket.icon = 0;
                                            socket.ally = -1;
                                            socket.flags = [0, 0, 1, 0, 1, 0, 0, 0];
                                            socket.connected = Date.now();
                                            socket.ip = ip;
                                            for (i = data[3].length - 1; i >= 0; i -= 1) {
                                                if (!Clients[player.id]) {
                                                    Server.send.data(socket, 'channels', data[3][i], [5, player.id, data[3][i], data[4], 0]);
                                                    Server.log(data[3][i], '== ' + socket.nick + ' joined #' + data[3][i]);
                                                }
                                                Data.set('channels', data[3][i], socket);
                                                Server.send.onlinelist(socket, data[3][i]);
                                            }
                                            Data.set('maps', player.map, socket);
                                            Clients.add(socket.nick, player.id, socket);
                                            Server.log.players();
                                            console.log('\x1b[32;1m' + socket.nick + ' logged in' + (data[6] ? '' : 'to the chat') + '\x1b[0m');
                                            if (player.last_played < time) {
                                                mySQL.query('SELECT * FROM activity WHERE time=?', [time], function(error, result) {
                                                    if (result && result.length) {
                                                        mySQL.query('UPDATE activity SET plays=plays+1 WHERE time=?', [time]);
                                                    } else {
                                                        mySQL.query('INSERT INTO activity(time,plays) VALUES(?,1)', [time]);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            });
                        } else {
                            socket.reason = ' (invalid user)';
                            socket.close();
                        }
                    });
                }
            });
        }
        if (!socket.id) {
            return;
        }
        // User goes idle
        if (data[0] === 2 && data.length === 2 && Server.validateData([
            [data[1], 'number']
        ])) {
            client = Clients[socket.id];
            for (i = client.length - 1; i >= 0; i -= 1) {
                client[i].idle = data[1];
                client[i].idleSince = Date.now();
            }
            Server.send.all([2, socket.id, data[1]], socket);
        }
        // Chat message sent to a channel
        if (data[0] === 3 && data.length === 3 && Server.validateData([
            [data[1], 'number'],
            [data[2], 'string', '']
        ])) {
            if (Server.mode === 'crashed') {
                Server.send(socket, [3, -1, '==error', 'The server has crashed!']);
            } else if (Server.mode === 'staff' && !socket.rank.staffMode) {
                Server.send(socket, [3, -1, '==notice', 'The server is in staff mode!']);
            } else if (!Users.mutedUntil[socket.id] && socket.channels[data[1]]) {
                if (data[2].substr(0, 3) === '/me') {
                    Server.send.data(socket, 'channels', socket.channels[data[1]], [3, 0, '*' + socket.nick, data[2].substr(3)]);
                    Server.log(socket.channels[data[1]], '* ' + socket.nick + data[2].substr(3), socket.userColor);
                    Server.log.history(socket.channels[data[1]], '*' + socket.nick, data[2].substr(3), socket.userColor);
                    console.log('\x1b[33;1m*' + socket.nick + data[2].substr(3) + '\x1b[0m');
                } else {
                    Server.send.data(socket, 'channels', socket.channels[data[1]], [3, 0, socket.id, data[2]]);
                    Server.log(socket.channels[data[1]], '<' + socket.nick + '> ' + data[2], socket.userColor);
                    Server.log.history(socket.channels[data[1]], socket.nick, data[2], socket.userColor);
                    console.log('\x1b[33;1m<' + socket.nick + '> ' + data[2] + '\x1b[0m');
                }
            }
        }
        // User joins or leaves a channel, or invites someone
        if (data[0] === 5 && data.length >= 2 && Server.validateData([
            [data[1], 'string', '']
        ])) {
            if (data.length === 2) {
                if (socket.channels.indexOf(data[1]) > -1) {
                    socket.channels.splice(socket.channels.indexOf(data[1]), 1);
                    Data.remove('channels', data[1], socket);
                    inChannel = false;
                    if (Data.channels[data[1]]) {
                        for (i = Data.channels[data[1]].length - 1; i >= 0; i -= 1) {
                            if (Data.channels[data[1]][i].id === socket.id) {
                                inChannel = true;
                                break;
                            }
                        }
                    }
                    if (!inChannel) {
                        Server.send.data(socket, 'channels', data[1], [5, socket.id, 0, '', 1]);
                        Server.log(data[1], '== ' + socket.nick + ' left #' + data[1]);
                    }
                } else {
                    socket.channels.push(data[1]);
                    inChannel = false;
                    if (Data.channels[data[1]]) {
                        for (i = Data.channels[data[1]].length - 1; i >= 0; i -= 1) {
                            if (Data.channels[data[1]][i].id === socket.id) {
                                inChannel = true;
                                break;
                            }
                        }
                    }
                    if (!inChannel) {
                        Server.send.data(socket, 'channels', data[1], [5, socket.id, 0, socket.status, 0]);
                        Server.log(data[1], '== ' + socket.nick + ' joined #' + data[1]);
                    }
                    Data.set('channels', data[1], socket);
                    Server.send.onlinelist(socket, data[1]);
                    if (Server.log.messages[data[1]]) {
                        Server.send(socket, [57, data[1], Server.log.messages[data[1]]]);
                    }
                }
            } else {
                Server.send.user(data[2], [5, socket.id, data[1]], socket);
            }
        }
        // Change a user's rank
        if (data[0] === 6 && data.length === 3 && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'number']
        ])) {
            Users.changeRank(data[1], data[2], socket);
        }
        // Change a user's skin
        if (data[0] === 7 && data.length === 3 && socket.rank.canSkin && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'number']
        ])) {
            Action.skin(data[1], data[2], socket.nick);
        }
        // User moves to a new position
        if (data[0] === 8 && data.length === 4 && Server.validateData([
            [data[1], 'number'],
            [data[2], 'number'],
            [data[3], 'number']
        ])) {
            Server.send.data(socket, 'maps', socket.map, [8, socket.id, data[1], data[2]]);
            socket.x = data[1];
            socket.y = data[2];
			console.log("X: "+socket.x+" Y: "+socket.y);
            socket.facing = data[3];
        }
        // User visits a new map
        if (data[0] === 9 && data.length >= 5 && Server.validateData([
            [data[1], 'number'],
            [data[2], 'number'],
            [data[3], 'number'],
            [data[4], 'number']
        ])) {
            Data.remove('maps', socket.map, socket);
            Server.send.data(socket, 'maps', socket.map, data.length === 6 ? [9, socket.id, 1] : [9, socket.id]);
            Data.set('maps', data[3], socket);
            Server.send.data(socket, 'maps', data[3], [12, socket.id, data[1], data[2], data[3], data[4]]);
            socket.x = data[1];
            socket.y = data[2];
            socket.map = data[3];
            socket.facing = data[4];
        }
        // User changes their status
        if (data[0] === 10 && data.length === 2 && Server.validateData([
            [data[1], 'string']
        ])) {
            data[1] = data[1].substr(0, 150);
            for (i = socket.channels.length - 1; i >= 0; i -= 1) {
                Server.send.data(socket, 'channels', socket.channels[i], [10, 0, socket.id, data[1]]);
            }
            socket.status = data[1];
        }
        // User changes their direction
        if (data[0] === 11 && data.length === 2 && Server.validateData([
            [data[1], 'number']
        ])) {
            Server.send.data(socket, 'maps', socket.map, [11, socket.id, data[1]]);
            socket.facing = data[1];
        }
        // User wants to know who else is on a map
        if (data[0] === 12 && data.length === 2 && Server.validateData([
            [data[1], 'number']
        ])) {
            Server.send.players(socket, data[1]);
        }
        // Change the Message of the Day
        if (data[0] === 13 && data.length === 2 && socket.rank.canMotD && Server.validateData([
            [data[1], 'string', '']
        ])) {
            Action.MotD(data[1], socket.nick);
        }
        // Change a user's flag
        if (data[0] === 14 && data.length === 3 && socket.rank.canFlag && Server.validateData([
            [data[1], 'number'],
            [data[2], 'string', '']
        ])) {
            Action.flag(data[1], data[2], socket);
        }
        // User sends a private message
        if (data[0] === 15 && data.length === 3 && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'string', '']
        ])) {
            if (data[1] !== '[console]') {
                Server.send.pmessage(data[1], data[2].substr(0, 3) !== '/me' ? [15, socket.nick, data[2]] : [15, '*' + socket.nick, data[2].substr(3)], socket);
            } else {
                console.log('\x1b[33;1mPM from ' + socket.nick + ': ' + data[2] + '\x1b[0m');
            }
        }
        // User tries to teleport
        if (data[0] === 16 && data.length === 3 && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'string', '']
        ])) {
            if (socket.rank.canFullyTeleport) {
                Action.teleport(data[1], data[2], socket);
            } else if (socket.rank.canTeleport) {
                Action.teleport(socket.nick, data[2], socket);
            }
        }
        // User wants to find a specific map
        if (data[0] === 17 && data.length === 2 && Server.validateData([
            [data[1], 'string', '']
        ])) {
            Data.maps.get(data[1], function(result) {
                Server.send(socket, [3, -1, '==' + (result.length ? '' : 'error'), result.length ? result.join(', ') : 'No map results!']);
            });
        }
        // User sends a ping to the server or another user
        if (data[0] === 18 && data.length === 2 && Server.validateData([
            [data[1], 'string']
        ])) {
            if (data[1] === '') {
                Server.send(socket, [19, '']);
            } else {
                Server.send.user(data[1], [18, socket.id], socket);
            }
        }
        // User replies to a ping, ponging back
        if (data[0] === 19 && data.length === 2 && Server.validateData([
            [data[1], 'number']
        ])) {
            Server.send.user(data[1], [19, Clients.nick(socket.nick), socket.id], function() {
                console.log('Pong from ' + socket.nick + '! (' + (Date.now() - socket.ping) + 'ms)');
            });
        }
        // User or ally jumps
        if (data[0] === 20 && data.length >= 2 && Server.validateData([
            [data[1], 'number']
        ])) {
            Server.send.data(socket, 'maps', socket.map, [20, socket.id, data[1], data.length === 3 ? 1 : 0]);
        }
		
		// User has a following pokemon
        if (data[0] === 55 && Server.validateData([
            [data[1], 'number']
        ])) {
			// Is the pokemon owned by this user and valid?
			mySQL.query('SELECT * FROM players_pokemon WHERE user=? AND id=? AND box<0 ORDER BY box DESC', [socket.id, data[1]], function(error, result) {
				if (result && result.length) {
					follower = result[0];
					Server.send.data(socket, 'maps', socket.map, [55, socket.id, data[1], data.length === 3 ? 1 : 0]);
					console.log("User: "+socket.id+" has a follower, with the name: "+follower.name);
				}
				// Hacker or cheater
				else {
					console.log("It seems the User: "+socket.id+" doesnt have a pokemon with the ID: "+data[1]);
				}
			});
		}
		
        // User triggers a trigger which triggers this
        if (data[0] === 24 && data.length === 3 && socket.rank.canTrigger && Server.validateData([
            [data[1], 'string'],
            [data[2], 'string', '']
        ])) {
            if (data[1]) {
                Server.send.user(data[1], [24, data[2]]);
            } else {
                Server.send.all([24, data[2]]);
            }
        }
        // User or ally triggers an icon
        if (data[0] === 25 && Server.validateData([
            [data[1], 'number']
        ])) {
            if (data.length === 3 && data[2]) {
                Server.send.all([25, socket.id, data[1]]);
                socket.icon = data[1];
            } else {
                Server.send.data(-1, 'map', socket.map, [25, socket.id, data[1], data.length === 2 ? 1 : 0]);
            }
        }
        // User tries to mute someone
        if (data[0] === 27 && data.length === 3 && socket.rank.canMute && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'number']
        ])) {
            Action.mute(data[1], data[2], socket);
        }
        // Find a user's location
        if (data[0] === 30 && data.length === 2 && Server.validateData([
            [data[1], 'string', '']
        ])) {
            client = Clients.get(data[1]);
            if (client) {
                mySQL.query('SELECT name FROM maps WHERE id=?', [client.map], function(error, result) {
                    Server.send(socket, [30, client.id, result[0].name, client.x, client.y]);
                });
            } else if (Clients.get(data[1], 1)) {
                Server.send(socket, [3, -1, '==error', 'User ' + data[1] + ' is using the chat-only version!']);
            } else {
                Server.send.user(data[1], 0, socket);
            }
        }
        // User requests a user's whois
        if (data[0] === 31 && data.length === 2 && Server.validateData([
            [data[1], 'string', '']
        ])) {
            client = Clients[Clients.nick(data[1])];
            if (client) {
                client = client[0];
                Server.send.user(socket.nick, [31, client.id, moment(client.connected).fromNow(), client.idle ? moment(client.idleSince).fromNow() : 0, socket.rank.extendedWhois ? [client.ip, client.channels.join(', ')] : []], socket);
            } else {
                mySQL.query('SELECT id,username,rank,iprotocol,last_played FROM players WHERE username=?', [Clients.nick(data[1])], function(error, result) {
                    if (result && result.length) {
                        var user = result[0];
                        user.rank = new Rank(user.rank);
                        Server.send.user(socket.nick, [31, user.id, 0, 0, socket.rank.extendedWhois ? [user.iprotocol] : [], user.rank.symbol + user.username, moment(user.last_played * 1000).fromNow()], socket);
                    } else {
                        Server.send(socket, [3, -1, '==error', 'User ' + data[1] + ' does not exist!']);
                    }
                });
            }
        }
        // Let's race
        /*if (data[0] === 51) {
if (data.length === 1) {
//
} else {
//
}
}*/
        // Answer me this!
        if (data[0] === 53 && socket.rank.canAsk && Server.validateData([
            [data[1], 'string', ''],
            [data[2], 'string', '']
        ])) {
            if (data.length === 4) {
                Server.send.user(data[1], [3, -1, '==', 'Reply from ' + socket.nick + ': ' + data[2] + '.'], socket);
            } else {
                Server.send.user(data[1], [53, data[2], socket.nick], socket);
            }
        }
        // User changes their color
        if (data[0] === 54 && data.length === 2 && Server.validateData([
            [data[1], 'string', '']
        ]) && data[1].match(/[A-Fa-f0-9]{6}/)) {
            client = Clients[socket.id];
            for (i = client.length - 1; i >= 0; i -= 1) {
                client[i].userColor = data[1];
            }
            mySQL.query('UPDATE players SET user_color=? WHERE id=?', [data[1], socket.id]);
            Server.send.all([54, socket.id, data[1]], socket);
        }
        // User sends a heartbeat
        if (data[0] === 55 && data.length === 1) {
            Server.send(socket, [55]);
        }
    });
    // What happens when the connection dies?
    socket.on('close', function() {
        if (socket.id) {
            mySQL.query('UPDATE players SET last_played=? WHERE id=?', [moment().format('X'), socket.id]);
            console.log('\x1b[31;1m' + socket.nick + ' quit' + (socket.reason || '') + '\x1b[0m');
            var i,
                data = [4, socket.id, socket.channels, 'quit' + (socket.reason || '')];
            if (socket.reason && socket.reason.substr(0, 8) === ' (kicked') {
                data[3] = 'was kicked from the server by ' + socket.kickedBy;
                if (socket.kickedReason) {
                    data[3] += ' (' + socket.kickedReason + ')';
                }
            }
            if ((Clients[socket.id] && Clients[socket.id].length === 1 && socket.reason !== ' (multiple logins)') || (!Clients[socket.id] && socket.reason === ' (multiple logins)')) {
                Server.send.all(data, socket);
                for (i = socket.channels.length - 1; i >= 0; i -= 1) {
                    Server.log(socket.channels[i], '== ' + socket.nick + ' ' + data[3]);
                }
            }
            Clients.remove(socket);
            for (i = socket.channels.length - 1; i >= 0; i -= 1) {
                Data.remove('channels', socket.channels[i], socket);
            }
            Data.remove('maps', socket.map, socket);
            if (Clients[socket.id] && Clients[socket.id].length && !Clients.get(socket.nick)) {
                Server.send.data(socket, 'maps', socket.map, [9, socket.id]);
            }
            Users.save(socket);
            Server.log.players();
            Server.battles.receive({
                action: 'disconnect'
            }, socket);
        } else {
            console.log('\x1b[31;1mDisconnected: ' + ip + (socket.reason || '') + '\x1b[0m');
            Server.battles.receive({
                action: 'disconnect'
            }, socket); //remove
        }
    });
    // Print the connected user's IP address
    console.log('Connected: ' + ip);
});

// Update lock.txt so its modification time can be read
Server.lock = function() {
    fileSys.writeFile(__dirname + '/../text/lock.txt', '');
};

// Validate the data received from players
Server.validateData = function(data) {
    var i,
        type,
        valid = true;
    for (i = data.length - 1; i >= 0; i -= 1) {
        type = typeof data[i][0];
        if (type !== data[i][1]) {
            valid = false;
        } else if (data[i][2] !== undefined && data[i][2] === data[i][0]) {
            valid = false;
        }
    }
    return valid;
};

// Send a message to a specific socket connection
Server.send = function(socket, message) {
    socket.send(JSON.stringify(message).slice(1, -1), function(error) {
        if (error) {
            console.log('Error:', error, socket.nick);
        }
    });
};

// Send a message to everyone
Server.send.all = function(message, exclude) {
    Clients.forEach(function(client) {
        if ((!exclude || client !== exclude) && client.id) {
            Server.send(client, message);
        }
    });
};

// Send a message to specific data groups
Server.send.data = function(exclude, group, value, message) {
    var values = [value],
        doSend,
        i,
        j;
    if (group === 'maps' && Data.sideMaps[value]) {
        values = Data.sideMaps[value];
    }
    for (i = values.length - 1; i >= 0; i -= 1) {
        if (Data[group][values[i]]) {
            for (j = Data[group][values[i]].length - 1; j >= 0; j -= 1) {
                doSend = true;
                if (group === 'maps' && Data[group][values[i]][j].chat) {
                    doSend = false;
                }
                if (group === 'channels') {
                    if (message[0] === 3) {
                        message[1] = Data[group][values[i]][j].channels.indexOf(value);
                    }
                    if (message[0] === 5) {
                        message[2] = Data[group][values[i]][j].channels.indexOf(value);
                    }
                    if (message[0] === 10) {
                        message[1] = Data[group][values[i]][j].channels.indexOf(value);
                    }
                }
                if (doSend && (exclude < 0 || Data[group][values[i]][j] !== exclude)) {
                    Server.send(Data[group][values[i]][j], message);
                }
            }
        }
    }
};

// Send a message to a specific user
Server.send.user = function(user, message, byWhom, error) {
    var client = Clients[Clients.nick(user)],
        i;
    if (client && message) {
        for (i = client.length - 1; i >= 0; i -= 1) {
            Server.send(client[i], message);
        }
    } else {
        if (typeof byWhom !== 'function') {
            if (byWhom && byWhom.id) {
                Server.send(byWhom, [3, -1, '==error', error || 'User ' + user + ' is not online!']);
            } else {
                console.log('\x1b[31;1m' + (error || 'User ' + user + ' is not online!') + '\x1b[0m');
            }
        } else {
            byWhom();
        }
        return {};
    }
};

// Send or store a personal message
Server.send.pmessage = function(user, message, byWhom) {
    Server.send.user(user, message, function() {
        mySQL.query('SELECT id,username FROM players WHERE username=?', [Clients.nick(user)], function(error, result) {
            if (result && result.length) {
                if (!Users.messages[result[0].id]) {
                    var notice = 'User ' + result[0].username + ' is currently offline, but they will receive your message the next time they log in.';
                    Users.messages[result[0].id] = [];
                    if (byWhom.id) {
                        Server.send(byWhom, [3, -1, '==notice', notice]);
                    } else {
                        console.log(notice);
                    }
                }
                Users.messages[result[0].id].push([message[1], message[2], byWhom.userColor || 0, Date.now()]);
            } else {
                if (byWhom.id) {
                    Server.send(byWhom, [3, -1, '==error', 'User ' + user + ' does not exist!']);
                } else {
                    console.log('\x1b[31;1mUser ' + user + ' does not exist!\x1b[0m');
                }
            }
        });
    });
};

// Get a channel's onlinelist
Server.send.onlinelist = function(byWhom, channel) {
    var list = [
        6,
        byWhom.channels.indexOf(channel), [],
        []
    ],
        cache = [],
        i;
    for (i = Data.channels[channel].length - 1; i >= 0; i -= 1) {
        if (cache.indexOf(Data.channels[channel][i].id) < 0) {
            list[2].push(Data.channels[channel][i].id);
            list[3].push(Data.channels[channel][i].status);
            cache.push(Data.channels[channel][i].id);
        }
    }
    Server.send(byWhom, list);
};

// Retrieve all users on a specific map
Server.send.players = function(byWhom, map) {
    var list = [
        12, [],
        [],
        [],
        [],
        []
    ],
        maps = [map],
        i,
        j,
        user;
    if (Data.sideMaps[map]) {
        maps = Data.sideMaps[map];
    }
    for (i = maps.length - 1; i >= 0; i -= 1) {
        if (Data.maps[maps[i]]) {
            for (j = Data.maps[maps[i]].length - 1; j >= 0; j -= 1) {
                user = Data.maps[maps[i]][j];
                if (user.id !== byWhom.id) {
                    list[1].push(user.id);
                    list[2].push(user.x);
                    list[3].push(user.y);
                    list[4].push(user.map);
                    list[5].push(user.facing);
                }
            }
        }
    }
    if (list[1].length) {
        Server.send(byWhom, list);
    }
};

// Send a player's party
Server.send.party = function(socket) {
    mySQL.query('SELECT * FROM players_pokemon WHERE user=? AND box<0 ORDER BY box DESC', [socket.id], function(error, result) {
        if (result && result.length) {
            Server.send(socket, [58, result]);
        }
    });
};

// Log messages to a channel chat log
Server.log = function(channel, message, color, callBack) {
    if (['main'].indexOf(channel) > -1 && !Server.log.off && !Server.test) {
        fileSys.appendFile(__dirname + '/../logs/' + channel + '_' + moment().format('DD-MMMM-YYYY') + '.txt', (color ? '#' + color : '') + '[' + moment().format('HH:mm') + '] ' + message + '\r\n', callBack || null);
    }
};

// Define the chat history object
Server.log.messages = {};

// Store recent messages of a channel
Server.log.history = function(channel, user, message, color) {
    if (!Server.log.off) {
        if (!Server.log.messages[channel]) {
            Server.log.messages[channel] = [];
        }
        Server.log.messages[channel].push([user, message, color || 0, Date.now()]);
        if (Server.log.messages[channel].length > 10) {
            Server.log.messages[channel].splice(0, 1);
        }
    }
};

// Log all users currently playing
Server.log.players = function() {
    if (!Server.test) {
        var players = [];
        if (Server.clients) {
            Clients.forEach(function(client, cache) {
                if (!cache[client.id] && client.id) {
                    players.push(client.nick + (client.userColor ? '#' + client.userColor : ''));
                }
            });
            players.sort(function(first, second) {
                var string = '\xA7@&+01234567989AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz',
                    firsts = [string.indexOf(first[0]), string.indexOf(second[0])],
                    which = 0;
                if (firsts[0] === firsts[1]) {
                    if (first < second) {
                        which = -1;
                    } else if (first > second) {
                        which = 1;
                    }
                } else {
                    which = firsts[0] - firsts[1];
                }
                return which;
            });
        }
        fileSys.writeFile(__dirname + '/../text/players.txt', players.join(', '));
    }
};

// Define the data groups
var Data = {
    channels: {},
    maps: {},
    sideMaps: []
};

// Add a user to a data group
Data.set = function(group, value, socket) {
    if (this[group][value]) {
        this[group][value].push(socket);
    } else {
        this[group][value] = [socket];
    }
};

// Remove a user from a data groups
Data.remove = function(group, value, socket) {
    if (this[group][value] && this[group][value].indexOf(socket) > -1) {
        this[group][value].splice(this[group][value].indexOf(socket), 1);
    }
};

// Retrieve side-maps
Data.sideMaps.retrieve = function() {
    mySQL.query('SELECT id,side_n,side_s,side_w,side_e FROM maps', function(error, result) {
        if (result && result.length) {
            var i;
            for (i = result.length - 1; i >= 0; i -= 1) {
                Data.sideMaps[result[i].id] = [result[i].id, result[i].side_n, result[i].side_s, result[i].side_e, result[i].side_w];
            }
        }
    });
};

// Get information about a map
Data.maps.get = function(name, callBack) {
    name = name.replace(/%/g, '');
    if (name.length >= 3) {
        mySQL.query('SELECT name,id FROM maps WHERE id=? OR name LIKE ? ORDER BY id DESC', [name, '%' + name + '%'], function(error, result) {
            var results = [],
                mapId = 0,
                i;
            if (result && result.length) {
                for (i = result.length - 1; i >= 0; i -= 1) {
                    results.push(result[i].name + '/' + result[i].id);
                    if (!mapId) {
                        mapId = result[i].id;
                    }
                }
            }
            callBack(results, mapId);
        });
    } else {
        callBack([], 0);
    }
};

// Define the users object
var Users = {
    mutedUntil: {},
    messages: {}
};

// Save a user's stats to the database
Users.save = function(socket, time) {
    if (socket) {
        var query = 'UPDATE players SET x=?,y=?,map=?,facing=?,skin=?,money=?,skin_color=?,last_played=?' + (time && !socket.chat ? ',play_time=play_time+150' : '') + ' WHERE id=?',
            values = [socket.x, socket.y, socket.map, socket.facing, socket.skin, socket.money, socket.skinColor, Date.now() / 1000, socket.id];
        mySQL.query(query, values);
    }
};

// Save all of the users and their souls
Users.saveAll = function() {
    var cache = [];
    if (Server.clients.length) {
        Clients.forEach(function(client) {
            if (!cache[client.id] && client.id) {
                if (Clients[client.id] && Clients[client.id].length === 1) {
                    Users.save(client, 1);
                } else {
                    Users.save(Clients.get(client.nick), 1);
                }
            }
        });
    }
    Server.lock();
};

// Change a user's rank
Users.changeRank = function(user, rank, byWhom) {
    mySQL.query('SELECT id,username,rank FROM players WHERE username=?', [user], function(error, result) {
        if (result && result.length) {
            if (rank !== result[0].rank && (!byWhom.id || byWhom.rank.canPromote.indexOf(result[0].rank) > -1)) {
                Server.send.all([35, result[0].id, result[0].username, rank, byWhom.nick]);
                mySQL.query('UPDATE players SET rank=? WHERE id=?', [rank, result[0].id]);
                rank = new Rank(rank);
                Server.log('main', '== ' + byWhom.nick + ' turned ' + result[0].username + ' into ' + rank.beforeNoun + ' ' + rank.name.toLowerCase());
                var client = Clients[Clients.nick(user)],
                    i;
                if (client) {
                    for (i = client.length - 1; i >= 0; i -= 1) {
                        client[i].nick = rank.symbol + Clients.nick(client[i].nick, 0);
                        client[i].rank = rank;
                    }
                }
                Server.log.players();
            }
        }
    });
};

// Define the client object
var Clients = {};

// Find a specific connection
Clients.get = function(user, chat) {
    user = this.nick(user);
    var client = this[user],
        i;
    if (client) {
        for (i = client.length - 1; i >= 0; i -= 1) {
            if ((!chat && !client[i].chat) || (chat && client[i].chat)) {
                return client[i];
            }
        }
    }
};

// Add a connection
Clients.add = function(user, userId, socket) {
    if (!this[this.nick(user)]) {
        this[this.nick(user)] = [];
    }
    if (!this[userId]) {
        this[userId] = [];
    }
    if (!this[socket.ip]) {
        this[socket.ip] = [];
    }
    this[this.nick(user)].push(socket);
    this[userId].push(socket);
    this[socket.ip].push(socket);
};

// Remove a connection
Clients.remove = function(socket) {
    var user = this.nick(socket.nick),
        userId = socket.id;
    this[user].splice(this[user].indexOf(socket), 1);
    this[userId].splice(this[userId].indexOf(socket), 1);
    if (!this[user].length) {
        delete this[user];
    }
    if (!this[userId].length) {
        delete this[userId];
    }
};

// Find a connection by IP address
Clients.getClientByIP = function(ip) {
    return Clients[ip];
};

// Strip a name to its cleanest form
Clients.nick = function(name, lowercase) {
    name = name.toString().replace(new RegExp('[^a-zA-Z0-9._]', 'g'), '');
    if (lowercase === undefined || lowercase) {
        name = name.toLowerCase();
    }
    return name;
};

// Go through every client
Clients.forEach = function(callBack) {
    var i,
        cache = {};
    for (i = Server.clients.length - 1; i >= 0; i -= 1) {
        callBack(Server.clients[i], cache);
        if (Server.clients[i].id) {
            cache[Server.clients[i].id] = 1;
        }
    }
};

// Actions object
var Action = {};

// Change the Message of the Day
Action.MotD = function(message, byWhom) {
    fileSys.writeFile(__dirname + '/../text/motd.txt', message);
    Server.send.all([13, message, byWhom]);
    console.log('New Message of the Day set!');
    Server.log('main', '== ' + byWhom + ' updated the Message of the Day');
};

// Change a user's flag
Action.flag = function(flag, user, byWhom) {
    var client = Clients.get(user),
        state;
    if (client) {
        state = client.flags[flag] ? 0 : 1;
        client.flags[flag] = state;
        Server.send.all([14, flag, client.id, state]);
        console.log((byWhom.nick === '[console]' ? 'Turned ' : byWhom.nick + ' turned ') + client.nick + '\'s ' + ['trail', 'spymode', 'shadow', 'solid', 'tag', 'spin'][flag] + ' ' + (state ? 'on' : 'off'));
    } else {
        Server.send.user(user, 0, byWhom);
    }
};

// Kick a user
Action.kick = function(user, byWhom, reason) {
    var client = Clients[Clients.nick(user)],
        i;
    if (client) {
        for (i = client.length - 1; i >= 0; i -= 1) {
            client[i].reason = ' (kicked by ' + byWhom.nick + ')';
            client[i].kickedBy = byWhom.nick;
            client[i].kickedReason = reason;
            Server.send(client[i], [0, byWhom.nick, reason]);
            client[i].close();
        }
    } else {
        Server.send.user(user, 0, byWhom);
    }
};

// Mute a user
Action.mute = function(user, minutes, byWhom) {
    var client = Clients[Clients.nick(user)],
        cache = {},
        userId,
        i,
        j;
    if (client) {
        userId = client[0].id;
        if (minutes) {
            minutes = parseInt(minutes, 10) || 1;
            clearTimeout(Users.mutedUntil[userId]);
            Users.mutedUntil[userId] = setTimeout(function() {
                delete Users.mutedUntil[userId];
                Server.send.user(user, [27, 0, 1]);
            }, minutes * 6e4);
        } else if (Users.mutedUntil[userId]) {
            clearTimeout(Users.mutedUntil[userId]);
            delete Users.mutedUntil[userId];
        } else {
            return;
        }
        for (i = client.length - 1; i >= 0; i -= 1) {
            if (byWhom) {
                for (j = client[i].channels.length - 1; j >= 0; j -= 1) {
                    if (!cache[client[i].channels[j]]) {
                        Server.send.data(-1, 'channels', client[i].channels[j], [3, 0, '==', client[i].nick + ' was ' + (minutes ? '' : 'un') + 'muted by ' + byWhom.nick + (minutes ? ', for ' + minutes + ' minute' + (minutes === 1 ? '' : 's') : '') + '!']);
                    }
                    cache[client[i].channels[j]] = 1;
                }
            }
            Server.send(client[i], [27, minutes ? 1 : 0]);
        }
    } else {
        Server.send.user(user, 0, byWhom);
    }
};

// Change a user's skin
Action.skin = function(user, skin, byWhom) {
    var client = Clients[Clients.nick(user)],
        i;
    if (client) {
        for (i = client.length - 1; i >= 0; i -= 1) {
            client[i].skin = skin;
        }
        Server.send.all([21, client[0].id, skin]);
    } else {
        Server.send.user(user, 0, byWhom);
    }
};

// Teleport a user to another location
Action.teleport = function(user, destination, byWhom) {
    var client,
        message = '',
        position;
    if (destination[0] === '#' && destination.length > 1) {
        destination = parseInt(destination.substr(1), 10);
        if (destination > 0) {
            mySQL.query('SELECT x,y FROM objects_placed WHERE obj=83 AND map=? ORDER BY rand() LIMIT 1', [destination], function(error, result) {
                if (result && result.length) {
                    Action.teleport(user, [result[0].x, result[0].y, destination], byWhom);
                } else {
                    Server.send.user(byWhom.nick, 0, byWhom, 'Map #' + destination + ' has no safe point!');
                }
            });
        }
    } else if (destination[0] === '$' && destination.length > 1) {
        Data.maps.get(destination.substr(1), function(result, mapId) {
            if (result.length) {
                Action.teleport(user, '#' + mapId, byWhom);
            } else {
                Server.send.user(byWhom.nick, [3, -1, '==error', 'That map does not seem to exist!']);
            }
        });
    } else if (destination[0] === '@' && destination.length > 1) {
        position = destination.substr(1).split(',');
        if (parseInt(position[0], 10) >= 0 && parseInt(position[1], 10) >= 0) {
            Action.teleport(user, [parseInt(position[0], 10), parseInt(position[1], 10)], byWhom);
        }
    } else if (typeof destination === 'string') {
        client = Clients.get(destination);
        if (client && client.flags[1] && client.id !== byWhom.id) {
            message = 'User ' + client.nick + ' is in spymode!';
        }
        if (!client && Clients.get(destination, 1)) {
            message = 'User ' + Clients.get(destination, 1).nick + ' is using the chat-only version!';
        }
        if (client && !message) {
            Action.teleport(user, [client.x, client.y, client.map], byWhom);
        } else {
            Server.send.user(destination, 0, byWhom, message);
        }
    } else if (typeof destination === 'object') {
        client = Clients.get(user);
        if (client && client.flags[1] && client.id !== byWhom.id) {
            message = 'User ' + client.nick + ' is in spymode!';
        }
        if (!client && Clients.get(user, 1)) {
            message = 'User ' + Clients.get(user, 1).nick + ' is using the chat-only version!';
        }
        if (client && !message) {
            Server.send(client, [16, destination[0], destination[1], destination[2] || client.map]);
        } else {
            Server.send.user(user, 0, byWhom, message);
        }
    }
};

// Console input
process.openStdin().addListener('data', function(data) {
    data = data.toString().substring(0, data.length - 2);
    if (data.length < 1) {
        return;
    }
    var i,
        client,
        users = [];
    // Send a message to everyone's first channel
    if (data[0] !== '/' && data[0] !== '@') {
        Server.send.all([3, -2, '[console]', data]);
        console.log('\x1b[33;1m[console] ' + data + '\x1b[0m');
        Server.log('main', '[console] ' + data);
        Server.log.history('main', '[console]', data);
    }
    data = data.split(' ');
    // Send a private message
    if (data[0][0] === '@') {
        console.log('[console] ' + data.join(' '));
        Server.send.pmessage(data[0].substr(1), [15, '[console]', data.join(' ').substr(data[0].length + 1)], {
            nick: '[console]'
        });
    }
    // See how many connections there are
    if (data[0] === '/clients') {
        console.log('There are ' + Server.clients.length + ' connected players.');
    }
    // Find users by IP
    if (data[0] === '/ip') {
        client = Clients.getClientByIP(data[1]);
        if (client) {
            for (i = client.length - 1; i >= 0; i -= 1) {
                Users.push(client[i].nick);
            }
        }
        console.log('Users: ' + (Users.length ? Users.join(', ') : '-'));
    }
    // See how long a data-channel is
    if (data[0] === '/data' && data[1] && Data[data[1]] && Data[data[1]][data[2]]) {
        console.log('There are ' + Data[data[1]][data[2]].length + ' users in that group.');
    }
    // Send a notice
    if (data[0] === '/notice' && data[1]) {
        Server.send.all([3, -2, '==notice', data.join(' ').substr(8)]);
    }
    // Fake a message
    if (data[0] === '/say' && data[2]) {
        Server.send.all([3, -2, data[1], data.join(' ').substr(data[1].length + 6)]);
    }
    // Send an action command
    if (data[0] === '/me') {
        Server.send.all([3, -2, '*[console]', data.join(' ').substr(3)]);
        console.log('\x1b[33;1m* [console] ' + data.join(' ').substr(3) + '\x1b[0m');
        Server.log('main', '* [console] ' + data.join(' ').substr(3));
        Server.log.history('main', '*[console]', data.join(' ').substr(3));
    }
    // Teleport a user
    if (data[0] === '/tp' && data[2]) {
        Action.teleport(data[1], data[2], {
            nick: '[console]'
        });
    }
    // Update all the side-maps
    if (data[0] === '/sidemaps') {
        Data.sideMaps.retrieve();
        console.log('Sidemaps updated!');
    }
    // Fake an achievement
    if (data[0] === '/achievement' && data[1]) {
        if (data[1] === 'all') {
            Server.send.all([34, 0, data.join(' ').substr(17)]);
        } else {
            Server.send.user(data[1], [34, 0, data.join(' ').substr(data[1].length + 14)]);
        }
    }
    // Send a trigger
    if (data[0] === '/trigger' && data[1]) {
        if (!data[2]) {
            Server.send.all([24, data[1]]);
        } else {
            Server.send.user(data[1], [24, data[2]]);
        }
    }
    // Refresh or reconnect a user
    if (data[0] === '/refresh' || data[0] === '/reconnect') {
        if (data[1]) {
            Server.send.user(data[1], [29, data[0] === '/refresh' ? 0 : 1]);
        } else {
            Server.send.all([29, data[0] === '/refresh' ? 0 : 1]);
        }
    }
    // Beep a user
    if (data[0] === '/beep') {
        if (data[1]) {
            Server.send.user(data[1], [3]);
        } else {
            Server.send.all([3]);
        }
    }
    // Change the Message of the Day
    if (data[0] === '/motd') {
        if (data[1]) {
            Action.MotD(data.join(' ').substr(6), '[console]');
        } else {
            fileSys.readFile(__dirname + '/../text/motd.txt', function(error, content) {
                console.log('MotD: ' + content.toString());
            });
        }
    }
    // Save the server in its current state
    if (data[0] === '/save') {
        Clients.forEach(function(client) {
            if (!client.chat) {
                Users.save(client);
            }
        });
        Server.lock();
        console.log('Forced a save!');
    }
    // Ping a user
    if (data[0] === '/ping' && data[1]) {
        client = Clients[Clients.nick(data[1])];
        if (client) {
            for (i = client.length - 1; i >= 0; i -= 1) {
                client[i].ping = Date.now();
            }
        }
        Server.send.user(data[1], [18, '']);
    }
    // Change a user's flag
    i = ['/trail', '/spymode', '/shadow', '/solid', '/nametag', '/spin'].indexOf(data[0]);
    if (i > -1 && data[1]) {
        Action.flag(i, data[1], {
            nick: '[console]'
        });
    }
    // Kick a user
    if (data[0] === '/kick' && data[1]) {
        Action.kick(data[1], {
            nick: '[console]'
        }, data.join(' ').substr(data[1].length + 7));
    }
    // Mute a user
    if (data[0] === '/mute' && data[1]) {
        Action.mute(data[1], parseInt(data[2], 10) || 1, {
            nick: '[console]'
        }, data[2] || 0);
    }
    // Unmute a user
    if (data[0] === '/unmute' && data[1]) {
        Action.mute(data[1], 0, {
            nick: '[console]'
        }, 0);
    }
    // Change a user's skin
    if (data[0] === '/skin' && data[2]) {
        Action.skin(data[1], data[2], {
            nick: '[console]'
        });
    }
    // Change a user's rank
    i = ['/player', '/telep', '/mod', '/admin', '/dev'].indexOf(data[0]);
    if (i > -1 && data[1]) {
        Users.changeRank(data[1], i, {
            nick: '[console]'
        });
    }
    // Turn the chat log on or off
    if (data[0] === '/chatlog') {
        if (['on', 'off'].indexOf(data[1]) > -1) {
            Server.log.off = data[1] === 'off' ? 1 : 0;
            Server.send.data(-1, 'channels', 'main', [3, 0, '==notice', Server.log.off ? 'This chat is no longer registering.' : 'This chat is now registering again.']);
        }
        console.log('The chatlog does' + (Server.log.off ? ' not' : '') + ' register.');
    }
    // Change the server mode
    if (data[0] === '/mode') {
        Server.mode = data[1] || '';
        Server.send.all([17, Server.mode]);
    }
    // Compile a map
    if (data[0] === '/compile') {
        if (data[1] === 'all') {
            Server.maps.compile.all();
        } else {
            Server.maps.compile(parseInt(data[1], 10));
        }
    }
    // Kill the server
    if (data[0] === '/exit') {
        Server.log('main', '== The server was shut down!', 0, function() {
            process.exit();
        });
    }
    // Cause a crash
    if (data[0] === '/crash') {
        throw new Error('Gotta catch \'em all!');
    }
});

// Print success message if everything went okay so far
console.log('\x1b[32;1mStarting new ' + (Server.test ? 'test' : 'production') + ' server...\x1b[0m');
Server.log('main', '== Started the server!');

// Save all players every 150s
setInterval(Users.saveAll, 150000);

// Initiate the database connection
mySQL.connection = 'mysql://root:@localhost/pokengine';
mySQL.stream = mySQL.createConnection(mySQL.connection);
mySQL.stream.on('error', function(error) {
    mySQL.stream = mySQL.createConnection(mySQL.connection);
});
mySQL.query = function(query, values, callback) {
    mySQL.stream.query(query, values, callback);
};
global.mySQL = mySQL;

// Retrieve all the side-map data
Data.sideMaps.retrieve();

// Clear the players
Server.log.players();

// Update lock.txt
Server.lock();

// Log errors and put the server in crash-mode
process.on('uncaughtException', function(exception) {
    console.log('uncaughtException occurred: ' + exception.stack);
    fileSys.appendFile(__dirname + '/../logs/errors/' + moment().format('DD-MMMM-YYYY') + '.txt', exception.stack + '\r\n\r\n');
    Server.mode = 'crashed';
    Server.send.all([17, Server.mode]);
    Server.log('main', '== The server has crashed!');
});

Server.maps.init();