function GetToken(length) {
    var mapping = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    var max = mapping.length;
    for (var i = 0; i < length; i++) {
        var index = Math.floor(Math.random() * max);
        result += mapping.charAt(index);
    }
    return result;
}