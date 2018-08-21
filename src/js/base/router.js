APP.router = (function(APP, $) {
  function init() {
    var $body = $("body");

    // Auto start

    // Conditional Start
    if (document.querySelector(".index-page")) APP.index.init();
  }

  return {
    init: init
  };
})(APP, jQuery);
APP.router.init();
