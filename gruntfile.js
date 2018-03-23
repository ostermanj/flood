module.exports = function(grunt){
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
       
        htmlhint: {
            index: {
                options: {
                    'tag-pair': true,
                    'tagname-lowercase': true,
                    'attr-lowercase': true,
                    'attr-value-double-quotes': false,
                    'doctype-first': true,
                    'spec-char-escape': true,
                    'id-unique': true,
                    'attr-no-duplication': true,
                    'tag-self-close': true,
                    'style-disabled': true
                },
                src: ['index.html']
            }
        },
        jshint: {
            options: {
                
              curly: true,
              eqeqeq: true,
              esversion: 6,
              eqnull: true,
              browser: true,
              node: true,
              devel: true,
              globals: {
                d3:true,
                mapboxgl:true
              },
              undef: true,
              unused: true
            },
            files: {
                src: ['dev-js/main.es6','js-exports/**/*.js']
            }

        },
        browserify: {
            dist: {
                files: {
                    // destination for transpiled js : source js
                    'dev-js/main.js': 'dev-js/main.es6'
                },
                options: {
                    transform: [['babelify', { presets: "env" }]],
                    browserifyOptions: {
                        debug: true
                    }
                }
            }
        },
        uglify: {
            options: {
              mangle: {
                reserved: ['d3']
              },
              compress: {
                drop_console: true
              }
            },
            min: {
                files: grunt.file.expandMapping(['*.js','!min.js'], 'js/', {
                    cwd: 'dev-js',
                    rename: function(destBase, destPath) {
                        return destBase+destPath.replace('.js', '.js'); 
                    }
                }),
                options: {
                    sourcemap: 'auto'
                }
            }
        },
        sass: {
            build: {
                files: grunt.file.expandMapping(['dev-css/*.scss'], '', {
                    rename: function(destBase, destPath) {
                        return destBase+destPath.replace('.scss', '.css');
                    }
                })
            }
        },
        cssmin: {
            build: {
                files: [{
                  expand: true,
                  cwd: 'css',
                  src: ['*.css', '!*.min.css'],
                  dest: 'css/',
                  ext: '.min.css'
                }]
            }
        },
        watch: {
            html: {
                files: ['*.html'],
                tasks: ['htmlhint']
            },
            jshintOnly: {
                files: ['js-exports/**/*.js'],
                tasks: ['jshint']
            },
            js: {
                files: ['dev-js/*.es6'],
                tasks: ['jshint','browserify'] // TO DO: ADD UGLIFY ET AL TO BULD TASK
            },
            scss: {
                files: ['dev-css/*.scss'], 
                tasks: ['sass'] // TO DO : ADD AUTOPREXIER ET AL TO BUILD TASK
            }
        },
        
        postcss: {
            options: {
                 processors: [
                    require('postcss-import')(),
                    require('autoprefixer')({browsers:['>1%','last 2 versions']})
                 ]
            },
            dist: {
                 src: 'dev-css/styles.css',
                dest: 'css/styles.css'
            }
        }
    });

    grunt.registerTask('default', []);

};