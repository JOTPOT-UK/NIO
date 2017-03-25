console.log("Welcome to project NIO.") ;
let vm = require("vm") ;
let nio = require("./nio") ;
console.log("All the NIO module loaded,") ;
console.log("Your project is loading...") ;
process.on("message",d=>{
	
	if (d[0] === "code") {
		
		console.log("Compiling your code...") ;
		d = d[1] ;
		let script = new vm.Script(`(function (nio,require) {\r\n${d}\r\n})`,{
			
			filename:"/usb/default/main.nio"
			
		}) ;
		console.log("Code comiled...") ;
		console.log("Running your code...") ;
		let func = script.runInThisContext({
			
			filename:"/usb/default/main.nio"
			
		}) ;
		console.log("Now executing...") ;
		func(nio,require) ;
		
	}
	
	else {
		
		console.log("Erm",d[0]) ;
		
	}
	
}) ;
