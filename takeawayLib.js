"use strict";

// PoiData Control
var PoiCont = (function () {
    var PoiData = { geojson: [], targets: [] };     // OvPassの応答(features抜き)と対象Keyの保存
    var latlngs = {};                               // 緯度経度  osmid: {lat,lng}
    var geoidx = {};                                // osmidからgeojsonのindexリスト

    return {
        // save answer from PvServer(geojson and target keys)
        set: function (pois) {      // pois: {geojson: [],targets: []}
            PoiData = { geojson: pois.geojson, targets: pois.targets };
            PoiData.geojson.forEach(function (node, node_idx) {
                if (node.geometry.type == "Polygon") {
                    latlngs[node.id] = { "lat": node.geometry.coordinates[0][0][1], "lng": node.geometry.coordinates[0][0][0] };
                } else {
                    latlngs[node.id] = { "lat": node.geometry.coordinates[1], "lng": node.geometry.coordinates[0] };
                }
                geoidx[node.id] = node_idx;
            });
        },
        get_target: function (targets) {        // 指定したtargetのgeojsonと緯度経度を返す
            return poi_filter(targets);
        },
        get_osmid: function (osmid) {           // osmidを元にgeojsonと緯度経度、targetを返す
            let idx = geoidx[osmid];
            return { geojson: PoiData.geojson[idx], latlng: latlngs[osmid], target: PoiData.targets[idx] };
        },
        get_catname: function (tags) {          // get Category Name from Conf.category(Global Variable)
            let catname = "";
            let key1 = tags.amenity == undefined ? "shop" : "amenity";
            let key2 = tags[key1] == undefined ? "" : tags[key1];
            if (key2 !== "") {                  // known tags
                catname = Conf.category[key1][key2];
                if (catname == undefined) catname = "";
            }
            return catname;
        },
        list: function (targets) {              // DataTables向きのJsonデータリストを出力
            let pois = poi_filter(targets);     // targetsに指定されたpoiのみフィルター
            let datas = [];
            let _7DaysAgo = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 7); //更新一週間以内のデータには印を付加する
            let update = "<span class='text-danger'>" + glot.get("list_update") + "</span>";
            let bookmarkFalse = "<span>☆</span>";
            pois.geojson.forEach((node, idx) => {
                let tags = node.properties;
                let name = (tags.name == undefined ? "-" : tags.name) + 
                    (tags.branch == undefined ? "" : " " + tags.branch) + 
                    (_7DaysAgo < new Date(tags.timestamp) ? update : '');
                let category = PoiCont.get_catname(tags);
                let between = Math.round(PoiCont.calc_between(latlngs[tags.id], map.getCenter()));
                let target = pois.targets[idx].join(',');
                const bookmarked = bookmark.isBookmarked(tags.id);
                const bookmarkLabel = "<span id='bm_2" + tags.id + "' bookmark='" + bookmarked +
                    "' osmid='" + tags.id + "' ' onclick='bookmark.toggle(this)'>" + (bookmarked ? "★":"☆") + "</span>";
                datas.push({ "osmid": tags.id, "bookmark": bookmarkLabel, "name": name, 
                    "category": category, "between": between, "target": target });
            });
            datas.sort((a, b) => {
                if (a.between > b.between) {
                    return 1;
                } else {
                    return -1;
                }
            });
            return datas;
        },
        calc_between: function (ll1, ll2) {         // 2点間の距離を計算(参考: https://qiita.com/chiyoyo/items/b10bd3864f3ce5c56291)
            let pi = Math.PI, r = 6378137.0;        // πと赤道半径
            let radLat1 = ll1.lat * (pi / 180);     // 緯度１
            let radLon1 = ll1.lng * (pi / 180);     // 経度１
            let radLat2 = ll2.lat * (pi / 180);     // 緯度２
            let radLon2 = ll2.lng * (pi / 180);     // 経度２
            let averageLat = (radLat1 - radLat2) / 2;
            let averageLon = (radLon1 - radLon2) / 2;
            return r * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(averageLat), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(averageLon), 2)));
        }
    }

    // targetsに指定されたpoiのみフィルター
    function poi_filter(targets) {
        let tars = [];
        let pois = PoiData.geojson.filter(function (geojson_val, geojson_idx) {
            let found = false;
            for (let target_idx in PoiData.targets[geojson_idx]) {
                if (targets.includes(PoiData.targets[geojson_idx][target_idx])) {
                    found = true;
                    break;
                };
            };
            if (found) tars.push(PoiData.targets[geojson_idx]);
            return found;
        });
        let lls = [];
        pois.forEach(function (node, idx) {
            lls.push(latlngs[node.properties.id]);
        });
        return { geojson: pois, latlng: lls, targets: tars };
    };
})();
const STORAGE_KEY_BOOKMARK = 'takeaway_bookmarks';
class Bookmark {
    load () {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_BOOKMARK);
            this.bookmarks = (saved == null) ? [] : saved.split(","); // List of OSM IDs
            console.log("Bookmark");
            console.log(saved);
        } catch (e) {
            this.bookmarks = [];
            alert("Sorry, your browser does not support local storage.");
        }
    }
    isBookmarked (osmId) {
        return this.bookmarks.indexOf(osmId) > -1;
    }
    toggle (sender) {
        const osmId = sender.getAttribute("osmid");
        let bookmarked = sender.getAttribute("bookmark") =='true';
        bookmarked = !bookmarked;
        sender.innerHTML = (bookmarked) ? "★" : "☆";
        if (bookmarked) {
            this.add(osmId);
        } else {
            this.remove(osmId);
        }
        this.save();
    }
    add (osmId) {
        if (!this.isBookmarked(osmId)) {
            this.bookmarks.push(osmId);
        }
    }
    remove (osmId) {
        const index = this.bookmarks.indexOf(osmId);
        if (index > -1) {
            this.bookmarks.splice(index, 1);
        }
    }
    save () {
        try {
            localStorage.setItem(STORAGE_KEY_BOOKMARK, this.bookmarks.join(","));
        } catch (e) {
            alert("Sorry, your browser does not support local storage.");
        }
    }
}
const bookmark = new Bookmark();
bookmark.load();

// make Marker
var Marker = (function () {
    var PointUp = { radius: 8, color: '#000080', fillColor: '#0000A0', Opacity: 0.1, fillOpacity: 0.1 };
    var markers = [];

    return {
        set: function (target) {
            markers[target] = [];
            let pois = PoiCont.get_target(target);
            if (pois.geojson !== undefined) {
                pois.geojson.forEach(function (node, idx) {
                    let html;
                    let tags = node.properties;
                    let name = tags.name == undefined || Conf.local.TextViewZoom > map.getZoom() ? "" : tags.name;
                    let keyn = tags.amenity !== undefined ? "amenity" : "shop";
                    let icon = Conf.icon[keyn][tags[keyn]];
                    icon = "./image/" + (icon !== undefined ? icon : Conf.icon.default);
                    tags.takeaway_icon = icon;   // icon情報を埋め込み(詳細情報表示で利用)
                    switch (name) {
                        case "":
                            html = '<img class="icon" src="' + icon + '">'
                            break;
                        default:
                            html = '<div class="d-flex align-items-center"><img class="icon" src="' + icon + '"><span class="icon">' + name + '</span></div>'
                            break;
                    }
                    icon = L.divIcon({ "className": 'icon', "iconAnchor": [8, 8] , "html": html});
                    markers[target].push(L.marker(new L.LatLng(pois.latlng[idx].lat, pois.latlng[idx].lng), { icon: icon, draggable: false }));
                    markers[target][markers[target].length - 1].addTo(map).on('click', e => Takeaway.view(e.target.takeaway_id));
                    markers[target][markers[target].length - 1].takeaway_id = tags.id;
                });
            }
        },

        all_delete: function (target) { // all delete
            if (markers[target] !== undefined) {
                markers[target].forEach(marker => map.removeLayer(marker));
                // markers[target].forEach(marker => marker.remove(map));
                markers[target] = [];
            }
        },

        center: (osmid) => {
            map.panTo(PoiCont.get_osmid(osmid).latlng, { animate: true, easeLinearity: 0.1, duration: 0.5 });
            PointUp.radius = Math.pow(2, 21 - map.getZoom());
            let circle = L.circle(PoiCont.get_osmid(osmid).latlng, PointUp).addTo(map);
            setTimeout(() => map.removeLayer(circle), 2000);
        }
    }
})();

// PoiDatalist管理
var DataList = (function () {
    var table, _status = "", _lock = false, timeout = 0

    return {
        status: () => { return _status }, // statusを返す
        table: () => { return table }, // tableを返す
        lock: mode => { _lock = mode }, // DataListをロック(true) or 解除(false)とする
        init: () => { // DataListに必要な初期化
            // キーワード検索機能
            let keyword = document.getElementById("keyword");
            keyword.addEventListener("input", (e) => {
                if (timeout > 0) {
                    window.clearTimeout(timeout);
                    timeout = 0;
                };
                timeout = window.setTimeout(() => DataList.filter(e.target.value), 500);
            });

            // デリバリー選択肢にキーワード追加
            DisplayStatus.clear_select("delivery_list");
            DisplayStatus.add_select("delivery_list", Conf.category.delivery.yes, "delivery");
            let delivery_list = document.getElementById("delivery_list");
            delivery_list.addEventListener("change", (e) => {
                let keyword = e.target.value == "-" ? "" : e.target.value;
                table.column(3).search(keyword).draw();
            });

            // カテゴリ選択時にキーワード検索
            let category_list = document.getElementById("category_list");
            category_list.addEventListener("change", (e) => {
                let keyword = e.target.value == "-" ? "" : e.target.value;
                DataList.filter(keyword);
            });
        },
        make_select: result => {
            // 店舗種別リストを作成
            let shops = [];
            DisplayStatus.clear_select("category_list");
            DisplayStatus.clear_select("delivery_list");
            DisplayStatus.add_select("delivery_list", Conf.category.delivery.yes, "delivery");
            shops = result.map(data => { return data.category });
            shops = shops.filter((x, i, self) => { return self.indexOf(x) === i });
            shops.map(shop => DisplayStatus.add_select("category_list", shop, shop));
        },
        view: function (targets) { // PoiDataのリスト表示
            DataList.lock(true);
            if (table !== undefined) table.destroy();
            let result = PoiCont.list(targets);
            table = $('#tableid').DataTable({
                "autoWidth": true,
                "columns": Object.keys(Conf.datatables_columns).map(function (key) { return Conf.datatables_columns[key] }),
                "columnDefs": [{ "targets": 2, "render": $.fn.dataTable.render.number(',', '.', 0, '', 'm') }, { targets: 3, visible: false }],
                "data": result,
                "processing": true,
                "filter": true,
                "destroy": true,
                "deferRender": true,
                "dom": 't',
                "language": Conf.datatables_lang,
                "order": [2, 'asc'],
                "ordering": false,
                "orderClasses": false,
                "paging": true,
                "processing": false,
                "pageLength": 100000,
                "select": 'single',
                "scrollCollapse": true,
                "scrollY": ($("#dataid").height() - 32) + "px"
            });
            DataList.make_select(result);
            let osmid = table.row(0).data() == undefined ? undefined : table.row(0).data().osmid;
            if (osmid !== undefined) DataList.select(osmid); // osmidがあれば1行目を選択

            table.off('select');
            table.on('select', function (e, dt, type, indexes) {
                if (_lock) {
                    table.row(indexes).deselect();
                } else if (_status == "") {
                    var data = table.row(indexes).data();
                    Marker.center(data.osmid); // do something with the ID of the selected items
                }
            });
            DataList.lock(false);
        },

        select: function (osmid) { // アイコンをクリックした時にデータを選択
            _status = "select";
            table.rows().deselect();
            let datas = table.data(),
                index = 0;
            for (let i in datas) {
                if (datas[i].osmid == osmid) {
                    index = i;
                    break;
                };
            };
            if (index >= 0) {
                table.row(index).select();
                table.row(index).node().scrollIntoView(true);
            }
            _status = "";
        },
        filter: keyword => { table.search(keyword).draw() } // キーワード検索
    }
})();

// OverPass Server Control(Width easy cache)
var OvPassCnt = (function () {
    var Cache = { "geojson": [], "targets": [] };   // Cache variable
    var LLc = { "NW": { "lat": 0, "lng": 0 }, "SE": { "lat": 0, "lng": 0 } }; // latlng cache area

    return {
        get: function (targets) {
            return new Promise((resolve, reject) => {
                let ZoomLevel = map.getZoom();
                let LayerCounts = Object.keys(Conf.target).length;
                if (LL.NW.lat < LLc.NW.lat && LL.NW.lng > LLc.NW.lng &&
                    LL.SE.lat > LLc.SE.lat && LL.NW.lat < LLc.NW.lat) {
                    console.log("OvPassCnt: Cache Hit.");       // Within Cache range
                    resolve(Cache);

                } else {
                    DisplayStatus.progress(0);                  // Not With Cache range
                    Cache = { "geojson": [], "targets": [] };
                    let magni = (ZoomLevel - Conf.local.IconViewZoom) < 1 ? 0.125 : (ZoomLevel - Conf.local.IconViewZoom) / 4;
                    let offset_lat = (LL.NW.lat - LL.SE.lat) * magni;
                    let offset_lng = (LL.SE.lng - LL.NW.lng) * magni;
                    let SE_lat = LL.SE.lat - offset_lat;
                    let SE_lng = LL.SE.lng + offset_lng;
                    let NW_lat = LL.NW.lat + offset_lat;
                    let NW_lng = LL.NW.lng - offset_lng;
                    let maparea = '(' + SE_lat + ',' + NW_lng + ',' + NW_lat + ',' + SE_lng + ');';
                    LLc = { "SE": { "lat": SE_lat, "lng": SE_lng }, "NW": { "lat": NW_lat, "lng": NW_lng } }; // Save now LL(Cache area)

                    let jqXHRs = [],
                        Progress = 0;
                    targets.forEach(key => {
                        let query = "";
                        for (let ovpass in Conf.target[key].ovpass) { query += Conf.target[key].ovpass[ovpass] + maparea; }
                        let url = OvServer + '?data=[out:json][timeout:30];(' + query + ');(._;>;);out meta qt;';
                        console.log("GET: " + url);
                        jqXHRs.push($.get(url, () => { DisplayStatus.progress(Math.ceil(((++Progress + 1) * 100) / LayerCounts)) }));
                    });
                    $.when.apply($, jqXHRs).done(function () {
                        let i = 0;
                        targets.forEach(target => {
                            let arg = arguments[0][1] == undefined ? arguments[1] : arguments[i][1];
                            if (arg !== "success") {
                                alert(OvGetError);
                                reject()
                            };
                            let osmxml = arguments[i++][0]
                            let geojson = osmtogeojson(osmxml, { flatProperties: true });
                            geojson = geojson.features.filter(node => {      // 非対応の店舗はキャッシュに載せない
                                let tags = node.properties;
                                if (PoiCont.get_catname(tags) !== "") {
                                    let result = false;
                                    switch (target) {
                                        case "takeaway":
                                            let take1 = tags.takeaway == undefined ? "" : tags.takeaway;                        // どれか一つにYesがあればOK
                                            let take2 = tags["takeaway:covid19"] == undefined ? "" : tags["takeaway:covid19"];
                                            if ([take1, take2].includes("yes")) result = true;
                                            if ([take1, take2].includes("only")) result = true;
                                            break;
                                        case "delivery":
                                            let deli1 = tags.delivery == undefined ? "" : tags.delivery;
                                            let deli2 = tags["delivery:covid19"] == undefined ? "" : tags["delivery:covid19"];
                                            if ([deli1, deli2].includes("yes")) result = true;
                                            if ([deli1, deli2].includes("only")) result = true;
                                            break;
                                        case "takeaway_shop":
                                        default:
                                            result = true
                                            break;
                                    };
                                    if (result) return node;
                                };
                            });
                            geojson.forEach(function (val1) {
                                let cidx = Cache.geojson.findIndex(function (val2) {
                                    if (val2.properties.id == val1.properties.id) return true;
                                });
                                if (cidx === -1) {                          // キャッシュが無い時は更新
                                    Cache.geojson.push(val1);
                                    cidx = Cache.geojson.length - 1;
                                };
                                if (Cache.targets[cidx] == undefined) {  // 
                                    Cache.targets[cidx] = [target];
                                } else if (Cache.targets[cidx].indexOf(target) === -1) {
                                    Cache.targets[cidx].push(target);
                                };
                            });
                        });
                        console.log("OvPassCnt: Cache Update");
                        DisplayStatus.progress(0);
                        resolve(Cache);
                    }).fail(function (jqXHR, statusText, errorThrown) {
                        console.log(statusText);
                        reject(jqXHR, statusText, errorThrown);
                    });
                };
            });
        }
    };
})();

// Display Status(progress&message)
var DisplayStatus = (function () {
    return {
        splash: (mode) => {
            $("#splash_image").attr("src", Conf.local.SplashImage);
            let act = mode ? { backdrop: 'static', keyboard: false } : 'hide';
            $('#Splash_Modal').modal(act);
        },
        make_menu: () => {
            Object.keys(Conf.menu).forEach(key => {
                $("#temp_menu>a:first").attr("href", Conf.menu[key].linkto);
                $("#temp_menu>a>span:first").attr("glot-model", Conf.menu[key]["glot-model"]);
                let link = $("#temp_menu>a:first").clone();
                $("#temp_menu").append(link);
                if (Conf.menu[key]["divider"]) $("#temp_menu>div:first").clone().appendTo($("#temp_menu"));
            });
            $("#temp_menu>a:first").remove();
            $("#temp_menu>div:first").remove();
        },

        progress: percent => {
            percent = percent == 0 ? 0.1 : percent;
            $('#Progress_Bar').css('width', parseInt(percent) + "%");
        },
        morezoom: message => {
            if (!$("#morezoom").length) {
                let morezoom = L.control({ position: "topleft" });
                morezoom.onAdd = function (map) {
                    this.ele = L.DomUtil.create('div', "morezoom");
                    this.ele.id = "morezoom";
                    return this.ele;
                };
                morezoom.addTo(map);
            };
            if (message !== "") {
                $("#morezoom").html("<h1>" + message + "</h1>");
            } else {
                $("#morezoom").html("");
            };
        },
        add_select: (domid, text, value) => {
            let option = document.createElement("option");
            option.text = text;
            option.value = value;
            document.getElementById(domid).appendChild(option);
        },
        clear_select: (domid) => {
            $('#' + domid + ' option').remove();
            $('#' + domid).append($('<option>').html("---").val("-"));
        },
        window_resize: () => {
            console.log("Window Width: " + window.innerWidth);
            let use_H, magni = window.innerWidth < 768 ? 0.7 : 1;
            switch (magni) {
                case 1: // 横画面
                    use_H = window.innerHeight - 40;
                    $("#mapid").css("height", Math.round(use_H * magni) + "px");
                    $("#dataid").css("height", (window.innerHeight - 90) + "px");
                    break;

                default: // 縦画面
                    use_H = window.innerHeight - 70;    // header + filtter height
                    let map_H = Math.round(use_H * magni);
                    let dat_H = use_H - map_H;
                    $("#mapid").css("height", map_H + "px");
                    $("#dataid").css("height", dat_H + "px");
                    break;
            };
        }
    };
})();
