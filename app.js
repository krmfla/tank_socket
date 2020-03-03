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

    setInterval(function() {
        caculator();
        io.emit('render', render());
    }, 1000 / 24);

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
        // characters[char].aim = null;
        characters[char].hp = 100;
        return io.emit('render', render());
    }

    function make_bullet(char) {
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
            // console.log(h);
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
            if (characters[char].y < 0) {
                characters[char].y = 0;
            } else if (characters[char].y > y_max) {
                characters[char].y = y_max;
            }
            if (characters[char].x < 0) {
                characters[char].x = 0;
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
            bullets[i].x += bullets[i].offset_x;
            bullets[i].y += bullets[i].offset_y;
            if (bullets[i].x < 0 || bullets[i].x > x_max + 40) {
                bullets[i] = null;
            } else if (bullets[i].y < 0 || bullets[i].y > y_max + 40) {
                bullets[i] = null;
            } else {
                // hit test
                for (var target in characters) {
                    // console.log(bullets);
                    if (bullets[i] && bullets[i].char !== characters[target].char) {
                        var x = bullets[i].x - characters[target].x;
                        var y = bullets[i].y - characters[target].y;
                        var distence = Math.sqrt(x * x + y * y);
                        if (distence < 15) {
                            characters[target].hp -= 5;
                            if (characters[target].hp < 0) {
                                characters[target].hp = 0;
                                reset_char(characters[target]);
                            }
                            characters[target].hit = true;
                            bullets[i] = null;
                            clearTimeout(characters[target].hit_timer);
                            // console.log(characters[target].hit_timer);
                            close_timer(characters[target]);
                            // characters[target].hit_timer = setTimeout(function() {
                            //     console.log('setTimeout active');
                            //     characters[target].hit = false;
                            // }, 1500);
                        }
                    }
                }
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
        console.log('reset_char');
        var _char = char;
        setTimeout(function() {
            if (_char.hp === 100) {
                return;
            }
            console.log('call reset_char');
            _char.x = Math.floor(Math.random() * x_max) + 20;
            _char.y = Math.floor(Math.random() * y_max) + 20;
            _char.hp = 100;
            _char.hit = false;
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
        render: render,
        action: action,
        restart: restart
    }
}

