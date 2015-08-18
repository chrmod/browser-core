module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            scripts: {
                files: ['**/*.*'],
                tasks: ["copy"],
                options: {
                    spawn: false
                },
            },
        },
        copy: {
            web: {
                files: [
                    { expand: true, cwd: "src/generic/", src: '**', dest: 'dist/web/page/' },
                    { expand: true, cwd: "src/environment/", src: 'web.js', dest: 'dist/web/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            },
            chrome: {
                files: [
                    { expand: true, cwd: "src/extensions/chrome/", src: '**', dest: 'dist/chrome/' },
                    { expand: true, cwd: "src/generic/", src: '**', dest: 'dist/chrome/page/' },
                    { expand: true, cwd: "src/environment/", src: 'chrome.js', dest: 'dist/chrome/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            },
            opera: {
                files: [
                    { expand: true, cwd: "src/extensions/opera/", src: '**', dest: 'dist/opera/' },
                    { expand: true, cwd: "src/generic/", src: '**', dest: 'dist/opera/page/' },
                    { expand: true, cwd: "src/environment/", src: 'opera.js', dest: 'dist/opera/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            },
            safari: {
                files: [
                    { expand: true, cwd: "src/extensions/freshtab.safariextension/", src: '**', dest: 'dist/safari/freshtab.safariextension' },
                    { expand: true, cwd: "src/generic/", src: '**', dest: 'dist/safari/freshtab.safariextension/page/' },
                    { expand: true, cwd: "src/environment/", src: 'safari.js', dest: 'dist/safari/freshtab.safariextension/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            },
            firefox: {
                files: [
                    { expand: true, cwd: "src/extensions/firefox/", src: '**', dest: 'dist/firefox/' },
                    { expand: true, cwd: "src/generic/", src: '**', dest: 'dist/firefox/page/' },
                    { expand: true, cwd: "src/environment/", src: 'firefox.js', dest: 'dist/firefox/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            },
            "firefox-inject": {
                files: [
                    { expand: true, cwd: "src/generic/", src: '**', dest: '../cliqz@cliqz.com/chrome/freshtab/page/' },
                    { expand: true, cwd: "src/environment/", src: 'firefox.js', dest: '../cliqz@cliqz.com/chrome/freshtab/page/js/', rename: function(dest,src){ return dest + 'environment.js' } }
                ]
            }
        }
    })

    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks("grunt-contrib-watch")
    grunt.registerTask('default',['copy', 'watch'])
}
