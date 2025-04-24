/* Color palette sampled from images of Sataksan ritual calligraphy ink https://www.sataksan.com/ */
const colorPalette = {
    "sign": {
        "aries": {
            "samples": ["#c33430", "#d4564d", "#c9524e", "#b73f3e"],
            "computed": {
                "average": "#c64742",
                "lightest": "#d4564d",
                "darkest": "#b73f3e",
                "reddest": "#d4564d",
                "orangest": "#d4564d",
                "yellowest": "#d4564d",
                "greenest": "#d4564d",
                "bluest": "#d4564d",
                "purplest": "#d4564d",
                "magentaest": "#d4564d",
                "mostSaturated": "#d4564d",
                "leastSaturated": "#b73f3e",
                "mostVivid": "#d4564d",
                "mostMuted": "#b73f3e"
            }
        },
        "taurus": {
            "samples": ["#80a24b", "#80a24b", "#80a24b", "#6a9849"],
            "computed": {
                "average": "#7ba04b",
                "lightest": "#80a24b",
                "darkest": "#6a9849",
                "reddest": "#6a9849",
                "orangest": "#80a24b",
                "yellowest": "#80a24b",
                "greenest": "#6a9849",
                "bluest": "#6a9849",
                "purplest": "#6a9849",
                "magentaest": "#6a9849",
                "mostSaturated": "#80a24b",
                "leastSaturated": "#6a9849",
                "mostVivid": "#80a24b",
                "mostMuted": "#6a9849"
            }
        },
        "gemini": {
            "samples": ["#7f7c65", "#938b6f", "#8f947d", "#869785"],
            "computed": {
                "average": "#8a8d76",
                "lightest": "#869785",
                "darkest": "#7f7c65",
                "reddest": "#869785",
                "orangest": "#938b6f",
                "yellowest": "#7f7c65",
                "greenest": "#869785",
                "bluest": "#869785",
                "purplest": "#869785",
                "magentaest": "#869785",
                "mostSaturated": "#938b6f",
                "leastSaturated": "#869785",
                "mostVivid": "#938b6f",
                "mostMuted": "#7f7c65"
            }
        },
        "cancer": {
            "samples": ["#c19044", "#caa04e", "#caa04e", "#be8c4e"],
            "computed": {
                "average": "#c5974c",
                "lightest": "#caa04e",
                "darkest": "#be8c4e",
                "reddest": "#caa04e",
                "orangest": "#be8c4e",
                "yellowest": "#caa04e",
                "greenest": "#caa04e",
                "bluest": "#caa04e",
                "purplest": "#caa04e",
                "magentaest": "#caa04e",
                "mostSaturated": "#caa04e",
                "leastSaturated": "#be8c4e",
                "mostVivid": "#caa04e",
                "mostMuted": "#be8c4e"
            }
        },
        "leo": {
            "samples": ["#ad7a1c", "#b0831e", "#b18f2e", "#ab8928"],
            "computed": {
                "average": "#ae8524",
                "lightest": "#b18f2e",
                "darkest": "#ad7a1c",
                "reddest": "#b18f2e",
                "orangest": "#ad7a1c",
                "yellowest": "#b18f2e",
                "greenest": "#b18f2e",
                "bluest": "#b18f2e",
                "purplest": "#b18f2e",
                "magentaest": "#b18f2e",
                "mostSaturated": "#ad7a1c",
                "leastSaturated": "#b18f2e",
                "mostVivid": "#b0831e",
                "mostMuted": "#b18f2e"
            }
        },
        "virgo": {
            "samples": ["#a96442", "#b8784c", "#bb8254", "#bc9063"],
            "computed": {
                "average": "#b67c51",
                "lightest": "#bc9063",
                "darkest": "#a96442",
                "reddest": "#bc9063",
                "orangest": "#bc9063",
                "yellowest": "#bc9063",
                "greenest": "#bc9063",
                "bluest": "#bc9063",
                "purplest": "#bc9063",
                "magentaest": "#bc9063",
                "mostSaturated": "#a96442",
                "leastSaturated": "#bc9063",
                "mostVivid": "#bb8254",
                "mostMuted": "#a96442"
            }
        },
        "libra": {
            "samples": ["#741e29", "#741e29", "#9e5967", "#832a36"],
            "computed": {
                "average": "#82303c",
                "lightest": "#9e5967",
                "darkest": "#741e29",
                "reddest": "#741e29",
                "orangest": "#9e5967",
                "yellowest": "#9e5967",
                "greenest": "#9e5967",
                "bluest": "#9e5967",
                "purplest": "#9e5967",
                "magentaest": "#9e5967",
                "mostSaturated": "#741e29",
                "leastSaturated": "#9e5967",
                "mostVivid": "#832a36",
                "mostMuted": "#9e5967"
            }
        },
        "scorpio": {
            "samples": ["#6c1b24", "#a1242e", "#87282a", "#993233"],
            "computed": {
                "average": "#8b262c",
                "lightest": "#993233",
                "darkest": "#6c1b24",
                "reddest": "#993233",
                "orangest": "#6c1b24",
                "yellowest": "#6c1b24",
                "greenest": "#6c1b24",
                "bluest": "#6c1b24",
                "purplest": "#6c1b24",
                "magentaest": "#6c1b24",
                "mostSaturated": "#a1242e",
                "leastSaturated": "#993233",
                "mostVivid": "#a1242e",
                "mostMuted": "#87282a"
            }
        },
        "sagittarius": {
            "samples": ["#6a9849", "#6b3a4b", "#764155", "#703746"],
            "computed": {
                "average": "#6f534c",
                "lightest": "#6a9849",
                "darkest": "#703746",
                "reddest": "#703746",
                "orangest": "#6a9849",
                "yellowest": "#6a9849",
                "greenest": "#6a9849",
                "bluest": "#764155",
                "purplest": "#764155",
                "magentaest": "#764155",
                "mostSaturated": "#6a9849",
                "leastSaturated": "#764155",
                "mostVivid": "#6a9849",
                "mostMuted": "#6b3a4b"
            }
        },
        "capricorn": {
            "samples": ["#3e443a", "#414537", "#797c44", "#444838"],
            "computed": {
                "average": "#4f533b",
                "lightest": "#797c44",
                "darkest": "#3e443a",
                "reddest": "#3e443a",
                "orangest": "#797c44",
                "yellowest": "#797c44",
                "greenest": "#3e443a",
                "bluest": "#3e443a",
                "purplest": "#3e443a",
                "magentaest": "#3e443a",
                "mostSaturated": "#797c44",
                "leastSaturated": "#3e443a",
                "mostVivid": "#797c44",
                "mostMuted": "#3e443a"
            }
        },
        "aquarius": {
            "samples": ["#0e6fb1", "#0979c0", "#4295c7", "#358bbf"],
            "computed": {
                "average": "#2482be",
                "lightest": "#4295c7",
                "darkest": "#0e6fb1",
                "reddest": "#0e6fb1",
                "orangest": "#4295c7",
                "yellowest": "#4295c7",
                "greenest": "#4295c7",
                "bluest": "#0e6fb1",
                "purplest": "#0e6fb1",
                "magentaest": "#0e6fb1",
                "mostSaturated": "#0979c0",
                "leastSaturated": "#4295c7",
                "mostVivid": "#0979c0",
                "mostMuted": "#358bbf"
            }
        },
        "pisces": {
            "samples": ["#287e79", "#3493aa", "#2c7d85", "#156366"],
            "computed": {
                "average": "#277c84",
                "lightest": "#3493aa",
                "darkest": "#156366",
                "reddest": "#3493aa",
                "orangest": "#287e79",
                "yellowest": "#287e79",
                "greenest": "#287e79",
                "bluest": "#3493aa",
                "purplest": "#3493aa",
                "magentaest": "#3493aa",
                "mostSaturated": "#156366",
                "leastSaturated": "#2c7d85",
                "mostVivid": "#3493aa",
                "mostMuted": "#287e79"
            }
        }
    },
    "planet": {
        "sun": {
            "samples": ["#b3a50b", "#c1b437", "#c3b72f", "#bdb340"],
            "computed": {
                "average": "#bdb12c",
                "lightest": "#c3b72f",
                "darkest": "#b3a50b",
                "reddest": "#bdb340",
                "orangest": "#c1b437",
                "yellowest": "#bdb340",
                "greenest": "#bdb340",
                "bluest": "#bdb340",
                "purplest": "#bdb340",
                "magentaest": "#bdb340",
                "mostSaturated": "#b3a50b",
                "leastSaturated": "#bdb340",
                "mostVivid": "#b3a50b",
                "mostMuted": "#bdb340"
            }
        },
        "mercury": {
            "samples": ["#cf9150", "#ca9350", "#d49759", "#cb9558"],
            "computed": {
                "average": "#ce9454",
                "lightest": "#d49759",
                "darkest": "#ca9350",
                "reddest": "#ca9350",
                "orangest": "#d49759",
                "yellowest": "#ca9350",
                "greenest": "#ca9350",
                "bluest": "#ca9350",
                "purplest": "#ca9350",
                "magentaest": "#ca9350",
                "mostSaturated": "#d49759",
                "leastSaturated": "#cb9558",
                "mostVivid": "#d49759",
                "mostMuted": "#ca9350"
            }
        },
        "venus": {
            "samples": ["#7a9e3a", "#558555", "#7fa14d", "#4f8335"],
            "computed": {
                "average": "#679244",
                "lightest": "#7fa14d",
                "darkest": "#4f8335",
                "reddest": "#558555",
                "orangest": "#7a9e3a",
                "yellowest": "#7a9e3a",
                "greenest": "#558555",
                "bluest": "#558555",
                "purplest": "#558555",
                "magentaest": "#558555",
                "mostSaturated": "#7a9e3a",
                "leastSaturated": "#558555",
                "mostVivid": "#7a9e3a",
                "mostMuted": "#558555"
            }
        },
        "earth": {
            "samples": ["#ae7434", "#ab7431", "#8c5522", "#935d21"],
            "computed": {
                "average": "#9e672a",
                "lightest": "#ae7434",
                "darkest": "#8c5522",
                "reddest": "#ab7431",
                "orangest": "#8c5522",
                "yellowest": "#ab7431",
                "greenest": "#ab7431",
                "bluest": "#ab7431",
                "purplest": "#ab7431",
                "magentaest": "#ab7431",
                "mostSaturated": "#935d21",
                "leastSaturated": "#ae7434",
                "mostVivid": "#ae7434",
                "mostMuted": "#8c5522"
            }
        },
        "moon": {
            "samples": ["#b6b7b2", "#b7b8b3", "#b9bab5", "#b4b5b0"],
            "computed": {
                "average": "#b7b8b3",
                "lightest": "#b9bab5",
                "darkest": "#b4b5b0",
                "reddest": "#b9bab5",
                "orangest": "#b6b7b2",
                "yellowest": "#b6b7b2",
                "greenest": "#b9bab5",
                "bluest": "#b9bab5",
                "purplest": "#b9bab5",
                "magentaest": "#b9bab5",
                "mostSaturated": "#b9bab5",
                "leastSaturated": "#b4b5b0",
                "mostVivid": "#b9bab5",
                "mostMuted": "#b4b5b0"
            }
        },
        "mars": {
            "samples": ["#790219", "#8e101e", "#981422", "#8d061b"],
            "computed": {
                "average": "#8b0b1d",
                "lightest": "#981422",
                "darkest": "#790219",
                "reddest": "#981422",
                "orangest": "#790219",
                "yellowest": "#790219",
                "greenest": "#790219",
                "bluest": "#790219",
                "purplest": "#790219",
                "magentaest": "#790219",
                "mostSaturated": "#790219",
                "leastSaturated": "#981422",
                "mostVivid": "#8d061b",
                "mostMuted": "#981422"
            }
        },
        "jupiter": {
            "samples": ["#391e23", "#4b2228", "#57313c", "#582f39"],
            "computed": {
                "average": "#4d2830",
                "lightest": "#57313c",
                "darkest": "#391e23",
                "reddest": "#4b2228",
                "orangest": "#57313c",
                "yellowest": "#57313c",
                "greenest": "#57313c",
                "bluest": "#57313c",
                "purplest": "#57313c",
                "magentaest": "#57313c",
                "mostSaturated": "#4b2228",
                "leastSaturated": "#57313c",
                "mostVivid": "#4b2228",
                "mostMuted": "#391e23"
            }
        },
        "saturn": {
            "samples": ["#0e0f10", "#131314", "#141417", "#161415"],
            "computed": {
                "average": "#131314",
                "lightest": "#161415",
                "darkest": "#0e0f10",
                "reddest": "#161415",
                "orangest": "#0e0f10",
                "yellowest": "#0e0f10",
                "greenest": "#0e0f10",
                "bluest": "#131314",
                "purplest": "#131314",
                "magentaest": "#161415",
                "mostSaturated": "#141417",
                "leastSaturated": "#131314",
                "mostVivid": "#141417",
                "mostMuted": "#131314"
            }
        },
        "uranus": {
            "samples": ["#0d080b", "#201416", "#23191a", "#1f1116"],
            "computed": {
                "average": "#1c1214",
                "lightest": "#23191a",
                "darkest": "#0d080b",
                "reddest": "#23191a",
                "orangest": "#0d080b",
                "yellowest": "#0d080b",
                "greenest": "#0d080b",
                "bluest": "#0d080b",
                "purplest": "#0d080b",
                "magentaest": "#0d080b",
                "mostSaturated": "#1f1116",
                "leastSaturated": "#23191a",
                "mostVivid": "#1f1116",
                "mostMuted": "#23191a"
            }
        },
        "neptune": {
            "samples": ["#6e91bd", "#6d4252", "#74485b", "#7f4d59"],
            "computed": {
                "average": "#745a71",
                "lightest": "#6e91bd",
                "darkest": "#6d4252",
                "reddest": "#7f4d59",
                "orangest": "#6e91bd",
                "yellowest": "#6e91bd",
                "greenest": "#6e91bd",
                "bluest": "#6e91bd",
                "purplest": "#6e91bd",
                "magentaest": "#74485b",
                "mostSaturated": "#6e91bd",
                "leastSaturated": "#74485b",
                "mostVivid": "#6e91bd",
                "mostMuted": "#6d4252"
            }
        },
        "pluto": {
            "samples": ["#3a2c33", "#66292f", "#752b31", "#5e292b"],
            "computed": {
                "average": "#5d2a30",
                "lightest": "#752b31",
                "darkest": "#3a2c33",
                "reddest": "#5e292b",
                "orangest": "#3a2c33",
                "yellowest": "#3a2c33",
                "greenest": "#3a2c33",
                "bluest": "#3a2c33",
                "purplest": "#3a2c33",
                "magentaest": "#3a2c33",
                "mostSaturated": "#752b31",
                "leastSaturated": "#3a2c33",
                "mostVivid": "#752b31",
                "mostMuted": "#3a2c33"
            }
        }
    },
    "element": {
        "air": {
            "samples": ["#a59b29", "#998e17", "#9a9321", "#a19421"],
            "computed": {
                "average": "#9e9421",
                "lightest": "#a59b29",
                "darkest": "#998e17",
                "reddest": "#9a9321",
                "orangest": "#a19421",
                "yellowest": "#9a9321",
                "greenest": "#9a9321",
                "bluest": "#9a9321",
                "purplest": "#9a9321",
                "magentaest": "#9a9321",
                "mostSaturated": "#998e17",
                "leastSaturated": "#a59b29",
                "mostVivid": "#998e17",
                "mostMuted": "#a59b29"
            }
        },
        "fire": {
            "samples": ["#bf5038", "#ce6a4e", "#b74e3a", "#c85d43"],
            "computed": {
                "average": "#c35941",
                "lightest": "#ce6a4e",
                "darkest": "#b74e3a",
                "reddest": "#ce6a4e",
                "orangest": "#ce6a4e",
                "yellowest": "#ce6a4e",
                "greenest": "#ce6a4e",
                "bluest": "#ce6a4e",
                "purplest": "#ce6a4e",
                "magentaest": "#ce6a4e",
                "mostSaturated": "#ce6a4e",
                "leastSaturated": "#b74e3a",
                "mostVivid": "#ce6a4e",
                "mostMuted": "#b74e3a"
            }
        },
        "water": {
            "samples": ["#1277b9", "#067dbf", "#278dc2", "#2382bf"],
            "computed": {
                "average": "#1981be",
                "lightest": "#278dc2",
                "darkest": "#1277b9",
                "reddest": "#1277b9",
                "orangest": "#278dc2",
                "yellowest": "#278dc2",
                "greenest": "#278dc2",
                "bluest": "#1277b9",
                "purplest": "#1277b9",
                "magentaest": "#1277b9",
                "mostSaturated": "#067dbf",
                "leastSaturated": "#278dc2",
                "mostVivid": "#067dbf",
                "mostMuted": "#278dc2"
            }
        },
        "earth": {
            "samples": ["#034b3d", "#3e7f4d", "#57915c", "#074e41"],
            "computed": {
                "average": "#286a4a",
                "lightest": "#57915c",
                "darkest": "#034b3d",
                "reddest": "#074e41",
                "orangest": "#57915c",
                "yellowest": "#57915c",
                "greenest": "#57915c",
                "bluest": "#074e41",
                "purplest": "#074e41",
                "magentaest": "#074e41",
                "mostSaturated": "#034b3d",
                "leastSaturated": "#57915c",
                "mostVivid": "#034b3d",
                "mostMuted": "#3e7f4d"
            }
        },
        "aether": {
            "samples": ["#99bac2", "#a6bfc4", "#adc0c4", "#afc1c5"],
            "computed": {
                "average": "#a7bfc4",
                "lightest": "#afc1c5",
                "darkest": "#99bac2",
                "reddest": "#99bac2",
                "orangest": "#a6bfc4",
                "yellowest": "#a6bfc4",
                "greenest": "#a6bfc4",
                "bluest": "#99bac2",
                "purplest": "#99bac2",
                "magentaest": "#99bac2",
                "mostSaturated": "#99bac2",
                "leastSaturated": "#afc1c5",
                "mostVivid": "#99bac2",
                "mostMuted": "#99bac2"
            }
        }
    }
};