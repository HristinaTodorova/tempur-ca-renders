(function () {
    'use strict';

    var Utils = function () {
        this.retries = 0;
        this.timeout = 100;
    };

    Utils.prototype = {
        baseAjax: function (params) {
            //url, callback, formatData, errorCallback
            var self = this;
            var xhr = new XMLHttpRequest();
            var mime = params.mime ? params.mime : "application/json"
            xhr.overrideMimeType(mime);
            xhr.open('GET', params.url, true);
            xhr.onload = function () {
                if (xhr.status === 200) {
                    var data = params.formatData ? params.formatData(xhr.responseText) : xhr.responseText;
                    if (data.length > 0) {
                        return params.callback(data);
                    } else {
                        console.error('Error retrieving data', xhr.responseText);
                        return params.callback(false);
                    }
                }

                else {
                    if (self.retries < 9) {
                        setTimeout(function () {
                            params.errorCallback(xhr.status);
                            self.timeout *= 2;
                            self.retries += 1;
                        }, self.timeout);
                    }
                    else {
                        console.error('Error retrieving data', xhr.responseText);
                    }
                }
            };
            xhr.onerror = function () {
                console.error('Error xhr request');
            };
            xhr.send(null);
        },
        getCaData: function (params) {
            var self = this;
            var retries = 0;

            var url = params.url ? params.url
                : encodeURI(params.auth.baseUrl + '/cms/content/query?fullBodyObject=true&scope=tree&store=' +
                    params.auth.store + '&query={"sys.iri":"http://content.cms.amplience.com/' +
                    params.auth.id + '"}&v=' + Date.now());

            return this.baseAjax({
                url: url,

                callback: function (data) {
                    params.callback(data);
                },
                errorCallback: function () {
                    self.getCaData(params);
                },
                formatData: function (data) {
                    return (params.formatData ? params.formatData(data) : data);
                }
            });
        },
        postProcessing: {
            exec: function(renderName, params) {
                var self = this;
                self.dependencies[renderName].forEach(function (fixName) {
                    self.handlers[fixName](params);
                });
            },
            dependencies: {
                slider: ['fixVideoButton', 'fixAndroidSwipeOverTheVideo'],
                video: ['fixVideoButton'],
                splitBlock: ['fixVideoButton'],
                blog: ['fixVideoButton'],
                homepage: ['fixVideoButton','fixAndroidSwipeOverTheVideo'],
            },
            handlers: {
                fixAndroidSwipeOverTheVideo: function () {
                    if (navigator.userAgent.match(/Android/i)) {
                        var videos = document.querySelectorAll('.amp-ca-slider .amp-ca-video');
                        videos = Array.prototype.slice.call(videos, 0);
                        videos.forEach(function (video, ix) {
                            var overlay = document.createElement('div');
                            overlay.style.width = video.clientWidth + 'px';
                            overlay.style.height = video.clientHeight - 30 + 'px';
                            overlay.style.marginBottom = -video.clientHeight + 30 + 'px';
                            overlay.className = 'inactive-video';
                            video.parentNode.parentNode.insertBefore(overlay, video.parentNode);
                            overlay.addEventListener('click', function () {
                                overlay.classList.add('no-overlay');
                                video.play();
                            });
                            video.addEventListener('pause', function(){
                                overlay.classList.remove('no-overlay');
                            });
                            window.addEventListener('resize', function () {
                                overlay.style.width = video.clientWidth + 'px';
                                overlay.style.height = video.clientHeight - 30 + 'px';
                                overlay.style.marginBottom = -video.clientHeight + 30 + 'px';
                            });
                        });

                    }
                },
                fixVideoButton: function(){
                    var videos = document.querySelectorAll('.amp-ca-video');
                    videos = Array.prototype.slice.call(videos,0);
                    var pauseButtons = document.querySelectorAll('.pause-button');
                    pauseButtons = Array.prototype.slice.call(pauseButtons,0);
                    var ev = 'click';
                    if(navigator.userAgent.match(/(iPad)|(iPhone)|(Android)/i)) {
                        ev = 'touchstart';
                    } else {
                        pauseButtons.forEach(function (item) {
                            item.classList.remove('inactive');
                        });
                    }
                    if (navigator.userAgent.match(/Android/i)) {
                        videos.forEach(function (video) {
                            video.addEventListener(ev, function(){
                                var self = this; self.paused ? setTimeout(function(){self.play();},1) : setTimeout(function(){self.pause();},1);
                            });
                        });
                    } else {
                        var lock = [];
                        var lockInit = function(ix){
                            lock[ix] = true;
                            setTimeout(function(){
                                lock[ix] = false;
                            },200);
                        };
                        videos.forEach(function (video, ix) {
                            lock[ix] = false;
                            video.addEventListener(ev, (function(){
                                return function () {
                                    if (!lock[ix]) {
                                        if (videos[ix].paused) {
                                            lockInit(ix);
                                            setTimeout(function(){
                                                videos[ix].paused ? videos[ix].play() : '';
                                            },200);
                                        } else {
                                            lockInit(ix);
                                            setTimeout(function(){
                                                videos[ix].pause();
                                            },200);
                                        }
                                    }
                                };
                            })(ix));
                            video.addEventListener('pause', function () {
                                    pauseButtons[ix].classList.remove('inactive');
                            });
                            video.addEventListener('play', function () {
                                    pauseButtons[ix].classList.add('inactive');

                            });
                            pauseButtons[ix].addEventListener(ev, function () {
                                    if (!lock[ix]) {
                                        videos[ix].paused ? setTimeout(function(){videos[ix].play();},1) : setTimeout(function(){videos[ix].pause();},1);
                                        lockInit(ix);
                                    }

                            });
                        });
                    }
                },
            }
        },
        constructor: Utils
    };

    window.AmpCa = window.AmpCa || {};
    window.AmpCa.Utils = Utils;
})();

/*===========================
 Utils AMD Export
 ===========================*/
if (typeof(module) !== 'undefined')
{
    module.exports = window.AmpCa.Utils;
}
else if (typeof define === 'function' && define.amd) {
    define([], function () {
        'use strict';
        return window.AmpCa.Utils;
    });
}
