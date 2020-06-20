const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const StrategySet = require('./resources/StrategySet.js');
const BattleSet = require('./resources/BattleSet.js');
const PORT = process.env.PORT || 5000;

var battle = new BattleSet(io);
var strategy = new StrategySet(io);

battle.bind(strategy);
strategy.bind(battle);

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/hello', function (req, res) {
    res.status(200).send('hello');
});
app.get('/restart', function (req, res) {
    battle.restart();
    strategy.restart();
    res.status(200).send('clear');
});
http.listen(PORT, () => {
    console.log(`Listen on ${PORT}`);
    console.log(`Process pid: ${process.pid}`);
});

io.on('connection', function(socket) {
    console.log('connect');
    // register
    socket.on('register', function(obj) {
        strategy.register(obj);
        io.emit('dispatch_series', strategy.get_series(obj.token));
    });

    socket.on('get_phase', function() {
        io.emit('change_phase', strategy.get_phase());
    });

    // strategy
    socket.on('join_request', function(obj) {
        strategy.join(obj);
    });

    // battle
    socket.on('get_render', function() {
        io.emit('render', battle.render());
    });
    socket.on('action', function(obj) {
        battle.action(obj);
    });
})

// idle detect
// Invincible 3sec when reburn and no shoot
// add team feature
//---- fix restart issue: npc move timer
//---- when disable no move