// grab our gulp packages
var gulp = require('gulp'),
    gutil = require('gulp-util'),
    sass = require('gulp-sass'),
    print = require('gulp-print'),
    sourcemaps = require('gulp-sourcemaps'),
    clean = require('gulp-clean');

var sass_source = "generic/static/styles/sass/**/*.scss",
    css_destination = "generic/static/styles/css/";


// Clean The Folder. Removes all build files
gulp.task('clean-css-folder', function () {
    return gulp.src(css_destination + '*', {read: false})
        .pipe(clean({force: true}))
        .pipe(gulp.dest('dist'));
});


//Build SASS
gulp.task('build-css', ['clean-css-folder'], function () {
    return gulp.src(sass_source)
        .pipe(sourcemaps.init())
        .pipe(print())
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(css_destination))
        .on('end', function () {
            gutil.log('CSS is ready!')
        })
});

gulp.task('build', ['build-css'], function () {});
