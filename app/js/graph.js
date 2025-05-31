import { csv } from './d3.min.js';

const csvData = csv("assets/cbcis_parameters_en.csv").then(data => {
    return data;
});

