# Uncomment if expecting to generate subtools
# tools = [ 'subtool1', 'subtool2' ]

config={  # Ready to code
    'info': {
        'name'    : 'Demo Tool',
        'text'    :
            'This is the demo_tool showing how to structure a tool and use the API',
        'version' : '1.0'
    },
    'sample': {
        },
    'documentation': {
        'links': [
            {
                'title' : '',
                'url'   : "",
            },
        ]
    },
    'input': [
        {
            'type'        : 'ConfigurationPage',
            'name'        : 'traffic',
            'label'       : 'Traffic Characteristics',
            'description' :
                'Enter the motorized vehicle flow parameters below.  Fields are already completed with their HCM default '
                'values if one is available, but you should supply a more specific local estimate if possible.  The defaults '
                'presume traffic counts are provided in one direction on a two-lane highway and show typical peak hour '
                'behavior.',
            'elements'    : [
                {
                    'name'        : 'vehicles',
                    'description' : 'Total bidirectional motorized flow (all vehicles) on all lanes (vehicles per hour)',
                    'type'        : 'number',
                    'required'    : True,
                },
                {
                    'name'        : 'lanes',
                    'description' : 'Number of through lanes in the analyzed direction (>0)',
                    'type'        : 'number',
                    'required'    : True,
                    
                },
                {
                    'name'        : 'directional',
                    'description' : 'Fraction of Total motorized flow in analyzed direction (decimal, 0-1; '
                                    'default is one-way flow)',
                    'type'        : 'number',
                    'required'    : False,
                    'default'     : 1.0,
                },
                {
                    'name'        : 'peak_hour_factor',
                    'description' : 'Peak Hour Factor (fraction of peak hour travel occurring in peak 15 minutes, ranging from 0.25 to 1.0)',
                    'type'        : 'number',
                    'required'    : True,
                    'default'     : 0.88,
                },
                {
                    'name'        : 'heavy_vehicles',
                    'description' : 'Fraction of counted vehicles that are heavy vehicles (decimal, 0-1)',
                    'type'        : 'number',
                    'required'    : False,
                    'default'     : 0.06,
                },
                {
                    'name'        : 'onstreet_parking',
                    'description' : 'Fraction of segment with occupied on-street parking (decimal, 0-1)',
                    'type'        : 'number',
                    'required'    : False,
                    'default'     : 0.00,
                },
            ],
        },
        {
            'type'        : 'ConfigurationPage',
            'name'        : 'geometry',
            'label'       : 'Roadway Geometry',
            'description' :
                'Enter the roadway geometry below.  Fields are already completed with their HCM default '
                'values if one is available, but you should supply a more specific local estimate if possible.',
            'elements'    : [
                {
                    'name'        : 'posted_speed',
                    'description' : 'Posted speed limit (miles per hour)',
                    'type'        : 'number',
                    'required'    : True,
                },
                {
                    'name'        : 'lane_width',
                    'description' : 'Width of outermost lane (feet)',
                    'type'        : 'number',
                    'default'     : 12,
                    'required'    : False,
                },
                {
                    'name'        : 'shoulder_width',
                    'description' : 'Width of shoulder, if any (feet)',
                    'type'        : 'number',
                    'default'     : 6,
                    'required'    : False,
                },
                {
                    'name'        : 'pavement_condition',
                    'description' : 'Pavement condition (FHWA 5-point scale, where 5 is excellent)',
                    'type'        : 'number',
                    'default'     : 4,
                },
            ]
        },
    ],
    'output': [
        {
            # ResultSpec provides details about output fields
            'type'   : "ResultSpec",
            'format' : 'JSON',
            'elements' : [  # Specify structure of output element display
                {
                    'name'  : 'results',
                    'label'  : 'Results',
                    'description' : 'Results for HCM2010 Uninterrupted Facility Bicycle LOS',
                    'elements' : [
                        # Recurse down into 'elements' to display object structures
                        # Leave out 'elements' to display 'variable' results using simple introspection
                        # Elements should be presented in order listed here
                        {
                            'name' : "los_abcdef",
                            'label' : "LOS",
                            'description' : "Level of Service (Letter Grade)",
                        },
                        {
                            'name' : "blos",
                            'label' : "BLOS",
                            'description' : "Bicycle Level of Service (numeric)",
                        },
                        {
                            'name' : "directional_volume",
                            'label' : "Directional Volume",
                            'description' : "Motorized vehicle flow in analysis direction (vehicles/hour during peak hour)",
                        },
                        {
                            'name' : "outside_lane_vol_peak15",
                            'label' : "Outside Lane Peak Volume",
                            'description' : "Motorized vehicle flow (vehicles/hour during peak 15 minutes",
                        },
                        {
                            'name' : "volume_corrected_width",
                            'label' : "Volume-Corrected Lane Width",
                            'description' : "Lane width (feet) corrected for adjacent motorized volume",
                        },
                        {
                            'name' : "equivalent_width",
                            'label' : "Equivalent Width",
                            'description' : "Lane width (feet) corrected for occupied on-street parking",
                        },
                        {
                            'name' : "effective_speed_factor",
                            'label' : "Effective Speed Factor",
                            'description' : "Effective speed factor (dimensionless)",
                        },
                    ]
                },
            ]
        }
    ],
}

###################### Dump the configuration as JSON>>>>

if __name__ == '__main__':
    import json
    print "Generating JSON configuration"%(t,)
    js = json.dumps(config,indent=2, separators=(',',':'))
    f = file("templates/demo_tool/tool_config.json","w")
    f.write(js)
    f.close()
