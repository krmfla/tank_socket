var socket = io();

function init(enviroment) {
    // var character = sessionStorage.getItem('player');
    // if (character) {
    //     enviroment.player = character;
    //     socket.emit('get_render');
    // } else {
    //     socket.emit('join');
    // }
    socket.emit('join');
}

socket.on('join', function(text) {
    console.log(text);
    if (!app.player) {
        app.player = text;
    }
    // sessionStorage.setItem('player', text);
});

socket.on('render', function(obj) {
    // console.log(obj);
    // console.log(obj.bullets);
    app.characters = obj.characters;
    app.bullets = obj.bullets;
});

var app = new Vue({
    el: '#app',
    data: {
        characters: {},
        bullets: {},
        player: ''
    },
    methods: {
        event_binding: function() {
            var vm = this;
            document.onkeydown = function(event) {
                vm.move(event.keyCode);
            };

            document.onkeyup = function(event) {
                vm.move(-event.keyCode);
            }
        },
        move: function(code) {
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
                    direction = 'fire';
                    trigger = true;
                    break;
                case -32:
                    direction = 'fire';
                    trigger = false;
                    break;
            }
            socket.emit('action', {
                'character': vm.player,
                'direction': direction,
                'trigger': trigger
            });
        }
    },
    mounted: function() {
        var vm = this;
        init(vm);
        this.event_binding();
    }
});