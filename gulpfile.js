// =================================================
//
//  Gulp task runner script
//
//
//  Dependencies: Node, NPM, ruby gem, sass, gulp
//
//  Setup: Install local dependencies: `yarn`
//
//  CLI Commands:
//    - Run dev (default process): gulp
//    - Build production: gulp build
//
//  NOTE: Be SURE to check what branch you are in,
//        as your files will upload to that theme!
//        (local branches will default to dev theme)
//
// =================================================

// ------------------
//      MODULES
// ------------------

var gulp = require("gulp"),
  jshint = require("gulp-jshint"),
  concat = require("gulp-concat"),
  stripDebug = require("gulp-strip-debug"),
  sass = require("gulp-sass"),
  notify = require("gulp-notify"),
  gutil = require("gulp-util"),
  rename = require("gulp-rename"),
  size = require("gulp-filesize"),
  autoprefixer = require("autoprefixer"),
  postCss = require("gulp-postcss"),
  mqPacker = require("css-mqpacker"),
  pxToRem = require("postcss-pxtorem"),
  sourceMaps = require("gulp-sourcemaps"),
  doiuse = require("doiuse"),
  cssNano = require("gulp-cssnano"),
  browserSync = require("browser-sync").create(),
  shell = require("gulp-shell"),
  filter = require("gulp-filter"),
  watch = require("gulp-watch"),
  cacheBuster = require("postcss-cachebuster"),
  mkdirp = require("mkdirp"),
  gitStatus = require("git-rev-sync"),
  fs = require("fs"),
  babel = require("gulp-babel"),
  git_branch = "";

// ------------------
//      SETUP
// ------------------

var clientName = "", // Client name, appened to generated files.
  projectName = clientName.toLowerCase().replace(/\s/g, "-"),
  url = "", // myshopify URL
  jsfiles = [
    // 'src/js/libs/jquery-2.1.4.min.js',
    "src/js/libs/*.js",
    "src/js/libs/pdhq/*.js",
    "src/js/base/define.js",
    "src/js/modules/**/*.js",
    "src/js/base/router.js"
  ],
  devProcessors = [
    autoprefixer(),
    pxToRem({ rootValue: 16, replace: true, mediaQuery: true }),
    cacheBuster({ cssPath: "/assets", type: "mtime" })
  ],
  prodProcessors = [
    pxToRem({ rootValue: 16, replace: true, mediaQuery: true }),
    // mqPacker({sort: true}),
    cacheBuster({ cssPath: "/assets", type: "mtime" })
  ];

// ------------------
//      TASKS
// ------------------

// JS ---------------

gulp.task("js:hint", function() {
  gutil.log(gutil.colors.blue("--> Validating JS "));
  gulp
    .src(["src/js/base/*.js", "src/js/modules/*.js"])
    .pipe(jshint())
    .pipe(
      notify(function(file) {
        return file.jshint.success ? false : file.relative + " has errors!";
      })
    )
    .pipe(jshint.reporter("jshint-stylish", { verbose: true }));
});
gulp.task("js:concat", ["git_check"], function() {
  var environment = "development";
  getBranch(environment);
  gutil.log(gutil.colors.blue("--> Concatenating JS "));
  gulp
    .src(jsfiles)
    .pipe(concat(projectName + ".min.js"))
    .pipe(gulp.dest("assets/"))
    .pipe(size())
    .pipe(
      shell(["theme upload <%= f(file.path) %>"], {
        templateData: {
          f: function(s) {
            // cut away absolute path of working dir for 'theme' cmd to work. Windows: `\\`, Mac: `/`
            return (
              "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
            );
          }
        },
        verbose: true
      })
    )
    .pipe(browserSync.stream())
    .pipe(notify({ title: clientName + " JS", message: "Browser Refreshed" }));
});
gulp.task("js:minify", ["git_check"], function() {
  var environment = "development";
  getBranch(environment);
  gutil.log(gutil.colors.blue("--> Minifying JS...Automate and chill :)"));
  gulp
    .src(jsfiles)
    .pipe(concat(projectName + ".min.js"))
    .pipe(stripDebug())
    .pipe(babel({ presets: ["babili"] }))
    .pipe(gulp.dest("assets/"))
    .pipe(size())
    .pipe(
      shell(["theme upload <%= f(file.path) %>"], {
        templateData: {
          f: function(s) {
            return (
              "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
            );
          }
        },
        verbose: true
      })
    )
    .pipe(notify({ title: clientName + " JS", message: "Uglified" }));
});

// CSS --------------

gulp.task("css:postsass", ["git_check"], function() {
  var environment = "development";
  getBranch(environment);
  gutil.log(gutil.colors.blue("--> Compiling CSS "));
  gulp
    .src("src/css/scss/*.scss")
    .pipe(sourceMaps.init())
    .pipe(sass().on("error", sassError))
    .pipe(postCss(devProcessors))
    .pipe(size())
    .pipe(sourceMaps.write())
    .pipe(rename(projectName + ".min.css"))
    .pipe(gulp.dest("assets/"))
    .pipe(
      shell(["theme upload <%= f(file.path) %> --force"], {
        templateData: {
          f: function(s) {
            return (
              "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
            );
          }
        },
        verbose: true
      })
    )
    .pipe(browserSync.stream())
    .pipe(notify({ title: clientName + " CSS", message: "CSS Refreshed" }));
});
gulp.task("css:post_build", ["git_check"], function() {
  var environment = "development";
  getBranch(environment);
  gutil.log(gutil.colors.blue("--> Making CSS Smaller "));
  gulp
    .src("src/css/scss/*.scss")
    .pipe(sass().on("error", sassError))
    .pipe(postCss(prodProcessors))
    .pipe(cssNano({ autoprefixer: { add: true }, zindex: false }))
    .pipe(rename(projectName + ".min.css"))
    .pipe(size())
    .pipe(gulp.dest("assets/"))
    .pipe(
      shell(["theme upload <%= f(file.path) %>"], {
        templateData: {
          f: function(s) {
            return (
              "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
            );
          }
        },
        verbose: true
      })
    )
    .pipe(notify({ title: clientName + " CSS", message: "CSS Refreshed" }));
});

// GIT --------------

gulp.task("git_check", function() {
  var current_branch = gitStatus.branch();
  console.log(current_branch);
  git_branch = current_branch;
  return current_branch;
});

// LIQUID -----------

var filterChanged = filter(isChanged),
  filterDeleted = filter(isDeleted),
  watchSrc = [
    "assets/**/*",
    "config/*",
    "!assets/*.min.js",
    "!assets/*.min.css",
    "layout/**/**.*",
    "snippets/**/**.*",
    "sections/**/**.*",
    "templates/**/**.*"
  ];

gulp.task("theme:upload", ["git_check"], function() {
  var environment = "development";
  getBranch(environment);
  gulp
    .src(watchSrc)
    .pipe(watch(watchSrc))
    .pipe(filterChanged)
    .pipe(
      shell(["theme upload <%= f(file.path) %>"], {
        templateData: {
          f: function(s) {
            return (
              "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
            );
          }
        },
        verbose: true
      })
    )
    .pipe(browserSync.stream({ injectChanges: false }))
    .pipe(notify({ title: "File Uploaded", message: "Browser Refreshed" }));
});
gulp.task("theme:delete", function() {
  gulp
    .src(watchSrc)
    .pipe(watch(watchSrc))
    .pipe(filterDeleted)
    .pipe(
      shell(["theme remove <%= f(file.path) %>"], {
        templateData: {
          f: function(s) {
            return s.replace(process.cwd() + "/", "");
          }
        }
      })
    )
    .pipe(browserSync.stream({ injectChanges: false }))
    .pipe(notify({ title: "File Removed", message: "Browser Refreshed" }));
});

// ------------------
//      HELPERS
// ------------------

function sassError(err) {
  gutil.log(gutil.colors.bold.white.bgRed("\n \n [SASS] ERROR \n"));
  console.error("", err.message);
  return notify({
    title: "Sass Error",
    message: "Error on line " + err.line + " of " + err.file
  }).write(err);
}

function getBranch(env) {
  if (git_branch === "master") {
    env = "production";
  } else if (git_branch === "staging") {
    env = "staging";
  }
  console.log("Git Branch: " + env);
  return env;
}

function isChanged(file) {
  return file.event === "change" || file.event === "add";
}

function isDeleted(file) {
  return file.event === "unlink";
}

// ------------------
//      PROCESSES
// ------------------

gulp.task(
  "default",
  ["git_check", "js:hint", "js:concat", "css:postsass", "theme:upload"],
  function() {
    fs.readFile("config.yml", "utf-8", function(err, _data) {
      // Development theme ID
      var themeId = /\d+/.exec(
        /development:(\s+)theme_id:(\s)([0-9]+)/.exec(_data)
      );
      browserSync.init({
        port: 3000,
        https: true,
        proxy: url + "?preview_theme_id=" + themeId,
        open: false, // Turn on if you are lazy and don't want to navigate to the page url
        xip: false,
        injectChanges: true,
        ghostMode: {
          clicks: true, //sync all devices under the same network :) @JW
          forms: true,
          scroll: true
        },
        ghostMode: true // switch all off
      });
    });
    // watch for changes in src
    gulp.watch("src/js/**/*.js", ["git_check", "js:hint", "js:concat"]);
    gulp.watch("src/css/scss/**/*.scss", ["git_check", "css:postsass"]);
  }
);
gulp.task("build", ["js:minify", "css:post_build"], function() {
  gulp.src([projectName + ".min.css", projectName + ".min.js"]).pipe(
    shell(["theme upload <%= f(file.path) %>"], {
      templateData: {
        f: function(s) {
          console.log("s: ", s);
          return (
            "--env=" + environment + " " + s.replace(process.cwd() + "/", "")
          );
        }
      },
      verbose: true
    })
  );
  gulp.src("gulpfile.js").pipe(
    notify({
      title: "Build Scripts",
      message: "Finished!"
    })
  );
});
