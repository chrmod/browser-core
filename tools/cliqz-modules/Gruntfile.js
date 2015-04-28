module.exports = function(grunt) {
    var web = 'dist/<%= pkg.name %>-web-<%= pkg.version %>.js',
        node = 'dist/<%= pkg.name %>-node-<%= pkg.version %>.js'
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                banner: "var CLIQZ = {};",
                process: function(src,filepath) {
                    var filename = filepath.match(/[^\/]+$/)[0]
                    
                    if (filename.match(/\.json$/i)) return "CLIQZ." + filename.split(".")[0].toUpperCase() + " = " + src + ";"
                    else return src
                }
            },
            web: {
                src: ['src/data/*.json','src/classes/*.js'],
                dest: web
            },
            node: {
                src: ['src/data/*.json','src/classes/*.js'],
                dest: node
            },
            test: {
                options: {
                    footer: ";exports.CLIQZ = CLIQZ"
                },
                src: ['src/data/*.json','src/classes/*.js'],
                dest: 'dist/<%= pkg.name %>-test.js'
            }
        },
        uglify: {
            options: {
                compress: {
                    drop_console: true
                }
            },
            web: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': web
                }
            }
        },
        nodeunit: {
            all: ['test/scripts/*.js']
        }
    })

    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-nodeunit')
    
    grunt.registerTask('default',['concat','uglify','nodeunit'])
}