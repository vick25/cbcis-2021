'use strict';
/*global L*/
/*global $*/

document.cookie = "AC-C=ac-c;expires=Fri, 31 Dec 9999 23:59:59 GMT;path=;SameSite=None;Secure";

const IPAddress = 'localhost:8700';
const rootUrl = `http://${IPAddress}/geoserver/crrebac/`;
// const rootUrl = 'https://cbcis.info:8443/geoserver/crrebac/';

var map, map2, featureList;
let isCollapsed = document.body.clientWidth <= 767 ? true : false;
let csvData, csvInfoData = [], catchmentID;
let xy = [];
let catchmentLoaded = false;
let myChart;

let basinCountriesSearch = [],
    africaSearch = [];

let gridCatchmentsData, catchID = 0,
    cbcisGrid;

const init = () => {
    const autolinker = new Autolinker({
        truncate: {
            length: 30,
            location: 'smart'
        }
    });

    const graticule = L.latlngGraticule({
        showLabel: false,
        color: '#222',
        zoomInterval: [{
            start: 2,
            end: 3,
            interval: 30
        },
        {
            start: 4,
            end: 4,
            interval: 10
        },
        {
            start: 5,
            end: 7,
            interval: 5
        },
        {
            start: 8,
            end: 10,
            interval: 1
        }
        ]
    });

    window.localStorage['defaultLanguage'] === 'en-UK' ? d3.csv('./assets/cbcis_parameters_en.csv').then(data => {
        csvData = data;
    }) : d3.csv("./assets/cbcis_parameters_fr.csv").then(data => {
        csvData = data;
    });

    d3.csv("./assets/cbcis_infos.csv").then(data => {
        data.forEach(d => {
            const { catchment,
                name,
                metadata,
                tech_note,
                pubs,
                ext_links } = d;

            csvInfoData.push({ catchment, name, metadata, tech_note, pubs, ext_links });
        });
    });

    let highlightCatchment;
    let clearHighlightCatchment = () => {
        if (highlight && cbcisGrid) {
            cbcisGrid.resetFeatureStyle(highlightCatchment);
        }
        highlightCatchment = null;
    };

    function clearHighlight() {
        highlight.clearLayers();
    }

    function translate() {
        return new Promise((resolve) => {
            $('html').lwcTranslator({
                languageSettingsFile: './assets/config/languages.json',
                languageFolderPath: './assets/config/languages/',
                attributes: {
                    textTranslation: 'data-translation',
                    attrTranslation: 'data-translation-attr'
                },
                async: true,
                paragraphSupport: true,
                defaultLanguage: window.localStorage['defaultLanguage'],
                onLanguagesLoaded: function () {
                    resolve();
                }
            });
        });
    }

    $(".leaflet-left").css({ left: "250px" });

    function sizeLayerControl() {
        $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
    }

    function sizeSidebar() {
        $(".scrollDiv").css("max-height", window.screen.availHeight - (window.outerHeight - window.innerHeight) - 225);
    }

    function setCatchmentStyle(highlightCatchment, c = '#013220', w = 3) {
        const style = {
            fillColor: 'transparent',
            fillOpacity: 0.3,
            stroke: true,
            fill: true,
            color: c,
            opacity: 1,
            weight: w
        };
        cbcisGrid.setFeatureStyle(highlightCatchment, style);
    }

    function sidebarClick(catchID, latLng) {
        if (highlightCatchment)
            clearHighlightCatchment();

        highlightCatchment = catchID;

        map.flyTo(latLng, 8);

        setCatchmentStyle(catchID, '#dd1c77', 6);

        clearHighlight();

        /* Hide sidebar and go to the map on small screens */
        if (document.body.clientWidth <= 767) {
            $("#sidebar").hide();
            map.invalidateSize();
        }
    }

    function showTotal() {
        const length = $('#feature-list > tbody > tr').length;
        $('#totalText').html(length > 1 ? `<b>Total :</b> ${length} catchments` : `<b>Total :</b> ${length} catchment`);

        featureList = new List("features", {
            valueNames: ['feature-name']
        });
        featureList.sort("feature-name", {
            order: "asc"
        });
    }

    const leftSidebarWidth = $("#sidebar").width();
    let leftSidebar = true;

    function animateSidebar() {
        // $(".left-sidebar-btn").on("click", function () {
        if (leftSidebar) {
            $("#sidebar").animate({
                left: `-${leftSidebarWidth + 11}px`,
                width: "toggle",
            }, 300, function () {
                map.invalidateSize();
                // Show the mini toggle button after sidebar is hidden
                $(".sidebar-toggle-mini").fadeIn(300);
            });
            $(".leaflet-left").animate({ left: 0 });
        } else {
            $(".leaflet-left.basic-functions").animate({ left: `${leftSidebarWidth}px` });
            $("#sidebar").animate({
                left: "0",
                width: "toggle"
            }, 300, function () {
                map.invalidateSize();
            });
        }
        map.setView([-2.131, 22.896], 5);
        leftSidebar = !leftSidebar;
        // });
        // $("#sidebar").animate({
        //     width: "toggle"
        // }, 100, function () {
        //     map.invalidateSize();
        // });
    }

    function syncSidebar() {
        /* Resize sidebar */
        sizeSidebar();

        /* Empty sidebar features */
        $("#feature-list tbody").empty();

        /* Loop through catchment layer and add only features which are in the map bounds */
        catchmentsJson.eachLayer(layer => {
            // console.log(layer);
            if (map.hasLayer(cb_cis_layerGrp) && cb_cis_layerGrp.hasLayer(cbcisGrid)) {
                if (map.getBounds().contains(layer.getBounds())) {
                    let name = String(layer.feature.properties['name']).trim();
                    let cid = layer.feature.properties['catchment'];
                    // console.log(cid, L.stamp(layer));

                    let centroid = turf.centroid(layer.feature);
                    let lon = centroid.geometry.coordinates[0];
                    let lat = centroid.geometry.coordinates[1];

                    // let center = fitToBounds(layer.feature.geometry.coordinates[0][0]);
                    $("#feature-list tbody").append(
                        '<tr class="feature-row" id="' + cid + '" catchID="' + cid + '" lat="' + lat + '" lng="' + lon + '"><td style = "vertical-align: middle;"><img width="24" height="24" src="./images/catchment1.png"></td><td class="feature-name" title="ID: ' + cid + '"><b>' + name + ' </b><small class="text-muted">(' + cid + ')</small></td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
                }
            }
        });

        showTotal();
    }

    function showChart(id) {
        let subset;
        let xLabels, yData;

        const value = csvData[catchmentID - 1];

        switch (id) {
            case 1://Land use
                subset = Object.fromEntries(
                    Object.entries(value).filter(([key]) => ["tree_cover",
                        "shrubs_cover",
                        "grassland",
                        "cropland",
                        "reg_flood",
                        "lichens_mo",
                        "bare_areas",
                        "built_up_a",
                        "open_water"
                    ].includes(key))
                );
                xLabels = Object.keys(subset);
                yData = Object.values(subset);
                break;
            case 2://Soil texture
                subset = Object.fromEntries(
                    Object.entries(value).filter(([key]) => ["clay",
                        "silt",
                        "sand",
                        "sand_c_s"
                    ].includes(key))
                );
                xLabels = Object.keys(subset);
                yData = Object.values(subset);
                break;
            case 3://Climate
                subset = Object.fromEntries(
                    Object.entries(value).filter(([key]) => ["january",
                        "february",
                        "march",
                        "april",
                        "may",
                        "june",
                        "july",
                        "august",
                        "september",
                        "october",
                        "november",
                        "december"
                    ].includes(key))
                );
                xLabels = Object.keys(subset);
                yData = Object.values(subset);
                break;
        }

        return [xLabels, yData];
        // if ($('#combatforces' + id).is(":visible")) {
        //     document.getElementById('details' + id).innerHTML = 'Show Forces';
        // }
        // else {
        //     document.getElementById('details' + id).innerHTML = 'Hide Forces';
        // }
        // $('#combatforces' + id).toggle("slow", "swing");
        $('#charts').toggle("fast", "swing");
    }

    function checkContent(content) {
        let text = ((content !== null) && (typeof (content) !== 'undefined') && (content !== "")) ? content.toLocaleString() : '<label class="text-danger">N/A</label>';
        if (text === 'Graph')
            return '<a href="#" class="badge badge-primary">' + autolinker.link(text) + ' <span class="badge badge-light">n/a</span></a>';
        return autolinker.link(text);
    }

    function makeUL(arr) {
        if (arr.length == 0)
            return "<label class='text-danger'>N/A</label>";
        const $ul = $('<ul>').append(
            arr.map(c =>
                $("<li>").append($("<a/>").attr('href', c.split(';')[1]).attr('target', '_blank').html(autolinker.link(c.split(';')[0])))
            )
        );
        return $ul;
    }

    function buildCatchmentAdditionalInfo(nestedData, idCatchment) {
        $("#tblContentInfo tbody tr td").empty();  //Clear table
        $("#tblContentInfo tbody tr td").append("<label class='text-danger'>N/A</label>");
        nestedData.forEach(function (row) {
            if (row.key === String(idCatchment)) {
                let metadatas = [],
                    notes = [],
                    pubs = [],
                    links = [];

                row.values.forEach(function (b) {
                    metadatas.push(b.metadata);
                    notes.push(b.tech_note);
                    pubs.push(b.pubs);
                    links.push(b.ext_links);
                });

                $("#meta").empty().append(makeUL(metadatas.filter(m => m !== "")));
                $("#note").empty().append(makeUL(notes.filter(n => n !== "")));
                $("#pubs").empty().append(makeUL(pubs.filter(p => p !== "")));
                $("#links").empty().append(makeUL(links.filter(l => l !== "")));
            }
        });
    }

    async function buildCatchmentContent(idCatchment) {
        translate(); // Wait to the translate file

        if (csvData && !isNaN(idCatchment)) {
            let value = csvData[idCatchment - 1];
            const name = value['name'];

            let contentCatchmentID = "<div class='table-responsive'><table id='tblContentCatchmentID' class='table table-striped table-bordered table-sm table-hover'><caption data-translation='catchment.identification'></caption>\
                <tr><th data-translation='readtext.catchment'>Catchment ID</th><td>" + checkContent(value['catchment']) + "</td></tr>" +
                "<tr><th data-translation='readtext.catchment-name'>Catchment Name</th><td>" + checkContent(name) + "</td></tr>" +
                "<tr><th data-translation='readtext.territory'>Admin. Territories (Provinces)</th><td>" + checkContent(value['territory']).replaceAll('/', ', ') + "</td></tr>" +
                "<tr><th data-translation='readtext.country'>Country</th><td>" + checkContent(value['country']).replaceAll('/', ', ') + "</td></tr>" +
                "<tr><th data-translation='readtext.code'>Catchment Code</th><td>" + checkContent(value['catch_code']) + "</td></tr>" +
                "<tr><th data-translation='readtext.downstream'>Downstream Catchment</th><td>" + checkContent(value['catch_down']) + "</td></tr>" +
                "<tr><th data-translation='readtext.classe_1'>Drainage Unit L1</th><td>" + checkContent(value['classe_1']) + "</td></tr>" +
                "<tr><th data-translation='readtext.classe_2'>Drainage Unit L2</th><td>" + checkContent(value['classe_2']) + "</td></tr>" +
                "<tr><th data-translation='readtext.classe_3'>Drainage Unit L3</th><td>" + checkContent(value['classe_3']) + "</td></tr>" +
                "<tr><th data-translation='readtext.classe_4'>Drainage Unit L4</th><td>" + checkContent(value['classe_4']) + "</td></tr>" +
                "<tr><th data-translation='readtext.priori'>A Priori Classification</th><td>" + checkContent(value['priori']) + "</td></tr>" +
                "</table></div>";

            let contentClimate = "<div class='table-responsive'><table id='tblContentClimate' class='table table-striped table-bordered table-sm table-hover'><caption data-translation='catchment.climate'></caption>\
                <tr><th data-translation='readtext.precip_rate'></th><td>" + checkContent(value['precip_rate']) + "</td></tr>" +
                "<tr><th data-translation='readtext.precip_mean'></th><td>" + checkContent(value['precip_mean']) + "</td></tr>" +
                "<tr><th data-translation='readtext.rain_days'></th><td>" + checkContent(value['rain_days']) + "</td></tr>" +
                "<tr><th data-translation='readtext.rain_ratio'></th><td>" + checkContent(value['rain_ratio']) + "</td></tr>" +
                "<tr><th data-translation='readtext.precip_def'></th><td>" + checkContent(value['precip_def']) + "</td></tr>" +
                "<tr><th data-translation='readtext.moisture'></th><td>" + checkContent(value['moisture']) + "</td></tr>" +
                "<tr><th data-translation='readtext.pet_mean'></th><td>" + checkContent(value['pet_mean']) + "</td></tr>" +
                "<tr><th data-translation='readtext.evapo_ratio'></th><td>" + checkContent(value['evapo_ratio']) + "</td></tr>" +
                "<tr><th data-translation='readtext.radia_index'></th><td>" + checkContent(value['radia_index']) + "</td></tr>" +
                "<tr><th data-translation='readtext.demart_index'></th><td>" + checkContent(value['demart_index']) + "</td></tr>" +
                "<tr><th data-translation='readtext.arid_index'>Aridity Index [-]</th><td>" + checkContent(value['arid_index']) + "</td></tr>" +
                "<tr><th data-translation='readtext.temp_mean'>Temp Mean [&deg;C]</th><td>" + checkContent(value['temp_mean']) + "</td></tr>" +
                "<tr><th data-translation='readtext.climat_net'></th><td>" + checkContent(value['climat_net']) + "</td></tr>" +
                "<tr><th data-translation='readtext.npp_temp'></th><td>" + checkContent(value['npp_temp']) + "</td></tr>" +
                "<tr><th data-translation='readtext.npp_precip'></th><td>" + checkContent(value['npp_precip']) + "</td></tr>" +
                "<tr><th data-translation='readtext.clim_k'></th><td>" + checkContent(value['clim_k']) + "</td></tr>" +
                "<tr><th data-translation='readtext.clim_b'></th><td>" + checkContent(value['clim_b']) + "</td></tr>" +
                "<tr><td class='bg-success text-center small text-white' colspan='2' data-translation='readtext.p_seas'>Precipitation Seasonality</td></tr>" +
                "<tr><th data-translation='readtext.january'></th><td>" + checkContent(value['january']) + "</td></tr>" +
                "<tr><th data-translation='readtext.february'></th><td>" + checkContent(value['february']) + "</td></tr>" +
                "<tr><th data-translation='readtext.march'></th><td>" + checkContent(value['march']) + "</td></tr>" +
                "<tr><th data-translation='readtext.april'></th><td>" + checkContent(value['april']) + "</td></tr>" +
                "<tr><th data-translation='readtext.may'></th><td>" + checkContent(value['may']) + "</td></tr>" +
                "<tr><th data-translation='readtext.june'></th><td>" + checkContent(value['june']) + "</td></tr>" +
                "<tr><th data-translation='readtext.july'></th><td>" + checkContent(value['july']) + "</td></tr>" +
                "<tr><th data-translation='readtext.august'></th><td>" + checkContent(value['august']) + "</td></tr>" +
                "<tr><th data-translation='readtext.september'></th><td>" + checkContent(value['september']) + "</td></tr>" +
                "<tr><th data-translation='readtext.october'></th><td>" + checkContent(value['october']) + "</td></tr>" +
                "<tr><th data-translation='readtext.november'></th><td>" + checkContent(value['november']) + "</td></tr>" +
                "<tr><th data-translation='readtext.december'></th><td>" + checkContent(value['december']) + "</td></tr>" +
                "</table></div>";

            let contentPhysiographic = "<div class='table-responsive'><table id='tblContentPhysiographic' class='table table-striped table-bordered table-sm table-hover'><caption data-translation='catchment.physio'></caption>\<tr><th data-translation='readtext.inc_area'>Inc. Catchment Area [km&sup2;]</th><td>" + checkContent(value['inc_area']) + "</td></tr>" +
                "<tr><th data-translation='readtext.cum_area'>Cum. Catchment Area [km&sup2;]</th><td>" + checkContent(value['cum_area']) + "</td></tr>" +
                "<tr><th data-translation='readtext.elev_mean'>Elevation Mean [m]</th><td>" + checkContent(value['elev_mean']) + "</td></tr>" +
                "<tr><th data-translation='readtext.elev_min'>Elevation Min [m]</th><td>" + checkContent(value['elev_min']) + "</td></tr>" +
                "<tr><th data-translation='readtext.elev_max'>Elevation Max [m]</th><td>" + checkContent(value['elev_max']) + "</td></tr>" +
                "<tr><th data-translation='readtext.slope'>Mean Slope [%]</th><td>" + checkContent(value['slope']) + "</td></tr>" +
                "<tr><th data-translation='readtext.hi'>Hypsometric Integral [-]</th><td>" + checkContent(value['hi']) + "</td></tr>" +
                "<tr><th data-translation='readtext.lai'>Leaf Area Index [-]</th><td>" + checkContent(value['lai']) + "</td></tr>" +
                "<tr><td class='bg-success text-center small text-white' colspan='2' data-translation='readtext.land_use'><strong>Land Use</strong></td></tr>" +
                "<tr><th data-translation='readtext.tree_cover'>Tree Cover Areas [%]</th><td>" + checkContent(value['tree_cover']) + "</td></tr>" +
                "<tr><th data-translation='readtext.shrubs_cover'>Shrubs Cover Areas [%]</th><td>" + checkContent(value['shrubs_cover']) + "</td></tr>" +
                "<tr><th data-translation='readtext.grassland'>Grassland [%]</th><td>" + checkContent(value['grassland']) + "</td></tr>" +
                "<tr><th data-translation='readtext.cropland'>Cropland [%]</th><td>" + checkContent(value['cropland']) + "</td></tr>" +
                "<tr><th data-translation='readtext.reg_flood'>Regularly Flooded [%]</th><td>" + checkContent(value['reg_flood']) + "</td></tr>" +
                "<tr><th data-translation='readtext.lichens_mo'>Lichens Mosses / Sparse Vegetation [%]</th><td>" + checkContent(value['lichens_mo']) + "</td></tr>" +
                "<tr><th data-translation='readtext.bare_areas'>Bare Areas [%]</th><td>" + checkContent(value['bare_areas']) + "</td></tr>" +
                "<tr><th data-translation='readtext.built_up_areas'>Built Up Areas [%]</th><td>" + checkContent(value['built_up_a']) + "</td></tr>" +
                "<tr><th data-translation='readtext.open_water'>Open Water [%]</th><td>" + checkContent(value['open_water']) + "</td></tr>" +
                "<tr><td class='bg-success text-center small text-white' colspan='2' data-translation='readtext.soil'><strong>Soil Texture</strong></td></tr>" +
                "<tr><th data-translation='readtext.clay'>Clay [%]</th><td>" + checkContent(value['clay']) + "</td></tr>" +
                "<tr><th data-translation='readtext.silt'>Silt [%]</th><td>" + checkContent(value['silt']) + "</td></tr>" +
                "<tr><th data-translation='readtext.sand'>Sand [%]</th><td>" + checkContent(value['sand']) + "</td></tr>" +
                "<tr><th data-translation='readtext.sand_c_s'>Sand / (C+S)</th><td>" + checkContent(value['sand_c_s']) + "</td></tr>" +
                "<tr><td class='bg-secondary text-center small text-white' colspan='2'></td></tr>" +
                "<tr><th data-translation='readtext.geo'>Geology / Lithology</th><td>" + checkContent(value['geo']) + "</td></tr>" +
                "<tr><th data-translation='readtext.cn'>Curve Number [-]</th><td>" + checkContent(value['cn']) + "</td></tr>" +
                "<tr><th data-translation='readtext.dd'>Drainage Density [km/km&sup2;]</th><td>" + checkContent(value['dd']) + "</td></tr>" +
                "</table></div>";

            let contentHydrology = "<div class='table-responsive'><table id='tblContentHydrology' class='table table-striped table-bordered table-sm table-hover'>\
        <tr><th data-translation='readtext.rch_mean'>Mean Monthly Recharge [mm]</th><td>" + checkContent(value['rch_mean']) + "</td></tr>" +
                "<tr><th data-translation='readtext.inflow_rate'></th><td>" + checkContent(value['inflow_rate']) + "</td></tr>" +
                "<tr><th data-translation='readtext.tot_inflow'></th><td>" + checkContent(value['tot_inflow']) + "</td></tr>" +
                "<tr><th data-translation='readtext.ro_ratio'></th><td>" + checkContent(value['ro_ratio']) + "</td></tr>" +
                "<tr><th data-translation='readtext.ro_coeff'></th><td>" + checkContent(value['ro_coeff']) + "</td></tr>" +
                "<tr><th data-translation='readtext.basefl_index'></th><td>" + checkContent(value['basefl_index']) + "</td></tr>" +
                "<tr><th data-translation='readtext.zero_flow'></th><td>" + checkContent(value['zero_flow']) + "</td></tr>" +
                "<tr><th data-translation='readtext.qmax'></th><td>" + checkContent(value['qmax']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q5th'>Q5th [m&sup3;/s]</th><td>" + checkContent(value['q5th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q10th'>Q10th [m&sup3;/s]</th><td>" + checkContent(value['q10th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q50th'>Q50th [m&sup3;/s]</th><td>" + checkContent(value['q50th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q75th'>Q75th [m&sup3;/s]</th><td>" + checkContent(value['q75th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q90th'>Q90th [m&sup3;/s]</th><td>" + checkContent(value['q90th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q95th'>Q95th [m&sup3;/s]</th><td>" + checkContent(value['q95th']) + "</td></tr>" +
                "<tr><th data-translation='readtext.q99th'>Q99th [m&sup3;/s]</th><td>" + checkContent(value['q99th']) + "</td></tr>" +
                "</table></div>";

            let contentRisk = "<div class='table-responsive'><table id='tblContentRisk' class='table table-striped table-bordered table-sm table-hover'><caption data-translation='catchment.risk'></caption>\
        <tr><th data-translation='readtext.tot_pop'></th><td>" + checkContent(value['tot_pop']) + "</td></tr>" +
                "<tr><th data-translation='readtext.pop_dens'></th><td>" + checkContent(value['pop_dens']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_flu_10'></th><td>" + checkContent(value['flood_flu_10']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_flu_20'></th><td>" + checkContent(value['flood_flu_20']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_flu_50'></th><td>" + checkContent(value['flood_flu_50']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_plu_10'></th><td>" + checkContent(value['flood_plu_10']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_plu_20'></th><td>" + checkContent(value['flood_plu_20']) + "</td></tr>" +
                "<tr><th data-translation='readtext.flood_plu_50'></th><td>" + checkContent(value['flood_plu_50']) + "</td></tr>" +
                "<tr><th data-translation='readtext.spi'></th><td>" + checkContent(value['spi']) + "</td></tr>" +
                "<tr><th data-translation='readtext.spei'></th><td>" + checkContent(value['spei']) + "</td></tr>" +
                "<tr><th data-translation='readtext.water_qua'></th><td>" + checkContent(value['water_qua']) + "</td></tr>" +
                "<tr><th data-translation='readtext.tot_sedi'></th><td>" + checkContent(value['tot_sedi']) + "</td></tr>" +
                "</table></div>";

            let contentWaterUse = "<div class='table-responsive'><table id='tblContentWaterUse' class='table table-striped table-bordered table-sm table-hover'>\
        <tr><th data-translation='readtext.tot_abst'></th><td>" + checkContent(value['tot_abst']) + "</td></tr>" +
                "<tr><th data-translation='readtext.water_use'>Domestic Water Use [% pop]</th><td>" + checkContent(value['water_use']) + "</td></tr>" +
                "<tr><th data-translation='readtext.nav_cat'>Navigation Category [depth]</th><td>" + checkContent(value['nav_cat']) + "</td></tr>" +
                "<tr><th data-translation='readtext.hydro_pot'>Hydropower Potential [MW]</th><td>" + checkContent(value['hypro_pot']) + "</td></tr>" +
                "<tr><th data-translation='readtext.inst_cap'>Installed Capacity [MW] [MW]</th><td>" + checkContent(value['inst_cap']) + "</td></tr>" +
                "<tr><th data-translation='readtext.irri_area'>Irrigated Area [km&sup2;]</th><td>" + checkContent(value['irri_area']) + "</td></tr>" +
                "<tr><th data-translation='readtext.water_use_oth'>Other Water Uses</th><td>" + checkContent(value['water_use_oth']) + "</td></tr>" +
                "</table></div>";

            let modalLabel = `<label data-translation='catchment.title'></label> [<span class='text-success font-weight-bold'>${checkContent(name)}</span>]`;

            $("#feature-title").html('Basins');
            $("#modalLabel").html(modalLabel);

            $("#catchmentID-info").html(contentCatchmentID);
            $("#climate-info").html(contentClimate);
            $("#physiographic-info").html(contentPhysiographic);
            $("#hydrology-info").html(contentHydrology);
            $("#risk-info").html(contentRisk);
            $("#water-info").html(contentWaterUse);

            if (csvInfoData) {
                let nested_data = d3.nest().key(function (d) {
                    return d.catchment;
                }).entries(csvInfoData);

                buildCatchmentAdditionalInfo(nested_data, idCatchment);
            }
        }
    }

    function buildChart(xLabels, yData) {
        const config = {
            type: 'bar',
            data: {
                labels: xLabels,
                datasets: [{
                    label: 'Land use',
                    fill: false,
                    lineTension: 0.1,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    data: yData,
                    backgroundColor: [
                        "rgba(255, 99, 132, 0.2)",
                        "rgba(54, 162, 235, 0.2)",
                        "rgba(255, 206, 86, 0.2)",
                        "rgba(75, 192, 192, 0.2)",
                        "rgba(153, 102, 255, 0.2)",
                        "rgba(7, 52, 10, 0.2)",
                        "rgba(89, 59, 99, 0.2)",
                        "rgba(224, 86, 56, 0.2)",
                        "rgba(15, 157, 88, 0.2)",
                        "rgba(125, 109, 97, 0.2)",
                        "rgba(47, 6, 1, 0.2)",
                        "rgba(79, 109, 122, 0.2)"
                    ],
                    borderColor: [
                        "rgba(255, 99, 132, 1)",
                        "rgba(54, 162, 235, 1)",
                        "rgba(255, 206, 86, 1)",
                        "rgba(75, 192, 192, 1)",
                        "rgba(153, 102, 255, 1)",
                        "rgba(7, 52, 10, 1)",
                        "rgba(89, 59, 99, 1)",
                        "rgba(224, 86, 56, 1)",
                        "rgba(15, 157, 88, 1)",
                        "rgba(125, 109, 97, 0.2)",
                        "rgba(47, 6, 1, 0.2)",
                        "rgba(79, 109, 122, 0.2)"
                    ],
                    borderWidth: 3,
                    hoverBackgroundColor: "rgba(57, 57, 57, 0.4)",
                    hoverBorderColor: "rgba(57, 57, 57, 1)"
                }]
            },
            options: {
                // maintainAspectRatio: false,
                responsive: true,
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                },
                legend: {
                    display: false
                }
            }
        };

        function changeChart(newType) {
            const ctx = document.getElementById("chart").getContext("2d");

            // Remove the old chart and all its event handles
            if (myChart) {
                myChart.destroy();
            }

            // Chart.js modifies the object you pass in. Pass a copy of the object so we can use the original object later
            let temp = jQuery.extend(true, {}, config);
            temp.type = newType;
            myChart = new Chart(ctx, temp);

            switch (newType) {
                case 'line':
                    myChart.options.legend.display = false;
                    break;
                case 'bar':
                    myChart.options.legend.display = false;
                    break;
                case 'pie':
                    myChart.options.legend.display = true;
                    myChart.options.legend.position = 'bottom';
                    myChart.options.legend.align = 'center';
                    // myChart.options.legend.position.labels = {
                    //     padding: 10
                    // };
                    myChart.options.scales.yAxes = false;
                    break;
                default:
                    myChart.update();
            }
            myChart.update();
        };

        $("#line").click(function () {
            changeChart('line');
        });

        $("#bar").click(function () {
            changeChart('bar');
        });

        $("#pie").click(function () {
            changeChart('pie');
        });

        //Trigger the bar button on the chart to show first
        $("#bar").trigger("click");
    }

    function showCatchmentOnMap2(idProperty) {
        catchmentGrp.clearLayers();
        //    http://localhost:8080/geoserver/crrebac/ows?
        //   "service=WFS&version=2.0.0&request=GetFeature&typeName=crrebac:v_catchment&srs=EPSG:4326&viewparams=CATCHMENT:" + idProperty + "&outputFormat=application/json"
        let uniqueCatchmentURl = `${rootUrl}ows?service=WFS&version=2.0.0&request=GetFeature&typeName=crrebac:cb_cis_1740_geo&srs=EPSG:4326&cql_filter=catchment=${idProperty}&outputFormat=application/json`;
        let uniqueCatchment = L.geoJson(null, {
            style: {
                weight: 4,
                opacity: 1,
                color: 'gray',
                dashArray: '4',
                fillOpacity: 0.2,
                fillColor: 'gray',
                radius: 5
            }
        });
        let y = $.getJSON(uniqueCatchmentURl, function (data) {
            uniqueCatchment.addData(data);
        });
        $.when(y).done(function () {
            catchmentGrp.addLayer(uniqueCatchment);
            map2.flyToBounds(uniqueCatchment.getBounds());
        });
    }

    $("body").on("click", "a#gotoFrame", () => {
        $('.nav-tabs a[href="#framework"]').tab('show');
        return false;
    });

    $("body").on("click", "a#gotoArt", () => {
        $('.nav-tabs a[href="#article"]').tab('show');
        return false;
    });

    $("body").on("click", "a#toggleLand", () => {
        const [xLabels,
            yData] = showChart(1);
        buildChart(xLabels, yData);

        // if (!($('#charts').is(":visible")))
        $('#charts').toggle("fast", "swing");
        return false;
    });

    $("body").on("click", "a#toggleSoil", () => {
        const [xLabels,
            yData] = showChart(2);
        buildChart(xLabels, yData);

        // if (!($('#charts').is(":visible")))
        $('#charts').toggle("fast", "swing");
        return false;
    });

    $("body").on("click", "a#togglePrecip", () => {
        const [xLabels,
            yData] = showChart(3);
        buildChart(xLabels, yData);

        // if (!($('#charts').is(":visible")))
        $('#charts').toggle("fast", "swing");
        return false;
    });

    $("#full-extent-btn").click(() => {
        $(".navbar-collapse.in").collapse("hide");
        map.fitBounds(congoBasin.getBounds());
        return false;
    });

    $("#legend-btn").click(() => {
        $("#legendModal").modal("show");
        $(".navbar-collapse.in").collapse("hide");
        return false;
    });

    //leaflet prevent functions for div inside map
    $(".leaflet-prevent").on("mousewheel", L.DomEvent.stopPropagation);
    $(".leaflet-prevent").on("dblclick", L.DomEvent.stopPropagation);
    $(".leaflet-prevent").on("mousedown", L.DomEvent.stopPropagation);
    $(".leaflet-prevent").on("click", L.DomEvent.preventDefault);
    $(".leaflet-prevent").on("mouseover", () => {
        map.dragging.disable();
    });
    $(".leaflet-prevent").on("mouseout", () => {
        map.dragging.enable();
    });

    //Default view
    $(".default-view").click(() => {
        // map.setView([-2.131, 22.896], 5);
        /* Fit map to Congo basin bounds */
        if (congoBasin)
            map.fitBounds(congoBasin.getBounds());
        return false;
    });

    //Toggle full layer
    $(".full-screen").click(() => {
        if (graticule.options.showLabel) {
            map.removeLayer(graticule);
            graticule.options.showLabel = false;
        } else {
            graticule.options.showLabel = true;
            map.addLayer(graticule);
        }
        $(".navbar-collapse.in").collapse("hide");
        return false;
    });

    $("#login-btn").click(() => {
        $("#loginModal").modal("show");
        $(".navbar-collapse.in").collapse("hide");
        return false;
    });

    $("#list-btn").click(() => {
        animateSidebar();
        return false;
    });

    $("#nav-btn").click(() => {
        $(".navbar-collapse").collapse("toggle");
        return false;
    });

    $(".sidebar-toggle-mini").hide();

    // Event handlers for both buttons
    $("#sidebar-hide-btn, .sidebar-toggle-mini").on("click", (e) => {
        e.preventDefault();
        $(".sidebar-toggle-mini").hide();
        animateSidebar();
    });

    $(window).resize(() => {
        sizeLayerControl();
    });

    //Catchment list row on click
    $(document).on("click", ".feature-row", function (e) {
        $(document).off("mouseout", ".feature-row", clearHighlight);
        const trID = $(this).attr("id");
        sidebarClick(parseInt(trID, 10), xy);

        setTimeout(() => {
            const elm = document.getElementById(String(trID));
            elm.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            $('tr').removeClass('active');
            $(elm).addClass('active');
        }, 2500);
        // $('#searchFilter').empty();
    });

    //Catchment list row on mouse over
    if (!("ontouchstart" in window)) {
        $(document).on("mouseover", ".feature-row", function (e) {
            xy = [$(this).attr("lat"), $(this).attr("lng")];
            highlight.clearLayers().addLayer(L.circleMarker(xy, highlightStyle));
            if (highlight)
                highlight.bringToFront();
        });
    }

    $(document).on("mouseout", ".feature-row", clearHighlight);

    /* Highlight search box text on click */
    $("#searchbox").click(() => $(this).select());

    /* Prevent hitting enter from refreshing the page */
    $("#searchbox").keypress(e => {
        if (e.which == 13) {
            e.preventDefault();
        }
    });

    $("#featureModal").on("hidden.bs.modal", (e) => {
        $(document).on("mouseout", ".feature-row", clearHighlight);
    });

    $('#catchmentModal').on('shown.bs.modal', () => {
        map2.invalidateSize(true);

        //Get the coordinates
        if (catchmentID)
            showCatchmentOnMap2(catchmentID);

        if (($('#charts').is(":visible"))) {
            const [xLabels,
                yData] = showChart(1);
            buildChart(xLabels, yData);
        }
    });

    var breaksStream = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    var colorsStream = ["#c1cace", "#91857f", "#bfada3", "#6c6c6c", "#59c4e1", "#5d73ff", "#33a02c", "#ff11ff", "#0f169c"];
    var weightStream = [0.3, 0.45, 0.9, 1.2, 1.9, 2.5, 3.2, 4.5, 4.5];

    /* Tiles layer */
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        minZoom: 1,
        label: "Street Map",
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    });

    const osm2 = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 10,
        minZoom: 2,
        label: "Street Map",
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
    });

    const worldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    const openTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        label: 'Open Topography',
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });

    //Google terrain
    const gmt = L.tileLayer("http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
    });

    // Overview mini map
    const Esri_WorldTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 10,
        minZoom: 2,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, ...'
    });

    //Data variables
    var cb_cis_layerGrp = L.layerGroup(),
        congoBasinlayerGrp = L.layerGroup(),
        streamFeatGrp = L.featureGroup(),
        africaLayerGrp = L.layerGroup(),
        catchmentGrp = L.layerGroup(),
        basinCountriesLyrGrp = L.layerGroup();

    //var highlightLayer;
    function highlightFeature(e) {
        let highlightLayer = e.target;

        if (highlightLayer.feature.geometry.type === 'LineString' || highlightLayer.feature.geometry.type === 'MultiLineString') {
            highlightLayer.setStyle({
                weight: 6,
                color: getStreamColor(highlightLayer.feature.properties['grid_code']),
                opacity: 1,
                smoothFactor: 1
            });
        } else {
            highlightLayer.setStyle({
                fillColor: '#ffff00',
                weight: 3,
                fillOpacity: 0.5
            });
        }
        highlightLayer.getPopup().setLatLng(e.latlng).openOn(map);
        if (!L.Browser.ie && !L.Browser.opera) {
            highlightLayer.bringToFront();
        }
    }

    function resetHighlight(e) {
        let highlightLayer = e.target,
            i;
        for (i in highlightLayer._eventParents) {
            highlightLayer._eventParents[i].resetStyle(highlightLayer);
        }

        typeof this.closePopup == 'function' ? this.closePopup() : this.eachLayer(function (feature) {
            this.feature.closePopup();
        });
    }

    //Format number
    function formatNumber(num) {
        return L.Util.formatNum(num, 3);
    }

    function getBasinColor(d) {
        for (let i = 0; i < breaksBasin.length; i++) {
            if (d > breaksBasin[i] && d <= breaksBasin[i + 1]) {
                return colorsBasin[i];
            }
        }
    }

    function getStreamColor(d) {
        for (let i = 0; i < breaksStream.length; i++) {
            if (d == breaksStream[i]) {
                return colorsStream[i];
            }
        }
    }

    function getStreamWeight(d) {
        for (let i = 0; i < breaksStream.length; i++) {
            if (d == breaksStream[i]) {
                return weightStream[i];
            }
        }
    }

    //Map2 creation
    map2 = L.map('map2', {
        layers: [Esri_WorldTopoMap],
        zoomControl: false
    }).setView([-3, 22], 6);
    catchmentGrp.addTo(map2);

    //Map creation
    map = L.map('map', {
        detectRetina: true,
        maxZoom: 19,
        minZoom: 4,
        editable: true,
        // continuousWorld: true,
        worldCopyJump: false,
        keyboard: true,
        crs: L.CRS.EPSG3857,
        layers: [osm, basinCountriesLyrGrp, cb_cis_layerGrp, streamFeatGrp, congoBasinlayerGrp],
        // renderer: L.canvas(),
        //    attributionControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
            position: 'topleft'
        }
    }).fitBounds([
        [-23.267758356808294, 6.471623061373654],
        [19.918393848513368, 37.840429946885386]
    ]).setMaxBounds([
        [-37.579413, -19.863281],
        [38.272689, 60.117188]
    ]); //

    map.spin(true, { lines: 10, length: 20 });

    let hash = L.hash(map);

    map.attributionControl.setPrefix('<a href="https://www.crrebac.org/en_GB/" target="_blank">© CRREBaC</a> &middot; <a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> &middot; vick25');

    /* Map create panes */
    map.createPane('catchmentPane');
    map.getPane('catchmentPane').style.zIndex = 250;

    /* Overlay Layers for catchment list */
    map.createPane('pane_Highlight');
    map.getPane('pane_Highlight').style.zIndex = 700;
    // map.getPane('pane_Highlight').style['mix-blend-mode'] = 'normal';
    let highlight = L.geoJson(null, {
        pane: 'pane_Highlight'
    });
    let highlightStyle = {
        stroke: false,
        fillColor: "#000FFF",
        fillOpacity: 0.8,
        radius: 13
    };
    map.addLayer(highlight); //sidebar zoom highlight

    cb_cis_layerGrp.clearLayers();
    africaLayerGrp.clearLayers();
    streamFeatGrp.clearLayers();
    congoBasinlayerGrp.clearLayers();
    basinCountriesLyrGrp.clearLayers();

    //Load streams
    const streamsURL = `${rootUrl}ows?service=WFS&version=1.1.0&request=GetFeature&typeName=crrebac:stream_9_geo_diss&outputFormat=json`;
    let streams = L.geoJson(null, {
        attribution: '',
        interactive: true,
        dataVar: 'json_stream_o_9_geo',
        layerName: 'layer_stream_o_9_geo',
        zIndex: 20,
        style: function (feature) {
            let gridCode = feature.properties['grid_code'];
            return {
                opacity: 1,
                color: getStreamColor(gridCode),
                weight: getStreamWeight(gridCode),
                dashArray: '',
                lineCap: 'square',
                lineJoin: 'round',
                fillOpacity: 0,
                interactive: true
            };
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                let content = `<table class='table table-striped table-bordered table-condensed'>\<tr><th>Grid code</th><td>${feature.properties.grid_code}</td></tr>\<tr><th>Website</th><td><a class='url-break' href='https://www.crrebac.org/en_GB/' target='_blank'>https://www.crrebac.org/en_GB/</a></td></tr>\</table>`;
                layer.on({
                    click: function (e) {
                        $("#feature-title").html('Streams');
                        $("#feature-info").html(content);
                        $("#featureModal").modal("show");
                    }
                });
            }

            switch (String(feature.properties['grid_code'])) {
                case '1':
                    layer.addTo(stream9);
                    break;
                case '2':
                    layer.addTo(stream8);
                    break;
                case '3':
                    layer.addTo(stream7);
                    break;
                case '4':
                    layer.addTo(stream6);
                    break;
                case '5':
                    layer.addTo(stream5);
                    break;
                case '6':
                    layer.addTo(stream4);
                    break;
                case '7':
                    layer.addTo(stream3);
                    break;
                case '8':
                    layer.addTo(stream2);
                    break;
                case '9':
                    layer.addTo(stream1);
                    break;
            }

            layer.on({
                mouseover: highlightFeature,
                mouseout: function (e) {
                    let layer = e.target;
                    //                streams.resetStyle(layer);
                    for (let i in layer._eventParents) {
                        layer._eventParents[i].resetStyle(layer);
                    }

                    typeof layer.closePopup == 'function' ? layer.closePopup() : layer.eachLayer(function (feature) {
                        feature.closePopup()
                    });
                }
            });
            var popupContent = '<table>\<tr><th>Grid code:</th><td><strong>' + feature.properties.grid_code + '</strong></td></tr>\</table>';
            layer.bindPopup(popupContent, {
                maxHeight: 400
            });
        }
    });
    fetch(streamsURL)
        .then(response => {
            map.spin(true);
            return response.json();
        })
        .then(data => {
            map.spin(false);
            if (data)
                streams.addData(data);
        }).catch(() => console.error('Streams Failed!'));

    //Load catchment as vectorgrid
    const catchTMSURL = `http://${IPAddress}/geoserver/gwc/service/tms/1.0.0/crrebac:cb_cis_1740_geo@EPSG:900913@pbf/{z}/{x}/{-y}.pbf`;

    let catchmentsJson = L.geoJson(null, {
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                let name = String(feature.properties['name']).trim();
                let cid = feature.properties['catchment'];

                let centroid = turf.centroid(feature);
                let lon = centroid.geometry.coordinates[0];
                let lat = centroid.geometry.coordinates[1];

                $("#feature-list tbody").append(
                    `<tr class='feature-row' id='${cid}' catchID='${cid}' lat='${lat}' lng='${lon}'><td style='vertical-align: middle;'><img width='24' height='24' src='./images/catchment1.png'></td><td class="feature-name" title="ID: ${cid}"><b>${name}</b> <small class="text-muted">(${cid})</small></td><td style='vertical-align: middle;'><i class='fa fa-chevron-right pull-right'></i></td></tr>`);
            }
        }
    });

    // Add initial loading text to feature list
    $("#feature-list tbody").html('<tr><td colspan="3" class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading catchments...</td></tr>');

    const catchURL = `${rootUrl}ows?service=WMS&version=1.1.0&request=GetMap&layers=crrebac%3Acb_cis_1740_geo&bbox=11.8403930664063%2C-13.459098815918%2C34.0189628601074%2C9.26166725158691&width=749&height=768&srs=EPSG%3A4326&format=geojson`;

    let loadCbcis = $.getJSON(catchURL, function (data) {
        return gridCatchmentsData = data;
    });
    $.when(loadCbcis).done(function () {
        // Clear the loading text
        $("#feature-list tbody").empty();

        sizeSidebar();

        /* Fit map to Congo basin bounds */
        if (congoBasin)
            map.fitBounds(congoBasin.getBounds());

        catchmentsJson.addData(gridCatchmentsData);

        setTimeout(showTotal());
    });

    let layerPopup;

    cbcisGrid = L.vectorGrid.protobuf(catchTMSURL, {
        rendererFactory: L.canvas.tile,
        vectorTileLayerStyles: {
            cb_cis_1740_geo: function (properties, zoom) {
                return {
                    fillColor: "transparent",
                    fillOpacity: 0,
                    stroke: true,
                    fill: false,
                    color: 'orange',
                    dashArray: '4',
                    opacity: 1,
                    weight: 2
                }
            }
        },
        pane: 'catchmentPane',
        maxZoom: 22,
        // indexMaxZoom: 5, // max zoom in the initial tile index
        // attribution: 'Catchments © CRREBaC',
        interactive: true,
        getFeatureId: function (f) {
            return f.properties['catchment'];
        }
    }).addTo(cb_cis_layerGrp);

    cbcisGrid.on('mouseover', (e) => {
        let properties = e.layer.properties;
        layerPopup = L.popup()
            .setContent(`<div class="popup"><strong>${properties.name}</strong><br/>Area: ${formatNumber(properties.inc_area)} km&sup2;</div>`, {
                maxHeight: 400
            })
            .setLatLng(e.latlng)
            .openOn(map);

        clearHighlightCatchment();
        highlightCatchment = properties.catchment;

        //Highlight catchments on mouseover
        setCatchmentStyle(highlightCatchment, undefined, 4);
    }).on('mouseout', (e) => {
        if (layerPopup && map) {
            map.closePopup(layerPopup);
            layerPopup = null;
        }
        highlight.clearLayers();
    }).on('click', (e) => {
        let prop;
        if (e.layer.feature) {
            prop = e.layer.feature.properties;
        } else {
            prop = e.layer.properties;
        }
        L.DomEvent.stop(e);
        // console.log(e);

        //settimeout otherwise when map click fires it will override this color change
        if (catchID != 0) {
            cbcisGrid.setFeatureStyle(catchID, {
                color: `orange`,
                weight: 2
            });
        }
        catchID = prop["catchment"];
        setTimeout(() => {
            cbcisGrid.setFeatureStyle(catchID, {
                color: `#de0000`
            });
        }, 5);

        catchmentID = prop['catchment'];

        $("#catchmentModal").modal("show");

        //Build html content after retrieving the catchment ID
        buildCatchmentContent(catchmentID);

        // buildChart(catchmentID);
    }).on('load', (e) => {
        map.spin(false);
        /* Resize sidebar */
        sizeSidebar();

        setTimeout(showTotal());
    });

    //Load africa boundary
    var wmsAfrica = L.Geoserver.wms(rootUrl + "wms", {
        layers: "crrebac:africa",
    });
    africaLayerGrp.addLayer(wmsAfrica);

    //Load Congo basin boundary
    var wmsCongoBasin = L.Geoserver.wms(rootUrl + "wms", {
        layers: "crrebac:congo_basin",
    });
    congoBasinlayerGrp.addLayer(wmsCongoBasin);

    const congoBasinURL = `${rootUrl}ows?service=WMS&version=1.1.0&request=GetMap&layers=crrebac%3Acongo_basin&bbox=11.7766666412354%2C-13.4591674804688%2C34.0191688537598%2C9.26166725158691&width=751&height=768&srs=EPSG%3A4326&format=geojson`;
    let congoBasin = L.geoJson(null, {
        attribution: '',
        interactive: false,
        style: feature => {
            return {
                weight: 3.5,
                color: "black",
                fill: false,
                opacity: 1,
                smoothFactor: 1,
                clickable: false
            };
        }
    });
    fetch(congoBasinURL)
        .then(response => {
            return response.json();
        })
        .then(data => {
            // console.log(data);
            congoBasin.addData(data);
            // congoBasinlayerGrp.addLayer(congoBasin);
        });

    /* Load Basin countries boundaries */
    var wmsBasinCountries = L.Geoserver.wms(`${rootUrl}wms`, {
        layers: "crrebac:basin_countries",
    });
    basinCountriesLyrGrp.addLayer(wmsBasinCountries);

    /* Map methods */
    //Map drawing
    map.on("draw:created", function (e) {
        drawnItems.clearLayers();
        e.layer.addTo(drawnItems);
        drawnItems.eachLayer(function (layer) {
            let geojson = JSON.stringify(layer.toGeoJSON().geometry);
            console.log(geojson);
        });
    });

    //Set up trigger functions for adding layers to interactivity.
    map.on('overlayadd', function (e) {
        map.spin(true);

        if (e.name === "Catchment") {
            cb_cis_layerGrp.addLayer(cbcisGrid);
            syncSidebar();
        }

        map.spin(false);
    });

    map.on('overlayremove', function (e) {
        map.spin(true);

        if (e.name === "Catchment" && cbcisGrid) {
            cb_cis_layerGrp.removeLayer(cbcisGrid);
            syncSidebar();
        }

        map.spin(false);
    });

    /* Filter sidebar feature list to only show features in current map bounds */
    map.on("moveend", function (e) {
        syncSidebar();
    });

    /* Clear feature highlight when map is clicked */
    map.on('click', function (e) {
        clearHighlightCatchment();
    });

    /**ZoomBox control */
    // Using a custom SVG icon as content
    let control = L.control.zoomBox({
        addToZoomControl: true,
        modal: true,
        className: "custom-content",
        content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(0,0)"><path fill="rgba(0, 0, 0, 1)" d="M138.563 16.063C83.49 42.974 41.459 86.794 16.124 138.53l59.938 29.407c18.988-38.845 50.47-71.807 91.812-92l-29.313-59.874zm234.843.156L344 76.124c38.846 18.99 71.807 50.47 92 91.813l59.875-29.313c-26.913-55.073-70.732-97.073-122.47-122.406zm62.53 327.717c-18.982 38.865-50.53 71.673-91.873 91.875l29.437 60.125c55.116-26.925 97.085-70.76 122.375-122.562l-59.938-29.438zm-359.936.125l-60 29.375c26.928 55.097 70.776 97.082 122.563 122.375l29.406-59.937C129.122 416.885 96.192 385.4 76 344.062z"></path></g></svg>'
    });
    map.addControl(control);

    /**Print */
    L.Control.BrowserPrint.Utils.registerLayer(
        // Actual typeof object to compare with
        L.VectorGrid.Protobuf,
        // Any string you would like for current function for print events
        "L.VectorGrid.Protobuf",
        function (layer, utils) {
            return new L.VectorGrid.Protobuf(layer._url, layer.options);
        }
    );

    L.control.browserPrint({
        title: "Print this Congo Basin map!",
        documentTitle: "Map printed using leaflet.browser.print plugin",
        closePopupsOnPrint: false,
        manualMode: false
    }).addTo(map);

    /* Measure control */
    let mesureOpts = {
        position: 'topleft',
        captureZIndex: 200000,
        primaryLengthUnit: 'meters',
        secondaryLengthUnit: 'kilometers',
        primaryAreaUnit: 'hectares',
        secondaryAreaUnit: 'sqmeters',
        activeColor: '#FF0080',
        completedColor: '#FF0080'
    };

    let measureControl = L.control.measure(mesureOpts);
    measureControl.addTo(map);


    // L.control.ruler({
    //     position: 'topleft',
    //     onToggle: true
    // }).addTo(map);

    // map.addControl(new L.Control.LinearMeasurement({
    //     unitSystem: 'metric',
    //     color: '#FF0080',
    //     type: 'line',
    //     features: ['ruler']
    // }));

    /* GPS enabled geolocation control set to follow the b's location */
    let locateControl = L.control.locate({
        position: "topleft",
        drawCircle: true,
        follow: true,
        setView: true,
        keepCurrentZoomLevel: true,
        markerStyle: {
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.8
        },
        circleStyle: {
            weight: 1,
            clickable: false
        },
        icon: "fa fa-location-arrow",
        metric: true,
        strings: {
            title: "My location",
            popup: "You are within {distance} {unit} from this point",
            outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
        },
        locateOptions: {
            maxZoom: 18,
            watch: true,
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 10000
        }
    }).addTo(map);

    /* Mouse coordinates control */
    L.control.mousePosition({
        numDigits: 6,
        prefix: 'Coodinates: '
    }).addTo(map);

    /* Scale control */
    L.control.scale({
        position: 'bottomleft'
    }).addTo(map);

    map.on("browser-print-start", function (e) {
        var header = document.querySelector('.grid-print-container');
        var link = document.createElement('link');
        link.id = 'minhaclass';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = '~/css/better-scale,css';
        link.media = 'all';
        header.appendChild(link);
        L.control.scale({
            position: 'bottomleft'
        }).addTo(e.printMap);
    });

    /* Draw FeatureGroup is to store editable layers */
    var drawnItems = new L.FeatureGroup().addTo(map);
    var drawControl = new L.Control.Draw({
        draw: {
            polygon: {
                shapeOptions: {
                    color: 'purple'
                },
                allowIntersection: false,
                drawError: {
                    color: 'orange',
                    timeout: 1000
                },
                showArea: true,
                metric: true,
                feet: false,
                repeatMode: true
            },
            polyline: {
                metric: true,
                color: 'red'
            },
            rectangle: false, // Rectangles disabled
            circle: false, // Circles disabled
            circlemarker: false, // Circle markers disabled
            marker: true
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    // map.addControl(drawControl);

    //define Drawing toolbar options
    var options = {
        position: 'topleft', // toolbar position, options are 'topleft', 'topright', 'bottomleft', 'bottomright'
        drawMarker: true, // adds button to draw markers
        drawPolyline: true, // adds button to draw a polyline
        drawRectangle: false, // adds button to draw a rectangle
        drawPolygon: true, // adds button to draw a polygon
        drawCircle: false, // adds button to draw a cricle
        cutPolygon: true, // adds button to cut a hole in a polygon
        editMode: true, // adds button to toggle edit mode for all layers
        removalMode: true, // adds a button to remove layers
    };

    /* Minimap */
    let miniMap = new L.Control.MiniMap(osm2, {
        toggleDisplay: true,
        minimized: true,
        position: 'bottomleft'
    });

    /* Base and overlays maps*/
    let overlayMaps = {
        "Boundaries": {
            "Africa": africaLayerGrp,
            "Basin countries": basinCountriesLyrGrp,
            "Congo basin": congoBasinlayerGrp
        },
        "": {
            "Catchment": cb_cis_layerGrp
        },
    };

    var baseMaps = [
        osm,
        worldImagery,
        gmt,
        openTopoMap
    ];

    map.addControl(
        L.control.basemaps({
            basemaps: baseMaps,
            tileX: 0,
            tileY: 0,
            tileZ: 1
        })
    );

    //Grouped layer control to add basemap and overlayMaps
    var layerControl = L.control.groupedLayers(null, overlayMaps, {
        groupCheckboxes: false,
        collapsed: isCollapsed
    }).addTo(map);

    const stream1 = L.layerGroup().addTo(map);
    const stream2 = L.layerGroup().addTo(map);
    const stream3 = L.layerGroup().addTo(map);
    const stream4 = L.layerGroup();
    const stream5 = L.layerGroup();
    const stream6 = L.layerGroup();
    const stream7 = L.layerGroup();
    const stream8 = L.layerGroup();
    const stream9 = L.layerGroup();
    const strHeader = "Streams";

    layerControl.addOverlay(stream1, "<img src='./images/streams/stream1.png' width='20' height='24'>&nbsp;&nbsp;Streams L1", strHeader).addOverlay(stream2, "<img src='./images/streams/stream2.png' width='20' height='24'>&nbsp;&nbsp;Streams L2", strHeader).addOverlay(stream3, "<img src='./images/streams/stream3.png' width='20' height='24'>&nbsp;&nbsp;Streams L3", strHeader).addOverlay(stream4, "<img src='./images/streams/stream4.png' width='20' height='24'>&nbsp;&nbsp;Streams L4", strHeader).addOverlay(stream5, "<img src='./images/streams/stream5.png' width='20' height='24'>&nbsp;&nbsp;Streams L5", strHeader).addOverlay(stream6, "<img src='./images/streams/stream6.png' width='20' height='24'>&nbsp;&nbsp;Streams L6", strHeader).addOverlay(stream7, "<img src='./images/streams/stream7.png' width='20' height='24'>&nbsp;&nbsp;Streams L7", strHeader).addOverlay(stream8, "<img src='./images/streams/stream8.png' width='20' height='24'>&nbsp;&nbsp;Streams L8", strHeader).addOverlay(stream9, "<img src='./images/streams/stream9.png' width='20' height='24'>&nbsp;&nbsp;Streams L9", strHeader);

    // Leaflet patch to make layer control scrollable on touch browsers
    var container = $(".leaflet-control-layers")[0];
    if (!L.Browser.touch) {
        L.DomEvent
            .disableClickPropagation(container)
            .disableScrollPropagation(container);
    } else {
        L.DomEvent.disableClickPropagation(container);
    }

    /* Typeahead search functionality */
    $(document).ajaxStop(function () {
        sizeSidebar();

        sizeLayerControl();

        featureList = new List("features", {
            valueNames: ["feature-name"]
        });
        featureList.sort("feature-name", {
            order: "asc"
        });
    });
};

$(document).ready(() => init());

// window.addEventListener('DOMContentLoaded', init);