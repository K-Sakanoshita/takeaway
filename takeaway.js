// Takeout MAP with everyone Licence: MIT
"use strict";

// Global Variable
var map, gl, hash, glot;    // leaflet系(map, gl, hash) 翻訳(glot)
var PoiData = {};           // {key: {geojson,marker}}
var LL = {};                // latlng
var Config = {}              // Download Config

// consts
const MoreZoomMsg = "ズームすると店舗が表示されます。";
const OvGetError = "サーバーからのデータ取得に失敗しました。やり直してください。";
const OvServer = 'https://overpass.kumi.systems/api/interpreter' // or 'https://overpass-api.de/api/interpreter' or 'https://overpass.nchc.org.tw/api/interpreter'
//const OvServer = 'https://overpass.nchc.org.tw/api/interpreter'
const FILES = ['modals.html', 'data/category-ja.json', 'data/datatables-ja.json', 'data/local.json'];
const OverPass = {
    TAK: ['node["takeaway"!="no"]["takeaway"]', 'way["takeaway"!="no"]["takeaway"]'],
    DEL: ['node["delivery"!="no"]["delivery"]', 'way["delivery"!="no"]["delivery"]'],
    DEF: ['node["shop"="bakery"]', 'way["shop"="bakery"]'],
    VND: ['node["amenity"="vending_machine"]["vending"="drinks"]'],
    LIB: ['node["amenity"="library"]', 'way["amenity"="library"]'],
};

const Defaults = { // 制御情報の保管場所
    TAK: { zoom: 15, icon: "./image/bentou.svg" },
    DEL: { zoom: 15, icon: "./image/delivery.svg" },
    DEF: { zoom: 15, icon: "./image/bentou.svg" },
    VND: { zoom: 17, icon: "./image/vending.svg" },
    LIB: { zoom: 15, icon: "./image/library.svg" },
};
const DataList_Targets = ["TAK", "DEL", "DEF", "LIB"];     // リストに掲載する対象(自販機は無し)

$(document).ready(function () {

    console.log("Welcome to Takeaway.");
    for (let key in Defaults) PoiData[key] = {};        // init variable

    // Load Config file
    let jqXHRs = [];
    for (let key in FILES) { jqXHRs.push($.get(FILES[key])) };
    $.when.apply($, jqXHRs).always(function () {
        $("#Modals").html(arguments[0][0]);
        for (let idx = 1; idx <= 3; idx++) {
            let arg = arguments[idx][0];
            Object.keys(arg).forEach(key1 => {
                Config[key1] = {};
                Object.keys(arg[key1]).forEach((key2) => Config[key1][key2] = arg[key1][key2]);
            });
        };

        DisplayStatus.window_resize();      // set Window Size
        DisplayStatus.splash(true);         // Splash Top
        DisplayStatus.make_menu();          // Splash Top
        DataList.init();

        // initialize leaflet
        console.log("initialize leaflet.");
        map = L.map('mapid', { center: Config.local.DefaultCenter, zoom: Config.local.DefaultZoom, maxZoom: 20 });
        gl = L.mapboxGL({ container: 'map', attribution: Config.local.attribution, accessToken: 'no-token', style: Config.local.style }).addTo(map);
        map.zoomControl.setPosition("bottomright");
        L.control.locate({ position: 'bottomright', strings: { title: "現在地を表示" }, locateOptions: { maxZoom: 16 } }).addTo(map);
        L.control.scale({ imperial: false, maxWidth: 200 }).addTo(map);

        // 翻訳
        glot = new Glottologist();
        glot.import("./data/glot.json").then(() => { glot.render() }); // translation

        // 引数の位置情報を元にマップを移動
        if (location.hash == "") { // 引数が無い場合
            hash = new L.Hash(map);
            Marker.event_move();
        } else {
            hash = new L.Hash(map);
        }

        // イベント登録
        // 画面サイズに合わせたコンテンツ表示切り替え
        $(window).resize(DisplayStatus.window_resize);

        // マップ移動時の処理
        map.on('moveend', Marker.event_move);

        // ズーム時のメッセージ表示
        map.on('zoomend', function (e) {
            if (map.getZoom() < Config.local.MinZoomLevel) {
                DisplayStatus.morezoom(MoreZoomMsg);
            } else {
                DisplayStatus.morezoom("");
            }
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