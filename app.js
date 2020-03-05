const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 5000;

var game = new GameSet();

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/hello', function (req, res) {
    game.restart();
    res.status(200).send('hello')
});
app.get('/restart', function (req, res) {
    game.restart();
    res.status(200).send('clear')
});
http.listen(PORT, () => {
    console.log(`Listen on ${PORT}`);
    console.log(`Process pid: ${process.pid}`);
});

io.on('connection', function(socket) {
    console.log('connect');
    socket.on('join', function() {
        var character = game.join();
        game.generate(character);
        game.npc_detect();
        io.emit('join', character);
        io.emit('render', game.render());
    });
    socket.on('get_render', function() {
        io.emit('render', game.render());
    });

    socket.on('action', function(obj) {
        game.action(obj);
    });
})

function GameSet() {
    var characters = {};
    var bullets = [];
    var player = 0;
    var x_max = 760;
    var y_max = 560;
    var npc_set = 3;
    var max_ammo = 10;

    setInterval(function() {
        caculator();
        io.emit('render', render());
    }, 1000 / 20);

    function join(io) {
        var index = player += 1;
        var char = 'p' + index;
        characters[char] = {};
        return char;
    }

    function generate(char) {
        characters[char].color = get_color();
        characters[char].char = char;
        characters[char].x = Math.floor(Math.random() * x_max) + 20;
        characters[char].y = Math.floor(Math.random() * y_max) + 20;
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
        // return io.emit('render', render());
    }

    function npc_detect() {
        var index = 1;
        while (npc_set > 0) {
            var npc = 'npc' + index;
            characters[npc] = {};
            generate(npc);
            npc_action(npc);
            index += 1;
            npc_set -= 1;
        }
    }

    function npc_action(npc) {
        var _npc = npc;
        var set_time = Math.floor(Math.random() * 4000) + 1000;
        setInterval(function() {
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
        setInterval(function() {
            characters[_npc].fire = !characters[_npc].fire;
        }, 80);
        
    }

    function make_bullet(char) {
        if (char.ammo <= 0 || char.hp === 0) {
            return;
        }
        var obj = {};
        var distence = 9999;
        var aim = null;
        var x = null;
        var y = null;
        var h = null;
        var speed = 5;
        obj.offset_x = null;
        obj.offset_y = null;
        obj.x = char.x;
        obj.y = char.y;
        obj.color = char.color;
        obj.char = char.char;
        char.ammo -= 1;
        for (var target in characters) {
            if (characters[target].char !== obj.char) {
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
        } else {
            h = Math.sqrt(x * x + y * y);
            obj.offset_x = speed * x / h;
            obj.offset_y = speed * y / h;
        }
        bullets.push(obj);
    }

    function get_color() {
        var color = [null, null, null];
        var shuffle = [0, 1, 2];
        var higher_index = Math.floor(Math.random() * 3);
        var lower_index = Math.floor(Math.random() * 2);
        var middle = Math.floor(Math.random() * 200) + 20;
        color[shuffle[higher_index]] = 220;
        shuffle.splice(higher_index, 1);
        color[shuffle[lower_index]] = 20;
        shuffle.splice(lower_index, 1);
        color[shuffle[0]] = middle;
        return 'rgb(' + color.toString() + ')';
    }

    function caculator() {
        for (var char in characters) {
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
            if (characters[char].y < 20) {
                characters[char].y = 20;
            } else if (characters[char].y > y_max) {
                characters[char].y = y_max;
            }
            if (characters[char].x < 20) {
                characters[char].x = 20;
            } else if (characters[char].x > x_max) {
                characters[char].x = x_max;
            }
            // fire
            if (characters[char].fire) {
                make_bullet(characters[char]);
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
                    // console.log(bullets);
                    if (bullets[i] && _char !== characters[target].char) {
                        // console.log(bullets[i]);
                        // console.log(characters[_char]);
                        var x = bullets[i].x - characters[target].x;
                        var y = bullets[i].y - characters[target].y;
                        var distence = Math.sqrt(x * x + y * y);
                        // hit
                        if (distence < 15 && characters[target].hp > 0) {
                            characters[target].hp -= 12;
                            if (characters[target].hp <= 0) {
                                characters[target].hp = 0;
                                reset_char(characters[target]);
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
        // console.log('prepare reset_char');
        var _char = char;
        setTimeout(function() {
            if (_char.hp === 100) {
                return;
            }
            console.log('reset_char: ' + _char.char);
            _char.x = Math.floor(Math.random() * x_max) + 20;
            _char.y = Math.floor(Math.random() * y_max) + 20;
            _char.hp = 100;
            _char.hit = false;
            _char.ammo = max_ammo;
        }, 3000);
    }

    function render() {
        return {
            characters: characters,
            bullets: bullets 
        }
    }
    function action(obj) {
        characters[obj.character][obj.direction] = obj.trigger;
    }

    function restart() {
        characters = {};
        bullets = [];
        player = 0;

    }

    return {
        join: join,
        generate: generate,
        npc_detect: npc_detect,
        render: render,
        action: action,
        restart: restart
    }
}

// idle detect
