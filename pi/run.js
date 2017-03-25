let fs = require("fs") ;
let cp = require("child_process") ;
let stream = require("stream") ;
let jpp = require("./package") ;

let currentFork = null ;
let rebooted = true ;
let waiters = 0 ;
let stopingWaiters = false ;

function isUSBIn() {
	
	return new Promise(resolve=>{
		
		fs.readdir("/dev",(err,dirs)=>{
			
			if (dirs.indexOf("sda1") !== -1) {
				
				resolve(true) ;
				
			}
			
			else {
				
				resolve(false) ;
				
			}
			
		}) ;
		
	}) ;
	
}

function waitForUSB(isIn,callback,delay=1000,isFirst=true) {
	
	if (isFirst) {
		
		waiters++ ;
		
	}
	isUSBIn().then(d=>{
		
		if (stopingWaiters) {
			
			waiters-- ;
			return ;
			
		}
		
		else if (d === isIn) {
			
			waiters-- ;
			callback() ;
			
		}
		
		else {
			
			setTimeout(_=>waitForUSB(isIn,callback,delay,false),delay) ;
			
		}
		
	}) ;
	
}

function stopWaiters(delay=1000) {
	
	return new Promise(resolve=>{
		
		if (waiters === 0) {
			
			resolve() ;
			
		}
		
		else {
			
			stopingWaiters = true ;
			let dat_inter = setInterval(_=>{
				
				if (waiters === 0) {
					
					clearInterval(dat_inter) ;
					stopingWaiters = false ;
					resolve() ;
					
				}
				
			},delay) ;
			
		}
		
	}) ;
	
}

function go() {
	
	console.log("Loading from USB...") ;
	cp.exec("mount /dev/sda1 /nio/usb",(err,stdout,stderr)=>{
		
		if (err) {
			
			console.log("Error",err) ;
			
		}
		
		if (fs.existsSync("/nio/usb/default.nio.jpp")) {
			
			jpp.read("/nio/usb/default.nio.jpp").then(p=>{
				
				jpp.getFile(p,p.fileNames[0]).then(d=>{
					
					compileandgo(d,p.data) ;
					
				}) ;
				
			}) ;
			
		}
		
		else {
			
			cp.exec("umount /nio/usb",_=>waitForUSB(go)) ;
			
		}
		
	}) ;
	
}

function goLocal() {
	
	console.log("Loading from local...") ;
	jpp.read("./local.nio.jpp").then(p=>{
		
		jpp.getFile(p,p.fileNames[0]).then(d=>{
			
			compileandgo(d,p.data,false) ;
			
		}) ;
		
	}) ;
	
}

function parseSettings(settings) {
	
	let temp = new String() ;
	for (let doing = 0 ; doing < settings.length ; doing++) {
		
		let temp2 = Number(settings[doing]).toString(2) ;
		while (temp2.length < 8) {
			
			temp2 = "0" + temp2 ;
			
		}
		temp += temp2 ;
		
		
	}
	temp = temp.split("") ;
	for (let doing in temp) {
		
		temp[doing] = Boolean(Number(temp[doing])) ;
		
	}
	console.log("Settings",temp) ;
	return temp ;
	
}

function sendCompile(d,settings) {
	
	if (settings[1]) {
		
		var logWrite = fs.createWriteStream("NIO.log") ;
		
	}
	currentFork = cp.fork("./runmodule.js",{stdio:["pipe","pipe","pipe","ipc"]}) ;
	currentFork.stdout.on("data",d=>{
		
		if (settings[0]) {
			
			process.stdout.write(d) ;
			
		}
		
		if (settings[1]) {
			
			logWrite.write(d) ;
			
		}
		
	}) ;
	currentFork.stderr.on("data",d=>{
		
		if (settings[0]) {
			
			process.stderr.write(d) ;
			
		}
		
		if (settings[1]) {
			
			logWrite.write(d) ;
			
		}
		
	}) ;
	currentFork.send(["code",d]) ;
	
}

function compileandgo(d,settings,wasUSB=true) {
	
	d = d.toString() ;
	settings = parseSettings(settings) ;
	
	if (settings[6] && !rebooted) {
		
		if (currentFork) {
			
			currentFork.once("exit",_=>{
				
				cp.exec("umount /nio/usb",_=>{
					
					cp.execSync("sudo reboot") ;
					
				}) ;
				
			}) ;
			currentFork.kill() ;
			
		}
		
		else {
			
			cp.exec("umount /nio/usb",_=>{
				
				cp.execSync("sudo reboot") ;
				
			}) ;
			
		}
		
		return ;
		
	}
	
	rebooted = false ;
	
	if (settings[4] && process.argv[process.argv.length-1] !== "ni") {
		
		if (currentFork) {
			
			currentFork.once("exit",_=>{
				
				cp.exec("umount /nio/usb",_=>{
					
					process.exit() ;
					
				}) ;
				
			}) ;
			currentFork.kill() ;
			
		}
		
		else {
			
			cp.exec("umount /nio/usb",_=>{
				
				process.exit() ;
				
			}) ;
			
		}
		
		return ;
		
	}
	
	if (wasUSB) {
		
		if (settings[8]) {
			
			compile(d,settings) ;
			
		}
		
		if (settings[7]) {
			
			let reader = fs.createReadStream("/nio/usb/default.nio.jpp") ;
			let writer = fs.createWriteStream("/nio/local.nio.jpp") ;
			reader.on("end",_=>{
				
				cp.exec("umount /nio/usb",_=>{
					
					waitForUSB(false,_=>{
						
						if (settings[3]) {
							
							currentFork.once("exit",_=>{
								
								currentFork = null ;
								
							}) ;
							currentFork.kill() ;
							
						}
						waitForUSB(true,_=>{
							
							go() ;
							
						},3000) ;
						
					},1500) ;
					
					if (!settings[8]) {
						
						compile(d,settings) ;
						
					}
					
				}) ;
				
			}) ;
			reader.pipe(writer) ;
			
		}
		
		else {
			
			cp.exec("umount /nio/usb",_=>{
				
				waitForUSB(false,_=>{
					
					if (settings[3]) {
						
						currentFork.once("exit",_=>{
							
							currentFork = null ;
							
						}) ;
						currentFork.kill() ;
						
					}
					waitForUSB(true,_=>{
						
						go() ;
						
					},3000) ;
					
				},1500) ;
				
				if (!settings[8]) {
					
					compile(d,settings) ;
					
				}
				
			}) ;
			
		}
		
	}
	
	else {
		
		waitForUSB(true,_=>{
			
			go() ;
			
		},3000) ;
		compile(d,settings) ;
		
	}
	
}

function compile(d,settings) {
	
	if (currentFork) {
		
		currentFork.once("exit",_=>{
			
			sendCompile(d,settings) ;
			
		}) ;
		currentFork.kill() ;
		
	}
	
	else {
		
		sendCompile(d,settings) ;
		
	}
	
}

jpp.onReady =_=> {
	
	isUSBIn().then(inQ=>{
		
		if (inQ) {
			
			go() ;
			
		}
		
		else {
			
			if (fs.existsSync("./local.nio.jpp")) {
				
				goLocal() ;
				
			}
			
			waitForUSB(true,go) ;
			
		}
		
	}) ;
	
} ;


let net = require("net") ;
let netPassword = "Hello :)\r\n" ;
net.createServer(s=>{
	
	console.log("Got connection!") ;
	s.on("error",err=>console.warn("Connection err",err)) ;
	s.write("Hello, welcome to the NIO network interface.\r\n") ;
	let mode = 0 ;
	s.on("end",_=>console.log("Connection ended.")) ;
	s.on("data",d=>{
		
		console.log(d) ;
		if (mode === 0) {
			
			d = d.toString().toLowerCase() ;
			if (d.indexOf("hello") === 0) {
				
				if (netPassword === null) {
					
					mode+=2 ;
					s.write("What do you want?\r\n") ;
					
				}
				
				else {
					
					mode++ ;
					s.write("Password required, please send it...\r\n") ;
					
				}
				
			}
			
		}
		
		else if (mode === 1) {
			
			if (d.toString() === netPassword) {
				
				mode++ ;
				s.write("What do you want?") ;
				
			}
			
			else {
				
				s.write("Password incorrect, please try again.\r\n") ;
				
			}
			
		}
		
		else if (mode === 2) {
			
			d = d.toString().toLowerCase() ;
			if (d.indexOf("upload") > -1 && d.indexOf("upload") < 5) {
				
				console.log("Uploading...") ;
				mode = -5 ;
				var writeStream = fs.createWriteStream("local.nio.jpp") ;
				s.pipe(writeStream) ;
				s.write("OK, send your data and then end the connection please.\r\n") ;
				
			}
			
			else if ((d.indexOf("log") > -1 && d.indexOf("log") < 6) || d.indexOf("view") === 0) {
				
				console.log("LOGS!!!") ;
				var logReader = fs.createReadStream("./NIO.log") ;
				s.write("Here are the logs:\r\n") ;
				logReader.on("data",d=>{
					
					console.log("Got log data...") ;
					s.write(d)
					
				}) ;
				logReader.on("end",_=>{
					
					console.log("Logs ended...") ;
					s.write("\r\n\r\nWhat else would you like me to do?\r\n") ;
					
				}) ;
				
			}
			
			else if (d.indexOf("run") === 0) {
				
				d = d.split(" ") ;
				if (d[1] === "local") {
					
					if (fs.existsSync("./local.nio.jpp")) {
						
						s.write("Running local...\r\n") ;
						stopWaiters(250).then(goLocal) ;
						s.write("What else would you like me to do?\r\n") ;
						
					}
					
					else {
						
						s.write("Error, no local file.\r\n") ;
						s.write("What else would you like me to do?\r\n") ;
						
					}
					
				}
				
				else if (d[1] === "usb") {
					
					isUSBIn().then(inQ=>{
						
						if (inQ) {
							
							s.write("Running from USB...\r\n") ;
							stopWaiters(250).then(go) ;
							s.write("What else would you like me to do?") ;
							
						}
						
						else {
							
							s.write("Error, no USB inserted.\r\n") ;
							s.write("What else would you like me to do?") ;
							
						}
						
					}) ;
					
				}
				
			}
			
		}
		
	}) ;
	
}).listen(3048) ;
