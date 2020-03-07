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
        series: undefined,
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
            // console.log(this.characters[this.player]);
            // console.log(this.characters[this.player]);
            if (window.innerWidth > 800 || !this.player || this.battle_set.result || !this.characters[this.player]) {
                return "none";
            }
            var x = 400 - this.characters[this.player].x;
            var y = 300 - this.characters[this.player].y;
            var scale_x = ((400 - Math.abs(x)) / 400) + 1;
            // var scale_y = ((300 - Math.abs(y)) / 300) + 1;
            // console.log(scale_x);
            // return "scale(" + scale_x + ","  + scale_x + ") translate(" + x + "px, " + y + "px)";
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
            // console.log(this.token);
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
                app.series = value;
            });
            
            socket.on('change_phase', function(text) {
                app.game_set.phase = text;
            });
            
            socket.on('strategy_render', function(obj) {
                // console.log(obj);
                if (app.game_set.phase !== 'strategy') {
                    return;
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
                // console.log(obj);
                app.characters = obj.characters;
                app.bullets = obj.bullets;
                app.battle_set = obj.battle_set;
                if (app.player && !app.binding) {
                    app.binding = true;
                    app.event_binding();
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
            // console.log(this.player);
            if (!this.player) {
                return;
            }
            // console.log(code);
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
        }
    },
    mounted: function() {
        var vm = this;
        // init(vm);
        // this.event_binding();
        // setTimeout(function() {
        //     vm.isBuffer = false;
        // }, 5000);
    }
});

//---- controller
// bug: multi join
// scale tank size
//aim target when reburn
// fix controller scale issue
// fix key down keep shoot
// bullet overheat
// fix bomber effect
// direct detect (remember last control and check after render)