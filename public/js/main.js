var socket = io();

window.onload = () => {
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length > 1) {
         event.preventDefault();
      }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
}

var app = new Vue({
    el: '#app',
    data: {
        engine: null,
        characters: {},
        bullets: {},
        player: '',
        panel_el: null,
        dot_el: null,
        fire_el: null,
        origin_x: null,
        origin_y: null,
        fire_timer: null,
        isBuffer: false,
        name: '',
        camp: 0,
        token: null,
        series: -1,
        game_set: {
            phase: 'login'
        },
        battle_set: {},
        camps: {
            allience: [],
            axis: []
        },
        country: [],
        battle_group: {
            allience: [],
            axis: []
        },
        binding: false,
        latency: 0,
        prev_request: 0,
        renderstamp: 0,
        render_cost: 0
    },
    computed: {
        onfire: function() {
            if (this.characters[this.player]) {
                return this.characters[this.player].fire;
            } else {
                return false;
            }
        },
        camara: function() {
            if (window.innerWidth > 801 || !this.player || this.battle_set.result || !this.characters[this.player]) {
                return "none";
            }
            var x = 400 - this.characters[this.player].x;
            var y = 300 - this.characters[this.player].y;
            return "scale(1.5, 1.5) translate(" + x + "px, " + y + "px)";
        }
    },
    methods: {
        handle_camp: function(value) {
            this.camp = value;
        },
        handle_start: function() {
            if (!this.name || !this.camp) {
                return;
            }
            this.token = GetToken(12);
            this.socket_binding();
            socket.emit('register', {
                name: this.name,
                token: this.token,
                camp: this.camp
            });
            socket.emit('get_phase');
        },
        handle_join(item, index, camp) {
            if (item.name || this.camp !== camp) {
                return;
            }
            socket.emit('join_request', {
                index: index,
                camp: camp,
                name: this.name,
                series: this.series
            });
        },
        socket_binding() {
            socket.on('dispatch_series', function(value) {
                if (app.series === undefined) {
                    app.series = value;
                }
            });
            
            socket.on('change_phase', function(text) {
                // console.log(text);
                app.game_set.phase = text;
            });
            
            socket.on('strategy_render', function(obj) {
                if (app.game_set.phase !== 'strategy') {
                    return;
                }
                if (app.engine.is_ready) {
                    app.engine.clean();
                }
                app.game_set = obj.game_set;
                app.camps = obj.camps;
                app.country = obj.country;
                app.battle_group = obj.battle_group;
            });
            
            socket.on('dispatch_player', function(characters) {
                for (var char in characters) {
                    if (characters[char].series === app.series) {
                        app.player = characters[char].char;
                        return;
                    }
                }
            });
            
            socket.on('clear_player', function() {
                app.player = '';
                app.binding = false;
            });
            
            socket.on('battle_render', function(obj) {
                var _time = new Date();
                if (app.prev_request) {
                    app.latency = _time.getTime() - app.prev_request;
                }
                app.prev_request = _time.getTime();
                if (app.latency > 100) {
                    return;
                }
                app.characters = obj.characters;
                app.bullets = obj.bullets;
                app.battle_set = obj.battle_set;
                if (app.player && !app.binding) {
                    app.binding = true;
                    app.event_binding();
                }
                if (app.engine.is_loaded()) {
                    if (app.engine.is_ready()) {
                        var offset;
                        // console.log(window.innerWidth);
                        // console.log(app.player);
                        // console.log(app.battle_set.result);
                        // console.log(app.characters[app.player]);
                        if (window.innerWidth > 801 || !app.player || app.battle_set.result || !app.characters[app.player]) {
                            offset = null;
                        } else {
                            var scale = 1.5;
                            var x = 400 - app.characters[app.player].x * scale - (50 * scale / 2);
                            var y = 300 - app.characters[app.player].y * scale - (50 * scale / 2);
                            offset = {
                                scale: scale,
                                x : x,
                                y : y
                            }
                        }
                        app.engine.render(obj.characters, obj.bullets, offset);
                    } else {
                        app.engine.init(obj.characters, obj.bullets, obj.battle_set);
                    }       
                }
            });
        },
        event_binding: function() {
            var vm = this;
            this.panel_el = document.getElementById('panel');
            this.dot_el = document.getElementById('dot');
            this.fire_el = document.getElementById('fire_btn');
            this.origin_x = this.panel_el.getBoundingClientRect().x + this.panel_el.getBoundingClientRect().width / 2;
            this.origin_y = this.panel_el.getBoundingClientRect().y + this.panel_el.getBoundingClientRect().height / 2;

            // key button
            document.onkeydown = function(event) {
                vm.move(event.keyCode);
            };

            document.onkeyup = function(event) {
                vm.move(-event.keyCode);
            }
            // virtual controller
            this.panel_el.addEventListener('touchstart', function(event) {
                vm.action(event.touches[0].clientX, event.touches[0].clientY);
            }, true);
            this.panel_el.addEventListener('touchmove', function(event) {
                vm.action(event.touches[0].clientX, event.touches[0].clientY);
            }, true);
            this.panel_el.addEventListener('touchend', function() {
                vm.action();
            }, true);

            this.fire_el.addEventListener('touchstart', function() {
                vm.move('one-shot');
            }, true);
            this.fire_el.addEventListener('touchstart', function() {
                vm.move(-32);
            }, true);
        },
        // virtual controller action
        action(x, y) {
            var offset_x;
            var offset_y;
            var _char = this.characters[this.player];
            if (!x) {
                this.dot_el.style.transform = 'none';
                // reset dot
                if (_char.left) { this.move(-37) }
                if (_char.right) { this.move(-39) }
                if (_char.up) { this.move(-38) }
                if (_char.down) { this.move(-40) }
            } else {
                offset_x = x - this.origin_x;
                offset_y = y - this.origin_y;
                this.dot_el.style.transform = 'translate(' + offset_x + 'px, ' + offset_y + 'px)';
                // move action
                if (offset_x < -50) {
                    if (!_char.left) {
                        this.move(37);
                    }
                    if (_char.right) {
                        this.move(-39);
                    }
                } else if (offset_x > 50) {
                    if (!_char.right) {
                        this.move(39);
                    }
                    if (_char.left) {
                        this.move(-37);
                    }
                } else if (offset_x > -50 && offset_x < 50) {
                    if (_char.left) {
                        this.move(-37);
                    }
                    if (_char.right) {
                        this.move(-39);
                    }
                }
                if (offset_y < -50) {
                    if (!_char.up) {
                        this.move(38);
                    }
                    if (_char.down) {
                        this.move(-40);
                    }
                } else if (offset_y > 50) {
                    if (!_char.up) {
                        this.move(40);
                    }
                    if (_char.down) {
                        this.move(-38);
                    }
                } else if (offset_y > -50 && offset_y < 50) {
                    if (_char.up) {
                        this.move(-38);
                    }
                    if (_char.down) {
                        this.move(-40);
                    }
                }
            }
        },
        move: function(code) {
            if (!this.player) {
                return;
            }
            var vm = this;
            var direction;
            var trigger;
            var char = this.characters[this.player];
            switch (code) {
                case 37:
                    direction = 'left';
                    trigger = true;
                    if (char.left) {
                        return;
                    }
                    if (char.right) {
                        this.move(-39);
                    }
                    break; 
                case -37: 
                    direction = 'left';
                    trigger = false;
                    break; 
                case 39:
                    direction = 'right';
                    trigger = true;
                    if (char.right) {
                        return;
                    }
                    if (char.left) {
                        this.move(-37);
                    }
                    break; 
                case -39: 
                    direction = 'right';
                    trigger = false;
                    break; 
                case 38:
                    direction = 'up';
                    trigger = true;
                    if (char.up) {
                        return;
                    }
                    if (char.down) {
                        this.move(-40);
                    }
                    break; 
                case -38: 
                    direction = 'up';
                    trigger = false;
                    break; 
                case 40:
                    direction = 'down';
                    trigger = true;
                    if (char.down) {
                        return;
                    }
                    if (char.up) {
                        this.move(-38);
                    }
                    break; 
                case -40: 
                    direction = 'down';
                    trigger = false;
                    break; 
                case 32:
                case 90:
                    direction = 'fire';
                    trigger = true;
                    break;
                case -32:
                case -90:
                    direction = 'fire';
                    trigger = false;
                    break;
                case 65:
                    direction = 'fire';
                    trigger = !char.fire;
                    break;
                case 'one-shot':
                    direction = 'one-shot';
                    trigger = false;
                    break;
            }
            if (vm.characters[vm.player][direction] !== trigger) {
                socket.emit('action', {
                    'character': vm.player,
                    'direction': direction,
                    'trigger': trigger
                });
            }
        },
        // draw_ready: function() {
        //     this.engine.init(this.characters, this.bullets, this.battle_set.ground);
        // }
    },
    beforeUpdate: function() {
        var _time = new Date();
        this.renderstamp = _time.getTime();
    },
    updated: function() {
        var _time = new Date();
        this.render_cost = _time - this.renderstamp;
    },
    mounted: function() {
        var vm = this;
        this.engine = new View_Engine();
    }
});

function View_Engine() {
    var wrapper;
    var loaded = false;
    var ready = false;
    var char_instance = {};
    var ball_instance = {};
    var source_mapping = {
        body: {
            body1: "images/tank_1.svg",
            body2: "images/tank_2.svg",
            body3: "images/tank_3.svg",
            body4: "images/tank_4.svg"
        },
        cannon: {
            cannon1: "images/tank_canon_1.svg",
            cannon2: "images/tank_canon_2.svg",
            cannon3: "images/tank_canon_3.svg",
            cannon4: "images/tank_canon_4.svg",
        },
        bullet: {
            bullet1: "images/bullet_b.svg",
            bullet2: "images/bullet_r.svg",
        },
        ground: {
            ground1: "images/ground1.png",
            ground2: "images/ground2.png",
            ground3: "images/ground3.png",
            ground4: "images/ground4.png",
            ground5: "images/ground5.png"
        },
        boom: [
            "images/boom1.png",
            "images/boom2.png",
            "images/boom3.png",
            "images/boom4.png",
            "images/boom5.png",
            "images/boom6.png",
            "images/boom7.png"
        ]
    }
    var engine = new PIXI.Application({
        width: 800,
        height: 600,
        antialias: true,
        backgroundColor: 0x333333,
        resolution: 1
    });
    var main = new PIXI.Container();
    main.position.set(0, 0);
    engine.stage.addChild(main);

    PIXI.loader.add([
        "images/tank_1.svg",
        "images/tank_2.svg",
        "images/tank_3.svg",
        "images/tank_4.svg",
        "images/tank_canon_1.svg",
        "images/tank_canon_2.svg",
        "images/tank_canon_3.svg",
        "images/tank_canon_4.svg",
        "images/ground1.png",
        "images/ground2.png",
        "images/ground3.png",
        "images/ground4.png",
        "images/ground5.png",
        "images/bullet_r.svg",
        "images/bullet_b.svg",
        // "images/boom2.png",
        ])
        .on("progress", loadProgressHandler)
        .load(function() {
            loaded = true;
    });

    function init(_characters, _bullets, _battle_setp) {
        console.warn('=== init ===');
        clean();
        // loaded = false;
        ready = false;
        char_instance = {};
        ball_instance = {};
        var characters = _characters;
        var assets = PIXI.loader.resources;
        var ground_texture = get_source('ground', _battle_setp.ground);
        var ground = PIXI.Texture.fromImage(ground_texture);
        var ground_tiling = new PIXI.TilingSprite(ground, 800, 600);
        
        wrapper = document.querySelector('#main_view');
        wrapper.appendChild(engine.view);

        ground_tiling.x = 0;
        ground_tiling.y = 0;
        main.addChild(ground_tiling);

        for (var char in _characters) {
            var _char = characters[char];
            var body_src = get_source('body', _char.body);
            var cannon_src = get_source('cannon', _char.cannon);
            var body = new PIXI.Sprite(assets[body_src].texture);
            var cannon = new PIXI.Sprite(assets[cannon_src].texture);
            // var boom = new PIXI.Sprite(assets['images/boom2.png'].texture);
            var boomArray = [];
            var boom; 
            var hp_container = new PIXI.Container();
            var hp_wrapper = new PIXI.Graphics();
            var hp_bar = new PIXI.Graphics();
            var style = new PIXI.TextStyle({
                fontFamily: 'sans-serif',
                fontSize: 10,
                fill: _char.camp == 1 ? '#03a9f4' : '#f44336',
                fontWeight: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
            });
            var name = new PIXI.Text(_char.name, style);

            var frame = new PIXI.Graphics();

            char_instance[char] = new PIXI.Container();
            char_instance[char].position.set(20,20);
            char_instance[char].ani_timer = null;

            char_instance[char].hit_offset = -0.05;

            main.addChild(char_instance[char]);

            // tank wrapper
            // frame.lineStyle(1, 0xFF0000, 1);
            // frame.drawRect(0,-10,50,70);
            // frame.visible = false;
            body.width = 50;
            body.height = 50;
            body.x = 0;
            body.y = 0;
            body.anchor.x = 0.5;
            body.anchor.y = 0.5;
            body.alpha = 1;
            cannon.width = 50;
            cannon.height = 50;
            cannon.x = 0;
            cannon.y = 0;
            cannon.anchor.x = 0.5;
            cannon.anchor.y = 0.5;
            cannon.alpha = 1;

            for (var i = 0; i < source_mapping.boom.length; i++) {
                var texture = PIXI.Texture.from(source_mapping.boom[i]);
                boomArray.push(texture);
            }
            boom = new PIXI.AnimatedSprite(boomArray);

            boom.width = 50;
            boom.height = 50;
            boom.x = 0;
            boom.y = 0;
            boom.anchor.x = 0.5;
            boom.anchor.y = 0.5;
            boom.visible = false;
            boom.animationSpeed = .25;
            
            name.x = 0;
            name.y = -25;
            name.anchor.x = 0.5;
            name.anchor.y = 0.5;
            hp_container.position.set(-25, 25);

            hp_wrapper.beginFill(0x000000);
            hp_wrapper.drawRect(0,0,50,4);
            hp_wrapper.endFill();
            hp_bar.beginFill(0xFF0000);
            hp_bar.drawRect(1,1,48,2);
            hp_bar.endFill();
 
            char_instance[char].addChild(body);
            char_instance[char].addChild(cannon);
            char_instance[char].addChild(boom);
            char_instance[char].addChild(frame);
            char_instance[char].addChild(name);
            char_instance[char].addChild(hp_container);
            hp_container.addChild(hp_wrapper);
            hp_container.addChild(hp_bar);
            hp_container.hp_bar = hp_bar;
        }
        ready = true;
    }

    function get_source(part, value) {
        return source_mapping[part][part + value];
    }

    function render(_characters, _bullets, offset_obj) {
        // console.log(_characters);
        // console.log(_bullets);
        // console.log(offset_obj);
        if (offset_obj) {
            main.position.set(offset_obj.x, offset_obj.y);
            main.scale.x = offset_obj.scale;
            main.scale.y = offset_obj.scale;
        } else {
            main.scale.x = 1;
            main.scale.y = 1;
            main.position.set(0,0);
        }
        var current_ball = {};
        for (var char in _characters) {
            // console.log(char);
            char_instance[char].x = _characters[char].x;
            char_instance[char].y = _characters[char].y;
            rotate(char_instance[char], _characters[char]);
            char_instance[char].children[5].hp_bar.width = 48 * (_characters[char].hp / 100);
            if (_characters[char].hp <= 0) {
                char_instance[char].children[2].visible = true;
                char_instance[char].children[2].play();
            } else {
                char_instance[char].children[2].visible = false;
                char_instance[char].children[2].stop();
            } 
            // TODO: fix hit
            // if (_characters[char].hit && !char_instance[char].ani_timer) {
            //     console.log(_characters[char].char + ' was hit');
            //     var timer = char_instance[char].ani_timer;
            //     var sprite = char_instance[char];
            //     char_instance[char].ani_timer = setInterval(function() {
            //         if (char_instance[char].children[0].alpha >= 1) {
            //             char_instance[char].hit_offset = -0.05;
            //         } else if (char_instance[char].children[0].alpha <= 0.1) {
            //             char_instance[char].hit_offset = 0.05;
            //         }
            //         char_instance[char].children[0].alpha += char_instance[char].hit_offset;
            //         char_instance[char].children[1].alpha += char_instance[char].hit_offset;
            //     }, 1000 / 20);
            //     console.log(char_instance[char].ani_timer);

            //     set_recover(timer, sprite, _characters[char].char);
                // setTimeout(function() {
                //     console.log('recover' + _characters[char].char);
                //     console.log(timer);
                //     clearInterval(timer);
                //     console.log(timer);
                //     console.log(sprite);
                //     console.log(sprite.children[0]);
                //     sprite.children[0].alpha = 1;
                //     sprite.children[1].alpha = 1;
                //     sprite.hit_offset = -0.05;
                // }, 1000);
            // }
        }
        for (var key in ball_instance) {
            current_ball[key] = key;
        }
        for (var i = 0; i < _bullets.length; i++) {
            if (ball_instance[_bullets[i].id]) {
                ball_instance[_bullets[i].id].x = _bullets[i].x - 5;
                ball_instance[_bullets[i].id].y = _bullets[i].y - 5;
                delete current_ball[_bullets[i].id];
            } else {
                generate_ball(_bullets[i]);
            }
        }
        for (var key in current_ball) {
            main.removeChild(ball_instance[key]);
        }
    }

    // function set_recover(timer, container, name) {
    //     var _timer = timer
    //     setTimeout(function() {
    //         console.log('recover ' + name);
    //         console.log(_timer);
    //         clearInterval(_timer);
    //         console.log(_timer);
    //         console.log(container);
    //         console.log(container.children[0]);
    //         container.children[0].alpha = 1;
    //         container.children[1].alpha = 1;
    //         container.hit_offset = -0.05;
    //     }, 1000);
    // }

    function rotate(ref, data_obj) {
        var angle = 0;
        if (data_obj.up) {
            if (data_obj.left) {
                angle = -45;
            } else if (data_obj.right) {
                angle = 45;
            } else {
                angle = 0;
            }
        } else if (data_obj.down) {
            if (data_obj.left) {
                angle = 225;
            } else if (data_obj.right) {
                angle = 135;
            } else {
                angle = 180;
            }
        } else {
            if (data_obj.left) {
                angle = 270;
            } else if (data_obj.right) {
                angle = 90;
            }
        }
        ref.children[0].rotation = angle * (Math.PI / 180);
        ref.children[1].rotation = (data_obj.cannon_angle + 90) * (Math.PI / 180);
    }

    function generate_ball(obj) {
        var ball = get_source('bullet', obj.camp);
        var assets = PIXI.loader.resources;
        ball_instance[obj.id] = new PIXI.Sprite(assets[ball].texture);
        ball_instance[obj.id].width = 10;
        ball_instance[obj.id].height = 10;
        ball_instance[obj.id].x = obj.x - 5;
        ball_instance[obj.id].y = obj.y - 5;
        main.addChild(ball_instance[obj.id]);
    }

    function clean() {
        for (var char in char_instance) {
            for (var content in char_instance[char].children) {
                char_instance[char].removeChild(char_instance[char].children[content]);
            }
            main.removeChild(char_instance[char]);
        }
        for (var ball in ball_instance) {
            main.removeChild(ball_instance[ball]);
        }
        ready = false;

    }

    function loadProgressHandler(obj) {

    }

    function is_ready() {
        return ready;
    }

    function is_loaded() {
        return loaded;
    }

    return {
        init: init,
        clean: clean,
        render: render,
        is_loaded: is_loaded,
        is_ready: is_ready
    }
}

//---- controller
//---- bug: multi join
//---- scale tank size
//aim target when reburn
// fix controller scale issue
// fix key down keep shoot
// bullet overheat
// fix bomber effect
// direct detect (remember last control and check after render)