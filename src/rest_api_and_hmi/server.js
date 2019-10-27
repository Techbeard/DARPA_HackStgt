var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var express = require('express');
var session = require('express-session');//sessions
var bodyParser = require('body-parser');//sessions
var sessionstore = require('sessionstore'); //sessions
var os = require("os");
var chalk = require('chalk'); //colors in console
var mqtt = require('mqtt'); //mqtt client
var config = require('./config/config.json'); //include the cofnig file
var uuidv1 = require('uuid/v1'); //gen random uuid times based
var got = require('got');
var randomstring = require("randomstring"); //gen random strings
var fs = require('fs');
var sanitizer = require('sanitizer');
var fileUpload = require('express-fileupload');
var cron = require('node-cron'); //some cronjobs
var listEndpoints = require('express-list-endpoints'); //for rest api explorer
var bcrypt = require('bcrypt'); //for pw hash
var DB = require('tingodb')().Db;//file based database like mongo db
var request = require('request').defaults({ encoding: null });
var randomColor = require('randomcolor');


var port = process.env.PORT || config.webserver_default_port || 3000;
var hostname = process.env.HOSTNAME || config.hostname || "http://127.0.0.1:" + port + "/";
var appDirectory = require('path').dirname(process.pkg ? process.execPath : (require.main ? require.main.filename : process.argv[0]));
console.log(appDirectory);

var db = new DB(path.join(appDirectory, 'db'), {});



var qr_code_funcations = [
    { qr_data: "21", action: "forward", odrive_parameters: "[0.1,0,0]" },
    { qr_data: "22", action: "backward", odrive_parameters: "[-0.1,0,0]" },
    { qr_data: "23", action: "left", odrive_parameters:     "[-0.001,0.1,0]" },
    { qr_data: "24", action: "right", odrive_parameters: "[0,-0.1,0.0]" },
    { qr_data: "25", action: "forward_right", odrive_parameters: "[0.1,-0.1,0.0]" },
    { qr_data: "26", action: "backward_right", odrive_parameters: "[-0.1,-0.1,0.0]" },
    { qr_data: "27", action: "forward_left", odrive_parameters: "[0.1,0.1,0.0]" },
    { qr_data: "28", action: "backward_left", odrive_parameters: "[-0.1,0.1,0.0]" },
    { qr_data: "29", action: "rotate_left", odrive_parameters: "[0,0,1]" },
    { qr_data: "30", action: "rotate_right", odrive_parameters: "[0,0,-1]" }
];






function load_movement_function_by_name(_name) {
    var fkt = null;
    for (let index = 0; index < qr_code_funcations.length; index++) {
        const element = qr_code_funcations[index];
       // console.log(element);
        if (element.action == _name) {
            fkt = element;
            break;
        }     
    }
    return fkt;
}
var ignore_qr_commands = false;
function load_movement_function_by_qr(_qr_data) {
   // console.log(_qr_data);
    var fkt = null;
    for (let index = 0; index < qr_code_funcations.length; index++) {
        const element = qr_code_funcations[index];
        if (element.qr_data == _qr_data) {
                fkt = element;       
            break;
        }   
    }
    return fkt;
}
var robot_movement_state =null;// qr_code_funcations[1];
//-------- EXPRESS APP SETUP --------------- //
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    if (!req.session) {
        return next(); //handle error
    }
    next(); //otherwise continue
});
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'damdkfgnlesfkdgjerinsmegwirhlnks.m',
    store: sessionstore.createSessionStore(),
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(fileUpload());


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});
// ---------------- END EXPRESS SETUP -------------- //


//--------- DB -----------------------------------//
var collection = db.collection("doc");

collection.insert([{ email: 'test@user.de', password: bcrypt.hashSync('test', 10), id: uuidv1(), type: "USER" }], function (err, result) { console.log(err); console.log(result); });

collection.findOne({ email: 'test@user.de' }, function (err, item) {
    console.log(err);
});

//-------- HELPER FUNCTIONS ---------------//
function generate_random_string() {
    return randomstring.generate({
        length: 13,
        charset: String(Math.round(new Date().getTime() / 1000))
    });
}
//--------END HELPER FUNCTIONS ---------------//
var sess;

var rosnode = null;
var pub = null;




app.get('/', function (req, res) {
    res.redirect('/index');
});

app.get('/index', function (req, res) {
    res.render('index.ejs', {
        app_name: config.app_name
    });
});



app.get('/error', function (req, res) {
    res.render('error.ejs', {
        err: sanitizer.sanitize(req.query.msg),
        app_name: config.app_name
    });
});







app.get('/rest/update/:id', function (req, res) {
    var id = req.params.id;
    var tmp = { "id": id };
    res.json(tmp);
});



app.get('/rest/disable_qr_commands', function (req, res) {
    ignore_qr_commands = false;
    res.json({ ignore_qr_commands: ignore_qr_commands});
});
app.get('/rest/enable_qr_commands', function (req, res) {
    ignore_qr_commands = true;
    res.json({ ignore_qr_commands: ignore_qr_commands });
});


app.get('/rest/plattform_state/:state', function (req, res) {
    plattform_state = req.params.state;
    res.json({ plattform_state: plattform_state });
});

app.get('/rest/gripper_state/:state', function (req, res) {
    gripper_state = req.params.state;
    res.json({ gripper_state: gripper_state });
});



//---------------- SOCKET IO START ------------- //
var gripper_state = 0;
var plattform_state = 0;
io.on('connection', function (socket) {
   // console.log('a user connected');


    socket.on('mvcmd', function (msg) {
     //   console.log(msg);
        robot_movement_state = load_movement_function_by_name(msg.action);
        console.log(robot_movement_state);
    });

    socket.on('gripper', function (msg) {
        console.log(msg);
        if (msg.action == "open"){
            gripper_state = 1;
        }else{
            gripper_state = 2;
        }
        plattform_state = gripper_state;
    });
    

    socket.on('plattform', function (msg) {
        console.log(msg);
        if (msg.action == "open") {
            plattform_state = 1;
        } else {
            plattform_state = 2;
        }
    });

});







//BROADCAST  socket.broadcast.emit('update', {});


//CRON JOB EVER MINUTE
cron.schedule('* * * * *', () => {
    console.log('running a task every minute');
});




setInterval(() => {
    request.get('http://127.0.0.1/cam0', function (error, response, body) {
        if (!error && response.statusCode == 200) {     
            io.emit('image_camera_0', { image: true, buffer: body.toString('base64') });
        }
    });
}, 100);



var batt_low_state = false;
setInterval(() => {
    request.get('http://127.0.0.1/data/powermanagement', function (error, response, body) {
        // console.log(body.toString());
        io.emit('powermanagement', { status: JSON.parse(body.toString()) });
        var sts = JSON.parse(body.toString());
        if (body.batteryLow) {
            if (batt_low_state) {
                serport.write('ff0000,15,' + String(plattform_state) +',' + String(gripper_state) +'\n');
            } else {
                serport.write('ff0880,15,' + String(plattform_state) +',' + String(gripper_state) +'\n');
            }
            batt_low_state = !batt_low_state;
        } else {//BATT MIN 14 BATT MAX 21 AT 15 LEDS
            var fkt = (((sts.voltage | 0) - 15) * (15 - 0) / (20 - 15) + 0);
            serport.write('000055,' + String(fkt) + ',' + String(plattform_state) +',' + String(gripper_state)+'\n');
        }
    });
}, 1000);






var SerialPort = require('serialport')
var Readline = require('@serialport/parser-readline')
var serport = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });

const ser_parser = new Readline();
serport.pipe(ser_parser);


serport.on('error', function (err) {
    console.log('Error: ', err.message);
});

//ser_parser.on('data', console.log);

//parser.on('data', line => console.log(`> ${line}`))


app.get('/rest/ports', function (req, res) {
    SerialPort.list(function (err, ports) {
        var lsit = [];
        for (let index = 0; index < ports.length; index++) {
            lsit.push({ 'path': ports[index].comName });
        }
        res.json({ 'ports': lsit, 'raw': ports });
    });
});


app.get('/rest/coltest', function (req, res) {
    serport.write('ffff00,15,0,0\n');
    res.json({});
});

app.get('/rest/randomcolor', function (req, res) {
    var color = randomColor();
    color = color.substr(1);
    serport.write(color + ',15,' + String(plattform_state)+',' + String(gripper_state) +'\n');
    res.json({ color: color });
});

var last_qr_data = "";
app.get('/rest/got_qr/:qr_data', function (req, res) {
    var _qr_data = req.params.qr_data;
    robot_movement_state = load_movement_function_by_qr(_qr_data);
    request.get('http://127.0.0.1//rest/randomcolor', function (error, response, body) {});
    res.json({ qr_data: _qr_data,robot_movement_state: robot_movement_state});
});
app.get('/rest/last_qr', function (req, res) {
    res.json({ last_qr_data: last_qr_data });
});
//---------------------- FOR REST ENDPOINT LISTING ---------------------------------- //
app.get('/rest', function (req, res) {
    res.redirect('/restexplorer.html');
});

app.get('/rest/mv_func/:name', function (req, res) {
    var _name = req.params.name;
    robot_movement_state = load_movement_function_by_name(_name);
    res.json({ name: _name, robot_movement_state: robot_movement_state});
});


app.get('/rest/list_actions', function (req, res) {
    for (let index = 0; index < qr_code_funcations.length; index++) {
        qr_code_funcations[index].action_uri = "http://127.0.0.1:" + port + "/rest/mv_func/" + qr_code_funcations[index].action;
    }
    res.json({ qr_code_funcations: qr_code_funcations });
});


//RETURNS A JSON WITH ONLY /rest ENPOINTS TO GENERATE A NICE HTML SITE
var REST_ENDPOINT_PATH_BEGIN_REGEX = "^\/rest\/(.)*$"; //REGEX FOR ALL /rest/* beginning
var REST_API_TITLE = config.app_name | "APP NAME HERE";
var rest_endpoint_regex = new RegExp(REST_ENDPOINT_PATH_BEGIN_REGEX);
var REST_PARAM_REGEX = "\/:(.*)\/"; // FINDS /:id/ /:hallo/test
//HERE YOU CAN ADD ADDITIONAL CALL DESCTIPRION
var REST_ENDPOINTS_DESCRIPTIONS = [
    { endpoints: "/rest/update/:id", text: "UPDATE A VALUES WITH ID" },
    { endpoints: "/rest/gripper_state/:state", text: "0 ignore; 1=open; 2=close" },
    { endpoints: "/rest/plattform_state/:state", text: "0 ignore; 1=open; 2=close" },
    { endpoints: "/rest/enable_qr_commands", text: "enable the scanning of qr codes" },
    { endpoints: "/rest/disable_qr_commands", text: "disables the scanning of qr codes" },
    { endpoints: "/rest/ports", text: "lists all avariable serial ports" },
    { endpoints: "/rest/randomcolor", text: "random colors for the leds" },
    { endpoints: "/rest/got_qr/:qr_data", text: "set a scanned qr code and does the action" },
    { endpoints: "/rest/last_qr", text: "shows the last scanned qr code data buffer" },
];

app.get('/rest', function (req, res) {   
    res.redirect("/restexplorer.html");
});



app.get('/listendpoints', function (req, res) {
    var ep = listEndpoints(app);
    var tmp = [];
    for (let index = 0; index < ep.length; index++) {
        var element = ep[index];
        if (rest_endpoint_regex.test(element.path)) {
            //LOAD OPTIONAL DESCRIPTION
            for (let descindex = 0; descindex < REST_ENDPOINTS_DESCRIPTIONS.length; descindex++) {
                if (REST_ENDPOINTS_DESCRIPTIONS[descindex].endpoints == element.path) {
                    element.desc = REST_ENDPOINTS_DESCRIPTIONS[descindex].text;
                }
            }
            //SEARCH FOR PARAMETERS
            //ONLY REST URL PARAMETERS /:id/ CAN BE PARSED
            //DO A REGEX TO THE FIRST:PARAMETER
            element.url_parameters = [];
            var arr = (String(element.path) + "/").match(REST_PARAM_REGEX);
            if (arr != null) {
                //SPLIT REST BY /
                var splittedParams = String(arr[0]).split("/");
                var cleanedParams = [];
                //CLEAN PARAEMETER BY LOOKING FOR A : -> THAT IS A PARAMETER
                for (let cpIndex = 0; cpIndex < splittedParams.length; cpIndex++) {
                    if (splittedParams[cpIndex].startsWith(':')) {
                        cleanedParams.push(splittedParams[cpIndex].replace(":", "")); //REMOVE :
                    }
                }
                //ADD CLEANED PARAMES TO THE FINAL JOSN OUTPUT
                for (let finalCPIndex = 0; finalCPIndex < cleanedParams.length; finalCPIndex++) {
                    element.url_parameters.push({ name: cleanedParams[finalCPIndex] });

                }
            }
            //ADD ENPOINT SET TO FINAL OUTPUT
            tmp.push(element);
        }
    }
    res.json({ api_name: REST_API_TITLE, endpoints: tmp });
});



setInterval(() => {
    if (robot_movement_state == null) {
        return;
    }
    request.get('http://127.0.0.1/data/distancesensorarray', function (error, response, body) {
        if (error || response.statusCode != 200) {
            robot_movement_state = null;
            return;
        }
        var dist_array = JSON.parse(body.toString());
        //console.log("------");
        //console.log(dist_array);
	for (let index = 0; index < dist_array.length; index++) {
            if (dist_array[index] < 0.2) { //min distance to object
                robot_movement_state = null;
                return;
            }
        }
        console.log(robot_movement_state);
        request({
            url: 'http://127.0.0.1/data/omnidrive',
            body: robot_movement_state.odrive_parameters,
            json: false,
            method: 'POST',
        }, function (error, response, body) {
            console.log(body.toJSON());
        });

    });
}, 150);


