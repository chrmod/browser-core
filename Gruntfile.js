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
                files: ["generic/**/*.*","specific/**/*.*", "Gruntfile.js"],
                tasks: ["copy","concat"],
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
                    { expand: true, cwd: "specific/firefox/cliqz@cliqz.com", src: "**", dest: build("firefox/cliqz@cliqz.com") },
                    { expand: true, cwd: "generic/modules/libs", src: "**", dest: build("firefox/cliqz@cliqz.com/modules/extern") }, //extern libs
                    { expand: true, cwd: "generic/static", src: "**", dest: build("firefox/cliqz@cliqz.com/chrome") }, //skin, locale
                    { expand: true, cwd: "generic/modules/global", src: "**", dest: build("firefox/cliqz@cliqz.com/modules") },
                    { expand: true, cwd: "generic/modules/local", src: "**", dest: build("firefox/cliqz@cliqz.com/chrome/content") },
                ]
            },
            chrome: {
                files: [
                    { expand: true, cwd: "specific/chrome/", src: "**", dest: build("chrome/") },
                    { expand: true, cwd: "generic/", src: "**", dest: build("chrome/navigation-tool/") }
                ]
            },
            android: {
                files: [
                    { expand: true, cwd: "generic/static/", src: "**", dest: build("android/chrome") },
                    { expand: true, cwd: "specific/android/", src: "**", dest: build("android/chrome/content") },
                ]
              },
            iOS: {
            files: [
                { expand: true, cwd: "generic/", src: "**", dest: build("tool_iOS/generic/") },
                { expand: true, cwd: "specific/iOS/css", src: "**", dest: build("tool_iOS/iOS/css") },
                { expand: true, cwd: "specific/iOS/js", src: "**", dest: build("tool_iOS/iOS/js") },
                { expand: true, cwd: "specific/iOS/", src: "index.html", dest: build("tool_iOS") }
              ]
            },
            androidkit: {
                files: [
                    { expand: true, cwd: "generic/static", src: "**", dest: build("androidkit/navigation") },
                    { expand: true, cwd: "specific/androidkit/", src: "**", dest: build("androidkit/navigation") },
                    { expand: true, cwd: "generic/modules/local/", src: "CliqzAntiPhishing.js", dest: build("androidkit/navigation/js") }
                ]
            },
        },
        concat: {
            global: {
                src: [
                    "generic/modules/global/CliqzUtils.jsm",
                    "generic/modules/global/*.jsm"
                ],
                options: {
                    banner: "'use strict';\n\nvar CLIQZ = {};\n\n",
                    sourceMap: true,
                    process: function(src,filepath) {
                        var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]
                        /* Lucian
                        return "// start module " + modulename + "\n"
                               + ";CLIQZ." + modulename + " = (function(Q,E){\n"
                               + src
                               + "})(CLIQZ,CLIQZEnvironment);\n"
                               + "// end module " + modulename + "\n\n"
                        */
                        return "// start module " + modulename + "\n"
                               + "(function(ctx,Q,E){\n"
                               + src
                               + "ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
                               + "})(this, CLIQZ,CLIQZEnvironment);\n"
                               + "// end module " + modulename + "\n\n"
                    }
                },
                dest: build("tool/js/global.js"),
            },
            androidkit: {
                src: [
                    "generic/modules/global/CliqzUtils.jsm",
                    "generic/modules/global/*.jsm"
                ],
                options: {
                    banner: "'use strict';\n\nvar CLIQZ = {};\n\n",
                    sourceMap: true,
                    process: function(src,filepath) {
                        var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]
                        return "// start module " + modulename + "\n"
                               + "(function(ctx,Q,E){\n"
                               + src
                               + "ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
                               + "})(this, CLIQZ,CLIQZEnvironment);\n"
                               + "// end module " + modulename + "\n\n"
                    }
                },
                dest: build("androidkit/navigation/js/global.js")
            },
            global: {
                src: [
                    "generic/modules/global/CliqzUtils.jsm",
                    "generic/modules/global/*.jsm"
                ],
                options: {
                    banner: "'use strict';\n\nvar CLIQZ = {};\n\n",
                    sourceMap: true,
                    process: function(src,filepath) {
                        var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]
                        return "// start module " + modulename + "\n"
                               + "(function(ctx,Q,E){\n"
                               + src
                               + "ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
                               + "})(this, CLIQZ,CLIQZEnvironment);\n"
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
            local2: {
                src: [
                    "generic/modules/local/core.js",
                    "generic/modules/local/ui.js"
                ],
                options: {
                    banner: "'use strict';\n\n",
                    sourceMap: true
                },
                dest: build("tool_iOS/js/local.js")
            },
            libs: {
                src: ["generic/modules/libs/*"],
                dest: build("tool/js/libs.js")
            },
            androidkit_local: {
                src: [
                    "generic/modules/local/core.js",
                    "generic/modules/local/ui.js"
                ],
                options: {
                    banner: "'use strict';\n\n",
                    sourceMap: true
                },
                dest: build("androidkit/navigation/js/local.js")
            },
            androidkit_libs: {
                src: ["generic/modules/libs/*"],
                dest: build("androidkit/navigation/js/libs.js")
              },
            libs3: {
                src: ["generic/modules/libs/*"],
                dest: build("android/modules/libs.js")
              },
            libs4: {
                src: ["generic/modules/libs/*"],
                dest: build("tool_iOS/js/libs.js")
            }

        }
    })

    grunt.loadNpmTasks("grunt-contrib-watch")
    grunt.loadNpmTasks("grunt-contrib-copy")
    grunt.loadNpmTasks("grunt-contrib-concat")
    grunt.loadNpmTasks("grunt-nodemon")
    grunt.loadNpmTasks("grunt-concurrent")

    grunt.registerTask("default",["copy","concat","concurrent"])
    grunt.registerTask("build",["copy","concat"])
}
