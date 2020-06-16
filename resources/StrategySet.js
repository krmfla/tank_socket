module.exports = StrategySet;

function StrategySet(socket) {
    var io = socket;
    var battle;
    var strategy_counter = 10;
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

    function bind(battleSet) {
        battle = battleSet;
    }

    return {
        register: register,
        get_series: get_series,
        get_phase: get_phase,
        after_campaign: after_campaign,
        render: render,
        join: join,
        restart: restart,
        bind: bind
    }
}

