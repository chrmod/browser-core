window.SCRIPTS["status_info"] = {

    model: function () {
        var cliqz_loyal_data = CliqzLoyalty.get_all_stat_current_term();
        cliqz_loyal_data["stt_meta"] = CliqzLoyalty.get_mem_status_meta();
        return Promise.resolve(cliqz_loyal_data);
    },

    ready: function (stats) {
    }
};