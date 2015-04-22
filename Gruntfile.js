module.exports = function(grunt) {
    var build = function(path,dev) {
        return (!dev?"build/dev/":"build/prod/") + path
    }
    
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        concurrent: {
            dev: {
                tasks: ["nodemon","watch"],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        nodemon: {
            dev: {
                script: 'index.js'
            }
        },
        watch: {
            scripts: {
                files: ["generic/**/*.*","specific/**/*.*"],
                tasks: ["copy:tool","concat"],
                options: {
                    spawn: false,
                    livereload: 3001
                },
            }
        },
        copy: {
            tool: {
                files: [
                    { expand: true, cwd: "generic/static/", src: "**", dest: build("tool/") }
                ]
            },
            firefox: {
                files: [
                    { expand: true, cwd: "specific/firefox/", src: "**", dest: build("firefox/") },
                    { expand: true, cwd: "generic/", src: "**", dest: build("firefox/cliqz@cliqz.com/chrome/") }
                ]
            },
            chrome: {
                files: [
                    { expand: true, cwd: "specific/chrome/", src: "**", dest: build("chrome/") },
                    { expand: true, cwd: "generic/", src: "**", dest: build("chrome/navigation-tool/") }
                ]
            },
        },
        concat: {
            global: {
                src: [
                    "generic/modules/global/utils.js",
                    "generic/modules/global/hb.js"
                ],
                options: {
                    banner: "'use strict';\n\nvar CLIQZ = {}\n\n",
                    sourceMap: true,
                    process: function(src,filepath) {
                        var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]

                        return "// start module " + modulename + "\n"
                               + ";CLIQZ." + modulename + " = (function(Q,E){\n"
                               + src
                               + "})(CLIQZ,CLIQZEnvironment);\n"
                               + "// end module " + modulename + "\n\n"
                    }
                },
                dest: build("tool/js/global.js")
            },
            local: {
                src: [
                    "generic/modules/local/core.js",
                    "generic/modules/local/ui.js"
                ],
                options: {
                    banner: "'use strict';\n\n",
                    sourceMap: true
                },
                dest: build("tool/js/local.js")
            },
            libs: {
                src: ["generic/modules/libs/*"],
                dest: build("tool/js/libs.js")
            }
        }
    })

    grunt.loadNpmTasks("grunt-contrib-watch")
    grunt.loadNpmTasks("grunt-contrib-copy")
    grunt.loadNpmTasks("grunt-contrib-concat")
    grunt.loadNpmTasks("grunt-nodemon")
    grunt.loadNpmTasks("grunt-concurrent")

    grunt.registerTask("default",["copy","concat","concurrent"])
}
