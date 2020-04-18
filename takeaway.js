// Takeout MAP with everyone Licence: MIT
"use strict";

// Global Variable
var map, gl, hash, glot;        // leaflet系(map, gl, hash) 翻訳(glot)
var LL = {}, Conf = {}          // latlng,Config

// consts
const MoreZoomMsg = "ズームすると店舗が表示されます。";
const OvGetError = "サーバーからのデータ取得に失敗しました。やり直してください。";
// const OvServer = 'https://overpass.kumi.systems/api/interpreter' // or 'https://overpass-api.de/api/interpreter' or 'https://overpass.nchc.org.tw/api/interpreter'
const OvServer = 'https://overpass.nchc.org.tw/api/interpreter'
const FILES = ['modals.html', 'data/category-ja.json', 'data/datatables-ja.json', 'data/local.json'];

$(document).ready(function () {

    console.log("Welcome to Takeaway.");

    // Load Conf file
    let jqXHRs = [];
    for (let key in FILES) { jqXHRs.push($.get(FILES[key])) };
    $.when.apply($, jqXHRs).always(function () {
        // initialize variable
        $("#Modals").html(arguments[0][0]);
        for (let idx = 1; idx <= 3; idx++) {
            let arg = arguments[idx][0];
            Object.keys(arg).forEach(key1 => {
                Conf[key1] = {};
                Object.keys(arg[key1]).forEach((key2) => Conf[key1][key2] = arg[key1][key2]);
            });
        };
        DisplayStatus.window_resize();      // Set Window Size
        DisplayStatus.splash(true);         // Splash Screen
        DisplayStatus.make_menu();          // Menu
        DataList.init();

        // initialize leaflet
        console.log("initialize leaflet.");
        map = L.map('mapid', { center: Conf.local.DefaultCenter, zoom: Conf.local.DefaultZoom, maxZoom: 20 });
        gl = L.mapboxGL({ container: 'map', attribution: Conf.local.attribution, accessToken: 'no-token', style: Conf.local.style }).addTo(map);
        map.zoomControl.setPosition("bottomright");
        L.control.locate({ position: 'bottomright', locateOptions: { maxZoom: 16 } }).addTo(map);
        L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

        // translation
        glot = new Glottologist();
        glot.import("./data/glot.json").then(() => { glot.render() });

        // 引数を元にマップの初期状態を設定
        if (location.hash == "") {      // 緯度経度が無い場合
            hash = new L.Hash(map);
            Marker.event_move();
        } else {
            hash = new L.Hash(map);
        };

        // イベント登録
        $(window).resize(DisplayStatus.window_resize);      // 画面サイズに合わせたコンテンツ表示切り替え
        map.on('moveend', Marker.event_move);               // マップ移動時の処理
        map.on('zoomend', function (e) {                    // ズーム時のメッセージ表示
            let msg = map.getZoom() < Conf.local.MinZoomLevel ? MoreZoomMsg : "";
            DisplayStatus.morezoom(msg);
        });

        // スタイル不足時のエラー回避
        map.on('styleimagemissing', function (e) {
            var id = e.id,
                prefix = 'square-rgb-';
            if (id.indexOf(prefix) !== 0) return;
            var rgb = id.replace(prefix, '').split(',').map(Number);
            var width = 1,
                bytesPerPixel = 1;
            var data = new Uint8Array(width * width * bytesPerPixel);
            for (var x = 0; x < width; x++) {
                for (var y = 0; y < width; y++) {
                    var offset = (y * width + x) * bytesPerPixel;
                    data[offset + 0] = rgb[0]; // red
                    data[offset + 1] = rgb[1]; // green
                    data[offset + 2] = rgb[2]; // blue
                    data[offset + 3] = 0; // alpha
                }
            }
            map.addImage(id, { width: width, height: width, data: data });
        });
    });
});

var Takeaway = (function () {

    var _status = "initialize";
    const OUTSEETS = ["yes", "no"]; // outseetタグ用
    const RegexPTN = [[/Mo/g, "月"], [/Tu/g, "火"], [/We/g, "水"], [/Th/g, "木"], [/Fr/g, "金"],
    [/Sa/g, "土"], [/Su/g, "日"], [/;/g, "<br>"], [/PH/g, "祝日"], [/off/g, "休業"], [/24\/7/g, "24時間営業"]];

    return {
        status: () => { return _status }, // ステータスを返す
        get: function (keys, callback) { // 情報（アイコンなど）を地図に追加
            console.log("Takeaway: get start...");
            _status = "get";
            var targets = [];
            if (keys == undefined || keys == "") {
                for (let key in Conf.target) targets.push(key);
            } else {
                targets = keys;
            };
            if (map.getZoom() < Conf.local.MinZoomLevel) {
                console.log("Takeaway: get end(Conf.local.MinZoomLevel).");
                Takeaway.update();
                callback();
            } else {
                OvPassCnt.get(targets).then(ovanswer => {
                    PoiCont.set(ovanswer);
                    Takeaway.update();
                    console.log("Takeaway: get end.");
                    callback();
                }).catch((jqXHR, statusText, errorThrown) => {
                    console.log("Takeaway: get Error. " + statusText);
                    Takeaway.update();
                    callback();
                });
            }
        },

        // Update Takeout Map Icon
        update: targetkey => {
            let ZoomLevel = map.getZoom();
            if (targetkey == "" || typeof (targetkey) == "undefined") { // no targetkey then update all layer
                for (let target in Conf.target) {
                    Marker.all_delete(target);
                    if (Conf.target[target].zoom <= ZoomLevel) Marker.set(target);
                }
            } else {
                Marker.all_delete(targetkey);
                if (Conf.target[targetkey].zoom <= ZoomLevel) Marker.set(targetkey);
            }
            _status = "";
        },

        view: osmid => {
            _status = "view";
            DataList.select(osmid);
            let poi = PoiCont.get_osmid(osmid);
            let tags = poi.geojson.properties;
            osmid = osmid.replace('/', "-");
            history.replaceState('', '', location.pathname + "?" + osmid + location.hash);

            $("#osmid").html(tags.id);
            $("#name").html(tags.name == null ? "-" : tags.name);
            $("#category-icon").attr("src", tags.takeaway_icon);
            $("#category").html(PoiCont.get_catname(tags));

            let openhour;
            if (tags["opening_hours:covid19"]) {
                openhour = tags.opening_hours;
            } else {
                openhour = tags.opening_hours == null ? "-" : tags.opening_hours;
            }
            RegexPTN.forEach(val => { openhour = openhour.replace(val[0], val[1]) });
            if (tags["opening_hours:covid19"]) { openhour += Conf.category.suffix_covid19 }
            $("#opening_hours").html(openhour);

            let delname;
            if (tags["delivery:covid19"] != null) {
                delname = Conf.category.delivery[tags["delivery:covid19"]] + Conf.category.suffix_covid19;
            } else {
                delname = tags.delivery == null ? "-" : Conf.category.delivery[tags.delivery];
            }
            $("#delivery").html(delname);

            let outseet = OUTSEETS.indexOf(tags.outdoor_seating) < 0 ? "-" : tags.outdoor_seating;
            $("#outdoor_seating").html(outseet);
            if (outseet !== "-") $("#outdoor_seating").attr("glot-model", "outdoor_seating_" + outseet);

            $("#phone").attr('href', tags.phone == null ? "" : "tel:" + tags.phone);
            $("#phone_view").html(tags.phone == null ? "-" : tags.phone);

            let fld = {};
            fld.website = tags["contact:website"] == null ? tags["website"] : tags["contact:website"];
            fld.sns_instagram = tags["contact:instagram"] == null ? tags["instagram"] : tags["contact:instagram"];
            fld.sns_twitter = tags["contact:twitter"] == null ? tags["twitter"] : tags["contact:twitter"];
            fld.sns_facebook = tags["contact:facebook"] == null ? tags["facebook"] : tags["contact:facebook"];
            Object.keys(fld).forEach(function (key) {
                if (fld[key] == null) {
                    $("#" + key).hide();
                } else {
                    $("#" + key).show();
                };
            });

            $("#description").html(tags.description == null ? "-" : tags.description);

            glot.render();
            $('#PoiView_Modal').modal({ backdrop: 'static', keyboard: true });

            let hidden = e => {
                _status = "";
                history.replaceState('', '', location.pathname + location.hash);
                $('#PoiView_Modal').modal('hide');
            };
            $('#PoiView_Modal').one('hidePrevented.bs.modal', hidden);
            $('#PoiView_Modal').one('hidden.bs.modal', hidden);
        },

        openmap: osmid => {
            let poi = PoiCont.get_osmid(osmid);
            let tags = poi.geojson.properties;
            let ll = poi.latlng;
            let name = tags.name == undefined ? "" : "search/" + tags.name + "/";
            window.open('https://www.google.com/maps/' + name + "@" + ll.lat + ',' + ll.lng + ',' + map.getZoom() + 'z');
        },

        opensite: (osmid, key) => {
            let tags = PoiCont.get_osmid(osmid).geojson.properties;
            let address = tags["contact:" + key] == undefined ? tags[key] : tags["contact:" + key];
            let http = address.substr(0, 4) == "http" ? true : false;
            switch (key) {
                case "website":
                case "facebook":
                    break;
                case "twitter":
                    if (!http) address = "https://twitter.com/" + address;
                    break;
                case "instagram":
                    if (!http) address = "https://www.instagram.com/" + address;
                    break;
            }
            if (address !== "") window.open(address);
        },

        sharemap: osmid => {
            let _osmid = osmid.replace('/', "-");
            let cpboard = location.origin + location.pathname + "?" + _osmid + location.hash;
            $(document.body).append("<textarea id=\"copyTarget\" style=\"position:absolute; left:-9999px; top:0px;\">" + cpboard + "</textarea>");
            let obj = document.getElementById("copyTarget");
            let range = document.createRange();
            range.selectNode(obj);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            $("#copyTarget").remove();
        }
    }
})();
