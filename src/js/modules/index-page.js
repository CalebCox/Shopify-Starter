APP.index = (function(APP, $) {
  // var variables defined here

  function bindEvents() {
    console.log("index page init");
  }

  function init() {
    bindEvents();
  }

  return {
    init: init
  };
})(APP, jQuery);
