const app = require("electron").app ;
const dialog = require("electron").dialog ;
const ipc = require("electron").ipcMain ;
const bw = require("electron").BrowserWindow ;
let jppMine = require("./package.js") ;
console.log(jppMine) ;
let path = require("path") ;
let fs = require("fs") ;

let win ;
app.on("ready",_=>{
	
	win = new bw() ;
	win.loadURL(__dirname+"/nio-manager.html") ;
	win.webContents.openDevTools() ;
	win.on("close",_=>app.quit()) ;
	
}) ;

ipc.on("open",_=>{
	
	dialog.showOpenDialog(win,{
		
		title:"Open a JavaScript file to make from.",
		buttonLabel:"Make",
		filters:[
			
			{name:"NIO JS File",extensions:["nio"]},
			{name:"JavaScript File",extensions:["js","es6"]},
			{name:"All (screb option)",extensions:["*"]}
			
		],
		properties:["openFile"]
		
	},files=>{
		
		win.webContents.send("opened",files) ;
		
	}) ;
	
}) ;

ipc.on("make",(m,file,saveTo,settings)=>{
	
	if (!fs.existsSync(`${saveTo}:/`)) {
		
		dialog.showErrorBox("Drive Error.",`Drive ${saveTo} does not exist!`) ;
		return ;
		
	}
	saveTo = `${saveTo}:/default.nio.jpp` ;
	console.log("Making with",file,"and",settings,"to",saveTo) ;
	if (!jppMine.isReady) {
		
		dialog.showErrorBox("JPP Not Ready!!!","The JOTPOT Packager is not ready, please try again in a moment!") ;
		return ;
		
	}
	
	let package = {
		
		dirs:[],
		files:[path.basename(file)],
		wDir:path.dirname(file),
		type:"nio",
		data:Buffer.from(settings)
		
	} ;
	jppMine.create(package,fs.createWriteStream(saveTo)).then(_=>{
		
		console.log("Done!") ;
		win.webContents.send("made") ;
		dialog.showMessageBox(win,{
			
			type:"info",
			title:"Done!",
			message:"Done!",
			detail:"Your NIO package has been created and writen to the drive, plug the drive in to your NIO device to run your script.",
			buttons:["YAY!!!"],
			noLink:true
			
		}) ;
		
	}).catch(console.warn) ;
	
}) ;

ipc.on("netmake",(m,file,ip_addr,passwd,settings)=>{
	
	saveTo = `./nettemp.nio.jpp` ;
	console.log("Net making...") ;
	if (!jppMine.isReady) {
		
		dialog.showErrorBox("JPP Not Ready!!!","The JOTPOT Packager is not ready, please try again in a moment!") ;
		return ;
		
	}
	
	let package = {
		
		dirs:[],
		files:[path.basename(file)],
		wDir:path.dirname(file),
		type:"nio",
		data:Buffer.from(settings)
		
	} ;
	
	let makeToStream = stream => {
		
		jppMine.create(package,stream).then(_=>{
			
			console.log("Done!") ;
			win.webContents.send("made") ;
			dialog.showMessageBox(win,{
				
				type:"info",
				title:"Done!",
				message:"Done!",
				detail:"Your NIO package has been created and sent to the device, it should start running shortly.",
				buttons:["YAY!!!"],
				noLink:true
				
			}) ;
			
		}).catch(console.warn) ;
		
	} ;
	
	let s = require("net").createConnection(3048,ip_addr) ;
	s.on("data",d=>{
		
		d = d.toString().toLowerCase() ;
		
		if (d.indexOf("hello") === 0) {
			
			s.write("Hello, how spiffing it is to see you today!\r\n") ;
			
		}
		
		else if (d.indexOf("password") === 0) {
			
			s.write(`${passwd}\r\n`) ;
			
		}
		
		else if (d.indexOf("what") === 0) {
			
			s.write("Upload please :)\r\n") ;
			
		}
		
		else if (d.indexOf("ok") === 0) {
			
			console.log("Sending") ;
			makeToStream(s) ;
			
		}
		
	}) ;
	s.on("end",_=>{
		
		s = require("net").createConnection(3048,ip_addr) ;
		s.on("data",d=>{
			
			d = d.toString().toLowerCase() ;
			console.log(d) ;
			
			if (d.indexOf("hello") === 0) {
				
				s.write("Hello, how spiffing it is to see you today!\r\n") ;
				
			}
			
			else if (d.indexOf("password") === 0) {
				
				s.write(`${passwd}\r\n`) ;
				
			}
			
			else if (d.indexOf("what") === 0) {
				
				s.write("run local please, lets see my script go YAY!!!\r\n") ;
				
			}
			
			else if (d.indexOf("running") === 0) {
				
				console.log("Running :P") ;
				
			}
			
		}) ;
		
	}) ;
	
}) ;

/*ipc.on("make",(m,settings)=>{
	
	dialog.showOpenDialog(win,{
		
		title:"Open a JavaScript file to make from.",
		buttonLabel:"Make",
		filters:[
			
			{name:"NIO JS File",extensions:["nio"]},
			{name:"JavaScript File",extensions:["js","es6"]},
			{name:"All (screb option)",extensions:["*"]}
			
		],
		properties:["openFile"]
		
	},files=>{
		
		if (typeof files === "undefined") {
			
			return ;
			
		}
		
		let file = files[0] ;
		console.log("Making with",file,"and",settings) ;
		dialog.showSaveDialog(win,{
			
			title:"Make to?",
			buttonLabel:"Make here.",
			properties:["openDirectory"],
			defaultPath:"default.nio",
			filters:[
				
				{name:"JOTPOT Package",extensions:["jpp"]}
				
			]
			
		},saveTo=>{
			
			if (!jppMine.isReady) {
				
				dialog.showErrorBox("JPP Not Ready!!!","The JOTPOT Packager is not ready, please try again in a moment!") ;
				return ;
				
			}
			
			let package = {
				
				dirs:[],
				files:[path.basename(file)],
				wDir:path.dirname(file),
				type:"nio",
				data:Buffer.from(settings)
				
			} ;
			jppMine.create(package,fs.createWriteStream(saveTo)).then(_=>{
				
				console.log("Done!") ;
				win.webContents.send("made") ;
				
			}).catch(console.warn) ;
			
		}) ;
		
	}) ;
	
}) ;*/