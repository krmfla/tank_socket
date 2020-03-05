var socket = io();

function init(enviroment) {
    socket.emit('join');
}

socket.on('join', function(text) {
    if (!app.player) {
        app.player = text;
    }
});

socket.on('render', function(obj) {
    app.characters = obj.characters;
    app.bullets = obj.bullets;
});

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
        origin_y: null
    },
    methods: {
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
                vm.fire_active(true);
            }, true);
            this.fire_el.addEventListener('touchend', function() {
                vm.fire_active(false);
            }, true);

        },
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
        fire_active(trigger) {
            console.log('fire_active');
            var _char = this.characters[this.player];
            if (trigger) {
                if (!_char.fire) {
                    this.move(32);
                }
            } else {
                if (_char.fire) {
                    this.move(-32);
                }
            }
        },
        move: function(code) {
            console.log(code);
            var vm = this;
            var direction;
            var trigger;
            switch (code) {
                case 37:
                    direction = 'left';
                    trigger = true;
                    break; 
                case -37: 
                    direction = 'left';
                    trigger = false;
                    break; 
                case 39:
                    direction = 'right';
                    trigger = true;
                    break; 
                case -39: 
                    direction = 'right';
                    trigger = false;
                    break; 
                case 38:
                    direction = 'up';
                    trigger = true;
                    break; 
                case -38: 
                    direction = 'up';
                    trigger = false;
                    break; 
                case 40:
                    direction = 'down';
                    trigger = true;
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
        init(vm);
        this.event_binding();
    }
});

// controller
// direct detect