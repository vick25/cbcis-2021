const setBg = () => {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return randomColor;
    document.body.style.backgroundColor = "#" + randomColor;
    color.innerHTML = "#" + randomColor;
}

function rgbToRgba(rgb, alpha = 1) {
    return `rgba(${rgb.substring(rgb.indexOf('(') + 1, rgb.length - 1).split(',').join()}, ${alpha})`;
}

// const ctx = $('#chart');

//Load data
var chartData;
let p = d3.csv("assets/cbcis_parameters_en.csv").then(data => {
    return chartData = data;
}).then(d => {
    return chartData = d[100];
    console.log(d[100])
});

$.when(p).done(() => {
    //            console.log(csvData);
    let subset = Object.fromEntries(
        Object.entries(chartData).filter(([key]) => ["tree_cover",
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
    let xlabels = Object.keys(subset),
        yData = Object.values(subset);

    let bgColor = [];
    for (let i = 0; i < xlabels.length; i++) {
        bgColor.push(setBg());
    }

    //            console.log(subset);
    const config = {
        type: 'bar',
        data: {
            xlabels: xlabels,
            datasets: [{
                label: 'Land use',
                data: yData,
                backgroundColor: [
                    "rgba(255, 99, 132, 0.2)",
                    "rgba(54, 162, 235, 0.2)",
                    "rgba(255, 206, 86, 0.2)",
                    "rgba(75, 192, 192, 0.2)",
                    "rgba(153, 102, 255, 0.2)"
                ],
                borderColor: [
                    "rgba(255, 99, 132, 1)",
                    "rgba(54, 162, 235, 1)",
                    "rgba(255, 206, 86, 1)",
                    "rgba(75, 192, 192, 1)",
                    "rgba(153, 102, 255, 1)"
                ],
                borderWidth: 2,
                hoverBackgroundColor: "rgba(255,99,132,0.4)",
                hoverBorderColor: "rgba(255,99,132,1)"
            }]
        },
        options: {
            //                    maintainAspectRatio: false,
            //                    responsive: false,
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

    let myChart;

    function changeChart(newType) {
        const ctx1 = document.getElementById("myChart").getContext("2d");

        // Remove the old chart and all its event handles
        if (myChart) {
            myChart.destroy();
        }

        // Chart.js modifies the object you pass in. Pass a copy of the object so we can use the original object later
        let temp = jQuery.extend(true, {}, config);
        temp.type = newType;
        myChart = new Chart(ctx1, temp);

        switch (newType) {
            case 'line':
                break;
            case 'bar':
                break;
            case 'pie':
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

    $("#bar").trigger("click");

});
