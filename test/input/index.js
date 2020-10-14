require('./nested');

(function () {
    var test = 1;

    function abc (cde) {
        console.log(cde);
    }

    abc('a');

    console.log(test);
})();