'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require("gulp-rename");
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');
var handlebars = require('gulp-handlebars');
var declare = require('gulp-declare');
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var pump = require('pump');
var processhtml = require('gulp-processhtml');
var del = require('del');
var concat = require("gulp-concat");

var insert = require("gulp-insert");
var addSrc = require("gulp-add-src");

var connect = require('gulp-connect');
var watch = require('gulp-watch');
var name;

var dependencies = require('./dependencies.json');

var libName = 'libs';

var excludeReusable = {
    text: '!./dist/reusable/showdown.min.js',
    slider: '!./dist/reusable/lory.js'
};

var reusable = './dist/reusable/*.js';

gulp.task('addDependencies', ['build'], function () {
    for (var module in dependencies) {
        var fullReusable = [reusable];
        for (var res in excludeReusable) {
            fullReusable.push(excludeReusable[res]);
        }

        if (excludeReusable[module]) {
            fullReusable.splice(fullReusable.indexOf(excludeReusable[module]), 1);
        }

        dependencies[module].forEach(function (currentDependency) {
            if (excludeReusable[currentDependency]) {
                fullReusable.splice(fullReusable.indexOf(excludeReusable[currentDependency]), 1);
            }
            gulp.src(['./dist/renders/' + currentDependency + '/package/**/*', '!./dist/renders/' + currentDependency + '/package/**/README.md'])
                .pipe(gulp.dest('./dist/renders/' + module + '/package/dependencies/' + currentDependency));

        });

        gulp.src(fullReusable)
            .pipe(gulp.dest('./dist/renders/' + module + '/package/' + libName));
    }
});


gulp.task('minifyPack', ['build'], function () {
    for (var mod in dependencies) {
        (function () {
            let module = mod;
            let css = ['./dist/renders/' + module + '/package/' + module + '.min.css'];
            let compiledTemplates = ['./dist/renders/' + module + '/template.' + module + '.min.js'];
            let fullReusable = [reusable, './src/renders/' + module + '/js/*.js'];

            for (var res in excludeReusable) {
                fullReusable.push(excludeReusable[res]);
            }

            if (excludeReusable[module]) {
                fullReusable.splice(fullReusable.indexOf(excludeReusable[module]), 1);
            }

            dependencies[module].forEach(function (currentDependency) {
                css.push('./dist/renders/' + currentDependency + '/package/' + currentDependency + '.min.css');
                compiledTemplates.push('./dist/renders/' + currentDependency + '/template.' + currentDependency + '.min.js');
                fullReusable.push('./src/renders/' + currentDependency + '/js/*.js');

                if (excludeReusable[currentDependency]) {
                    fullReusable.splice(fullReusable.indexOf(excludeReusable[currentDependency]), 1);
                }
            });

            gulp.src(fullReusable)
                .pipe(uglify())
                .pipe(concat("libs.min.js"))
                .pipe(rename(function (path) {
                    path.dirname = 'renders/' + module + '/min'
                }))
                .pipe(gulp.dest('dist'));

            gulp.src(compiledTemplates)
                .pipe(concat("templates.min.js"))
                .pipe(rename(function (path) {
                    path.dirname = 'renders/' + module + '/min'
                }))
                .pipe(gulp.dest('dist'));

            gulp.src(css)
                .pipe(cleanCSS())
                .pipe(concat("styles.min.css"))
                .pipe(rename(function (path) {
                    path.dirname = 'renders/' + module + '/min'
                }))
                .pipe(gulp.dest('dist'));
        }());
    }
});

gulp.task('concatAll', ['build'], function () {
    gulp.src(['./dist/renders/*/template.*'])
        .pipe(concat("templates.min.js"))
        .pipe(gulp.dest('./dist/renders/all'));

    gulp.src(['./dist/reusable/*.js', './src/renders/slider/js/sliderHelper.js', '!./dist/reusable/lory.min.js', '!./dist/reusable/showdown.min.js'])
        .pipe(uglify())
        .pipe(addSrc.append(['./dist/reusable/lory.min.js', './dist/reusable/showdown.min.js']))
        .pipe(concat("libs.min.js"))
        .pipe(gulp.dest('./dist/renders/all'));

    gulp.src(['./dist/renders/*/*.min.css'])
        .pipe(concat("styles.min.css"))
        .pipe(gulp.dest('./dist/renders/all'));
});

gulp.task('del', function () {
    return del.sync([
        'dist'
    ]);
});

gulp.task('renders-html', function () {
    return gulp.src(['src/renders/**/*.html', '!src/renders/**/visualisation.html'])
        .pipe(processhtml())
        //.pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('dist/renders'));
});

gulp.task('renders-sass', function () {
    return gulp.src('src/renders/**/sass/*.scss')
        .pipe(
            sass({
                outputStyle: 'expanded'
            }).on('error', sass.logError)
        )
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(rename(function (path) {
            name = path.dirname.slice(0, path.dirname.indexOf('sass') - 1);
            path.dirname = name + '/package';
            path.basename = name;
        }))
        .pipe(gulp.dest('dist/renders'))
        // .pipe(sourcemaps.init())
        .pipe(cleanCSS())
        // .pipe(sourcemaps.write())
        .pipe(rename(function (path) {
            name = path.dirname.slice(0, path.dirname.indexOf('package') - 1);
            path.dirname = name;
            path.basename = name + '.min';
        }))
        .pipe(gulp.dest('dist/renders'))
        .pipe(rename(function (path) {
            path.dirname = path.dirname + '/package';
        }))
        .pipe(gulp.dest('dist/renders'));
});

gulp.task('renders-templates', function () {
    return gulp.src('src/renders/**/templates/*.hbs')
        .pipe(rename(function (path) {
            name = path.dirname.slice(0, path.dirname.indexOf('templates') - 1);
            path.dirname = name + '/package';
        }))
        .pipe(gulp.dest('dist/renders'))
        .pipe(handlebars({
            handlebars: require('handlebars')
        }))
        .pipe(declare({
            namespace: 'AmpCa.templates'
        }))
        .pipe(uglify())
        .pipe(rename(function (path) {
            name = path.dirname.slice(0, path.dirname.indexOf('package') - 1);
            path.dirname = name;
            path.basename = 'template.' + path.basename + '.min';
        }))
        .pipe(gulp.dest('dist/renders'))
});

gulp.task('renders-js-copy', function () {
    return gulp.src(['src/renders/**/js/*.js'])
        .pipe(rename(function (path) {
            name = path.dirname.slice(0, path.dirname.indexOf('js') - 1);
            path.dirname = name + '/package';
        }))
        .pipe(gulp.dest('dist/renders'))

});

gulp.task('renders-types-copy', function () {
    return gulp.src(['src/renders/**/*.json'])
        .pipe(rename(function (path) {
            var name = path.dirname;
            path.dirname = name + '/package';
        }))
        .pipe(gulp.dest('dist/renders'))
});

gulp.task('renders-files-copy', function () {
    return gulp.src(['src/renders/**/visualisation.html'])
        .pipe(rename(function (path) {
            var name = path.dirname;
            path.dirname = name + '/package';
        }))
        .pipe(gulp.dest('dist/renders'))
});

gulp.task('renders-readme-copy', function () {
    return gulp.src(['src/renders/**/README.md'])
        .pipe(rename(function (path) {
            var name = path.dirname;
            path.dirname = name + '/package'
        }))
        .pipe(gulp.dest('dist/renders'))
});

gulp.task('salesforce-dist-copy', ['buildAllWithoutReload'], function () {
    return gulp.src(['src/salesforce/**/*', 'node_modules/cms-javascript-sdk/dist/cms-javascript-sdk.min.js', 'src/reusable/js/handlebars_helpers.js', '!src/salesforce/templates', '!src/salesforce/templates/**'])
        .pipe(gulp.dest('dist/salesforce'))
});


gulp.task('concatAllSalesforce', ['salesforce-dist-copy'], function () {
    gulp.src(['./dist/reusable/utils.js', './src/renders/slider/js/sliderHelper.js'])
        .pipe(uglify())
        .pipe(addSrc.append(['./dist/reusable/lory.min.js', './dist/reusable/showdown.min.js']))
        .pipe(concat("libs.min.js"))
        .pipe(gulp.dest('./dist/salesforce'));

    gulp.src(['./dist/renders/*/*.min.css'])
        .pipe(concat("styles.min.css"))
        .pipe(gulp.dest('./dist/salesforce'));
});

gulp.task('salesforce-types-copy', ['salesforce-dist-copy'], function () {
    return gulp.src(['src/renders/**/*.json'])
        .pipe(gulp.dest('dist/salesforce/renders/'))
});

gulp.task('salesforce-templates-move', ['salesforce-dist-copy'], function () {

    return gulp.src(['src/salesforce/templates/**'])
        .pipe(rename(function (path) {
            path.dirname = path.basename;
        }))
        .pipe(gulp.dest('dist/salesforce/renders/'))
});

gulp.task('renders-js-min', function (cb) {
    pump([
            gulp.src(['src/renders/**/js/*.js']),
            //uglify(),
            rename(function (path) {
                name = path.dirname.slice(0, path.dirname.indexOf('js') - 1);
                path.dirname = name;
                path.basename = path.basename
                //+ '.min';
            }),
            gulp.dest('dist/renders')
        ],
        cb
    );
});

gulp.task('reusable-js-min', function (cb) {
    pump([
            gulp.src(['src/**/js/*.js']),
            //uglify(),
            rename(function (path) {
                name = path.dirname.slice(0, path.dirname.indexOf('js') - 1);
                path.dirname = name;
                path.basename = path.basename
            }),
            gulp.dest('dist')
        ],
        cb
    );
});
gulp.task('copy-node-modules', function () {
    return gulp.src([
            'node_modules/cms-javascript-sdk/dist/cms-javascript-sdk.min.js',
            'node_modules/handlebars/dist/handlebars.min.js',
            'node_modules/showdown/dist/showdown.min.js',
            'node_modules/lory.js/dist/lory.min.js'
        ])
        .pipe(gulp.dest('dist/reusable'));
});

gulp.task('addLoryLicense', ['copy-node-modules'], function () {
    return gulp.src('node_modules/lory.js/LICENSE')
        .pipe(insert.prepend('/*'))
        .pipe(insert.append('*/'))
        .pipe(addSrc.append('dist/reusable/lory.min.js'))
        .pipe(concat("lory.min.js"))
        .pipe(gulp.dest('dist/reusable'))

})

gulp.task('addShowdownLicense', ['copy-node-modules'], function () {
    return gulp.src('node_modules/showdown/license.txt')
        .pipe(insert.prepend('/*'))
        .pipe(insert.append('*/'))
        .pipe(addSrc.append('dist/reusable/showdown.min.js'))
        .pipe(concat("showdown.min.js"))
        .pipe(gulp.dest('dist/reusable'));

})

gulp.task('copy-viewer-kit-modules', function () {
    return gulp.src(['bower_components/jquery-ui/ui/jquery.ui.core.js', 'bower_components/jquery-ui/ui/jquery.ui.widget.js',
            'node_modules/amplience-sdk-client/dist/video-js/video.min.js',
            'node_modules/amplience-sdk-client/dist/amplience-sdk-client.js'])
        .pipe(gulp.dest('src/pdp/js'));
});

gulp.task('renders-build', ['renders-html', 'renders-sass', 'renders-templates', 'renders-readme-copy',
    'renders-js-copy', 'renders-files-copy', 'renders-types-copy', 'renders-js-min'], function () {
});

gulp.task('build', ['del', 'copy-node-modules', 'addLoryLicense', 'addShowdownLicense', 'reusable-js-min', 'renders-build'], function () {

});

gulp.task('buildSalesforce', ['salesforce-dist-copy', 'concatAllSalesforce', 'salesforce-types-copy', 'salesforce-templates-move'], function () {

});

gulp.task('buildAllWithoutReload', ['build', 'addDependencies', 'concatAll'])

gulp.task('buildAll', ['buildAllWithoutReload'], function () {
    return gulp.src('*')
        .pipe(connect.reload());
});

gulp.task('buildAllSalesforce', ['buildAllWithoutReload', 'buildSalesforce'], function () {
    return gulp.src('*')
        .pipe(connect.reload());
});

gulp.task('buildAllMin', ['build', 'addDependencies', 'minifyPack', 'server'], function () {
    return gulp.src('*')
        .pipe(connect.reload());
});

gulp.task('server', function () {
    return connect.server({
        port: 9100,
        hostname: '0.0.0.0',
        livereload: true,
        debug: true
    });
});

gulp.task('watch', ['buildAll'], function () {
    return watch(['./src/**/*'], function () {
        gulp.start('buildAll')
    })
});

gulp.task('watchSalesforce', ['buildAllSalesforce'], function () {
    return watch(['./src/**/*'], function () {
        gulp.start('buildAllSalesforce')
    })
});

gulp.task('default', ['watch', 'server']);

gulp.task('salesforce', ['watchSalesforce', 'server']);
