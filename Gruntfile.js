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
                files: ["generic/**/*.*", "specific/**/*.*", "Gruntfile.js", "!generic/static/styles/css"],
                tasks: ["build"],
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
                    { expand: true, cwd: "specific/firefox/package", src: "**", dest: build("firefox/") }, //package
                ]
            },
            firefoxDebug: {
                files: [
                    { expand: true, cwd: "specific/firefox/cliqz@cliqz.com", src: "**", dest: build("firefoxDebug/cliqz@cliqz.com")},
                    { expand: true, cwd: "specific/firefox", src: "CliqzExceptions.jsm", dest: build("firefoxDebug/cliqz@cliqz.com/modules")}, //debug hook
                    { expand: true, cwd: "generic/modules/libs", src: "**", dest: build("firefoxDebug/cliqz@cliqz.com/modules/extern") }, //extern libs
                    { expand: true, cwd: "generic/static", src: "**", dest: build("firefoxDebug/cliqz@cliqz.com/chrome") }, //skin, locale
                    { expand: true, cwd: "generic/modules/global", src: "**", dest: build("firefoxDebug/cliqz@cliqz.com/modules") },
                    { expand: true, cwd: "generic/modules/local", src: "**", dest: build("firefoxDebug/cliqz@cliqz.com/chrome/content") },
                    { expand: true, cwd: "specific/firefox/package", src: "**", dest: build("firefoxDebug/") }, //package
                ]
            },
            chrome: {
                files: [
                    { expand: true, cwd: "specific/chrome/", src: "**", dest: build("chrome/") },
                    { expand: true, cwd: "generic/", src: "**", dest: build("chrome/navigation-tool/") }
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
                    { expand: true, cwd: "generic/static/locale", src: "**", dest: build("androidkit/navigation/locale") },
                    { expand: true, cwd: "generic/static/skin", src: ["**", '!*a'], dest: build("androidkit/navigation/skin") },
                    { expand: true, cwd: "specific/mobile/skin", src: ["*", '!*sass'], dest: build("androidkit/navigation/skin/mobile") },
                    { expand: true, cwd: "specific/mobile/templates", src: '*', dest: build("androidkit/navigation/templates") },
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
            global_iOS: {
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
                dest: build("tool_iOS/js/global.js"),
            },
            //find a more elegant way to change this file
            firefoxDebugInjector: {
                src: [ "specific/firefox/cliqz@cliqz.com/modules/Extension.jsm" ],
                options: {
                    process: function(src,filepath) {
                        return src
                                .split('\n')
                                .map(function(line){
                                    return line.indexOf('CliqzExceptions') != -1 ?
                                            line.replace('// ', '') :
                                            line
                                })
                                .join('\n')
                    }
                },
                dest: build("firefoxDebug/cliqz@cliqz.com/modules/Extension.jsm"),
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
                src: ["generic/modules/libs/*", "specific/androidkit/js/viewpager.js"],
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
            libs4: {
                src: ["generic/modules/libs/*"],
                dest: build("tool_iOS/js/libs.js")
            }
        },
        run: {
            build: {
                cmd: 'gulp',
                args: [
                    'build-css',
                ]
            }
        }
    })

    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-nodemon");
    grunt.loadNpmTasks("grunt-concurrent");
    grunt.loadNpmTasks('grunt-run');

    grunt.registerTask("build",["run:build", "copy", "concat"]);
    grunt.registerTask("default",["build","concurrent"]);
    grunt.registerTask("serve",["build", "watch"]);

    grunt.registerTask('package', '', function(version){
        var result, exec = require('child_process').execSync;

        switch(version) {
            case 'live':
                result = exec("cd build/dev/firefox; python -c 'import fabfile; fabfile.package(\"False\")'");
                break;
            case 'beta': //fallthrough builds all betas
            default:
                result = exec("cd build/dev/firefox; python -c 'import fabfile; fabfile.package(\"True\")'");
                result += exec("cd build/dev/firefoxDebug; python -c 'import fabfile; fabfile.package(\"True\")'");
        }

        grunt.log.writeln(result);
    });

    grunt.registerTask('publish', '', function (version) {
        switch(version) {
            case 'beta':
                //deploys firefox debug to beta channel
                grunt.log.writeln('Deploying firefox debug to beta channel');
                var exec = require('child_process').execSync;
                var result = exec("cd build/dev/firefoxDebug; python -c 'import fabfile; fabfile.publish()'");
                grunt.log.writeln(result);
                break;
            case 'live':
                // TODO
                break
            default:
                grunt.log.writeln('please specify the version, eg: publish:beta');
        }
    });
}
