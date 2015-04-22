Components.utils.import('chrome://cliqzmodules/content/CliqzTour.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var unload = function () {
    CliqzTour.unload();
}

var init = function () {
    CliqzUtils.localizeDoc(document);

    CliqzTour.init();

    btn = document.getElementById('tour-btn'),
    btnCancel = document.getElementById('tour-btn-cancel');

    btn.addEventListener('click', function () {
        CliqzTour.start();
    });

    btnCancel.addEventListener('click', function () {
        CliqzTour.cancel();
    });

    btnCancel.addEventListener('mouseover', function () {
        // close popup to focus on main window; otherwise user has to click twice
        CliqzTour.hideCallout();
        CliqzTour.hideCursor();
    });
};
