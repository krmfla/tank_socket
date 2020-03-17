const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;

var strategy = new StrategySet();
var battle = new BattleSet();

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/hello', function (req, res) {
    battle.restart();
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

// TODO: label
/* === Strategy Set === */

function StrategySet() {
    var strategy_counter = 20;
    var camps = {
        allience: [],
        axis: []
    }
    var battle_group = {
        max_allience : 4,
        max_axis : 4,
        allience: [{}, {}, {}, {}],
        axis: [{}, {}, {}, {}]
    };
    var token_mapping = [];
    var country = [
        { name:'不列顛', own: 1 },
        { name:'法蘭西', own: 1 },
        { name:'愛爾蘭', own: 1 },
        { name:'挪威', own: 1 },
        { name:'荷比盧', own: 1 },
        { name:'德意志', own: 2 },
        { name:'義大利', own: 2 },
        { name:'丹麥', own: 2 },
        { name:'捷克', own: 2 },
        { name:'波蘭', own: 2 }
    ]
    var game_set = {
        phase: 'strategy',
        counter: strategy_counter,
        target_index: null,
        target: {
            name: null,
            own: null,
        },
        year: 1940,
        month: 5
    }
    var counter_timer = null;
    init();

    function init() {
        select_target();
        set_counter(true);
    }

    function select_target() {
        var index = Math.floor(Math.random() * country.length);
        game_set.target = country[index];
        game_set.target_index = index;
    }

    function set_counter(type) {
        if (type) {
            counter_timer = setInterval(function() {
                var left = 0;
                game_set.counter -= 1;
                // into battle
                if (game_set.counter < 0) {
                    game_set.counter = 0;
                    clearInterval(counter_timer);
                    game_set.counter = 0;
                    game_set.phase = 'battle';
                    io.emit('change_phase', 'battle');
                    battle.init(battle_group, camps, game_set);
                }
                io.emit('strategy_render', render());
                for (var i = 0; i <　battle_group.allience.length; i++) {
                    if (!battle_group.allience[i].name) {
                        left += 1;
                    }
                }
                for (var i = 0; i <　battle_group.axis.length; i++) {
                    if (!battle_group.axis[i].name) {
                        left += 1;
                    }
                }
                if (!left) {
                    clearInterval(counter_timer);
                    game_set.counter = 0;
                    game_set.phase = 'battle';
                    io.emit('change_phase', 'battle');
                    battle.init(battle_group, camps, game_set);
                }
            }, 1000);
        } else {
            clearInterval(counter_timer);
        }
    }

    function register(obj) {
        var camp = obj.camp === 1 ? 'allience' : 'axis';
        var token_index = token_mapping.length;
        token_mapping.push(obj.token);
        camps[camp].push({
            name: obj.name,
            series: token_index,
            crashes: 0
        })
    }

    function get_phase() {
        return game_set.phase;
    }

    function get_series(token) {
        for (var i = 0; i < token_mapping.length; i++) {
            if (token_mapping[i] === token) {
                return i;
            }
        }
    }

    function join(obj) {
        var camp = obj.camp === 1 ? 'allience' : 'axis';
        for (var i = 0; i < battle_group[camp].length; i++) {
            if(battle_group[camp][i].name === obj.name) {
                return;
            }
        }
        if (battle_group[camp][obj.index] && !battle_group[camp][obj.index].name) {
            battle_group[camp][obj.index].name = obj.name;
            battle_group[camp][obj.index].series = obj.series;
        }
    }
    
    function after_campaign() {
        var year = game_set.year;
        var month = game_set.month += 1;
        if (month > 12) {
            year += 1;
            month = 1;
        }
        game_set = {
            phase: 'strategy',
            counter: strategy_counter,
            target_index: null,
            target: null,
            year: year,
            month: month
        };
        battle_group = {
            max_allience : 4,
            max_axis : 4,
            allience: [{}, {}, {}, {}],
            axis: [{}, {}, {}, {}]
        };
        
        io.emit('change_phase', 'strategy');
        io.emit('clear_player');
        init();
    }

    function render() {
        return {
            game_set: game_set,
            camps: camps,
            country: country,
            battle_group: battle_group
        }
    }

    function restart() {
        camps = {
            allience: [],
            axis: []
        }
        battle_group = {
            max_allience : 4,
            max_axis : 4,
            allience: [{}, {}, {}, {}],
            axis: [{}, {}, {}, {}]
        };
        token_mapping = [];
        country = [
            { name:'不列顛', own: 1 },
            { name:'法蘭西', own: 1 },
            { name:'愛爾蘭', own: 1 },
            { name:'挪威', own: 1 },
            { name:'荷比盧', own: 1 },
            { name:'德意志', own: 2 },
            { name:'義大利', own: 2 },
            { name:'丹麥', own: 2 },
            { name:'捷克', own: 2 },
            { name:'波蘭', own: 2 }
        ]
        game_set = {
            phase: 'strategy',
            counter: strategy_counter,
            target_index: null,
            target: {
                name: null,
                own: null
            },
            year: 1940,
            month: 5
        }
        counter_timer = null;
        init();
    }

    return {
        register: register,
        get_series: get_series,
        get_phase: get_phase,
        after_campaign: after_campaign,
        render: render,
        join: join,
        restart: restart
    }
}

// TODO: label
/* === Battle Set === */

function BattleSet() {
    var game_counter = 60;
    var characters = {};
    var bullets = [];
    var bullet_index = 0;
    var x_max = 770;
    var y_max = 570;
    var cd_wait = 12;
    var max_ammo = 5;
    var npc_timer = [];
    var battle_set = {
        counter: game_counter,
        allience_score: 0,
        axis_score: 0,
        result: '',
        ground: 0,
        timestamp: 0,
    };
    
    var strategy_set;
    var counter_timer = null;
    var render_timer = null;

    function init(groups, camps, set) {
        restart();
        battle_set.ground = Math.floor((Math.random() * 5)) + 1;
        strategy_set = set;
        for (var i = 0; i < groups.allience.length; i++) {
            if (groups.allience[i].name) {
                var char = 'allience' + (i + 1);
                characters[char] = {};
                characters[char].series = groups.allience[i].series;
                characters[char].camp = 1;
                characters[char].name = groups.allience[i].name;
                generate(char);
            } else {
                npc_generate('alliencebot' + (i+1), 1);
            }
        }
        for (var i = 0; i < groups.axis.length; i++) {
            if (groups.axis[i].name) {
                var char = 'axis' + (i + 1);
                characters[char] = {};
                characters[char].series = groups.axis[i].series;
                characters[char].camp = 2;
                characters[char].name = groups.axis[i].name;
                generate(char);
            } else {
                npc_generate('axisbot' + (i+1), 2);
            }
        }
        io.emit('dispatch_player', characters)

        render_timer = setInterval(function() {
            caculator();
            io.emit('battle_render', render());
        }, 1000 / 20);

        counter_timer = setInterval(function() {
            battle_set.counter -= 1;
            if (battle_set.counter <= 0) {
                battle_set.counter = 0;
                result();
            }
        }, 1000);
    };

    function generate(char) {
        characters[char].color = characters[char].camp === 1 ? '#03a9f4' : '#f44336';
        characters[char].char = char;
        if (characters[char].camp === 1) {
            characters[char].x = 40;
        } else {
            characters[char].x = x_max - 10;
        }
        characters[char].y = Math.floor(Math.random() * (y_max - 60)) + 40;
        characters[char].left = false;
        characters[char].right = false;
        characters[char].up = false;
        characters[char].down = false;
        characters[char].fire = false;
        characters[char].cd = 0;
        characters[char].hit = false;
        characters[char].hit_timer = null;
        characters[char].hp = 100;
        characters[char].ammo = max_ammo;
        characters[char].shot = false;
        characters[char].cd = 0;
        characters[char].cannon_angle = 0;
        characters[char].body = Math.floor(Math.random() * 4) + 1;
        characters[char].cannon = Math.floor(Math.random() * 4) + 1;
        characters[char].crushes = 0;
    }

    function npc_generate(npc, camp) {
        characters[npc] = {};
        characters[npc].series = null;
        characters[npc].camp = camp;
        characters[npc].name = camp === 1 ? '同盟軍' : '軸心軍';
        generate(npc);
        npc_action(npc);
    }

    function npc_action(npc) {
        var _npc = npc;
        var set_time = Math.floor(Math.random() * 4000) + 1000;
        var action_timer = setInterval(function() {
            var x_action = Math.floor(Math.random() * 3);
            var y_action = Math.floor(Math.random() * 3);
            if (x_action) {
                if (x_action === 1) {
                    characters[_npc].left = true;
                    characters[_npc].right = false;
                } else if (x_action === 2) {
                    characters[_npc].left = false;
                    characters[_npc].right = true;
                }
            } else if(x_action === 0) {
                characters[_npc].left = false;
                characters[_npc].right = false;
            }
            if (y_action) {
                if (y_action === 1) {
                    characters[_npc].up = true;
                    characters[_npc].down = false;
                } else if (y_action === 2) {
                    characters[_npc].up = false;
                    characters[_npc].down = true;
                }
            } else if (y_action === 0) {
                characters[_npc].up = false;
                characters[_npc].down = false;
            }
        }, set_time);
        var fire_timer = setInterval(function() {
            if (characters[_npc]) {
                characters[_npc].fire = !characters[_npc].fire;
            }
        }, 80);
        npc_timer.push(action_timer);
        npc_timer.push(fire_timer);
    }

    function make_bullet(char) {
        if (char.ammo <= 0 || char.hp === 0 || char.cd > 0) {
            return;
        }
        var obj = {};
        var distence = 9999;
        var aim = null;
        var x = null;
        var y = null;
        var h = null;
        var speed = 8;
        obj.offset_x = null;
        obj.offset_y = null;
        obj.x = char.x;
        obj.y = char.y;
        obj.char = char.char;
        obj.camp = char.camp;
        char.ammo -= 1;
        char.cd = cd_wait;
        obj.id = 'b' + bullet_index;
        bullet_index += 1;
        for (var target in characters) {
            if (characters[target].char !== obj.char && characters[target].camp !== obj.camp) {
                var _x = characters[target].x - obj.x;
                var _y = characters[target].y - obj.y;
                var _distance = Math.abs(_x) + Math.abs(_y);
                if (distence > _distance) {
                    distence = _distance;
                    x = _x;
                    y = _y;
                }
            }
        }
        if (!x) {
            obj.offset_x = speed;
            obj.offset_y = 0;
            char.cannon_angle = 0;
        } else {
            h = Math.sqrt(x * x + y * y);
            obj.offset_x = speed * x / h;
            obj.offset_y = speed * y / h;
            char.cannon_angle = Math.atan2(y, x) * 180 / Math.PI;
        }
        obj.x += obj.offset_x * 2;
        obj.y += obj.offset_y * 2;
        bullets.push(obj);
        if (char.shot) {
            char.fire = false;
            char.shot = false;
        }
    }

    function caculator() {
        if (battle_set.counter <= 0) {
            return;
        }
        for (var char in characters) {
            if (characters[char].hp > 0) {
                // move
                if (characters[char].up) {
                    characters[char].y -= 2;
                } else if (characters[char].down) {
                    characters[char].y += 2;
                }
                if (characters[char].left) {
                    characters[char].x -= 2;
                } else if (characters[char].right) {
                    characters[char].x += 2;
                }
                if (characters[char].y < 30) {
                    characters[char].y = 30;
                } else if (characters[char].y > y_max) {
                    characters[char].y = y_max;
                }
                if (characters[char].x < 30) {
                    characters[char].x = 30;
                } else if (characters[char].x > x_max) {
                    characters[char].x = x_max;
                }
                // fire
                characters[char].cd = characters[char].cd > 0 ? characters[char].cd -= 1 : 0;
                
                if (characters[char].fire) {
                    make_bullet(characters[char]);
                }
            }
        }
        // bullet
        for (var i = 0; i < bullets.length; i++) {
            var _char = bullets[i].char;
            bullets[i].x += bullets[i].offset_x;
            bullets[i].y += bullets[i].offset_y;
            // 出界
            if (bullets[i].x < 0 || bullets[i].x > x_max + 40) {
                characters[_char].ammo += 1;
                bullets[i] = null;
                
            } else if (bullets[i].y < 0 || bullets[i].y > y_max + 40) {
                characters[_char].ammo += 1;
                bullets[i] = null;
            } else {
                // hit test
                for (var target in characters) {
                    if (bullets[i] && _char !== characters[target].char && bullets[i].camp !== characters[target].camp) {
                        var x = bullets[i].x - characters[target].x;
                        var y = bullets[i].y - characters[target].y;
                        var distence = Math.sqrt(x * x + y * y);
                        // hit
                        if (distence < 25 && characters[target].hp > 0) {
                            characters[target].hp -= 20;
                            if (characters[target].hp <= 0) {
                                characters[target].hp = 0;
                                characters[_char].crushes += 1;
                                reset_char(characters[target]);
                                if (bullets[i].camp === 1) {
                                    battle_set.allience_score += 1;
                                } else {
                                    battle_set.axis_score += 1;
                                }
                            }
                            characters[_char].ammo += 1;
                            characters[target].hit = true;
                            bullets[i] = null;
                            clearTimeout(characters[target].hit_timer);
                            close_timer(characters[target]);
                        }
                    }
                }
            }
            if (characters[_char].ammo > max_ammo) {
                characters[_char].ammo = max_ammo;
            }
        }
        bullets = bullets.filter(function(item) {
            return item !== null;
        });
    }

    function close_timer(target) {
        setTimeout(function() {
            target.hit = false;
        }, 1500);
    }

    function reset_char(char) {
        var _char = char;
        setTimeout(function() {
            if (_char.hp === 100) {
                return;
            }
            if (_char.camp === 1) {
                _char.x = 40;
            } else {
                _char.x = x_max - 10;
            }
            _char.y = Math.floor(Math.random() * y_max - 60) + 40;
            _char.hp = 100;
            _char.hit = false;
            _char.ammo = max_ammo;
            _char.cd = 0;
        }, 3000);
    }

    function result() {
        clearInterval(counter_timer);
        if (strategy_set.target.own === 1) {
            if (battle_set.allience_score >= battle_set.axis_score) {
                battle_set.result = '同盟軍堅守' + strategy_set.target.name + '地區';
            } else {
                battle_set.result = '軸心軍攻陷' + strategy_set.target.name + '地區';
                strategy_set.target.own = 2;
            }
        } else {
            if (battle_set.allience_score > battle_set.axis_score) {
                battle_set.result = '同盟軍攻陷' + strategy_set.target.name + '地區';
                strategy_set.target.own = 1;
            } else {
                battle_set.result = '軸心軍堅守' + strategy_set.target.name + '地區';
            }
        }
        setTimeout(function() {
            restart();
            io.emit('battle_render', render());
            strategy.after_campaign();
        }, 8000);
    }

    function render() {
        var _time = new Date();
        battle_set.timestamp = _time.getTime();
        return {
            characters: characters,
            bullets: bullets,
            battle_set: battle_set
        }
    }
    function action(obj) {
        if (!characters[obj.character]) {
            return;
        }
        if (obj.direction === 'one-shot') {
            characters[obj.character].fire = true;
            characters[obj.character].shot = true;
        } else {
            characters[obj.character][obj.direction] = obj.trigger;
        }
        
    }

    function restart() {
        characters = {};
        bullets = [];
        bullet_index = 0;
        for (var i = 0; i < npc_timer.length; i++) {
            clearInterval(npc_timer[i]);
        }
        clearInterval(counter_timer);
        clearInterval(render_timer);
        npc_timer = [];
        battle_set = {
            counter: game_counter,
            allience_score: 0,
            axis_score: 0,
            result: '',
            ground: 0,
            timestamp: 0
        };
        
    }

    return {
        init: init,
        render: render,
        action: action,
        restart: restart
    }
}

// idle detect
// Invincible 3sec when reburn and no shoot
// add team feature
//---- fix restart issue: npc move timer
//---- when disable no move