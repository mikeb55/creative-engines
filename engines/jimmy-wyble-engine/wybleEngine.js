"use strict";
/**
 * Jimmy Wyble Engine — Runtime prototype
 * Implements design spec from gml-composer-engines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWybleEtude = generateWybleEtude;
const wybleGenerator_1 = require("./wybleGenerator");
/**
 * Generate a two-line contrapuntal guitar etude in the spirit of Jimmy Wyble.
 */
function generateWybleEtude(parameters) {
    return (0, wybleGenerator_1.generateWybleEtude)(parameters);
}
